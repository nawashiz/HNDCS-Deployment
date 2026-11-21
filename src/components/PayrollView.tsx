"use client";
import { Alert, Badge, EmptyState, Loading, PageHeader, StatCard } from "./Ui";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Eye, LoaderIcon, Wallet } from "lucide-react";
import { apiGet, apiSend } from "@/lib/client-api";
import { formatMoney, formatMonth } from "@/lib/payroll";
import type { SalaryRecord } from "@/lib/types";

type PayrollResponse = {
    records: SalaryRecord[];
    summary: { count: number; draft: number; approved: number; paid: number; gross: number; net: number };
    month: string;
};

export default function PayrollView() {
    const [month, setMonth] = useState("");
    const [status, setStatus] = useState("");
    const [data, setData] = useState<PayrollResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState("");
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const load = useCallback(async (selectedMonth: string, selectedStatus: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedMonth) params.set("month", selectedMonth);
            if (selectedStatus) params.set("status", selectedStatus);

            const result = await apiGet<PayrollResponse>(`/api/payroll?${params.toString()}`);
            setData(result);
            if (!selectedMonth && result.month) setMonth(result.month);
            setError("");
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load("", "");
    }, [load]);

    function refresh(nextMonth = month, nextStatus = status) {
        load(nextMonth, nextStatus);
    }

    async function generatePayroll() {
        if (!month) {
            setFeedback({ type: "error", text: "Choose a month first." });
            return;
        }
        setFeedback(null);
        setGenerating(true);
        try {
            const result = await apiSend<{ created: number; skipped: number }>("/api/payroll", "POST", { month });
            setFeedback({
                type: "success",
                text: `Payroll generated for ${formatMonth(`${month}-01`)}: ${result.created} created, ${result.skipped} already existed.`,
            });
            refresh();
        } catch (err) {
            setFeedback({ type: "error", text: (err as Error).message });
        } finally {
            setGenerating(false);
        }
    }

    const summary = data?.summary;

    return (
        <>
            <PageHeader
                title="Payroll"
                subtitle="Generate, check, approve and pay monthly salaries."
            />

            <section className="mb-5 flex flex-col gap-3 rounded-card border border-slate-200 bg-white p-5 shadow-card sm:flex-row sm:items-end">
                <div>
                    <label htmlFor="pay-month" className="mb-1 block text-sm font-medium text-slate-700">Pay month</label>
                    <input
                        id="pay-month"
                        type="month"
                        value={month}
                        onChange={(event) => {
                            setMonth(event.target.value);
                            refresh(event.target.value, status);
                        }}
                        className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand"
                    />
                </div>
                <div>
                    <label htmlFor="pay-status" className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                    <select
                        id="pay-status"
                        value={status}
                        onChange={(event) => {
                            setStatus(event.target.value);
                            refresh(month, event.target.value);
                        }}
                        className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand"
                    >
                        <option value="">All statuses</option>
                        <option value="draft">Draft</option>
                        <option value="approved">Approved</option>
                        <option value="paid">Paid</option>
                    </select>
                </div>
                <div className="sm:ml-auto">
                    <button
                        onClick={generatePayroll}
                        disabled={generating}
                        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60 sm:w-auto"
                    >
                        {generating ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                        Generate payroll
                    </button>
                </div>
            </section>

            {feedback && <div className="mb-5"><Alert type={feedback.type} message={feedback.text} /></div>}
            {error && <div className="mb-5"><Alert type="error" message={error} /></div>}

            {summary && (
                <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Salary records" value={String(summary.count)} hint={formatMonth(`${(data?.month || month)}-01`)} icon={Wallet} tone="blue" />
                    <StatCard label="Total gross" value={formatMoney(summary.gross)} hint="Before deductions" icon={CheckCircle2} tone="purple" />
                    <StatCard label="Total net payable" value={formatMoney(summary.net)} hint="After EPF and deductions" icon={CheckCircle2} tone="green" />
                    <StatCard label="Pending" value={String(summary.draft + summary.approved)} hint={`${summary.draft} draft · ${summary.approved} approved`} icon={Wallet} tone="amber" />
                </div>
            )}

            {loading ? (
                <Loading label="Loading payroll..." />
            ) : !data || data.records.length === 0 ? (
                <EmptyState
                    title="No salary records for this month"
                    description="Click Generate payroll to create salary records for all active staff members."
                    icon={Wallet}
                />
            ) : (
                <div className="overflow-x-auto rounded-card border border-slate-200 bg-white shadow-card">
                    <table className="w-full min-w-[900px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Staff member</th>
                                <th className="px-4 py-3">Department</th>
                                <th className="whitespace-nowrap px-4 py-3 text-right">Basic</th>
                                <th className="whitespace-nowrap px-4 py-3 text-right">Allowances</th>
                                <th className="whitespace-nowrap px-4 py-3 text-right">Deductions</th>
                                <th className="whitespace-nowrap px-4 py-3 text-right">Net salary</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="whitespace-nowrap px-4 py-3 text-right">Payslip</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.records.map((record) => (
                                <tr key={record.id} className="hover:bg-slate-50/60">
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-ink">{record.full_name}</p>
                                        <p className="text-xs text-slate-400">{record.staff_code} · {record.designation}</p>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{record.department_name}</td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right">{formatMoney(record.basic_salary)}</td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right text-emerald-700">{formatMoney(record.total_allowances)}</td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right text-red-600">-{formatMoney(record.total_deductions)}</td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-ink">{formatMoney(record.net_salary)}</td>
                                    <td className="px-4 py-3"><Badge value={record.status} /></td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right">
                                        <Link href={`/payroll/${record.id}`} aria-label={`Open payslip of ${record.full_name}`} className="inline-flex rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-brand">
                                            <Eye className="h-4 w-4" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
