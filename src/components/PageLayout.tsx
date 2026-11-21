"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
    BarChart3,
    Building2,
    LayoutDashboard,
    LogOut,
    Menu,
    Receipt,
    Users,
    Wallet,
    X,
} from "lucide-react";
import type { CurrentUser } from "@/lib/types";

type NavItem = {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    adminOnly: boolean;
};

const NAV_ITEMS: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: true },
    { href: "/staff", label: "Staff", icon: Users, adminOnly: true },
    { href: "/departments", label: "Departments", icon: Building2, adminOnly: true },
    { href: "/payroll", label: "Payroll", icon: Wallet, adminOnly: true },
    { href: "/reports", label: "Reports", icon: BarChart3, adminOnly: true },
    { href: "/my-salary", label: "My Salary", icon: Receipt, adminOnly: false },
];

export default function PageLayout({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const items = NAV_ITEMS.filter((item) => (user.role === "admin" ? true : !item.adminOnly));

    async function handleLogout() {
        setLoggingOut(true);
        await fetch("/api/auth", { method: "DELETE" });
        router.replace("/");
        router.refresh();
    }

    const initials = user.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    return (
        <div className="flex min-h-screen flex-col lg:flex-row">
            {/* mobile top bar */}
            <header className="no-print flex items-center justify-between bg-sidebar px-4 py-3 text-white lg:hidden">
                <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand"><Wallet className="h-5 w-5" /></span>
                    <span className="font-bold">Upbright Payroll</span>
                </div>
                <button aria-label="Open menu" onClick={() => setMenuOpen(true)} className="cursor-pointer rounded-lg p-2 hover:bg-sidebar-soft">
                    <Menu className="h-6 w-6" />
                </button>
            </header>

            {/* sidebar */}
            <aside
                className={`no-print fixed inset-y-0 left-0 z-40 w-64 transform bg-sidebar text-white transition-transform duration-200 lg:static lg:translate-x-0 ${
                    menuOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="flex items-center justify-between px-5 py-5">
                    <Link href={user.role === "admin" ? "/dashboard" : "/my-salary"} className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand"><Wallet className="h-5 w-5" /></span>
                        <span>
                            <span className="block text-sm font-bold leading-tight">Upbright Payroll</span>
                            <span className="block text-[11px] text-emerald-300">Salary Management</span>
                        </span>
                    </Link>
                    <button aria-label="Close menu" onClick={() => setMenuOpen(false)} className="cursor-pointer rounded-lg p-1 hover:bg-sidebar-soft lg:hidden">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <nav className="mt-2 space-y-1 px-3">
                    {items.map((item) => {
                        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMenuOpen(false)}
                                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                                    active ? "bg-brand text-white" : "text-emerald-100 hover:bg-sidebar-soft"
                                }`}
                            >
                                <Icon className="h-5 w-5" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-bold">{initials}</span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{user.name}</p>
                            <p className="text-[11px] uppercase tracking-wide text-emerald-300">{user.role}</p>
                        </div>
                        <button
                            aria-label="Log out"
                            title="Log out"
                            onClick={handleLogout}
                            disabled={loggingOut}
                            className="cursor-pointer rounded-lg p-2 text-emerald-200 hover:bg-sidebar-soft hover:text-white"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </aside>

            {menuOpen && (
                <div className="no-print fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMenuOpen(false)} />
            )}

            {/* page content */}
            <div className="flex min-w-0 flex-1 flex-col">
                <header className="no-print sticky top-0 z-20 hidden items-center justify-between border-b border-slate-200 bg-white/90 px-8 py-3 backdrop-blur lg:flex">
                    <p className="text-sm text-slate-500">
                        Staff Salary Management System
                    </p>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-sm font-semibold text-ink">{user.name}</p>
                            <p className="text-[11px] uppercase tracking-wide text-slate-400">{user.role} account</p>
                        </div>
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">{initials}</span>
                    </div>
                </header>

                <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>

                <footer className="no-print border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-400">
                    © 2026 Upbright Technologies (Pvt) Ltd · Staff Salary Management System
                </footer>
            </div>
        </div>
    );
}
