"use client";
import { Alert, Badge, Loading } from "./Ui";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, LoaderIcon, Printer, Wallet } from "lucide-react";
import { apiGet, apiSend } from "@/lib/client-api";
import { formatDate, formatMoney, formatMonth } from "@/lib/payroll";
import type { CurrentUser, SalaryRecordFull } from "@/lib/types";

export default function PayslipView() {
    const params = useParams<{ id: string }>();
    const recordId = Number(params.id);

    const [record, setRecord] = useState<SalaryRecordFull | null>(null);
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [working, setWorking] = useState(false);
    const [payMethod, setPayMethod] = useState("bank_transfer");
    const [reference, setReference] = useState("");

    const load = useCallback(async () => {
        try {
            const [recordData, currentUser] = await Promise.all([
                apiGet<SalaryRecordFull>(`/api/payroll?id=${recordId}`),
                apiGet<CurrentUser>("/api/auth"),
            ]);
            setRecord(recordData);
            setUser(currentUser);
            setError("");
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, [recordId]);

    useEffect(() => {
        load();
    }, [load]);

    async function changeStatus(action: "approve" | "pay") {
        if (!record) return;
        setFeedback(null);
        setWorking(true);
        try {
            await apiSend(`/api/payroll?id=${recordId}`, "PATCH", {
                action,
                payment_method: payMethod,
                reference_no: reference,
            });
            setFeedback({ type: "success", text: action === "approve" ? "Salary approved." : "Salary marked as paid." });
            await load();
        } catch (err) {
            setFeedback({ type: "error", text: (err as Error).message });
        } finally {
            setWorking(false);
        }
    }

    if (loading) return <Loading label="Loading payslip..." />;
    if (error) return <Alert type="error" message={error} />;
    if (!record) return null;

    const earnings = record.details.filter((row) => row.component_type !== "deduction");
    const deductions = record.details.filter((row) => row.component_type === "deduction");
    const isAdmin = user?.role === "admin";

    return (
        <>
            <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
                <Link href={isAdmin ? "/payroll" : "/my-salary"} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand">
                    <ArrowLeft className="h-4 w-4" /> Back
                </Link>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => window.print()}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        <Printer className="h-4 w-4" /> Print payslip
                    </button>
                    {isAdmin && record.status === "draft" && (
                        <button
                            onClick={() => changeStatus("approve")}
                            disabled={working}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                            {working ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Approve
                        </button>
                    )}
                </div>
            </div>

            {feedback && <div className="no-print mb-4"><Alert type={feedback.type} message={feedback.text} /></div>}

            <article className="print-card mx-auto max-w-3xl rounded-card border border-slate-200 bg-white shadow-card">
                <header className="flex flex-col gap-3 border-b border-slate-100 px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white"><Wallet className="h-6 w-6" /></span>
                        <div>
                            <p className="text-lg font-bold text-ink">Upbright Technologies (Pvt) Ltd</p>
                            <p className="text-xs text-slate-500">Staff Salary Management System</p>
                        </div>
                    </div>
                    <div className="text-left sm:text-right">
                        <p className="text-sm font-semibold text-ink">Payslip</p>
                        <p className="text-xs text-slate-500">{formatMonth(record.pay_month)}</p>
                        <div className="mt-1"><Badge value={record.status} /></div>
                    </div>
                </header>

                <section className="grid gap-4 border-b border-slate-100 px-8 py-6 text-sm sm:grid-cols-2">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Employee</p>
                        <p className="mt-1 font-semibold text-ink">{record.full_name}</p>
                        <p className="text-slate-600">{record.staff_code} · {record.designation}</p>
                        <p className="text-slate-600">{record.department_name}</p>
                    </div>
                    <div className="sm:text-right">
                        <p className="text-xs uppercase tracking-wide text-slate-400">Payment details</p>
                        <p className="mt-1 text-slate-600">Basic salary: <span className="font-medium text-ink">{formatMoney(record.basic_salary)}</span></p>
                        {record.paid_date ? (
                            <>
                                <p className="text-slate-600">Paid on: <span className="font-medium text-ink">{formatDate(record.paid_date)}</span></p>
                                <p className="text-slate-600">Method: <span className="font-medium capitalize text-ink">{(record.payment_method ?? "-").replace("_", " ")}</span></p>
                                {record.reference_no && <p className="text-slate-600">Reference: <span className="font-medium text-ink">{record.reference_no}</span></p>}
                            </>
                        ) : (
                            <p className="text-slate-500">Not paid yet</p>
                        )}
                    </div>
                </section>

                <section className="grid gap-6 px-8 py-6 sm:grid-cols-2">
                    <div>
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-700">Earnings</h3>
                        <table className="w-full text-sm">
                            <tbody className="divide-y divide-slate-100">
                                {earnings.map((row) => (
                                    <tr key={row.id}>
                                        <td className="py-2 text-slate-600">{row.component_name}</td>
                                        <td className="py-2 text-right font-medium text-ink">{formatMoney(row.amount)}</td>
                                    </tr>
                                ))}
                                <tr>
                                    <td className="py-2 font-semibold text-ink">Gross salary</td>
                                    <td className="py-2 text-right font-semibold text-ink">{formatMoney(record.gross_salary)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div>
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-red-700">Deductions</h3>
                        <table className="w-full text-sm">
                            <tbody className="divide-y divide-slate-100">
                                {deductions.map((row) => (
                                    <tr key={row.id}>
                                        <td className="py-2 text-slate-600">{row.component_name}</td>
                                        <td className="py-2 text-right font-medium text-ink">{formatMoney(row.amount)}</td>
                                    </tr>
                                ))}
                                <tr>
                                    <td className="py-2 font-semibold text-ink">Total deductions</td>
                                    <td className="py-2 text-right font-semibold text-ink">{formatMoney(record.total_deductions)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="mx-8 mb-8 flex flex-col gap-3 rounded-xl bg-emerald-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-emerald-700">Net salary payable</p>
                        <p className="text-2xl font-bold text-emerald-800">{formatMoney(record.net_salary)}</p>
                    </div>
                    <div className="text-xs text-emerald-800/80">
                        <p>Employer EPF (12%): {formatMoney(record.epf_employer)}</p>
                        <p>Employer ETF (3%): {formatMoney(record.etf)}</p>
                        <p className="mt-1 text-emerald-700">These are paid by the company.</p>
                    </div>
                </section>
            </article>

            {isAdmin && record.status === "approved" && (
                <section className="no-print mx-auto mt-5 max-w-3xl rounded-card border border-slate-200 bg-white p-5 shadow-card">
                    <h3 className="text-sm font-semibold text-ink">Mark as paid</h3>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div>
                            <label htmlFor="pay-method" className="mb-1 block text-xs font-medium text-slate-600">Payment method</label>
                            <select
                                id="pay-method"
                                value={payMethod}
                                onChange={(event) => setPayMethod(event.target.value)}
                                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
                            >
                                <option value="bank_transfer">Bank transfer</option>
                                <option value="cash">Cash</option>
                                <option value="cheque">Cheque</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <label htmlFor="pay-reference" className="mb-1 block text-xs font-medium text-slate-600">Bank reference</label>
                            <input
                                id="pay-reference"
                                value={reference}
                                onChange={(event) => setReference(event.target.value)}
                                placeholder="e.g. PAY-202610-EMP001"
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
                            />
                        </div>
                        <button
                            onClick={() => changeStatus("pay")}
                            disabled={working}
                            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                        >
                            {working ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Confirm payment
                        </button>
                    </div>
                </section>
            )}
        </>
    );
}
