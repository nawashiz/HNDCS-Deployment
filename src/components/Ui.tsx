import { LoaderIcon } from "lucide-react";

// ------------------------------------------------------------------
// Small pieces of UI used by more than one page (one file keeps the
// components folder short).
// ------------------------------------------------------------------

// ---------- Badge : coloured status pill ----------
const BADGE_COLORS: Record<string, string> = {
    draft: "bg-amber-100 text-amber-700 border-amber-200",
    approved: "bg-blue-100 text-blue-700 border-blue-200",
    paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
    active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    inactive: "bg-slate-100 text-slate-600 border-slate-200",
    permanent: "bg-indigo-100 text-indigo-700 border-indigo-200",
    contract: "bg-purple-100 text-purple-700 border-purple-200",
    intern: "bg-sky-100 text-sky-700 border-sky-200",
};

export function Badge({ value }: { value: string }) {
    const style = BADGE_COLORS[value] ?? "bg-slate-100 text-slate-600 border-slate-200";
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${style}`}>
            {value.replace("_", " ")}
        </span>
    );
}

// ---------- Alert : success / error / info message ----------
const ALERT_STYLES: Record<string, string> = {
    error: "border-red-200 bg-red-50 text-red-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
};

export function Alert({ type, message }: { type: "error" | "success" | "info"; message: string }) {
    if (!message) return null;
    return <div role="alert" className={`rounded-xl border px-4 py-3 text-sm font-medium ${ALERT_STYLES[type]}`}>{message}</div>;
}

// ---------- Loading ----------
export function Loading({ label = "Loading..." }: { label?: string }) {
    return (
        <div className="flex items-center justify-center gap-3 rounded-card border border-slate-200 bg-white py-16 text-sm text-slate-500">
            <LoaderIcon className="h-5 w-5 animate-spin text-brand" />
            {label}
        </div>
    );
}

// ---------- EmptyState ----------
export function EmptyState({ title, description, icon: Icon, action }: {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Icon className="h-7 w-7" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

// ---------- PageHeader ----------
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
    return (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h1 className="text-2xl font-bold text-ink">{title}</h1>
                {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}

// ---------- StatCard ----------
const TONES: Record<string, string> = {
    green: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    purple: "bg-purple-100 text-purple-700",
};

export function StatCard({ label, value, hint, icon: Icon, tone = "green" }: {
    label: string;
    value: string;
    hint?: string;
    icon: React.ComponentType<{ className?: string }>;
    tone?: "green" | "blue" | "amber" | "purple";
}) {
    return (
        <div className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="mt-2 break-words text-xl font-bold leading-tight text-ink sm:text-2xl">{value}</p>
                    {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
                </div>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}>
                    <Icon className="h-6 w-6" />
                </span>
            </div>
        </div>
    );
}
