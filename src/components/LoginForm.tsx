"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderIcon, Lock, Mail } from "lucide-react";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Feedback = {
    type: "error" | "success";
    text: string;
} | null;

export default function LoginForm() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<Feedback>(null);

    async function handleLogin(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFeedback(null);

        const trimmedEmail = email.trim();

        // front-end validation (the API checks everything again)
        if (trimmedEmail === "") {
            setFeedback({ type: "error", text: "Please enter your email address." });
            return;
        }
        if (!EMAIL_PATTERN.test(trimmedEmail)) {
            setFeedback({ type: "error", text: "Please enter a valid email address." });
            return;
        }
        if (password === "") {
            setFeedback({ type: "error", text: "Please enter your password." });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: trimmedEmail, password }),
            });
            const body = await response.json();

            if (!response.ok) {
                setFeedback({ type: "error", text: body.error ?? "Login failed. Please try again." });
                setLoading(false);
                return;
            }

            setFeedback({ type: "success", text: `Welcome ${body.user.name}! Redirecting...` });
            router.replace(body.user.role === "admin" ? "/dashboard" : "/my-salary");
            router.refresh();
        } catch {
            setFeedback({ type: "error", text: "Cannot reach the server. Please check your connection." });
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleLogin} noValidate className="space-y-4">
            <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">Email address</label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus-within:border-brand">
                    <Mail className="h-5 w-5 text-slate-400" />
                    <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        className="w-full bg-transparent text-sm outline-none"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                    />
                </div>
            </div>

            <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">Password</label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus-within:border-brand">
                    <Lock className="h-5 w-5 text-slate-400" />
                    <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        className="w-full bg-transparent text-sm outline-none"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                    <button
                        type="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((value) => !value)}
                        className="cursor-pointer text-slate-400 hover:text-slate-600"
                    >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
                {loading ? <><LoaderIcon className="h-5 w-5 animate-spin" /> Signing in...</> : "Sign in"}
            </button>

            <p
                role="status"
                className={`min-h-5 text-center text-sm font-semibold ${feedback?.type === "error" ? "text-red-600" : "text-emerald-600"}`}
            >
                {feedback?.text}
            </p>
        </form>
    );
}
