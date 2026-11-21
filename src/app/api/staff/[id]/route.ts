import { getDb } from "@/lib/mysql";
import { getCurrentUser, logActivity } from "@/lib/auth";
import { intField, numberField, parseStaffPayload, textField } from "@/lib/validate";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/staff/5  ->  one staff member with the salary components
export async function GET(_request: Request, context: RouteContext) {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "You must be logged in." }, { status: 401 });

    const { id } = await context.params;
    const staffId = intField(id);
    if (!staffId) return Response.json({ error: "Invalid staff id." }, { status: 400 });
    if (user.role === "staff" && user.staffId !== staffId) {
        return Response.json({ error: "You can only view your own record." }, { status: 403 });
    }

    try {
        const [rows] = await getDb().execute<RowDataPacket[]>(
            `SELECT s.*, d.name AS department_name
             FROM staff s JOIN departments d ON d.id = s.department_id
             WHERE s.id = ? LIMIT 1`,
            [staffId]
        );
        if (!rows[0]) return Response.json({ error: "Staff member not found." }, { status: 404 });

        const [components] = await getDb().execute<RowDataPacket[]>(
            "SELECT id, staff_id, name, type, amount, is_active FROM staff_components WHERE staff_id = ? ORDER BY type, name",
            [staffId]
        );
        return Response.json({ data: { staff: rows[0], components } });
    } catch (error) {
        console.error("Load staff member failed", error);
        return Response.json({ error: "Unable to load the staff member." }, { status: 503 });
    }
}

// PATCH /api/staff/5  ->  update the staff details
export async function PATCH(request: Request, context: RouteContext) {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
        return Response.json({ error: "Only an admin can update staff." }, { status: 403 });
    }

    const { id } = await context.params;
    const staffId = intField(id);
    if (!staffId) return Response.json({ error: "Invalid staff id." }, { status: 400 });

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
        const [result] = await getDb().execute<ResultSetHeader>(
            `UPDATE staff SET staff_code = ?, full_name = ?, email = ?, phone = ?, address = ?,
                designation = ?, department_id = ?, employment_type = ?, join_date = ?,
                basic_salary = ?, bank_account = ?, status = ?
             WHERE id = ?`,
            [staff.staff_code, staff.full_name, staff.email, staff.phone, staff.address, staff.designation,
                staff.department_id, staff.employment_type, staff.join_date, staff.basic_salary,
                staff.bank_account, staff.status, staffId]
        );
        if (result.affectedRows === 0) return Response.json({ error: "Staff member not found." }, { status: 404 });
        await logActivity(user.id, "staff_update", `Updated staff ${staff.staff_code} ${staff.full_name}`);
        return Response.json({ data: { id: staffId } });
    } catch (error) {
        if (typeof error === "object" && error && "code" in error && error.code === "ER_DUP_ENTRY") {
            return Response.json({ error: "That staff code or email is already used." }, { status: 409 });
        }
        console.error("Update staff failed", error);
        return Response.json({ error: "Unable to update the staff member." }, { status: 503 });
    }
}

// POST /api/staff/5  ->  add an allowance or deduction
export async function POST(request: Request, context: RouteContext) {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
        return Response.json({ error: "Only an admin can add salary components." }, { status: 403 });
    }

    const { id } = await context.params;
    const staffId = intField(id);
    if (!staffId) return Response.json({ error: "Invalid staff id." }, { status: 400 });

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }

    const value = body as Record<string, unknown> | null;
    const name = textField(value?.name, 100);
    const type = textField(value?.type, 20).toLowerCase();
    const amount = numberField(value?.amount);

    if (name.length < 2) return Response.json({ error: "Component name must be at least 2 characters." }, { status: 400 });
    if (!["allowance", "deduction"].includes(type)) return Response.json({ error: "Type must be allowance or deduction." }, { status: 400 });
    if (amount === null || amount === 0) return Response.json({ error: "Amount must be greater than zero." }, { status: 400 });

    try {
        const [result] = await getDb().execute<ResultSetHeader>(
            "INSERT INTO staff_components (staff_id, name, type, amount) VALUES (?, ?, ?, ?)",
            [staffId, name, type, amount]
        );
        await logActivity(user.id, "component_create", `Added ${type} "${name}" to staff #${staffId}`);
        return Response.json({ data: { id: result.insertId, staff_id: staffId, name, type, amount } }, { status: 201 });
    } catch (error) {
        console.error("Create component failed", error);
        return Response.json({ error: "Unable to save the salary component." }, { status: 503 });
    }
}

// DELETE /api/staff/5?a=12  ->  delete the staff member, or one component with ?componentId=12
export async function DELETE(request: Request, context: RouteContext) {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
        return Response.json({ error: "Only an admin can delete records." }, { status: 403 });
    }

    const { id } = await context.params;
    const staffId = intField(id);
    if (!staffId) return Response.json({ error: "Invalid staff id." }, { status: 400 });

    const componentId = intField(new URL(request.url).searchParams.get("componentId"));

    try {
        if (componentId) {
            const [result] = await getDb().execute<ResultSetHeader>(
                "DELETE FROM staff_components WHERE id = ? AND staff_id = ?",
                [componentId, staffId]
            );
            if (result.affectedRows === 0) return Response.json({ error: "Component not found." }, { status: 404 });
            await logActivity(user.id, "component_delete", `Removed component #${componentId} from staff #${staffId}`);
            return Response.json({ data: { id: componentId } });
        }

        const [result] = await getDb().execute<ResultSetHeader>("DELETE FROM staff WHERE id = ?", [staffId]);
        if (result.affectedRows === 0) return Response.json({ error: "Staff member not found." }, { status: 404 });
        await logActivity(user.id, "staff_delete", `Deleted staff record #${staffId}`);
        return Response.json({ data: { id: staffId } });
    } catch (error) {
        console.error("Delete failed", error);
        return Response.json({ error: "Unable to delete the record." }, { status: 503 });
    }
}
