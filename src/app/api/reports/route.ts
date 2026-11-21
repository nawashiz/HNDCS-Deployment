import { getDb } from "@/lib/mysql";
import { getCurrentUser } from "@/lib/auth";
import { monthToDate } from "@/lib/payroll";
import { isMonth } from "@/lib/validate";
import { RowDataPacket } from "mysql2";

export const runtime = "nodejs";

/**
 * One endpoint, three views (keeps the project small):
 *   GET /api/reports                  -> monthly salary report by department
 *   GET /api/reports?view=dashboard   -> numbers for the dashboard page
 *   GET /api/reports?view=rate        -> live LKR to USD rate (external API)
 */
export async function GET(request: Request) {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "You must be logged in." }, { status: 401 });

    const view = new URL(request.url).searchParams.get("view");

    if (view === "dashboard") return dashboardNumbers(user.role);
    if (view === "rate") return exchangeRate();

    return monthlyReport(request, user.role);
}

// ---------------- dashboard ----------------
async function dashboardNumbers(role: "admin" | "staff") {
    if (role !== "admin") return Response.json({ error: "Only an admin can open the dashboard." }, { status: 403 });

    try {
        const [staffRows] = await getDb().execute<(RowDataPacket & { total: number; active: number; inactive: number })[]>(
            "SELECT COUNT(*) AS total, SUM(status = 'active') AS active, SUM(status = 'inactive') AS inactive FROM staff"
        );
        const [departmentRows] = await getDb().execute<(RowDataPacket & { total: number })[]>(
            "SELECT COUNT(*) AS total FROM departments"
        );
        const [monthRows] = await getDb().execute<(RowDataPacket & { pay_month: string | null })[]>(
            "SELECT MAX(pay_month) AS pay_month FROM salary_records"
        );
        const month = monthRows[0]?.pay_month ?? "";

        const [payrollRows] = await getDb().execute<(RowDataPacket & {
            count: number; draft: number; approved: number; paid: number;
            gross: number; net: number; epf_employer: number; etf: number;
        })[]>(
            `SELECT COUNT(*) AS count,
                    SUM(status = 'draft') AS draft,
                    SUM(status = 'approved') AS approved,
                    SUM(status = 'paid') AS paid,
                    COALESCE(SUM(gross_salary), 0) AS gross,
                    COALESCE(SUM(net_salary), 0) AS net,
                    COALESCE(SUM(epf_employer), 0) AS epf_employer,
                    COALESCE(SUM(etf), 0) AS etf
             FROM salary_records WHERE pay_month = ?`,
            [month]
        );

        const [history] = await getDb().execute<(RowDataPacket & { pay_month: string; net: number })[]>(
            `SELECT pay_month, SUM(net_salary) AS net FROM salary_records
             GROUP BY pay_month ORDER BY pay_month DESC LIMIT 6`
        );
        const [activity] = await getDb().execute<RowDataPacket[]>(
            `SELECT a.id, a.action, a.description, a.created_at, u.name AS user_name
             FROM activity_logs a LEFT JOIN users u ON u.id = a.user_id
             ORDER BY a.id DESC LIMIT 6`
        );

        const payroll = payrollRows[0];

        return Response.json({
            data: {
                staff: {
                    total: Number(staffRows[0]?.total ?? 0),
                    active: Number(staffRows[0]?.active ?? 0),
                    inactive: Number(staffRows[0]?.inactive ?? 0),
                },
                departments: Number(departmentRows[0]?.total ?? 0),
                month,
                payroll: {
                    count: Number(payroll.count),
                    draft: Number(payroll.draft),
                    approved: Number(payroll.approved),
                    paid: Number(payroll.paid),
                    gross: Number(payroll.gross),
                    net: Number(payroll.net),
                },
                employerCost: Number(payroll.net) + Number(payroll.epf_employer) + Number(payroll.etf),
                history: history.reverse(),
                activity,
            },
        });
    } catch (error) {
        console.error("Load dashboard failed", error);
        return Response.json({ error: "Unable to load dashboard data." }, { status: 503 });
    }
}

