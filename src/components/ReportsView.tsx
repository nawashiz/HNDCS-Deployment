"use client";
import { Alert, Loading, PageHeader, StatCard } from "./Ui";
import { useCallback, useEffect, useState } from "react";
import { BadgeDollarSign, Download, LoaderIcon, RefreshCw, TrendingUp } from "lucide-react";
import { apiGet } from "@/lib/client-api";
import { formatMoney, formatMonth } from "@/lib/payroll";
import type { ReportData } from "@/lib/types";

type ExchangeRate = { base: string; usdRate: number; updatedAt: string };

export default function ReportsView() {
    const [month, setMonth] = useState("");
    const [report, setReport] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [rate, setRate] = useState<ExchangeRate | null>(null);
    const [rateError, setRateError] = useState("");
    const [rateLoading, setRateLoading] = useState(true);

    const load = useCallback(async (selectedMonth: string) => {
        setLoading(true);
        try {
            const query = selectedMonth ? `?month=${selectedMonth}` : "";
            const result = await apiGet<ReportData>(`/api/reports${query}`);
            setReport(result);
            if (!selectedMonth && result.month) setMonth(result.month);
            setError("");
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadRate = useCallback(async () => {
        setRateLoading(true);
        setRateError("");
        try {
            setRate(await apiGet<ExchangeRate>("/api/reports?view=rate"));
        } catch (err) {
            setRateError((err as Error).message);
        } finally {
            setRateLoading(false);
        }
    }, []);

    useEffect(() => {
        load("");
        loadRate();
    }, [load, loadRate]);

    function downloadCsv() {
        if (!report?.departments) return;

        const lines = [
            ["Department", "Staff count", "Gross (LKR)", "Net (LKR)", "EPF employee (LKR)"].join(","),
            ...report.departments.map((row) => [
                `"${row.department_name}"`,
                row.staff_count,
                Number(row.gross).toFixed(2),
                Number(row.net).toFixed(2),
                Number(row.epf_employee).toFixed(2),
            ].join(",")),
            ["TOTAL", report.totals.staff_count, Number(report.totals.gross).toFixed(2), Number(report.totals.net).toFixed(2), Number(report.totals.epf_employee).toFixed(2)].join(","),
        ];

        const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `salary-report-${report.month}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }

    const maxDepartmentNet = Math.max(...(report?.departments.map((row) => Number(row.net)) ?? [1]), 1);

    return (
        <>
            <PageHeader
                title="Reports"
                subtitle="Monthly salary totals by department, with a live currency conversion."
                action={
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            type="month"
                            value={month}
                            onChange={(event) => {
                                setMonth(event.target.value);
                                load(event.target.value);
                            }}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                        />
                        <button
                            onClick={downloadCsv}
                            disabled={!report?.departments?.length}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                        >
                            <Download className="h-4 w-4" /> Export CSV
                        </button>
                    </div>
                }
            />

            {loading ? (
                <Loading label="Loading report..." />
            ) : error ? (
                <Alert type="error" message={error} />
            ) : !report?.totals ? (
                <Alert type="info" message="No salary records found. Generate payroll first." />
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard label="Staff paid" value={String(report.totals.staff_count)} hint={formatMonth(`${report.month}-01`)} icon={TrendingUp} tone="blue" />
                        <StatCard label="Total gross" value={formatMoney(report.totals.gross)} hint={`Allowances ${formatMoney(report.totals.allowances)}`} icon={TrendingUp} tone="purple" />
                        <StatCard label="Total net" value={formatMoney(report.totals.net)} hint={`Deductions ${formatMoney(report.totals.deductions)}`} icon={BadgeDollarSign} tone="green" />
                        <StatCard label="EPF (employee)" value={formatMoney(report.totals.epf_employee)} hint={`Employer EPF ${formatMoney(report.totals.epf_employer)} · ETF ${formatMoney(report.totals.etf)}`} icon={BadgeDollarSign} tone="amber" />
                    </div>

                    <div className="mt-6 grid gap-6 lg:grid-cols-3">
                        <section className="rounded-card border border-slate-200 bg-white p-5 shadow-card lg:col-span-2">
                            <h2 className="text-base font-semibold text-ink">Salary by department</h2>

                            <div className="mt-4 space-y-4">
                                {report.departments.map((row) => (
                                    <div key={row.department_name}>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium text-slate-700">{row.department_name}</span>
                                            <span className="text-slate-500">{formatMoney(row.net)} · {row.staff_count} staff</span>
                                        </div>
                                        <div className="mt-1 h-2.5 w-full rounded-full bg-slate-100">
                                            <div
                                                className="h-2.5 rounded-full bg-brand"
                                                style={{ width: `${Math.max((Number(row.net) / maxDepartmentNet) * 100, 3)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 overflow-x-auto">
                                <table className="w-full min-w-[520px] text-left text-sm">
                                    <thead className="text-xs uppercase tracking-wide text-slate-500">
                                        <tr>
                                            <th className="py-2">Department</th>
                                            <th className="whitespace-nowrap py-2 text-right">Staff</th>
                                            <th className="whitespace-nowrap py-2 text-right">Gross</th>
                                            <th className="whitespace-nowrap py-2 text-right">Net</th>
                                            <th className="whitespace-nowrap py-2 text-right">EPF</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {report.departments.map((row) => (
                                            <tr key={row.department_name}>
                                                <td className="py-2 text-slate-700">{row.department_name}</td>
                                                <td className="whitespace-nowrap py-2 text-right">{row.staff_count}</td>
                                                <td className="whitespace-nowrap py-2 text-right">{formatMoney(row.gross)}</td>
                                                <td className="whitespace-nowrap py-2 text-right font-medium text-ink">{formatMoney(row.net)}</td>
                                                <td className="whitespace-nowrap py-2 text-right">{formatMoney(row.epf_employee)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <div className="space-y-6">
                            {/* external API integration */}
                            <section className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-base font-semibold text-ink">Currency conversion</h2>
                                    <button
                                        onClick={loadRate}
                                        aria-label="Refresh exchange rate"
                                        className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand"
                                    >
                                        {rateLoading ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                    </button>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">Live USD rate from open.er-api.com</p>

                                {rateError ? (
                                    <div className="mt-3"><Alert type="error" message={rateError} /></div>
                                ) : rate ? (
                                    <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">
                                        <p className="text-slate-600">1 USD = <span className="font-semibold text-ink">Rs. {rate.usdRate.toFixed(2)}</span></p>
                                        <p className="mt-2 text-slate-600">Total net payroll in USD:</p>
                                        <p className="text-xl font-bold text-ink">
                                            ${(report.totals.net / rate.usdRate).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                                        </p>
                                        <p className="mt-2 text-[11px] text-slate-400">Updated: {rate.updatedAt}</p>
                                    </div>
                                ) : (
                                    <p className="mt-4 text-sm text-slate-400">Loading rate...</p>
                                )}
                            </section>

                            <section className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
                                <h2 className="text-base font-semibold text-ink">Payment status</h2>
                                <ul className="mt-4 space-y-2 text-sm">
                                    <li className="flex justify-between"><span className="text-slate-600">Draft</span><span className="font-semibold text-amber-600">{report.statusCounts.draft}</span></li>
                                    <li className="flex justify-between"><span className="text-slate-600">Approved</span><span className="font-semibold text-blue-600">{report.statusCounts.approved}</span></li>
                                    <li className="flex justify-between"><span className="text-slate-600">Paid</span><span className="font-semibold text-emerald-600">{report.statusCounts.paid}</span></li>
                                </ul>

                                <h3 className="mt-6 text-sm font-semibold text-ink">Top 5 net salaries</h3>
                                <ol className="mt-2 space-y-1 text-sm text-slate-600">
                                    {report.topEarners.map((row, index) => (
                                        <li key={row.full_name} className="flex justify-between gap-2">
                                            <span className="truncate">{index + 1}. {row.full_name}</span>
                                            <span className="shrink-0 font-medium text-ink">{formatMoney(row.net_salary)}</span>
                                        </li>
                                    ))}
                                </ol>
                            </section>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
