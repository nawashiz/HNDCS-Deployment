import { redirect } from "next/navigation";
import { RowDataPacket } from "mysql2";
import { getDb } from "@/lib/mysql";
import { getSession } from "@/lib/user-auth";
import type { CurrentUser } from "@/lib/types";

// Read the logged in user from the session cookie and the database.
export async function getCurrentUser(): Promise<CurrentUser | null> {
    const session = await getSession();
    if (!session) return null;

    const [rows] = await getDb().execute<(RowDataPacket & {
        id: number;
        name: string;
        email: string;
        role: "admin" | "staff";
        staff_id: number | null;
    })[]>("SELECT id, name, email, role, staff_id FROM users WHERE id = ? LIMIT 1", [session.id]);

    const user = rows[0];
    if (!user) return null;

    return { id: user.id, name: user.name, email: user.email, role: user.role, staffId: user.staff_id };
}

// Used inside pages. Sends the browser to the login page when there is no session.
export async function requireUser(): Promise<CurrentUser> {
    const user = await getCurrentUser();
    if (!user) redirect("/");
    return user;
}

// Admin only pages. A staff user is sent to their own salary page.
export async function requireAdmin(): Promise<CurrentUser> {
    const user = await requireUser();
    if (user.role !== "admin") redirect("/my-salary");
    return user;
}

// Small audit trail used on the dashboard.
export async function logActivity(userId: number | null, action: string, description: string) {
    try {
        await getDb().execute(
            "INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)",
            [userId, action, description.slice(0, 255)]
        );
    } catch (error) {
        console.error("Activity log failed:", error);
    }
}
