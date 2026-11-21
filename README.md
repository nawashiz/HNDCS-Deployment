# Staff Salary Management System

A full-stack payroll web application built for the HND in Computer Science **Web Application Development** module.

The system lets a company manage departments and staff records, keep the allowances and deductions of each staff member, generate the monthly salary of every active employee with one click, approve and pay the salaries, print payslips, and view monthly reports. Staff members can sign in and see **only their own** payslips.

---

## 1. Live links

| Item | Link |
| --- | --- |
| Live application | https://staff-salary-system.vercel.app |
| GitHub repository | https://github.com/[your-username]/staff-salary-system |
| Report (PDF) | `report/UB1234CS_Assignment001.pdf` |

## 2. Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@upbright.lk` | `Admin@123` |
| Admin (HR) | `kavindi@upbright.lk` | `Hr@12345` |
| Staff | `nimal@upbright.lk` | `Staff@123` |
| Staff | `dilini@upbright.lk` | `Staff@123` |

---

## 3. Technology stack

| Layer | Technology |
| --- | --- |
| Front end | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, lucide-react icons |
| Back end | Next.js Route Handlers (REST API) on the Node.js runtime |
| Database | MySQL 8 / MariaDB 10.5+ with `mysql2/promise` connection pool |
| Security | scrypt password hashing, HMAC-SHA256 signed session cookie (HttpOnly), role-based access |
| External API | open.er-api.com (live LKR → USD exchange rate) |
| Version control | Git + GitHub |
| Deployment | Vercel (application) + hosted MySQL |

## 4. Project structure

```
staff-salary-system/
├── database/
│   ├── schema.sql              # all 7 tables, keys, indexes and constraints
│   └── seed.mjs                # creates the tables and inserts the demo data
├── public/
│   └── logo.png
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/route.ts       # GET me, POST login, PUT signup, DELETE logout
│   │   │   ├── departments/route.ts
│   │   │   ├── payroll/route.ts
│   │   │   ├── reports/route.ts    # report + dashboard numbers + exchange rate
│   │   │   ├── staff/route.ts
│   │   │   └── staff/[id]/route.ts
│   │   ├── dashboard/page.tsx
│   │   ├── departments/page.tsx
│   │   ├── my-salary/page.tsx
│   │   ├── payroll/page.tsx
│   │   ├── payroll/[id]/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── staff/page.tsx
│   │   ├── staff/[id]/page.tsx
│   │   ├── staff/new/page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                # login page (and redirect when already signed in)
│   ├── components/
│   │   ├── DashboardView.tsx       # one view component per page
│   │   ├── DepartmentsView.tsx
│   │   ├── InputGroup.tsx          # reusable text box with an icon
│   │   ├── LoginForm.tsx
│   │   ├── MySalaryView.tsx
│   │   ├── PageLayout.tsx          # sidebar, top bar and footer
│   │   ├── PayrollView.tsx
│   │   ├── PayslipView.tsx
│   │   ├── ReportsView.tsx
│   │   ├── StaffDetailView.tsx
│   │   ├── StaffForm.tsx
│   │   ├── StaffListView.tsx
│   │   └── Ui.tsx                  # badge, alert, loading, empty state, card, header
│   └── lib/
│       ├── auth.ts                 # session helpers and activity log
│       ├── client-api.ts           # small fetch wrapper for the browser
│       ├── mysql.ts                # one connection pool
│       ├── payroll.ts              # EPF / ETF / net salary rules and formatters
│       ├── types.ts                # shared TypeScript types
│       ├── user-auth.ts            # password hashing and signed session cookie
│       └── validate.ts             # input validation
├── .env.example                # copy to .env.local
├── .gitignore
├── README.md
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

Total: **49 files** in 4 folders. `node_modules/`, `.next/`, `next-env.d.ts` and
`package-lock.json` are not included because `npm install` and `npm run dev`
create them automatically.

## 5. How to run the project locally

### Step 1 - install the tools

* Node.js 20 or newer (`node -v`)
* MySQL 8 or MariaDB 10.5 or newer
* Visual Studio Code (recommended)

### Step 2 - get the code

```bash
git clone https://github.com/[your-username]/staff-salary-system.git
cd staff-salary-system
npm install
```

### Step 3 - create the database user

Open a MySQL console as root and run:

```sql
CREATE USER 'salary_app'@'localhost' IDENTIFIED BY 'SalaryApp2026';
GRANT ALL PRIVILEGES ON staff_salary_db.* TO 'salary_app'@'localhost';
GRANT CREATE ON *.* TO 'salary_app'@'localhost';
FLUSH PRIVILEGES;
```

> Tip: avoid the `#` character in a database password. Some `.env` file readers
> treat everything after `#` as a comment and the connection silently fails.

