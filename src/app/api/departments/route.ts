import { getDb } from "@/lib/mysql";
import { getCurrentUser, logActivity } from "@/lib/auth";
import { intField, textField } from "@/lib/validate";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export const runtime = "nodejs";

// GET /api/departments  ->  list with the number of staff in each
export async function GET() {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "You must be logged in." }, { status: 401 });

    try {
        const [rows] = await getDb().execute<RowDataPacket[]>(
            `SELECT d.id, d.name, d.description, COUNT(s.id) AS staffCount
             FROM departments d
             LEFT JOIN staff s ON s.department_id = d.id
             GROUP BY d.id, d.name, d.description
             ORDER BY d.name`
        );
        return Response.json({ data: rows });
    } catch (error) {
        console.error("Load departments failed", error);
        return Response.json({ error: "Unable to load departments." }, { status: 503 });
    }
}

// POST /api/departments  ->  add
export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
        return Response.json({ error: "Only an admin can add departments." }, { status: 403 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }

    const value = body as Record<string, unknown> | null;
    const name = textField(value?.name, 100);
    const description = textField(value?.description, 255);
    if (name.length < 2) return Response.json({ error: "Department name must be at least 2 characters." }, { status: 400 });

    try {
        const [result] = await getDb().execute<ResultSetHeader>(
            "INSERT INTO departments (name, description) VALUES (?, ?)",
            [name, description || null]
        );
        await logActivity(user.id, "department_create", `Added department ${name}`);
        return Response.json({ data: { id: result.insertId, name, description } }, { status: 201 });
    } catch (error) {
        if (typeof error === "object" && error && "code" in error && error.code === "ER_DUP_ENTRY") {
            return Response.json({ error: "A department with that name already exists." }, { status: 409 });
        }
        console.error("Create department failed", error);
        return Response.json({ error: "Unable to save the department." }, { status: 503 });
    }
}

// PATCH /api/departments?id=2  ->  update
export async function PATCH(request: Request) {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
        return Response.json({ error: "Only an admin can update departments." }, { status: 403 });
    }

    const departmentId = intField(new URL(request.url).searchParams.get("id"));
    if (!departmentId) return Response.json({ error: "Invalid department id." }, { status: 400 });

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }

    const value = body as Record<string, unknown> | null;
    const name = textField(value?.name, 100);
    const description = textField(value?.description, 255);
    if (name.length < 2) return Response.json({ error: "Department name must be at least 2 characters." }, { status: 400 });

    try {
        const [result] = await getDb().execute<ResultSetHeader>(
            "UPDATE departments SET name = ?, description = ? WHERE id = ?",
            [name, description || null, departmentId]
        );
        if (result.affectedRows === 0) return Response.json({ error: "Department not found." }, { status: 404 });
        await logActivity(user.id, "department_update", `Updated department ${name}`);
        return Response.json({ data: { id: departmentId, name, description } });
    } catch (error) {
        if (typeof error === "object" && error && "code" in error && error.code === "ER_DUP_ENTRY") {
            return Response.json({ error: "A department with that name already exists." }, { status: 409 });
        }
        console.error("Update department failed", error);
        return Response.json({ error: "Unable to update the department." }, { status: 503 });
    }
}

// DELETE /api/departments?id=2
export async function DELETE(request: Request) {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
        return Response.json({ error: "Only an admin can delete departments." }, { status: 403 });
    }

    const departmentId = intField(new URL(request.url).searchParams.get("id"));
    if (!departmentId) return Response.json({ error: "Invalid department id." }, { status: 400 });

    try {
        const [result] = await getDb().execute<ResultSetHeader>("DELETE FROM departments WHERE id = ?", [departmentId]);
        if (result.affectedRows === 0) return Response.json({ error: "Department not found." }, { status: 404 });
        await logActivity(user.id, "department_delete", `Deleted department #${departmentId}`);
        return Response.json({ data: { id: departmentId } });
    } catch (error) {
        // the foreign key stops us deleting a department that still has staff
        if (typeof error === "object" && error && "code" in error && error.code === "ER_ROW_IS_REFERENCED_2") {
            return Response.json({ error: "This department still has staff members, move them first." }, { status: 409 });
        }
        console.error("Delete department failed", error);
        return Response.json({ error: "Unable to delete the department." }, { status: 503 });
    }
}
