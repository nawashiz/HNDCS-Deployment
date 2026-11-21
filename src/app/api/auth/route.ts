import { getDb } from "@/lib/mysql";
import { createSession, clearSessionCookie, sessionCookie, hashPassword, verifyPassword, getSession } from "@/lib/user-auth";
import { getCurrentUser, logActivity } from "@/lib/auth";
import { intField, isEmail, isStrongPassword, textField } from "@/lib/validate";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export const runtime = "nodejs";

type UserRow = RowDataPacket & {
    id: number;
    name: string;
    email: string;
    password_hash: string;
    role: "admin" | "staff";
    staff_id: number | null;
    staff_status: "active" | "inactive" | null;
};

// GET /api/auth  ->  who am I?
export async function GET() {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Not logged in." }, { status: 401 });
    return Response.json({ data: user });
}

// POST /api/auth  ->  sign in
export async function POST(request: Request) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }

    const value = body as Record<string, unknown> | null;
    const email = typeof value?.email === "string" ? value.email.trim().toLowerCase() : "";
    const password = typeof value?.password === "string" ? value.password : "";

    if (!isEmail(email)) return Response.json({ error: "Provide a valid email address." }, { status: 400 });
    if (password === "") return Response.json({ error: "Password is required." }, { status: 400 });

    try {
        const [rows] = await getDb().execute<UserRow[]>(
            `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.staff_id, s.status AS staff_status
             FROM users u
             LEFT JOIN staff s ON s.id = u.staff_id
             WHERE u.email = ? LIMIT 1`,
            [email]
        );
        const user = rows[0];

        // the same message for "no user" and "wrong password"
        if (!user || !verifyPassword(password, user.password_hash)) {
            return Response.json({ error: "Invalid email or password." }, { status: 401 });
        }
        if (user.staff_status === "inactive") {
            return Response.json({ error: "This staff account is inactive. Please contact the administrator." }, { status: 403 });
        }

        const response = Response.json({
            user: { id: user.id, name: user.name, email: user.email, role: user.role, staffId: user.staff_id },
        });
        response.headers.append("Set-Cookie", sessionCookie(createSession({ id: user.id, role: user.role })));
        await logActivity(user.id, "login", `${user.name} signed in to the system`);
        return response;
    } catch (error) {
        console.error("Login failed", error);
        return Response.json({ error: "Unable to sign in. Check the MySQL connection and schema." }, { status: 503 });
    }
}

// PUT /api/auth  ->  create a login account for a staff member (admin only)
export async function PUT(request: Request) {
    const currentUser = await getCurrentUser();
    if (!currentUser) return Response.json({ error: "You must be logged in." }, { status: 401 });
    if (currentUser.role !== "admin") return Response.json({ error: "Only an admin can create accounts." }, { status: 403 });

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }

    const value = body as Record<string, unknown> | null;
    const name = textField(value?.name, 120);
    const email = textField(value?.email, 254).toLowerCase();
    const password = typeof value?.password === "string" ? value.password : "";
    const staffId = value?.staffId === null || value?.staffId === undefined ? null : intField(value?.staffId);

    if (name.length < 2) return Response.json({ error: "Name must be at least 2 characters." }, { status: 400 });
    if (!isEmail(email)) return Response.json({ error: "Provide a valid email address." }, { status: 400 });
    if (!isStrongPassword(password)) {
        return Response.json({ error: "Password must be 8-72 characters and include a letter and a number." }, { status: 400 });
    }

    try {
        const [result] = await getDb().execute<ResultSetHeader>(
            "INSERT INTO users (name, email, password_hash, role, staff_id) VALUES (?, ?, ?, 'staff', ?)",
            [name, email, hashPassword(password), staffId]
        );
        await logActivity(currentUser.id, "user_create", `Created a login account for ${email}`);
        return Response.json({ data: { id: result.insertId, name, email } }, { status: 201 });
    } catch (error) {
        if (typeof error === "object" && error && "code" in error && error.code === "ER_DUP_ENTRY") {
            return Response.json({ error: "An account with that email already exists." }, { status: 409 });
        }
        console.error("Signup failed", error);
        return Response.json({ error: "Unable to create the account." }, { status: 503 });
    }
}

// DELETE /api/auth  ->  sign out
export async function DELETE() {
    const session = await getSession();
    if (session) {
        try {
            const [rows] = await getDb().execute<(RowDataPacket & { name: string })[]>(
                "SELECT name FROM users WHERE id = ? LIMIT 1",
                [session.id]
            );
            if (rows[0]) await logActivity(session.id, "logout", `${rows[0].name} signed out`);
        } catch (error) {
            console.error("Logout log failed", error);
        }
    }

    const response = Response.json({ message: "Logged out successfully." });
    response.headers.append("Set-Cookie", clearSessionCookie());
    return response;
}
