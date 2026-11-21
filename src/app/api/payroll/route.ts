import { getDb } from "@/lib/mysql";
import { getCurrentUser, logActivity } from "@/lib/auth";
import { calculateSalary, monthToDate } from "@/lib/payroll";
import { intField, isMonth, textField } from "@/lib/validate";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export const runtime = "nodejs";

type RecordRow = RowDataPacket & {
    id: number;
    staff_id: number;
    pay_month: string;
    basic_salary: number;
    total_allowances: number;
    total_deductions: number;
    epf_employee: number;
    epf_employer: number;
    etf: number;
    gross_salary: number;
    net_salary: number;
    status: string;
    paid_date: string | null;
    payment_method: string | null;
    reference_no: string | null;
    staff_code: string;
    full_name: string;
    designation: string;
    department_name: string;
};

export async function GET(request: Request) {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "You must be logged in." }, { status: 401 });

    const url = new URL(request.url);

    // /api/payroll?id=12 -> one payslip
    const recordId = intField(url.searchParams.get("id"));
    if (recordId) return loadPayslip(recordId, user);

    let month = (url.searchParams.get("month") ?? "").trim();
    const status = (url.searchParams.get("status") ?? "").trim().toLowerCase();

    let staffId = Number(url.searchParams.get("staffId") ?? 0) || null;
    // staff users can only see their own salary records
    if (user.role === "staff") {
        if (!user.staffId) return Response.json({ data: { records: [], summary: null, month } });
        staffId = user.staffId;
    }

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    const showAll = url.searchParams.get("all") === "1";

    try {
        // no month given -> use the newest month that has salary records
        if (!showAll && !isMonth(month)) {
            const [monthRows] = await getDb().execute<(RowDataPacket & { pay_month: string | null })[]>(
                "SELECT MAX(pay_month) AS pay_month FROM salary_records"
            );
            month = monthRows[0]?.pay_month ? monthRows[0].pay_month.slice(0, 7) : "";
        }
    } catch (error) {
        console.error("Find latest month failed", error);
    }

    if (isMonth(month)) {
        conditions.push("sr.pay_month = ?");
        params.push(monthToDate(month));
    }
    if (["draft", "approved", "paid"].includes(status)) {
        conditions.push("sr.status = ?");
        params.push(status);
    }
    if (staffId) {
        conditions.push("sr.staff_id = ?");
        params.push(staffId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    try {
        const [records] = await getDb().execute<RecordRow[]>(
            `SELECT sr.id, sr.staff_id, sr.pay_month, sr.basic_salary, sr.total_allowances, sr.total_deductions,
                    sr.epf_employee, sr.epf_employer, sr.etf, sr.gross_salary, sr.net_salary, sr.status,
                    sr.paid_date, sr.payment_method, sr.reference_no,
                    s.staff_code, s.full_name, s.designation, d.name AS department_name
             FROM salary_records sr
             JOIN staff s ON s.id = sr.staff_id
             JOIN departments d ON d.id = s.department_id
             ${where}
             ORDER BY sr.pay_month DESC, s.full_name`,
            params
        );

        const summary = {
            count: records.length,
            draft: records.filter((row) => row.status === "draft").length,
            approved: records.filter((row) => row.status === "approved").length,
            paid: records.filter((row) => row.status === "paid").length,
            gross: records.reduce((sum, row) => sum + Number(row.gross_salary), 0),
            net: records.reduce((sum, row) => sum + Number(row.net_salary), 0),
        };

        return Response.json({ data: { records, summary, month } });
    } catch (error) {
        console.error("Load payroll failed", error);
        return Response.json({ error: "Unable to load salary records." }, { status: 503 });
    }
}

/**
 * Generate salary records for one month.
 * Uses a database transaction: if anything fails, nothing is saved.
 */
export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "You must be logged in." }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Only an admin can generate payroll." }, { status: 403 });

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }

    const value = body as Record<string, unknown> | null;
    const month = typeof value?.month === "string" ? value.month.trim() : "";
    if (!isMonth(month)) return Response.json({ error: "Choose a valid month (YYYY-MM)." }, { status: 400 });

    const payMonth = monthToDate(month);
    const connection = await getDb().getConnection();

    try {
        await connection.beginTransaction();

        const [staffRows] = await connection.execute<(RowDataPacket & { id: number; staff_code: string; basic_salary: number })[]>(
            "SELECT id, staff_code, basic_salary FROM staff WHERE status = 'active' ORDER BY staff_code"
        );

        if (staffRows.length === 0) {
            await connection.rollback();
            return Response.json({ error: "There are no active staff members to generate salaries for." }, { status: 400 });
        }

        const [existing] = await connection.execute<(RowDataPacket & { staff_id: number })[]>(
            "SELECT staff_id FROM salary_records WHERE pay_month = ?",
            [payMonth]
        );
        const done = new Set(existing.map((row) => row.staff_id));

        let created = 0;
        let skipped = 0;

        for (const staff of staffRows) {
            if (done.has(staff.id)) {
                skipped++;
                continue;
            }

            const [componentRows] = await connection.execute<(RowDataPacket & { name: string; type: "allowance" | "deduction"; amount: number })[]>(
                "SELECT name, type, amount FROM staff_components WHERE staff_id = ? AND is_active = 1",
                [staff.id]
            );

            const allowances = componentRows.filter((row) => row.type === "allowance");
            const deductions = componentRows.filter((row) => row.type === "deduction");
            const calc = calculateSalary(
                Number(staff.basic_salary),
                allowances.map((row) => Number(row.amount)),
                deductions.map((row) => Number(row.amount))
            );

            const [result] = await connection.execute<ResultSetHeader>(
                `INSERT INTO salary_records (staff_id, pay_month, basic_salary, total_allowances, total_deductions,
                    epf_employee, epf_employer, etf, gross_salary, net_salary, status, generated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
                [staff.id, payMonth, calc.basicSalary, calc.totalAllowances, calc.totalDeductions,
                    calc.epfEmployee, calc.epfEmployer, calc.etf, calc.grossSalary, calc.netSalary, user.id]
            );

            const details: [string, "basic" | "allowance" | "deduction", number][] = [
                ["Basic Salary", "basic", calc.basicSalary],
                ...allowances.map((row) => [row.name, "allowance", Number(row.amount)] as [string, "allowance", number]),
                ["EPF (Employee 8%)", "deduction", calc.epfEmployee],
                ...deductions.map((row) => [row.name, "deduction", Number(row.amount)] as [string, "deduction", number]),
            ];

            for (const [name, type, amount] of details) {
                await connection.execute(
                    "INSERT INTO salary_details (salary_record_id, component_name, component_type, amount) VALUES (?, ?, ?, ?)",
                    [result.insertId, name, type, amount]
                );
            }

            created++;
        }

        await connection.commit();
        await logActivity(user.id, "payroll_generate", `Generated salary records for ${month} (${created} created, ${skipped} skipped)`);

        return Response.json({ data: { month, created, skipped, alreadyGenerated: skipped } }, { status: 201 });
    } catch (error) {
        await connection.rollback();
        console.error("Generate payroll failed", error);
        return Response.json({ error: "Unable to generate payroll. Nothing was saved." }, { status: 503 });
    } finally {
        connection.release();
    }
}

type SessionUser = { id: number; role: "admin" | "staff"; staffId: number | null };

// One salary record with every line of the payslip.
async function loadPayslip(recordId: number, user: SessionUser) {
    try {
        const [rows] = await getDb().execute<RecordRow[]>(
            `SELECT sr.*, s.staff_code, s.full_name, s.designation, s.bank_account,
                    d.name AS department_name
             FROM salary_records sr
             JOIN staff s ON s.id = sr.staff_id
             JOIN departments d ON d.id = s.department_id
             WHERE sr.id = ? LIMIT 1`,
            [recordId]
        );
        const record = rows[0];
        if (!record) return Response.json({ error: "Salary record not found." }, { status: 404 });

        // staff users may only open their own payslip
        if (user.role === "staff" && record.staff_id !== user.staffId) {
            return Response.json({ error: "You can only view your own payslip." }, { status: 403 });
        }

        const [details] = await getDb().execute<RowDataPacket[]>(
            "SELECT id, component_name, component_type, amount FROM salary_details WHERE salary_record_id = ? ORDER BY id",
            [recordId]
        );

        return Response.json({ data: { ...record, details } });
} catch (error) {
        console.error("Load salary record failed", error);
        return Response.json({ error: "Unable to load the salary record." }, { status: 503 });
    }
}

/**
 * Change the status of a salary record.
 * draft -> approved -> paid
 */
export async function PATCH(request: Request) {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "You must be logged in." }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Only an admin can approve or pay salaries." }, { status: 403 });

    const recordId = intField(new URL(request.url).searchParams.get("id"));
    if (!recordId) return Response.json({ error: "Invalid salary record id." }, { status: 400 });

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }

    const value = body as Record<string, unknown> | null;
    const action = textField(value?.action, 20).toLowerCase();
    const paymentMethod = textField(value?.payment_method, 20).toLowerCase() || "bank_transfer";
    const referenceNo = textField(value?.reference_no, 50);

    if (!["approve", "pay"].includes(action)) {
        return Response.json({ error: "Action must be approve or pay." }, { status: 400 });
    }
    if (action === "pay" && !["bank_transfer", "cash", "cheque"].includes(paymentMethod)) {
        return Response.json({ error: "Choose a valid payment method." }, { status: 400 });
    }

    try {
        const [rows] = await getDb().execute<RecordRow[]>(
            "SELECT sr.id, sr.staff_id, sr.pay_month, sr.status, sr.net_salary, s.full_name FROM salary_records sr JOIN staff s ON s.id = sr.staff_id WHERE sr.id = ? LIMIT 1",
            [recordId]
        );
        const record = rows[0];
        if (!record) return Response.json({ error: "Salary record not found." }, { status: 404 });

        if (action === "approve" && record.status !== "draft") {
            return Response.json({ error: `Only draft records can be approved. This record is ${record.status}.` }, { status: 409 });
        }
        if (action === "pay" && record.status !== "approved") {
            return Response.json({ error: `Only approved records can be paid. This record is ${record.status}.` }, { status: 409 });
        }

        const [result] = await getDb().execute<ResultSetHeader>(
            `UPDATE salary_records
             SET status = ?, paid_date = ?, payment_method = ?, reference_no = ?
             WHERE id = ?`,
            [
                action === "approve" ? "approved" : "paid",
                action === "pay" ? new Date().toISOString().slice(0, 10) : null,
                action === "pay" ? paymentMethod : null,
                action === "pay" ? (referenceNo || null) : null,
                recordId,
            ]
        );
        if (result.affectedRows === 0) return Response.json({ error: "Salary record not found." }, { status: 404 });

        await logActivity(
            user.id,
            action === "approve" ? "payroll_approve" : "payroll_pay",
            `${action === "approve" ? "Approved" : "Paid"} salary of ${record.full_name} for ${record.pay_month.slice(0, 7)}`
        );

        return Response.json({ data: { id: recordId, status: action === "approve" ? "approved" : "paid" } });
    } catch (error) {
        console.error("Update salary record failed", error);
        return Response.json({ error: "Unable to update the salary record." }, { status: 503 });
    }
}

export async function DELETE(request: Request) {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "You must be logged in." }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Only an admin can delete salary records." }, { status: 403 });

    const recordId = intField(new URL(request.url).searchParams.get("id"));
    if (!recordId) return Response.json({ error: "Invalid salary record id." }, { status: 400 });

    try {
        const [rows] = await getDb().execute<(RowDataPacket & { status: string })[]>(
            "SELECT status FROM salary_records WHERE id = ? LIMIT 1",
            [recordId]
        );
        const record = rows[0];
        if (!record) return Response.json({ error: "Salary record not found." }, { status: 404 });
        if (record.status !== "draft") {
            return Response.json({ error: "Only draft salary records can be deleted." }, { status: 409 });
        }

        await getDb().execute("DELETE FROM salary_records WHERE id = ?", [recordId]);
        await logActivity(user.id, "payroll_delete", `Deleted draft salary record #${recordId}`);
        return Response.json({ data: { id: recordId } });
    } catch (error) {
        console.error("Delete salary record failed", error);
        return Response.json({ error: "Unable to delete the salary record." }, { status: 503 });
    }
}
