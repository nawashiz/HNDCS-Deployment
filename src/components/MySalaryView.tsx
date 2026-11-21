"use client";
import { Alert, Badge, EmptyState, Loading, PageHeader, StatCard } from "./Ui";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Receipt, Wallet } from "lucide-react";
import { apiGet } from "@/lib/client-api";
import { formatDate, formatMoney, formatMonth } from "@/lib/payroll";
import type { SalaryRecord } from "@/lib/types";

type PayrollResponse = { records: SalaryRecord[] };

export default function MySalaryView() {
    const [records, setRecords] = useState<SalaryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        apiGet<PayrollResponse>("/api/payroll?all=1")
            .then((data) => setRecords(data.records))
            .catch((err: Error) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Loading label="Loading your salary records..." />;
    if (error) return <Alert type="error" message={error} />;

    const paid = records.filter((row) => row.status === "paid");
    const totalPaid = paid.reduce((sum, row) => sum + Number(row.net_salary), 0);
    const latest = records[0];

    return (
        <>
            <PageHeader title="My Salary" subtitle="Your monthly payslips and payment status." />

            {records.length === 0 ? (
                <EmptyState
                    title="No salary records yet"
                    description="Your payslips will appear here after the admin generates payroll."
                    icon={Wallet}
                />
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <StatCard
                            label="Latest net salary"
                            value={formatMoney(latest?.net_salary ?? 0)}
                            hint={latest ? formatMonth(latest.pay_month) : "-"}
                            icon={Wallet}
                            tone="green"
                        />
                        <StatCard
                            label="Total received"
                            value={formatMoney(totalPaid)}
                            hint={`${paid.length} paid payslips`}
                            icon={Receipt}
                            tone="blue"
                        />
                        <StatCard
                            label="Pending"
                            value={String(records.filter((row) => row.status !== "paid").length)}
                            hint="Draft or waiting for payment"
                            icon={Receipt}
                            tone="amber"
                        />
                    </div>

                    <div className="mt-6 overflow-x-auto rounded-card border border-slate-200 bg-white shadow-card">
                        <table className="w-full min-w-[640px] text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">Month</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-right">Gross</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-right">Deductions</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-right">Net salary</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Paid date</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-right">Payslip</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {records.map((record) => (
                                    <tr key={record.id} className="hover:bg-slate-50/60">
                                        <td className="px-4 py-3 font-medium text-ink">{formatMonth(record.pay_month)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right">{formatMoney(record.gross_salary)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right text-red-600">-{formatMoney(record.total_deductions)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-emerald-700">{formatMoney(record.net_salary)}</td>
                                        <td className="px-4 py-3"><Badge value={record.status} /></td>
                                        <td className="px-4 py-3 text-slate-500">{formatDate(record.paid_date)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            <Link href={`/payroll/${record.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
                                                View <ArrowRight className="h-3.5 w-3.5" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </>
    );
}
