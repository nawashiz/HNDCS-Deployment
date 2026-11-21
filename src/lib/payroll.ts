// ------------------------------------------------------------------
// 1. Salary calculation (the main business logic of the system)
// ------------------------------------------------------------------
export const EPF_EMPLOYEE_RATE = 0.08; // 8%  taken from the employee
export const EPF_EMPLOYER_RATE = 0.12; // 12% paid by the company
export const ETF_RATE = 0.03;          // 3%  paid by the company

export function round2(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

export type SalaryCalculation = {
    basicSalary: number;
    totalAllowances: number;
    otherDeductions: number;
    epfEmployee: number;
    epfEmployer: number;
    etf: number;
    grossSalary: number;
    totalDeductions: number;
    netSalary: number;
};

/**
 * gross = basic + allowances
 * EPF (8%) is taken from the basic salary
 * net   = gross - EPF - other deductions
 */
export function calculateSalary(basicSalary: number, allowances: number[], deductions: number[]): SalaryCalculation {
    const basic = round2(basicSalary);
    const totalAllowances = round2(allowances.reduce((sum, value) => sum + value, 0));
    const otherDeductions = round2(deductions.reduce((sum, value) => sum + value, 0));

    const epfEmployee = round2(basic * EPF_EMPLOYEE_RATE);
    const epfEmployer = round2(basic * EPF_EMPLOYER_RATE);
    const etf = round2(basic * ETF_RATE);

    const grossSalary = round2(basic + totalAllowances);
    const totalDeductions = round2(epfEmployee + otherDeductions);

    return {
        basicSalary: basic,
        totalAllowances,
        otherDeductions,
        epfEmployee,
        epfEmployer,
        etf,
        grossSalary,
        totalDeductions,
        netSalary: round2(grossSalary - totalDeductions),
    };
}

// ------------------------------------------------------------------
// 2. Display helpers used by every page
// ------------------------------------------------------------------
const money = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// 125000.5 -> "Rs. 125,000.50"
export function formatMoney(value: number | string | null | undefined) {
    const number = Number(value ?? 0);
    return `Rs. ${money.format(Number.isNaN(number) ? 0 : number)}`;
}

const MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

// "2026-10-01" -> "October 2026"
export function formatMonth(value: string | null | undefined) {
    if (!value) return "-";
    const [year, month] = value.split("-");
    const index = Number(month) - 1;
    if (!MONTHS[index]) return value;
    return `${MONTHS[index]} ${year}`;
}

// "2026-10-01" -> "01 Oct 2026"
export function formatDate(value: string | null | undefined) {
    if (!value) return "-";
    const date = new Date(`${value.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// "2026-11" -> "2026-11-01"  (the value stored in the database)
export function monthToDate(month: string) {
    return `${month}-01`;
}