### Step 4 - environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=salary_app
DB_PASSWORD=SalaryApp2026
DB_NAME=staff_salary_db
AUTH_SECRET=put_a_random_secret_with_at_least_32_characters_here
```

### Step 5 - create the schema and demo data

```bash
npm run seed
```

This command reads `database/schema.sql`, creates the seven tables, and inserts
4 departments, 10 staff members, 4 login accounts, 21 salary components and
50 salary records for 5 months.

### Step 6 - start the app

```bash
npm run dev
```

Open <http://localhost:3000> and sign in with `admin@upbright.lk` / `Admin@123`.

## 6. Database design

| Table | Purpose |
| --- | --- |
| `departments` | Departments of the company |
| `staff` | Staff master data, department, join date, basic salary, status |
| `users` | Login accounts (`admin` or `staff`) linked to a staff record |
| `staff_components` | Allowances and deductions of each staff member |
| `salary_records` | One salary record per staff member per month |
| `salary_details` | The line items printed on a payslip |
| `activity_logs` | Audit trail of logins and data changes |

Main relationships:

* `departments` 1 : M `staff`
* `staff` 1 : M `staff_components`
* `staff` 1 : M `salary_records` (unique on `staff_id` + `pay_month`)
* `salary_records` 1 : M `salary_details`
* `users` M : 1 `staff` (every staff account is linked to one staff record)

Full definitions, indexes and foreign keys are in [`database/schema.sql`](database/schema.sql).

## 7. Salary calculation rules

The calculation lives in `src/lib/payroll.ts` so every payslip uses the same rules.

```
Gross salary        = Basic salary + total allowances
EPF (employee 8%)   = Basic salary × 8%          → deducted from the employee
EPF (employer 12%)  = Basic salary × 12%         → company cost, stored for reports
ETF (employer 3%)   = Basic salary × 3%          → company cost, stored for reports
Total deductions    = EPF employee + other deductions
Net salary          = Gross salary − Total deductions
```

Rates are constants at the top of `src/lib/payroll.ts`, so they are easy to change.

## 8. API endpoints

| Method | Endpoint | Purpose | Access |
| --- | --- | --- | --- |
| POST | `/api/auth` | Sign in and set the session cookie | Public |
| GET | `/api/auth` | Current user | Logged in |
| DELETE | `/api/auth` | Sign out | Logged in |
| PUT | `/api/auth` | Create a staff login account | Admin |
| GET | `/api/departments` | List departments (with staff counts) | Logged in |
| POST | `/api/departments` | Add a department | Admin |
| PATCH | `/api/departments?id=` | Update a department | Admin |
| DELETE | `/api/departments?id=` | Delete a department | Admin |
| GET | `/api/staff` | List and search staff | Admin |
| POST | `/api/staff` | Create a staff member | Admin |
| GET | `/api/staff/:id` | One staff member + salary components | Admin / owner |
| PATCH | `/api/staff/:id` | Update a staff member | Admin |
| POST | `/api/staff/:id` | Add an allowance or deduction | Admin |
| DELETE | `/api/staff/:id?componentId=` | Remove a component | Admin |
| DELETE | `/api/staff/:id` | Delete a staff member | Admin |
| GET | `/api/payroll?month=&status=&staffId=` | Salary records | Logged in (staff sees own) |
| GET | `/api/payroll?id=` | One payslip with details | Admin / owner |
| POST | `/api/payroll` | Generate payroll for a month | Admin |
| PATCH | `/api/payroll?id=` | Approve (`action: "approve"`) or pay (`action: "pay"`) | Admin |
| DELETE | `/api/payroll?id=` | Delete a draft record | Admin |
| GET | `/api/reports?month=` | Monthly report by department | Admin |
| GET | `/api/reports?view=dashboard` | Dashboard counters | Admin |
| GET | `/api/reports?view=rate` | Live LKR → USD rate | Logged in |

### Example requests

```bash
# 1. login (the cookie is saved to cookies.txt)
curl -c cookies.txt -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@upbright.lk","password":"Admin@123"}'

