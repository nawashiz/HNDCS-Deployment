// Tiny helpers that convert unknown JSON values into safe values.
export function textField(value: unknown, maxLength: number) {
    if (typeof value !== "string") return "";
    return value.trim().slice(0, maxLength);
}

export function numberField(value: unknown) {
    const number = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(number) || number < 0) return null;
    return Math.round(number * 100) / 100;
}

export function intField(value: unknown) {
    const number = typeof value === "number" ? value : Number(value);
    if (!Number.isInteger(number) || number <= 0) return null;
    return number;
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_PATTERN = /^[0-9+\-\s()]{7,20}$/;
const CODE_PATTERN = /^[A-Z0-9-]{3,20}$/;

export function isEmail(value: string) {
    return value.length <= 254 && EMAIL_PATTERN.test(value);
}

export function isMonth(value: string) {
    return MONTH_PATTERN.test(value);
}

export function isDate(value: string) {
    if (!DATE_PATTERN.test(value)) return false;
    const date = new Date(`${value}T00:00:00`);
    return !Number.isNaN(date.getTime());
}

// at least 8 characters, one letter and one number
export function isStrongPassword(value: string) {
    return value.length >= 8 && value.length <= 72 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export type StaffPayload = {
    staff_code: string;
    full_name: string;
    email: string;
    phone: string;
    address: string | null;
    designation: string;
    department_id: number;
    employment_type: "permanent" | "contract" | "intern";
    join_date: string;
    basic_salary: number;
    bank_account: string | null;
    status: "active" | "inactive";
};

/**
 * Checks the staff form data on the server.
 * Returns { value } when everything is fine, or { error } with a friendly message.
 */
export function parseStaffPayload(body: unknown): { value: StaffPayload } | { error: string } {
    const input = body as Record<string, unknown> | null;

    const staff_code = textField(input?.staff_code, 20).toUpperCase();
    const full_name = textField(input?.full_name, 120);
    const email = textField(input?.email, 254).toLowerCase();
    const phone = textField(input?.phone, 20);
    const address = textField(input?.address, 255);
    const designation = textField(input?.designation, 100);
    const department_id = intField(input?.department_id);
    const employment_type = textField(input?.employment_type, 20).toLowerCase();
    const join_date = textField(input?.join_date, 10);
    const basic_salary = numberField(input?.basic_salary);
    const bank_account = textField(input?.bank_account, 30);
    const status = textField(input?.status, 10).toLowerCase() || "active";

    if (staff_code !== "" && !CODE_PATTERN.test(staff_code)) {
        return { error: "Staff code can only use letters, numbers and dashes (3-20 characters)." };
    }
    if (full_name.length < 2) return { error: "Full name must be at least 2 characters." };
    if (!isEmail(email)) return { error: "Provide a valid email address." };
    if (!PHONE_PATTERN.test(phone)) return { error: "Provide a valid phone number (7-20 digits)." };
    if (designation.length < 2) return { error: "Designation must be at least 2 characters." };
    if (!department_id) return { error: "Please select a department." };
    if (!["permanent", "contract", "intern"].includes(employment_type)) return { error: "Select a valid employment type." };
    if (!isDate(join_date)) return { error: "Provide a valid join date (YYYY-MM-DD)." };
    if (basic_salary === null || basic_salary > 99999999.99) return { error: "Basic salary must be a positive amount." };
    if (!["active", "inactive"].includes(status)) return { error: "Select a valid staff status." };

    return {
        value: {
            staff_code, full_name, email, phone, address: address || null, designation,
            department_id,
            employment_type: employment_type as StaffPayload["employment_type"],
            join_date, basic_salary, bank_account: bank_account || null,
            status: status as StaffPayload["status"],
        },
    };
}
