"use client";
import { Alert } from "./Ui";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderIcon, Save } from "lucide-react";
import { apiGet, apiSend } from "@/lib/client-api";
import type { Department, Staff } from "@/lib/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+\-\s()]{7,20}$/;

type FormState = {
    staff_code: string;
    full_name: string;
    email: string;
    phone: string;
    address: string;
    designation: string;
    department_id: string;
    employment_type: string;
    join_date: string;
    basic_salary: string;
    bank_account: string;
    status: string;
};

type Props = {
    mode: "create" | "edit";
    initial?: Staff;
    onSaved?: () => void;
};

function emptyForm(): FormState {
    return {
        staff_code: "",
        full_name: "",
        email: "",
        phone: "",
        address: "",
        designation: "",
        department_id: "",
        employment_type: "permanent",
        join_date: new Date().toISOString().slice(0, 10),
        basic_salary: "",
        bank_account: "",
        status: "active",
    };
}

export default function StaffForm({ mode, initial, onSaved }: Props) {
    const router = useRouter();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        apiGet<Department[]>("/api/departments")
            .then((rows) => {
                setDepartments(rows);
                setForm((current) => ({ ...current, department_id: current.department_id || String(rows[0]?.id ?? "") }));
            })
            .catch((error: Error) => setFeedback({ type: "error", text: error.message }));
    }, []);

    useEffect(() => {
        if (!initial) return;
        setForm({
            staff_code: initial.staff_code,
            full_name: initial.full_name,
            email: initial.email,
            phone: initial.phone,
            address: initial.address ?? "",
            designation: initial.designation,
            department_id: String(initial.department_id),
            employment_type: initial.employment_type,
            join_date: initial.join_date.slice(0, 10),
            basic_salary: String(initial.basic_salary),
            bank_account: initial.bank_account ?? "",
            status: initial.status,
        });
    }, [initial]);

    function update(field: keyof FormState, value: string) {
        setForm((current) => ({ ...current, [field]: value }));
        setErrors((current) => ({ ...current, [field]: "" }));
    }

    // this is the front-end validation, the API validates again
    function validate() {
        const next: Record<string, string> = {};

        if (form.full_name.trim().length < 2) next.full_name = "Enter the staff member's full name.";
        if (!EMAIL_PATTERN.test(form.email.trim())) next.email = "Enter a valid email address.";
        if (!PHONE_PATTERN.test(form.phone.trim())) next.phone = "Enter a valid phone number.";
        if (form.designation.trim().length < 2) next.designation = "Enter the designation.";
        if (!form.department_id) next.department_id = "Select a department.";
        if (!form.join_date) next.join_date = "Select the join date.";
        if (form.basic_salary === "" || Number(form.basic_salary) <= 0) next.basic_salary = "Basic salary must be greater than 0.";
        if (form.staff_code !== "" && !/^[A-Za-z0-9-]{3,20}$/.test(form.staff_code)) {
            next.staff_code = "Use 3-20 letters, numbers or dashes.";
        }

        setErrors(next);
        return Object.keys(next).length === 0;
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFeedback(null);
        if (!validate()) {
            setFeedback({ type: "error", text: "Please fix the highlighted fields." });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...form,
                staff_code: form.staff_code.trim().toUpperCase(),
                department_id: Number(form.department_id),
                basic_salary: Number(form.basic_salary),
            };

            if (mode === "create") {
                const created = await apiSend<{ id: number; staff_code: string }>("/api/staff", "POST", payload);
                router.push(`/staff/${created.id}`);
                return;
            }

            await apiSend(`/api/staff/${initial?.id}`, "PATCH", payload);
            setFeedback({ type: "success", text: "Staff details updated." });
            onSaved?.();
        } catch (error) {
            setFeedback({ type: "error", text: (error as Error).message });
        } finally {
            setSaving(false);
        }
    }

    const inputClass = (field: string) =>
        `w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${errors[field] ? "border-red-400 focus:border-red-500" : "border-slate-300 focus:border-brand"}`;

    return (
        <form onSubmit={handleSubmit} noValidate className="rounded-card border border-slate-200 bg-white p-6 shadow-card">
            <div className="grid gap-4 md:grid-cols-2">
                <div>
                    <label htmlFor="staff_code" className="mb-1 block text-sm font-medium text-slate-700">Staff code</label>
                    <input
                        id="staff_code"
                        value={form.staff_code}
                        onChange={(event) => update("staff_code", event.target.value)}
                        placeholder="Leave empty to auto-generate (EMP011)"
                        className={inputClass("staff_code")}
                    />
                    {errors.staff_code && <p className="mt-1 text-xs text-red-600">{errors.staff_code}</p>}
                </div>

                <div>
                    <label htmlFor="full_name" className="mb-1 block text-sm font-medium text-slate-700">Full name *</label>
                    <input
                        id="full_name"
                        value={form.full_name}
                        onChange={(event) => update("full_name", event.target.value)}
                        placeholder="e.g. Nimal Perera"
                        className={inputClass("full_name")}
                    />
                    {errors.full_name && <p className="mt-1 text-xs text-red-600">{errors.full_name}</p>}
                </div>

                <div>
                    <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">Email *</label>
                    <input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(event) => update("email", event.target.value)}
                        placeholder="name@upbright.lk"
                        className={inputClass("email")}
                    />
                    {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                </div>

                <div>
                    <label htmlFor="phone" className="mb-1 block text-sm font-medium text-slate-700">Phone *</label>
                    <input
                        id="phone"
                        value={form.phone}
                        onChange={(event) => update("phone", event.target.value)}
                        placeholder="07X XXX XXXX"
                        className={inputClass("phone")}
                    />
                    {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                </div>

                <div>
                    <label htmlFor="designation" className="mb-1 block text-sm font-medium text-slate-700">Designation *</label>
                    <input
                        id="designation"
                        value={form.designation}
                        onChange={(event) => update("designation", event.target.value)}
                        placeholder="e.g. Software Engineer"
                        className={inputClass("designation")}
                    />
                    {errors.designation && <p className="mt-1 text-xs text-red-600">{errors.designation}</p>}
                </div>

                <div>
                    <label htmlFor="department_id" className="mb-1 block text-sm font-medium text-slate-700">Department *</label>
                    <select
                        id="department_id"
                        value={form.department_id}
                        onChange={(event) => update("department_id", event.target.value)}
                        className={inputClass("department_id")}
                    >
                        <option value="">Select department</option>
                        {departments.map((department) => (
                            <option key={department.id} value={department.id}>{department.name}</option>
                        ))}
                    </select>
                    {errors.department_id && <p className="mt-1 text-xs text-red-600">{errors.department_id}</p>}
                </div>

                <div>
                    <label htmlFor="employment_type" className="mb-1 block text-sm font-medium text-slate-700">Employment type</label>
                    <select
                        id="employment_type"
                        value={form.employment_type}
                        onChange={(event) => update("employment_type", event.target.value)}
                        className={inputClass("employment_type")}
                    >
                        <option value="permanent">Permanent</option>
                        <option value="contract">Contract</option>
                        <option value="intern">Intern</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="join_date" className="mb-1 block text-sm font-medium text-slate-700">Join date *</label>
                    <input
                        id="join_date"
                        type="date"
                        value={form.join_date}
                        onChange={(event) => update("join_date", event.target.value)}
                        className={inputClass("join_date")}
                    />
                    {errors.join_date && <p className="mt-1 text-xs text-red-600">{errors.join_date}</p>}
                </div>

                <div>
                    <label htmlFor="basic_salary" className="mb-1 block text-sm font-medium text-slate-700">Basic salary (LKR) *</label>
                    <input
                        id="basic_salary"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.basic_salary}
                        onChange={(event) => update("basic_salary", event.target.value)}
                        placeholder="e.g. 75000"
                        className={inputClass("basic_salary")}
                    />
                    {errors.basic_salary && <p className="mt-1 text-xs text-red-600">{errors.basic_salary}</p>}
                </div>

                <div>
                    <label htmlFor="bank_account" className="mb-1 block text-sm font-medium text-slate-700">Bank account</label>
                    <input
                        id="bank_account"
                        value={form.bank_account}
                        onChange={(event) => update("bank_account", event.target.value)}
                        placeholder="Optional"
                        className={inputClass("bank_account")}
                    />
                </div>

                <div className="md:col-span-2">
                    <label htmlFor="address" className="mb-1 block text-sm font-medium text-slate-700">Address</label>
                    <input
                        id="address"
                        value={form.address}
                        onChange={(event) => update("address", event.target.value)}
                        placeholder="Optional"
                        className={inputClass("address")}
                    />
                </div>

                <div>
                    <label htmlFor="status" className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                    <select
                        id="status"
                        value={form.status}
                        onChange={(event) => update("status", event.target.value)}
                        className={inputClass("status")}
                    >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>

            {feedback && <div className="mt-4"><Alert type={feedback.type} message={feedback.text} /></div>}

            <div className="mt-6 flex items-center gap-3">
                <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                >
                    {saving ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {mode === "create" ? "Save staff member" : "Save changes"}
                </button>
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
