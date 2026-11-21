"use client";
import { Alert, EmptyState, Loading, PageHeader } from "./Ui";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Building2, LoaderIcon, Pencil, Trash2, X } from "lucide-react";
import { apiGet, apiSend } from "@/lib/client-api";
import type { Department } from "@/lib/types";

export default function DepartmentsView() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            setDepartments(await apiGet<Department[]>("/api/departments"));
            setError("");
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    function resetForm() {
        setName("");
        setDescription("");
        setEditingId(null);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFeedback(null);

        if (name.trim().length < 2) {
            setFeedback({ type: "error", text: "Department name must be at least 2 characters." });
            return;
        }

        setSaving(true);
        try {
            if (editingId) {
                await apiSend(`/api/departments?id=${editingId}`, "PATCH", { name, description });
                setFeedback({ type: "success", text: "Department updated." });
            } else {
                await apiSend("/api/departments", "POST", { name, description });
                setFeedback({ type: "success", text: "Department added." });
            }
            resetForm();
            await load();
        } catch (err) {
            setFeedback({ type: "error", text: (err as Error).message });
        } finally {
            setSaving(false);
        }
    }

    function startEdit(department: Department) {
        setEditingId(department.id);
        setName(department.name);
        setDescription(department.description ?? "");
    }

    async function handleDelete(department: Department) {
        if (!window.confirm(`Delete department "${department.name}"?`)) return;
        setFeedback(null);
        try {
            await apiSend(`/api/departments?id=${department.id}`, "DELETE");
            setFeedback({ type: "success", text: "Department deleted." });
            await load();
        } catch (err) {
            setFeedback({ type: "error", text: (err as Error).message });
        }
    }

    return (
        <>
            <PageHeader title="Departments" subtitle="Groups used to organise staff members." />

            <div className="grid gap-6 lg:grid-cols-3">
                <section className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
                    <h2 className="text-base font-semibold text-ink">{editingId ? "Edit department" : "Add department"}</h2>

                    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                        <div>
                            <label htmlFor="dept-name" className="mb-1 block text-sm font-medium text-slate-700">Name</label>
                            <input
                                id="dept-name"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder="e.g. Finance"
                                maxLength={100}
                                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand"
                            />
                        </div>
                        <div>
                            <label htmlFor="dept-description" className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                            <textarea
                                id="dept-description"
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                rows={3}
                                maxLength={255}
                                placeholder="What does this department do?"
                                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                            >
                                {saving && <LoaderIcon className="h-4 w-4 animate-spin" />}
                                {editingId ? "Save changes" : "Add department"}
                            </button>
                            {editingId && (
                                <button type="button" onClick={resetForm} className="cursor-pointer rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </form>

                    {feedback && <div className="mt-4"><Alert type={feedback.type} message={feedback.text} /></div>}
                </section>

                <section className="lg:col-span-2">
                    {loading ? (
                        <Loading label="Loading departments..." />
                    ) : error ? (
                        <Alert type="error" message={error} />
                    ) : departments.length === 0 ? (
                        <EmptyState
                            title="No departments yet"
                            description="Add your first department using the form on the left."
                            icon={Building2}
                        />
                    ) : (
                        <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-card">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">Department</th>
                                        <th className="hidden px-4 py-3 md:table-cell">Description</th>
                                        <th className="px-4 py-3 text-center">Staff</th>
                                        <th className="whitespace-nowrap px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {departments.map((department) => (
                                        <tr key={department.id} className="hover:bg-slate-50/60">
                                            <td className="px-4 py-3 font-medium text-ink">{department.name}</td>
                                            <td className="hidden px-4 py-3 text-slate-500 md:table-cell">{department.description ?? "-"}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                                                    {department.staffCount ?? 0}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        aria-label={`Edit ${department.name}`}
                                                        onClick={() => startEdit(department)}
                                                        className="cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-brand"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        aria-label={`Delete ${department.name}`}
                                                        onClick={() => handleDelete(department)}
                                                        className="cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}
