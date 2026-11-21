import { getDb } from "@/lib/mysql";
import { getCurrentUser, logActivity } from "@/lib/auth";
import { parseStaffPayload } from "@/lib/validate";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export const runtime = "nodejs";

type StaffRow = RowDataPacket & {
    id: number;
    staff_code: string;
    full_name: string;
    email: string;
    phone: string;
    address: string | null;
    designation: string;
    department_id: number;
    department_name: string;
    employment_type: string;
    join_date: string;
    basic_salary: number;
    bank_account: string | null;
    status: string;
};

// build the next code like EMP011
async function nextStaffCode() {
    const [rows] = await getDb().execute<(RowDataPacket & { maxNumber: number | null })[]>(
        "SELECT MAX(CAST(SUBSTRING(staff_code, 4) AS UNSIGNED)) AS maxNumber FROM staff WHERE staff_code REGEXP '^EMP[0-9]+$'"
    );
    const next = Number(rows[0]?.maxNumber ?? 0) + 1;
    return `EMP${String(next).padStart(3, "0")}`;
}

export async function GET(request: Request) {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "You must be logged in." }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Only an admin can view staff records." }, { status: 403 });

    const url = new URL(request.url);
    const search = (url.searchParams.get("search") ?? "").trim();
    const status = (url.searchParams.get("status") ?? "").trim().toLowerCase();

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (search !== "") {
        conditions.push("(s.full_name LIKE ? OR s.staff_code LIKE ? OR s.email LIKE ? OR s.designation LIKE ?)");
        const like = `%${search}%`;
        params.push(like, like, like, like);
    }
    if (status === "active" || status === "inactive") {
        conditions.push("s.status = ?");
        params.push(status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    try {
        const [rows] = await getDb().execute<StaffRow[]>(
            `SELECT s.id, s.staff_code, s.full_name, s.email, s.phone, s.address, s.designation,
                    s.department_id, d.name AS department_name, s.employment_type, s.join_date,
                    s.basic_salary, s.bank_account, s.status
             FROM staff s
             JOIN departments d ON d.id = s.department_id
             ${where}
             ORDER BY s.staff_code`,
            params
        );
        return Response.json({ data: rows });
    } catch (error) {
        console.error("Load staff failed", error);
        return Response.json({ error: "Unable to load staff records." }, { status: 503 });
    }
}

export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "You must be logged in." }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Only an admin can add staff." }, { status: 403 });

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }

    const parsed = parseStaffPayload(body);
    if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });
    const staff = parsed.value;

    try {
        const [departments] = await getDb().execute<RowDataPacket[]>("SELECT id FROM departments WHERE id = ? LIMIT 1", [staff.department_id]);
        if (departments.length === 0) return Response.json({ error: "The selected department does not exist." }, { status: 400 });

        const staffCode = staff.staff_code === "" ? await nextStaffCode() : staff.staff_code;

        const [result] = await getDb().execute<ResultSetHeader>(
            `INSERT INTO staff (staff_code, full_name, email, phone, address, designation, department_id,
                employment_type, join_date, basic_salary, bank_account, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [staffCode, staff.full_name, staff.email, staff.phone, staff.address, staff.designation,
                staff.department_id, staff.employment_type, staff.join_date, staff.basic_salary,
                staff.bank_account, staff.status]
        );

        await logActivity(user.id, "staff_create", `Added new staff member ${staffCode} ${staff.full_name}`);
        return Response.json({ data: { id: result.insertId, staff_code: staffCode } }, { status: 201 });
    } catch (error) {
        if (typeof error === "object" && error && "code" in error && error.code === "ER_DUP_ENTRY") {
            return Response.json({ error: "That staff code or email is already used by another staff member." }, { status: 409 });
        }
        console.error("Create staff failed", error);
        return Response.json({ error: "Unable to save the staff member." }, { status: 503 });
    }
}