// ---------------- external API ----------------
async function exchangeRate() {
    try {
        const response = await fetch("https://open.er-api.com/v6/latest/LKR", { next: { revalidate: 3600 } });
        if (!response.ok) throw new Error(`Exchange API returned ${response.status}`);

        const body = (await response.json()) as {
            result?: string;
            time_last_update_utc?: string;
            rates?: Record<string, number>;
        };
        const usd = body.rates?.USD;
        if (body.result !== "success" || !usd) throw new Error("USD rate missing in the response");

        return Response.json({
            data: {
                base: "LKR",
                usdRate: Math.round((1 / usd) * 100) / 100, // how many LKR for 1 USD
                updatedAt: body.time_last_update_utc ?? new Date().toUTCString(),
            },
        });
    } catch (error) {
        console.error("Exchange rate failed", error);
        return Response.json({ error: "The exchange rate service is not available right now." }, { status: 502 });
    }
}

// ---------------- monthly report ----------------
async function monthlyReport(request: Request, role: "admin" | "staff") {
    if (role !== "admin") return Response.json({ error: "Only an admin can view reports." }, { status: 403 });

    const url = new URL(request.url);
    let month = (url.searchParams.get("month") ?? "").trim();

    try {
        if (!isMonth(month)) {
            const [monthRows] = await getDb().execute<(RowDataPacket & { pay_month: string | null })[]>(
                "SELECT MAX(pay_month) AS pay_month FROM salary_records"
            );
            month = monthRows[0]?.pay_month ? monthRows[0].pay_month.slice(0, 7) : "";
        }
        if (!month) {
            return Response.json({ data: { month: "", totals: null, statusCounts: null, departments: [], topEarners: [] } });
        }

        const payMonth = monthToDate(month);

        const [totalRows] = await getDb().execute<(RowDataPacket & {
            staff_count: number; gross: number; net: number; allowances: number; deductions: number;
            epf_employee: number; epf_employer: number; etf: number;
        })[]>(
            `SELECT COUNT(*) AS staff_count,
                    COALESCE(SUM(gross_salary), 0) AS gross,
                    COALESCE(SUM(net_salary), 0) AS net,
                    COALESCE(SUM(total_allowances), 0) AS allowances,
                    COALESCE(SUM(total_deductions), 0) AS deductions,
                    COALESCE(SUM(epf_employee), 0) AS epf_employee,
                    COALESCE(SUM(epf_employer), 0) AS epf_employer,
                    COALESCE(SUM(etf), 0) AS etf
             FROM salary_records WHERE pay_month = ?`,
            [payMonth]
        );

        const [statusRows] = await getDb().execute<(RowDataPacket & { draft: number; approved: number; paid: number })[]>(
            `SELECT SUM(status = 'draft') AS draft, SUM(status = 'approved') AS approved, SUM(status = 'paid') AS paid
             FROM salary_records WHERE pay_month = ?`,
            [payMonth]
        );

        const [departmentRows] = await getDb().execute<RowDataPacket[]>(
            `SELECT d.name AS department_name, COUNT(sr.id) AS staff_count,
                    COALESCE(SUM(sr.gross_salary), 0) AS gross,
                    COALESCE(SUM(sr.net_salary), 0) AS net,
                    COALESCE(SUM(sr.epf_employee), 0) AS epf_employee
             FROM salary_records sr
             JOIN staff s ON s.id = sr.staff_id
             JOIN departments d ON d.id = s.department_id
             WHERE sr.pay_month = ?
             GROUP BY d.id, d.name ORDER BY net DESC`,
            [payMonth]
        );

        const [topEarners] = await getDb().execute<RowDataPacket[]>(
            `SELECT s.full_name, s.designation, sr.net_salary
             FROM salary_records sr JOIN staff s ON s.id = sr.staff_id
             WHERE sr.pay_month = ? ORDER BY sr.net_salary DESC LIMIT 5`,
            [payMonth]
        );

        const totals = totalRows[0];
        const status = statusRows[0];

        return Response.json({
            data: {
                month,
                totals: {
                    staff_count: Number(totals.staff_count),
                    gross: Number(totals.gross),
                    net: Number(totals.net),
                    allowances: Number(totals.allowances),
                    deductions: Number(totals.deductions),
                    epf_employee: Number(totals.epf_employee),
                    epf_employer: Number(totals.epf_employer),
                    etf: Number(totals.etf),
                },
                statusCounts: { draft: Number(status.draft ?? 0), approved: Number(status.approved ?? 0), paid: Number(status.paid ?? 0) },
                departments: departmentRows,
                topEarners,
            },
        });
    } catch (error) {
        console.error("Load report failed", error);
        return Response.json({ error: "Unable to load the report." }, { status: 503 });
    }
}
