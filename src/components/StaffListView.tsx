"use client";
import { Alert, Badge, EmptyState, Loading, PageHeader } from "./Ui";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Plus, Search, Users } from "lucide-react";
import { apiGet } from "@/lib/client-api";
import { formatMoney } from "@/lib/payroll";
import type { Staff } from "@/lib/types";

export default function StaffListView() {
    const [staff, setStaff] = useState<Staff[]>([]);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        // wait a moment before calling the API (simple debounce for the search box)
        const timer = setTimeout(() => {
            const params = new URLSearchParams();
            if (search.trim() !== "") params.set("search", search.trim());
            if (status !== "") params.set("status", status);

            apiGet<Staff[]>(`/api/staff?${params.toString()}`)
                .then((rows) => {
                    if (!cancelled) {
                        setStaff(rows);
                        setError("");
                    }
                })
                .catch((err: Error) => !cancelled && setError(err.message))
                .finally(() => !cancelled && setLoading(false));
        }, 300);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [search, status]);

    return (
        <>
            <PageHeader
                title="Staff"
                subtitle="All staff members and their basic salary details."
                action={
                    <Link
                        href="/staff/new"
                        className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
                    >
                        <Plus className="h-4 w-4" /> Add staff
                    </Link>
                }
            />

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by name, code or email..."
                        className="w-full bg-transparent text-sm outline-none"
                    />
                </div>
                <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                >
                    <option value="">All statuses</option>
                    <option value="active">Active only</option>
                    <option value="inactive">Inactive only</option>
                </select>
            </div>

            {loading ? (
                <Loading label="Loading staff..." />
            ) : error ? (
                <Alert type="error" message={error} />
            ) : staff.length === 0 ? (
                <EmptyState
                    title="No staff members found"
                    description="Try a different search, or add a new staff member."
                    icon={Users}
                    action={
                        <Link href="/staff/new" className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
                            <Plus className="h-4 w-4" /> Add staff
                        </Link>
                    }
                />
            ) : (
                <div className="overflow-x-auto rounded-card border border-slate-200 bg-white shadow-card">
                    <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Staff member</th>
                                <th className="px-4 py-3">Designation</th>
                                <th className="px-4 py-3">Department</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="whitespace-nowrap px-4 py-3 text-right">Basic salary</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="whitespace-nowrap px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {staff.map((row) => (
                                <tr key={row.id} className="hover:bg-slate-50/60">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                                                {row.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
                                            </span>
                                            <div>
                                                <p className="font-medium text-ink">{row.full_name}</p>
                                                <p className="text-xs text-slate-400">{row.staff_code} · {row.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{row.designation}</td>
                                    <td className="px-4 py-3 text-slate-600">{row.department_name}</td>
                                    <td className="px-4 py-3"><Badge value={row.employment_type} /></td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-ink">{formatMoney(row.basic_salary)}</td>
                                    <td className="px-4 py-3"><Badge value={row.status} /></td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-1">
                                            <Link href={`/staff/${row.id}`} aria-label={`View ${row.full_name}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-brand">
                                                <Eye className="h-4 w-4" />
                                            </Link>
                                            <Link href={`/staff/${row.id}`} aria-label={`Edit ${row.full_name}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-brand">
                                                <Pencil className="h-4 w-4" />
                                            </Link>
                                        </div>
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
