"use client";
import { ReactNode } from "react";

type InputGroupProps = {
    icon: ReactNode;
    type?: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    autoComplete?: string;
    trailing?: ReactNode;
};

// One styled text box with an icon on the left.
export default function InputGroup({ icon, type = "text", placeholder, value, onChange, autoComplete, trailing }: InputGroupProps) {
    return (
        <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus-within:border-brand">
            <span className="text-slate-400">{icon}</span>
            <input
                type={type}
                autoComplete={autoComplete}
                placeholder={placeholder}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full bg-transparent text-sm outline-none"
            />
            {trailing}
        </div>
    );
}