# 2. generate the payroll for November 2026
curl -b cookies.txt -X POST http://localhost:3000/api/payroll \
  -H "Content-Type: application/json" -d '{"month":"2026-11"}'

# 3. approve salary record 58
curl -b cookies.txt -X PATCH http://localhost:3000/api/payroll?id=58 \
  -H "Content-Type: application/json" -d '{"action":"approve"}'

# 4. mark it as paid
curl -b cookies.txt -X PATCH http://localhost:3000/api/payroll?id=58 \
  -H "Content-Type: application/json" \
  -d '{"action":"pay","payment_method":"bank_transfer","reference_no":"PAY-202611-EMP001"}'
```

## 9. Security features

* Passwords are hashed with **scrypt** and a random salt (`scrypt:salt:hash`).
* Session cookie is signed with HMAC-SHA256, `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
* Role-based authorisation on every admin endpoint (`403` for staff users).
* Ownership checks so a staff member cannot open another person's payslip.
* All SQL uses `execute()` with `?` placeholders — no SQL injection.
* Input validation on the client **and** on the server.
* Secrets only in `.env.local` / hosting environment variables (`.env*` is git-ignored).
* Activity log records logins and important data changes.

## 10. Testing

Manual test cases and their results are in the report (Table 9.1). Quick checks:

```bash
# login with a wrong password → 401
curl -i -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" -d '{"email":"admin@upbright.lk","password":"wrong"}'

# call an admin endpoint without a session → 401
curl -i http://localhost:3000/api/staff

# staff user calling an admin endpoint → 403
curl -c s.txt -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" -d '{"email":"nimal@upbright.lk","password":"Staff@123"}'
curl -b s.txt http://localhost:3000/api/staff

# generate payroll twice → the second call skips every record
curl -b cookies.txt -X POST http://localhost:3000/api/payroll \
  -H "Content-Type: application/json" -d '{"month":"2026-11"}'
```

## 11. Deployment notes

1. Create a MySQL database on a hosted provider (Railway, Aiven, PlanetScale or similar).
   Import `database/schema.sql` and run `npm run seed` once with the production details.
2. Push the repository to GitHub.
3. On Vercel: **Add New → Project → Import** the repository.
4. Add the environment variables `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
   and `AUTH_SECRET` in **Project Settings → Environment Variables**.
5. Deploy. Every push to `main` creates a new deployment.
6. Allow connections from Vercel in the database firewall / allowed-hosts settings.

Free database plans sleep after inactivity, so the first request after a long
break may take a few seconds. This is a hosting limitation, not an application bug.

## 12. Screenshots

Screenshots of every screen (login, dashboard, staff list, add-staff validation,
staff detail, departments, payroll, payslip, reports, mobile layouts) are included
in the submitted PDF report, figures 2.3 to 2.7 and appendix B.

## 13. Useful scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server on port 3000 |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | Run ESLint |
| `npm run seed` | Create the schema and re-insert the demo data |

## 14. Author

* **[ Your name ]** — HND in Computer Science
* Module: Web Application Development
* Submitted: 6 December 2026

## 15. References

1. Next.js Documentation — https://nextjs.org/docs
2. MySQL 8.0 Reference Manual — https://dev.mysql.com/doc
3. mysql2 (Node.js driver) — https://github.com/sidorares/node-mysql2
4. Tailwind CSS v4 — https://tailwindcss.com/docs
5. OWASP Top 10 — https://owasp.org/www-project-top-ten/
6. Node.js crypto (scrypt, HMAC) — https://nodejs.org/api/crypto.html
7. ExchangeRate-API free endpoint — https://www.exchangerate-api.com/docs/free
8. Employees' Provident Fund, Sri Lanka — https://www.epf.lk
#   H N D C S - D e p l o y m e n t  
 