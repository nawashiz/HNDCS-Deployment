-- ============================================================
-- Staff Salary Management System
-- ============================================================

CREATE DATABASE IF NOT EXISTS staff_salary_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE staff_salary_db;

-- 1. departments ------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_departments_name (name)
) ENGINE=InnoDB;

-- 2. staff ------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    staff_code VARCHAR(20) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address VARCHAR(255) NULL,
    designation VARCHAR(100) NOT NULL,
    department_id BIGINT UNSIGNED NOT NULL,
    employment_type ENUM('permanent','contract','intern') NOT NULL DEFAULT 'permanent',
    join_date DATE NOT NULL,
    basic_salary DECIMAL(10,2) NOT NULL,
    bank_account VARCHAR(30) NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_staff_code (staff_code),
    UNIQUE KEY uq_staff_email (email),
    KEY idx_staff_department (department_id),
    KEY idx_staff_status (status),
    CONSTRAINT fk_staff_department FOREIGN KEY (department_id)
        REFERENCES departments (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_staff_salary CHECK (basic_salary >= 0)
) ENGINE=InnoDB;

-- 3. users (login accounts) -------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin','staff') NOT NULL DEFAULT 'staff',
    staff_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_role (role),
    CONSTRAINT fk_users_staff FOREIGN KEY (staff_id)
        REFERENCES staff (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4. staff_components (allowances / deductions of one staff) ----
CREATE TABLE IF NOT EXISTS staff_components (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    staff_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    type ENUM('allowance','deduction') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_components_staff (staff_id),
    CONSTRAINT fk_components_staff FOREIGN KEY (staff_id)
        REFERENCES staff (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_components_amount CHECK (amount >= 0)
) ENGINE=InnoDB;

-- 5. salary_records (one row per staff for one month) ----------
CREATE TABLE IF NOT EXISTS salary_records (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    staff_id BIGINT UNSIGNED NOT NULL,
    pay_month DATE NOT NULL,
    basic_salary DECIMAL(10,2) NOT NULL,
    total_allowances DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_deductions DECIMAL(10,2) NOT NULL DEFAULT 0,
    epf_employee DECIMAL(10,2) NOT NULL DEFAULT 0,
    epf_employer DECIMAL(10,2) NOT NULL DEFAULT 0,
    etf DECIMAL(10,2) NOT NULL DEFAULT 0,
    gross_salary DECIMAL(10,2) NOT NULL,
    net_salary DECIMAL(10,2) NOT NULL,
    status ENUM('draft','approved','paid') NOT NULL DEFAULT 'draft',
    paid_date DATE NULL,
    payment_method ENUM('bank_transfer','cash','cheque') NULL,
    reference_no VARCHAR(50) NULL,
    notes VARCHAR(255) NULL,
    generated_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_salary_staff_month (staff_id, pay_month),
    KEY idx_salary_month (pay_month),
    KEY idx_salary_status (status),
    CONSTRAINT fk_salary_staff FOREIGN KEY (staff_id)
        REFERENCES staff (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_salary_user FOREIGN KEY (generated_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 6. salary_details (line items of a salary record) ------------
CREATE TABLE IF NOT EXISTS salary_details (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    salary_record_id BIGINT UNSIGNED NOT NULL,
    component_name VARCHAR(100) NOT NULL,
    component_type ENUM('basic','allowance','deduction') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_details_record (salary_record_id),
    CONSTRAINT fk_details_record FOREIGN KEY (salary_record_id)
        REFERENCES salary_records (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 7. activity_logs (simple audit trail) ------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NULL,
    action VARCHAR(60) NOT NULL,
    description VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_logs_created (created_at),
    CONSTRAINT fk_logs_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;
