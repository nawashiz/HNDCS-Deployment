"use client";
import { Alert, Loading, PageHeader, StatCard } from "./Ui";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, TrendingUp, UserPlus, Users, Wallet } from "lucide-react";
import { apiGet } from "@/lib/client-api";
import { formatMoney, formatMonth } from "@/lib/payroll";
import type { DashboardStats } from "@/lib/types";

const ACTION_ICONS: Record<string, string> = {
    login: "🔐",
    logout: "👋",
    staff_create: "👤",
    staff_update: "✏️",
    staff_delete: "🗑️",
    payroll_generate: "📄",
    payroll_approve: "✅",
    payroll_pay: "💸",
    department_create: "🏢",
    department_update: "🏢",
    department_delete: "🗑️",
    component_create: "➕",
    component_delete: "➖",
    user_create: "🔑",
};

export default function DashboardView() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiGet<DashboardStats>("/api/reports?view=dashboard")
            .then(setStats)
            .catch((err: Error) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Loading label="Loading dashboard..." />;
    if (error) return <Alert type="error" message={error} />;
    if (!stats) return null;

    // add 15% headroom so the tallest bar does not touch the top
    const maxNet = Math.max(...stats.history.map((row) => Number(row.net)), 1) * 1.15;
    const pending = stats.payroll.draft + stats.payroll.approved;

    return (
        <>
            <PageHeader
                title="Dashboard"
                subtitle="A quick look at staff, departments and the latest payroll."
                action={
                    <Link
                        href="/payroll"
                        className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
                    >
                        <Wallet className="h-4 w-4" /> Go to payroll
                    </Link>
                }
            />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Total staff"
                    value={String(stats.staff.total)}
                    hint={`${stats.staff.active} active · ${stats.staff.inactive} inactive`}
                    icon={Users}
                    tone="green"
                />
                <StatCard
                    label="Departments"
                    value={String(stats.departments)}
                    hint="Across the company"
                    icon={Building2}
                    tone="blue"
                />
                <StatCard
                    label={`Net payroll · ${formatMonth(stats.month)}`}
                    value={formatMoney(stats.payroll.net)}
                    hint={`Gross ${formatMoney(stats.payroll.gross)}`}
                    icon={TrendingUp}
                    tone="purple"
                />
                <StatCard
                    label="Awaiting payment"
                    value={String(pending)}
                    hint={`${stats.payroll.draft} draft · ${stats.payroll.approved} approved`}
                    icon={Wallet}
                    tone="amber"
                />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                {/* simple bar chart, no chart library needed */}
                <section className="rounded-card border border-slate-200 bg-white p-5 shadow-card lg:col-span-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold text-ink">Net salary paid by month</h2>
                        <span className="text-xs text-slate-400">Last {stats.history.length} months</span>
                    </div>

                    {stats.history.length === 0 ? (
                        <p className="mt-10 text-center text-sm text-slate-500">No salary records yet.</p>
                    ) : (
                        <div className="mt-6 flex h-56 items-end gap-3">
                            {stats.history.map((row) => (
                                <div key={row.pay_month} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                                    <span className="text-[11px] font-medium text-slate-500">
                                        {formatMoney(row.net).replace("Rs. ", "")}
                                    </span>
                                    <div
                                        className="w-full rounded-t-lg bg-brand/80 transition-all hover:bg-brand"
                                        style={{ height: `${Math.max((Number(row.net) / maxNet) * 100, 6)}%` }}
                                        title={formatMoney(row.net)}
                                    />
                                    <span className="text-xs text-slate-500">{formatMonth(row.pay_month).slice(0, 3)} {row.pay_month.slice(0, 4)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
                    <h2 className="text-base font-semibold text-ink">Recent activity</h2>
                    <ul className="mt-4 space-y-3">
                        {stats.activity.length === 0 && <li className="text-sm text-slate-500">No activity yet.</li>}
                        {stats.activity.map((log) => (
                            <li key={log.id} className="flex gap-3 text-sm">
                                <span className="text-lg leading-none">{ACTION_ICONS[log.action] ?? "•"}</span>
                                <div className="min-w-0">
                                    <p className="text-slate-700">{log.description}</p>
                                    <p className="text-xs text-slate-400">
                                        {log.user_name ?? "System"} · {formatMonth(log.created_at.slice(0, 10))}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>

            <section className="mt-6 grid gap-4 sm:grid-cols-3">
                <Link href="/staff/new" className="flex items-center gap-3 rounded-card border border-slate-200 bg-white p-4 shadow-card transition hover:border-brand">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><UserPlus className="h-5 w-5" /></span>
                    <span>
                        <span className="block text-sm font-semibold text-ink">Add a staff member</span>
                        <span className="block text-xs text-slate-500">Create a new staff record</span>
                    </span>
                </Link>
                <Link href="/payroll" className="flex items-center gap-3 rounded-card border border-slate-200 bg-white p-4 shadow-card transition hover:border-brand">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><Wallet className="h-5 w-5" /></span>
                    <span>
                        <span className="block text-sm font-semibold text-ink">Generate payroll</span>
                        <span className="block text-xs text-slate-500">Create this month&apos;s salaries</span>
                    </span>
                </Link>
                <Link href="/reports" className="flex items-center gap-3 rounded-card border border-slate-200 bg-white p-4 shadow-card transition hover:border-brand">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700"><TrendingUp className="h-5 w-5" /></span>
                    <span>
                        <span className="block text-sm font-semibold text-ink">Monthly report</span>
                        <span className="block text-xs text-slate-500">Totals by department</span>
                    </span>
                </Link>
            </section>
        </>
    );
}
