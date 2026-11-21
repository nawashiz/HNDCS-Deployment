export type Role = "admin" | "staff";

export type CurrentUser = {
    id: number;
    name: string;
    email: string;
    role: Role;
    staffId: number | null;
};

export type Department = {
    id: number;
    name: string;
    description: string | null;
    staffCount?: number;
};

export type Staff = {
    id: number;
    staff_code: string;
    full_name: string;
    email: string;
    phone: string;
    address: string | null;
    designation: string;
    department_id: number;
    department_name: string;
    employment_type: "permanent" | "contract" | "intern";
    join_date: string;
    basic_salary: number;
    bank_account: string | null;
    status: "active" | "inactive";
};

export type SalaryComponent = {
    id: number;
    staff_id: number;
    name: string;
    type: "allowance" | "deduction";
    amount: number;
    is_active: number;
};

export type SalaryDetail = {
    id: number;
    component_name: string;
    component_type: "basic" | "allowance" | "deduction";
    amount: number;
};

export type SalaryRecord = {
    id: number;
    staff_id: number;
    pay_month: string;
    basic_salary: number;
    total_allowances: number;
    total_deductions: number;
    epf_employee: number;
    epf_employer: number;
    etf: number;
    gross_salary: number;
    net_salary: number;
    status: "draft" | "approved" | "paid";
    paid_date: string | null;
    payment_method: string | null;
    reference_no: string | null;
    notes: string | null;
    staff_code?: string;
    full_name?: string;
    designation?: string;
    department_name?: string;
};

export type SalaryRecordFull = SalaryRecord & {
    details: SalaryDetail[];
};

export type DashboardStats = {
    staff: { total: number; active: number; inactive: number };
    departments: number;
    month: string;
    payroll: { count: number; draft: number; approved: number; paid: number; gross: number; net: number };
    employerCost: number;
    history: { pay_month: string; net: number }[];
    activity: { id: number; action: string; description: string; created_at: string; user_name: string | null }[];
};

export type DepartmentReport = {
    department_name: string;
    staff_count: number;
    gross: number;
    net: number;
    epf_employee: number;
};

export type ReportData = {
    month: string;
    totals: { staff_count: number; gross: number; net: number; allowances: number; deductions: number; epf_employee: number; epf_employer: number; etf: number };
    statusCounts: { draft: number; approved: number; paid: number };
    departments: DepartmentReport[];
    topEarners: { full_name: string; designation: string; net_salary: number }[];
};
