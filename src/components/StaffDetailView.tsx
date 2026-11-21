"use client";
import { Alert, Badge, Loading, PageHeader } from "./Ui";
import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, LoaderIcon, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import StaffForm from "./StaffForm";
import { apiGet, apiSend } from "@/lib/client-api";
import { formatDate, formatMoney, formatMonth } from "@/lib/payroll";
import type { SalaryComponent, SalaryRecord, Staff } from "@/lib/types";

type StaffDetail = {
    staff: Staff;
    components: SalaryComponent[];
};

export default function StaffDetailView() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const staffId = Number(params.id);

    const [data, setData] = useState<StaffDetail | null>(null);
    const [history, setHistory] = useState<SalaryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [editing, setEditing] = useState(false);

    // salary component form
    const [componentName, setComponentName] = useState("");
    const [componentType, setComponentType] = useState("allowance");
    const [componentAmount, setComponentAmount] = useState("");
    const [savingComponent, setSavingComponent] = useState(false);

    // login account form
    const [accountName, setAccountName] = useState("");
    const [accountEmail, setAccountEmail] = useState("");
    const [accountPassword, setAccountPassword] = useState("");
    const [creatingAccount, setCreatingAccount] = useState(false);
    const [accountMessage, setAccountMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const load = useCallback(async () => {
        try {
            const detail = await apiGet<StaffDetail>(`/api/staff/${staffId}`);
            setData(detail);
            setAccountName((current) => current || detail.staff.full_name);
            setAccountEmail((current) => current || detail.staff.email);
            const payroll = await apiGet<{ records: SalaryRecord[] }>(`/api/payroll?staffId=${staffId}&all=1`);
            setHistory(payroll.records);
            setError("");
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, [staffId]);

    useEffect(() => {
        load();
    }, [load]);

    if (loading) return <Loading label="Loading staff member..." />;
    if (error) return <Alert type="error" message={error} />;
    if (!data) return null;

    const { staff, components } = data;
    const allowances = components.filter((row) => row.type === "allowance");
    const deductions = components.filter((row) => row.type === "deduction");
    const allowanceTotal = allowances.reduce((sum, row) => sum + Number(row.amount), 0);
    const deductionTotal = deductions.reduce((sum, row) => sum + Number(row.amount), 0);
    const epf = Math.round(Number(staff.basic_salary) * 0.08 * 100) / 100;
    const estimatedNet = Number(staff.basic_salary) + allowanceTotal - deductionTotal - epf;

    async function addComponent(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFeedback(null);

        if (componentName.trim().length < 2) {
            setFeedback({ type: "error", text: "Component name must be at least 2 characters." });
            return;
        }
        if (componentAmount === "" || Number(componentAmount) <= 0) {
            setFeedback({ type: "error", text: "Amount must be greater than zero." });
            return;
        }

        setSavingComponent(true);
        try {
            await apiSend(`/api/staff/${staffId}`, "POST", {
                name: componentName,
                type: componentType,
                amount: Number(componentAmount),
            });
            setComponentName("");
            setComponentAmount("");
            setFeedback({ type: "success", text: "Salary component added." });
            await load();
        } catch (err) {
            setFeedback({ type: "error", text: (err as Error).message });
        } finally {
            setSavingComponent(false);
        }
    }

    async function removeComponent(component: SalaryComponent) {
        if (!window.confirm(`Remove "${component.name}"?`)) return;
        setFeedback(null);
        try {
            await apiSend(`/api/staff/${staffId}?componentId=${component.id}`, "DELETE");
            setFeedback({ type: "success", text: "Salary component removed." });
            await load();
        } catch (err) {
            setFeedback({ type: "error", text: (err as Error).message });
        }
    }

    async function createAccount(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setAccountMessage(null);

        if (accountName.trim().length < 2) {
            setAccountMessage({ type: "error", text: "Enter the account name." });
            return;
        }
        if (accountPassword.length < 8) {
            setAccountMessage({ type: "error", text: "Password must be at least 8 characters and include a number." });
            return;
        }

        setCreatingAccount(true);
        try {
            await apiSend("/api/auth", "PUT", {
                name: accountName,
                email: accountEmail,
                password: accountPassword,
                staffId,
            });
            setAccountPassword("");
            setAccountMessage({ type: "success", text: "Login account created. The staff member can now sign in." });
        } catch (err) {
            setAccountMessage({ type: "error", text: (err as Error).message });
        } finally {
            setCreatingAccount(false);
        }
    }

    async function deleteStaff() {
        if (!window.confirm(`Delete ${staff.full_name}? All salary records of this staff member will also be removed.`)) return;
        try {
            await apiSend(`/api/staff/${staffId}`, "DELETE");
            router.push("/staff");
        } catch (err) {
            setFeedback({ type: "error", text: (err as Error).message });
        }
    }

    return (
        <>
            <div className="mb-4 flex items-center justify-between gap-3">
                <Link href="/staff" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand">
                    <ArrowLeft className="h-4 w-4" /> Back to staff
                </Link>
                <div className="flex gap-2">
                    <button
                        onClick={() => setEditing((value) => !value)}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        <Pencil className="h-4 w-4" /> {editing ? "Close editor" : "Edit details"}
                    </button>
                    <button
                        onClick={deleteStaff}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                    >
                        <Trash2 className="h-4 w-4" /> Delete
                    </button>
                </div>
            </div>

            <PageHeader
                title={staff.full_name}
                subtitle={`${staff.designation} · ${staff.department_name}`}
            />

            {/* profile card */}
            <section className="rounded-card border border-slate-200 bg-white p-6 shadow-card">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-lg font-bold text-white">
                            {staff.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
                        </span>
                        <div>
                            <p className="text-lg font-semibold text-ink">{staff.full_name}</p>
                            <p className="text-sm text-slate-500">{staff.staff_code} · {staff.employment_type} employee</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge value={staff.status} />
                        <Badge value={staff.employment_type} />
                    </div>
                </div>

                <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div><dt className="text-xs uppercase tracking-wide text-slate-400">Email</dt><dd className="mt-1 text-slate-700">{staff.email}</dd></div>
                    <div><dt className="text-xs uppercase tracking-wide text-slate-400">Phone</dt><dd className="mt-1 text-slate-700">{staff.phone}</dd></div>
                    <div><dt className="text-xs uppercase tracking-wide text-slate-400">Joined</dt><dd className="mt-1 text-slate-700">{formatDate(staff.join_date)}</dd></div>
                    <div><dt className="text-xs uppercase tracking-wide text-slate-400">Bank account</dt><dd className="mt-1 text-slate-700">{staff.bank_account ?? "-"}</dd></div>
                    <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wide text-slate-400">Address</dt><dd className="mt-1 text-slate-700">{staff.address ?? "-"}</dd></div>
                    <div><dt className="text-xs uppercase tracking-wide text-slate-400">Basic salary</dt><dd className="mt-1 font-semibold text-ink">{formatMoney(staff.basic_salary)}</dd></div>
                    <div><dt className="text-xs uppercase tracking-wide text-slate-400">Estimated net / month</dt><dd className="mt-1 font-semibold text-emerald-700">{formatMoney(estimatedNet)}</dd></div>
                </dl>
            </section>

            {editing && (
                <div className="mt-6">
                    <h2 className="mb-3 text-base font-semibold text-ink">Edit staff details</h2>
                    <StaffForm mode="edit" initial={staff} onSaved={load} />
                </div>
            )}

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                {/* salary components */}
                <section className="rounded-card border border-slate-200 bg-white p-6 shadow-card lg:col-span-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold text-ink">Salary components</h2>
                        <p className="text-xs text-slate-400">Allowances and deductions added every month</p>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">Allowances</p>
                            <ul className="space-y-2 text-sm">
                                {allowances.length === 0 && <li className="text-slate-400">No allowances.</li>}
                                {allowances.map((component) => (
                                    <li key={component.id} className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2">
                                        <span className="text-slate-700">{component.name}</span>
                                        <span className="flex items-center gap-2 font-medium text-emerald-700">
                                            {formatMoney(component.amount)}
                                            <button aria-label={`Remove ${component.name}`} onClick={() => removeComponent(component)} className="cursor-pointer text-slate-400 hover:text-red-600">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">Deductions</p>
                            <ul className="space-y-2 text-sm">
                                {deductions.length === 0 && <li className="text-slate-400">No deductions.</li>}
                                {deductions.map((component) => (
                                    <li key={component.id} className="flex items-center justify-between rounded-xl bg-red-50 px-3 py-2">
                                        <span className="text-slate-700">{component.name}</span>
                                        <span className="flex items-center gap-2 font-medium text-red-700">
                                            {formatMoney(component.amount)}
                                            <button aria-label={`Remove ${component.name}`} onClick={() => removeComponent(component)} className="cursor-pointer text-slate-400 hover:text-red-600">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <form onSubmit={addComponent} className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row">
                        <input
                            value={componentName}
                            onChange={(event) => setComponentName(event.target.value)}
                            placeholder="Component name"
                            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
                        />
                        <select
                            value={componentType}
                            onChange={(event) => setComponentType(event.target.value)}
                            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
                        >
                            <option value="allowance">Allowance</option>
                            <option value="deduction">Deduction</option>
                        </select>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={componentAmount}
                            onChange={(event) => setComponentAmount(event.target.value)}
                            placeholder="Amount"
                            className="w-32 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
                        />
                        <button
                            type="submit"
                            disabled={savingComponent}
                            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                        >
                            {savingComponent ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
                        </button>
                    </form>

                    {feedback && <div className="mt-4"><Alert type={feedback.type} message={feedback.text} /></div>}
                </section>

                {/* login account */}
                <section className="rounded-card border border-slate-200 bg-white p-6 shadow-card">
                    <div className="flex items-center gap-2">
                        <KeyRound className="h-5 w-5 text-brand" />
                        <h2 className="text-base font-semibold text-ink">Staff login account</h2>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Create a login so this staff member can view their own payslips.</p>

                    <form onSubmit={createAccount} className="mt-4 space-y-3">
                        <input
                            value={accountName}
                            onChange={(event) => setAccountName(event.target.value)}
                            placeholder="Account name"
                            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand"
                        />
                        <input
                            type="email"
                            value={accountEmail}
                            onChange={(event) => setAccountEmail(event.target.value)}
                            placeholder="Email"
                            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand"
                        />
                        <input
                            type="password"
                            value={accountPassword}
                            onChange={(event) => setAccountPassword(event.target.value)}
                            placeholder="Password (min 8 chars, 1 number)"
                            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand"
                        />
                        <button
                            type="submit"
                            disabled={creatingAccount}
                            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                        >
                            {creatingAccount && <LoaderIcon className="h-4 w-4 animate-spin" />} Create login
                        </button>
                    </form>

                    {accountMessage && <div className="mt-3"><Alert type={accountMessage.type} message={accountMessage.text} /></div>}
                </section>
            </div>

            {/* salary history */}
            <section className="mt-6 rounded-card border border-slate-200 bg-white shadow-card">
                <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
                    <Wallet className="h-5 w-5 text-brand" />
                    <h2 className="text-base font-semibold text-ink">Salary history</h2>
                </div>

                {history.length === 0 ? (
                    <p className="px-6 py-8 text-center text-sm text-slate-500">No salary records yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-6 py-3">Month</th>
                                    <th className="whitespace-nowrap px-6 py-3 text-right">Gross</th>
                                    <th className="whitespace-nowrap px-6 py-3 text-right">Deductions</th>
                                    <th className="whitespace-nowrap px-6 py-3 text-right">Net salary</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="whitespace-nowrap px-6 py-3 text-right">Payslip</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {history.map((record) => (
                                    <tr key={record.id} className="hover:bg-slate-50/60">
                                        <td className="px-6 py-3 font-medium text-ink">{formatMonth(record.pay_month)}</td>
                                        <td className="whitespace-nowrap px-6 py-3 text-right">{formatMoney(record.gross_salary)}</td>
                                        <td className="whitespace-nowrap px-6 py-3 text-right text-red-600">-{formatMoney(record.total_deductions)}</td>
                                        <td className="whitespace-nowrap px-6 py-3 text-right font-semibold text-emerald-700">{formatMoney(record.net_salary)}</td>
                                        <td className="px-6 py-3"><Badge value={record.status} /></td>
                                        <td className="whitespace-nowrap px-6 py-3 text-right">
                                            <Link href={`/payroll/${record.id}`} className="text-sm font-medium text-brand hover:underline">View</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </>
    );
}
