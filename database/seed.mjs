/**
 * Seed script for the Staff Salary Management System.
 * Run:  npm run seed
 *
 * What it does:
 *   1. reads database/schema.sql and creates the tables
 *   2. removes old demo data
 *   3. inserts departments, staff, login accounts, salary components
 *      and salary records for the last few months
 */
import fs from "node:fs";
import path from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import mysql from "mysql2/promise";

// --- read the .env.local file without any extra library -----------
function loadEnvFile(file) {
    if (!fs.existsSync(file)) return {};
    const env = {};
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const index = trimmed.indexOf("=");
        if (index === -1) continue;
        env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
    }
    return env;
}

const fileEnv = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local") };
const env = (key, fallback) => process.env[key] ?? fileEnv[key] ?? fallback;

const DB_NAME = env("DB_NAME", "staff_salary_db");
const connection = await mysql.createConnection({
    host: env("DB_HOST", "127.0.0.1"),
    port: Number(env("DB_PORT", "3306")),
    user: env("DB_USER", "root"),
    password: env("DB_PASSWORD", ""),
    multipleStatements: true,
});

// --- helpers ------------------------------------------------------
function hashPassword(password) {
    const salt = randomBytes(16).toString("hex");
    return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

function calculate(basic, allowances, deductions) {
    const epfEmployee = round2(basic * 0.08);
    const epfEmployer = round2(basic * 0.12);
    const etf = round2(basic * 0.03);
    const gross = round2(basic + allowances.reduce((s, v) => s + v, 0));
    const totalDeductions = round2(epfEmployee + deductions.reduce((s, v) => s + v, 0));
    return {
        epfEmployee,
        epfEmployer,
        etf,
        gross,
        totalDeductions,
        net: round2(gross - totalDeductions),
    };
}

// --- 1. create the tables ----------------------------------------
const schema = fs.readFileSync(path.join("database", "schema.sql"), "utf8");
await connection.query(schema);
await connection.query(`USE \`${DB_NAME}\``);
console.log("Schema created.");

// --- 2. clear old data -------------------------------------------
await connection.query("SET FOREIGN_KEY_CHECKS = 0");
for (const table of ["salary_details", "salary_records", "staff_components", "activity_logs", "users", "staff", "departments"]) {
    await connection.query(`TRUNCATE TABLE \`${table}\``);
}
await connection.query("SET FOREIGN_KEY_CHECKS = 1");
console.log("Old data removed.");

// --- 3. departments ----------------------------------------------
const departments = [
    ["Human Resources", "Recruitment, training and staff welfare"],
    ["Information Technology", "Software development and IT support"],
    ["Finance", "Accounting, payroll and budgeting"],
    ["Operations", "Daily business operations and logistics"],
];
for (const [name, description] of departments) {
    await connection.execute("INSERT INTO departments (name, description) VALUES (?, ?)", [name, description]);
}
console.log("Departments inserted:", departments.length);

// --- 4. staff -----------------------------------------------------
// [code, name, email, phone, address, designation, deptId, type, joinDate, basic]
const staff = [
    ["EMP001", "Nimal Perera", "nimal@upbright.lk", "0771234501", "12 Temple Road, Negombo", "Software Engineer", 2, "permanent", "2021-03-15", 95000],
    ["EMP002", "Kavindi Silva", "kavindi@upbright.lk", "0771234502", "45 Lake Drive, Colombo", "HR Executive", 1, "permanent", "2022-06-01", 78000],
    ["EMP003", "Ruwan Fernando", "ruwan@upbright.lk", "0771234503", "8 Church Street, Gampaha", "Accountant", 3, "permanent", "2020-01-20", 88000],
    ["EMP004", "Sanduni Jayasuriya", "sanduni@upbright.lk", "0771234504", "23 Beach Road, Mount Lavinia", "UI/UX Designer", 2, "permanent", "2023-02-10", 82000],
    ["EMP005", "Kasun Bandara", "kasun@upbright.lk", "0771234505", "67 Flower Lane, Kandy", "Operations Manager", 4, "permanent", "2019-09-05", 110000],
    ["EMP006", "Dilini Wickramasinghe", "dilini@upbright.lk", "0771234506", "31 Station Road, Ja-Ela", "Payroll Assistant", 3, "contract", "2024-04-01", 60000],
    ["EMP007", "Chamara Gunasekara", "chamara@upbright.lk", "0771234507", "90 Green Path, Kurunegala", "Network Administrator", 2, "permanent", "2022-11-14", 85000],
    ["EMP008", "Achini Rathnayake", "achini@upbright.lk", "0771234508", "14 Hill Street, Matara", "Recruitment Officer", 1, "permanent", "2023-07-24", 68000],
    ["EMP009", "Tharindu Senanayake", "tharindu@upbright.lk", "0771234509", "5 Park Avenue, Negombo", "Intern Software Developer", 2, "intern", "2026-01-12", 35000],
    ["EMP010", "Fathima Nazeer", "fathima@upbright.lk", "0771234510", "72 Market Street, Colombo", "Account Assistant", 3, "contract", "2025-05-19", 55000],
];

const staffIds = [];
for (const [code, name, email, phone, address, designation, deptId, type, joinDate, basic] of staff) {
    const [result] = await connection.execute(
        `INSERT INTO staff (staff_code, full_name, email, phone, address, designation, department_id,
            employment_type, join_date, basic_salary, bank_account, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [code, name, email, phone, address, designation, deptId, type, joinDate, basic, `1002${Math.floor(100000 + Math.random() * 899999)}`]
    );
    staffIds.push(result.insertId);
}
console.log("Staff inserted:", staffIds.length);

// --- 5. login accounts -------------------------------------------
const users = [
    ["Siva Sivananthan", "admin@upbright.lk", hashPassword("Admin@123"), "admin", null],
    ["Kavindi Silva", "kavindi@upbright.lk", hashPassword("Hr@12345"), "admin", staffIds[1]],
    ["Nimal Perera", "nimal@upbright.lk", hashPassword("Staff@123"), "staff", staffIds[0]],
    ["Dilini Wickramasinghe", "dilini@upbright.lk", hashPassword("Staff@123"), "staff", staffIds[5]],
];
for (const [name, email, hash, role, staffId] of users) {
    await connection.execute(
        "INSERT INTO users (name, email, password_hash, role, staff_id) VALUES (?, ?, ?, ?, ?)",
        [name, email, hash, role, staffId]
    );
}
console.log("Users inserted:", users.length);

// --- 6. salary components ----------------------------------------
// [staffIndex, name, type, amount]
const components = [
    [0, "Housing Allowance", "allowance", 15000],
    [0, "Transport Allowance", "allowance", 8000],
    [0, "Staff Loan", "deduction", 5000],
    [1, "Housing Allowance", "allowance", 12000],
    [1, "Welfare Fund", "deduction", 1000],
    [2, "Housing Allowance", "allowance", 14000],
    [2, "Medical Allowance", "allowance", 5000],
    [2, "Staff Loan", "deduction", 7500],
    [3, "Transport Allowance", "allowance", 8000],
    [3, "Welfare Fund", "deduction", 1000],
    [4, "Housing Allowance", "allowance", 18000],
    [4, "Fuel Allowance", "allowance", 12000],
    [4, "Staff Loan", "deduction", 10000],
    [5, "Transport Allowance", "allowance", 6000],
    [5, "Welfare Fund", "deduction", 1000],
    [6, "Housing Allowance", "allowance", 13000],
    [6, "On-call Allowance", "allowance", 6000],
    [7, "Transport Allowance", "allowance", 7000],
    [8, "Transport Allowance", "allowance", 5000],
    [9, "Transport Allowance", "allowance", 6000],
    [9, "Insurance", "deduction", 2500],
];
for (const [index, name, type, amount] of components) {
    await connection.execute(
        "INSERT INTO staff_components (staff_id, name, type, amount) VALUES (?, ?, ?, ?)",
        [staffIds[index], name, type, amount]
    );
}
console.log("Salary components inserted:", components.length);

// --- 7. salary records (last few months) -------------------------
const months = [
    { value: "2026-06-01", status: "paid", paidDate: "2026-06-30" },
    { value: "2026-07-01", status: "paid", paidDate: "2026-07-30" },
    { value: "2026-08-01", status: "paid", paidDate: "2026-08-29" },
    { value: "2026-09-01", status: "paid", paidDate: "2026-09-30" },
    { value: "2026-10-01", status: "mixed", paidDate: null },
];

let recordCount = 0;
for (const month of months) {
    for (let index = 0; index < staff.length; index++) {
        const [code, , , , , , , , , basic] = staff[index];
        const own = components.filter((row) => row[0] === index);
        const allowances = own.filter((row) => row[2] === "allowance");
        const deductions = own.filter((row) => row[2] === "deduction");

        const calc = calculate(basic, allowances.map((row) => row[3]), deductions.map((row) => row[3]));

        // October is left partly finished so the admin can still approve / pay it
        let status = month.status;
        let paidDate = month.paidDate;
        if (status === "mixed") {
            if (index < 7) {
                status = "approved";
                paidDate = null;
            } else {
                status = "draft";
                paidDate = null;
            }
        }

        const method = status === "paid" ? "bank_transfer" : null;
        const reference = status === "paid" ? `PAY-${month.value.slice(0, 7).replace("-", "")}-${code}` : null;

        const [result] = await connection.execute(
            `INSERT INTO salary_records (staff_id, pay_month, basic_salary, total_allowances, total_deductions,
                epf_employee, epf_employer, etf, gross_salary, net_salary, status, paid_date, payment_method,
                reference_no, generated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [staffIds[index], month.value, basic, round2(allowances.reduce((s, r) => s + r[3], 0)),
                calc.totalDeductions, calc.epfEmployee, calc.epfEmployer, calc.etf, calc.gross, calc.net,
                status, paidDate, method, reference]
        );
        recordCount++;

        const details = [
            ["Basic Salary", "basic", basic],
            ...allowances.map((row) => [row[1], "allowance", row[3]]),
            ["EPF (Employee 8%)", "deduction", calc.epfEmployee],
            ...deductions.map((row) => [row[1], "deduction", row[3]]),
        ];
        for (const [detailName, type, amount] of details) {
            await connection.execute(
                "INSERT INTO salary_details (salary_record_id, component_name, component_type, amount) VALUES (?, ?, ?, ?)",
                [result.insertId, detailName, type, amount]
            );
        }
    }
}
console.log("Salary records inserted:", recordCount);

// --- 8. activity log samples -------------------------------------
const logs = [
    [1, "login", "Admin signed in to the system"],
    [1, "staff_create", "Added new staff member EMP009 Tharindu Senanayake"],
    [1, "payroll_generate", "Generated salary records for October 2026"],
    [2, "login", "Kavindi Silva signed in to the system"],
    [1, "payroll_pay", "Marked September 2026 salary records as paid"],
];
for (const [userId, action, description] of logs) {
    await connection.execute(
        "INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)",
        [userId, action, description]
    );
}
console.log("Activity logs inserted:", logs.length);

await connection.end();
console.log("\nSeed finished successfully.");
