import { redirect } from "next/navigation";
import { Wallet, ShieldCheck, Users, CalendarCheck } from "lucide-react";
import LoginForm from "@/components/LoginForm";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
    const user = await getCurrentUser();
    if (user) redirect(user.role === "admin" ? "/dashboard" : "/my-salary");

    return (
        <main className="flex min-h-screen flex-col lg:flex-row">
            {/* left side - branding */}
            <section className="flex flex-1 flex-col justify-between bg-sidebar px-8 py-10 text-white lg:px-14 lg:py-14">
                <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand">
                        <Wallet className="h-6 w-6" />
                    </span>
                    <div>
                        <p className="text-lg font-bold leading-tight">Upbright Payroll</p>
                        <p className="text-xs text-emerald-200">Staff Salary Management</p>
                    </div>
                </div>

                <div className="my-10 max-w-lg">
                    <h1 className="text-3xl font-bold leading-snug lg:text-4xl">
                        Manage staff salaries in one simple place.
                    </h1>
                    <p className="mt-4 text-sm leading-6 text-emerald-100">
                        Keep staff records, departments and monthly salary payments organised.
                        Generate salaries, check EPF and ETF, approve payments and print payslips
                        without using spreadsheets.
                    </p>

                    <ul className="mt-8 space-y-3 text-sm text-emerald-50">
                        <li className="flex items-center gap-3"><Users className="h-5 w-5 text-emerald-300" /> Staff and department records</li>
                        <li className="flex items-center gap-3"><CalendarCheck className="h-5 w-5 text-emerald-300" /> One-click monthly payroll</li>
                        <li className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-emerald-300" /> Secure login for admin and staff</li>
                    </ul>
                </div>

                <p className="text-xs text-emerald-300">© 2026 Upbright Technologies (Pvt) Ltd</p>
            </section>

            {/* right side - login form */}
            <section className="flex flex-1 items-center justify-center px-6 py-12">
                <div className="w-full max-w-md rounded-card bg-white p-8 shadow-card">
                    <h2 className="text-2xl font-bold text-ink">Welcome back</h2>
                    <p className="mt-1 text-sm text-slate-500">Sign in to continue to your dashboard.</p>

                    <div className="mt-6">
                        <LoginForm />
                    </div>

                    <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-600">
                        <p className="font-semibold text-slate-700">Demo accounts</p>
                        <p className="mt-1">Admin: <span className="font-mono">admin@upbright.lk</span> / <span className="font-mono">Admin@123</span></p>
                        <p>Staff: <span className="font-mono">nimal@upbright.lk</span> / <span className="font-mono">Staff@123</span></p>
                    </div>
                </div>
            </section>
        </main>
    );
}
