-- PSRC Transportation Management System - Database Schema
-- PostgreSQL
-- Created: 2026-05-04

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. AUTH & USERS
-- =====================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'accountant', 'staff', 'client')),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. MASTER DATA
-- =====================================================

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    contact_person VARCHAR(255),
    contact_phone VARCHAR(20),
    type VARCHAR(50) CHECK (type IN ('godown', 'delivery_point', 'office', 'client_location')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    gst_number VARCHAR(20),
    pan_number VARCHAR(20),
    billing_address TEXT,
    shipping_address TEXT,
    credit_limit DECIMAL(15,2) DEFAULT 0,
    payment_terms INTEGER DEFAULT 30, -- days
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rate_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    origin_location_id UUID REFERENCES locations(id),
    destination_location_id UUID REFERENCES locations(id),
    rate_type VARCHAR(50) CHECK (rate_type IN ('per_km', 'per_ton', 'per_trip', 'fixed')),
    rate_value DECIMAL(10,2) NOT NULL,
    minimum_charge DECIMAL(10,2) DEFAULT 0,
    fuel_surcharge_percent DECIMAL(5,2) DEFAULT 0,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 3. FLEET MANAGEMENT
-- =====================================================

CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_number VARCHAR(50) UNIQUE NOT NULL,
    vehicle_type VARCHAR(50) CHECK (vehicle_type IN ('truck', 'tempo', 'container', 'trailer', 'tanker')),
    make VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    capacity_tons DECIMAL(5,2),
    capacity_volume DECIMAL(8,2),
    fuel_type VARCHAR(20) CHECK (fuel_type IN ('diesel', 'petrol', 'cng', 'electric')),
    chassis_number VARCHAR(100),
    engine_number VARCHAR(100),
    rc_number VARCHAR(100),
    rc_expiry DATE,
    insurance_number VARCHAR(100),
    insurance_expiry DATE,
    fitness_certificate VARCHAR(100),
    fitness_expiry DATE,
    permit_type VARCHAR(50),
    permit_expiry DATE,
    gps_device_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired', 'sold')),
    current_odometer DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    license_number VARCHAR(50) NOT NULL,
    license_expiry DATE,
    license_type VARCHAR(50),
    date_of_birth DATE,
    address TEXT,
    emergency_contact VARCHAR(20),
    emergency_contact_name VARCHAR(255),
    joining_date DATE,
    salary_type VARCHAR(50) CHECK (salary_type IN ('fixed', 'per_trip', 'per_km')),
    salary_amount DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'suspended', 'terminated')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vehicle_drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    assigned_from DATE NOT NULL,
    assigned_to DATE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE maintenance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    maintenance_type VARCHAR(50) CHECK (maintenance_type IN ('routine', 'repair', 'accident', 'tyre', 'battery', 'other')),
    description TEXT,
    service_center VARCHAR(255),
    cost DECIMAL(10,2),
    odometer_reading DECIMAL(10,2),
    next_service_due DATE,
    next_service_odometer DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fuel_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id),
    fuel_station VARCHAR(255),
    fuel_type VARCHAR(20),
    quantity_liters DECIMAL(8,2),
    rate_per_liter DECIMAL(8,2),
    total_amount DECIMAL(10,2),
    odometer_reading DECIMAL(10,2),
    payment_mode VARCHAR(50) CHECK (payment_mode IN ('cash', 'card', 'fuel_card', 'credit')),
    bill_number VARCHAR(100),
    filled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 4. TRIP / ORDER MANAGEMENT
-- =====================================================

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
    origin_location_id UUID REFERENCES locations(id),
    destination_location_id UUID REFERENCES locations(id),
    cargo_description TEXT,
    cargo_weight DECIMAL(10,2),
    cargo_volume DECIMAL(10,2),
    cargo_type VARCHAR(100),
    number_of_packages INTEGER DEFAULT 1,
    order_date DATE NOT NULL,
    expected_delivery DATE,
    actual_delivery TIMESTAMP,
    rate_contract_id UUID REFERENCES rate_contracts(id),
    freight_amount DECIMAL(12,2),
    loading_charges DECIMAL(10,2) DEFAULT 0,
    unloading_charges DECIMAL(10,2) DEFAULT 0,
    toll_charges DECIMAL(10,2) DEFAULT 0,
    other_charges DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(12,2),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'loaded', 'in_transit', 'delivered', 'cancelled')),
    remarks TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_number VARCHAR(50) UNIQUE NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id),
    driver_id UUID REFERENCES drivers(id),
    secondary_driver_id UUID REFERENCES drivers(id),
    start_date DATE,
    end_date DATE,
    start_odometer DECIMAL(10,2),
    end_odometer DECIMAL(10,2),
    total_distance DECIMAL(10,2),
    route_description TEXT,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'loading', 'in_transit', 'halted', 'delivered', 'completed', 'cancelled')),
    gps_tracking_url TEXT,
    eway_bill_number VARCHAR(100),
    eway_bill_date DATE,
    eway_bill_validity DATE,
    pod_status VARCHAR(50) DEFAULT 'pending' CHECK (pod_status IN ('pending', 'collected', 'verified', 'disputed')),
    pod_image_url TEXT,
    pod_received_at TIMESTAMP,
    pod_remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trip_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id),
    stop_type VARCHAR(50) CHECK (stop_type IN ('pickup', 'delivery', 'halt', 'fuel', 'rest')),
    sequence INTEGER,
    planned_arrival TIMESTAMP,
    actual_arrival TIMESTAMP,
    planned_departure TIMESTAMP,
    actual_departure TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'arrived', 'completed', 'skipped')),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trip_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    expense_type VARCHAR(50) CHECK (expense_type IN ('fuel', 'toll', 'food', 'lodging', 'repair', 'police', 'other')),
    amount DECIMAL(10,2),
    description TEXT,
    receipt_number VARCHAR(100),
    receipt_image_url TEXT,
    incurred_by UUID REFERENCES drivers(id),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'reimbursed')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 5. BILLING & INVOICING
-- =====================================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
    order_id UUID REFERENCES orders(id),
    invoice_date DATE NOT NULL,
    due_date DATE,
    subtotal DECIMAL(12,2),
    gst_type VARCHAR(10) CHECK (gst_type IN ('igst', 'sgst_cgst')),
    gst_rate DECIMAL(5,2) DEFAULT 12.00,
    gst_amount DECIMAL(12,2),
    total_amount DECIMAL(12,2),
    amount_paid DECIMAL(12,2) DEFAULT 0,
    balance_due DECIMAL(12,2),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled')),
    sent_at TIMESTAMP,
    paid_at TIMESTAMP,
    payment_reference VARCHAR(255),
    notes TEXT,
    terms_conditions TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2),
    unit VARCHAR(50),
    rate DECIMAL(10,2),
    amount DECIMAL(12,2),
    gst_rate DECIMAL(5,2),
    gst_amount DECIMAL(12,2),
    total_amount DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE credit_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    credit_note_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_id UUID REFERENCES invoices(id),
    client_id UUID REFERENCES clients(id),
    amount DECIMAL(12,2),
    reason TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 6. ACCOUNTING
-- =====================================================

CREATE TABLE chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_code VARCHAR(50) UNIQUE NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    parent_account_id UUID REFERENCES chart_of_accounts(id),
    is_bank_account BOOLEAN DEFAULT FALSE,
    bank_name VARCHAR(255),
    bank_account_number VARCHAR(100),
    bank_ifsc VARCHAR(20),
    opening_balance DECIMAL(12,2) DEFAULT 0,
    current_balance DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    transaction_date DATE NOT NULL,
    account_id UUID REFERENCES chart_of_accounts(id),
    contra_account_id UUID REFERENCES chart_of_accounts(id),
    transaction_type VARCHAR(50) CHECK (transaction_type IN ('journal', 'payment', 'receipt', 'contra', 'expense')),
    reference_type VARCHAR(50), -- 'invoice', 'trip', 'expense', 'manual'
    reference_id UUID,
    amount DECIMAL(12,2) NOT NULL,
    debit_amount DECIMAL(12,2) DEFAULT 0,
    credit_amount DECIMAL(12,2) DEFAULT 0,
    description TEXT,
    narration TEXT,
    status VARCHAR(50) DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'reversed')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    ifsc_code VARCHAR(20),
    branch_name VARCHAR(255),
    account_type VARCHAR(50) CHECK (account_type IN ('current', 'savings', 'overdraft')),
    opening_balance DECIMAL(12,2) DEFAULT 0,
    current_balance DECIMAL(12,2) DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    bank_api_enabled BOOLEAN DEFAULT FALSE,
    bank_api_provider VARCHAR(50), -- 'icici', 'hdfc', 'axis', 'razorpay'
    api_credentials JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bank_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_account_id UUID REFERENCES bank_accounts(id),
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(50) CHECK (transaction_type IN ('debit', 'credit')),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    reference_number VARCHAR(255),
    utr_number VARCHAR(100),
    party_name VARCHAR(255),
    party_account VARCHAR(100),
    party_ifsc VARCHAR(20),
    status VARCHAR(50) DEFAULT 'unreconciled' CHECK (status IN ('unreconciled', 'reconciled', 'manual')),
    reconciled_with UUID REFERENCES transactions(id),
    source VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('manual', 'api', 'import')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 7. PAYMENT VOUCHERS
-- =====================================================

CREATE TABLE payment_vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_number VARCHAR(50) UNIQUE NOT NULL,
    voucher_date DATE NOT NULL,
    voucher_type VARCHAR(50) CHECK (voucher_type IN ('payment', 'receipt', 'journal', 'contra')),
    bank_account_id UUID REFERENCES bank_accounts(id),
    party_type VARCHAR(50) CHECK (party_type IN ('client', 'driver', 'vendor', 'staff', 'other')),
    party_id UUID,
    party_name VARCHAR(255),
    amount DECIMAL(12,2) NOT NULL,
    payment_mode VARCHAR(50) CHECK (payment_mode IN ('cash', 'cheque', 'neft', 'rtgs', 'upi', 'imps', 'bank_transfer')),
    cheque_number VARCHAR(100),
    cheque_date DATE,
    bank_reference VARCHAR(255),
    narration TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'posted', 'cancelled')),
    approved_by UUID REFERENCES users(id),
    posted_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 8. AUDIT & LOGS
-- =====================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    performed_by UUID REFERENCES users(id),
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_orders_client ON orders(client_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_trips_vehicle ON trips(vehicle_id);
CREATE INDEX idx_trips_driver ON trips(driver_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_bank_txn_account ON bank_transactions(bank_account_id);
CREATE INDEX idx_bank_txn_status ON bank_transactions(status);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_audit_record ON audit_logs(record_id);

-- =====================================================
-- SEED DATA
-- =====================================================

INSERT INTO users (email, password_hash, full_name, phone, role) VALUES
('admin@psrc.in', '$2b$10$hashplaceholder', 'System Admin', '9876543210', 'admin'),
('manager@psrc.in', '$2b$10$hashplaceholder', 'Operations Manager', '9876543211', 'manager'),
('accounts@psrc.in', '$2b$10$hashplaceholder', 'Accountant', '9876543212', 'accountant');

INSERT INTO chart_of_accounts (account_code, account_name, account_type, opening_balance) VALUES
('1001', 'Cash in Hand', 'asset', 50000.00),
('1002', 'Bank - ICICI Current', 'asset', 250000.00),
('1003', 'Bank - HDFC Current', 'asset', 100000.00),
('1101', 'Accounts Receivable', 'asset', 0),
('1201', 'Vehicles', 'asset', 0),
('2001', 'Accounts Payable', 'liability', 0),
('2101', 'GST Payable', 'liability', 0),
('3001', 'Capital Account', 'equity', 0),
('4001', 'Freight Income', 'revenue', 0),
('4002', 'Loading Charges', 'revenue', 0),
('5001', 'Fuel Expenses', 'expense', 0),
('5002', 'Driver Salaries', 'expense', 0),
('5003', 'Vehicle Maintenance', 'expense', 0),
('5004', 'Toll Charges', 'expense', 0),
('5005', 'Office Expenses', 'expense', 0);

INSERT INTO locations (name, city, state, type) VALUES
('PSRC Main Godown', 'Mohali', 'Punjab', 'godown'),
('Delhi Hub', 'Delhi', 'Delhi', 'delivery_point'),
('Mumbai Depot', 'Mumbai', 'Maharashtra', 'delivery_point'),
('Chennai Warehouse', 'Chennai', 'Tamil Nadu', 'delivery_point'),
('Bangalore Center', 'Bangalore', 'Karnataka', 'delivery_point');

INSERT INTO clients (company_name, contact_person, phone, gst_number, billing_address, payment_terms) VALUES
('PVR Limited', 'Mr. Sharma', '9876512345', '07AABCP1234C1Z5', 'Delhi Office', 30),
('Ascend Telecom', 'Ms. Gupta', '9876512346', '27AABCP1235C1Z6', 'Mumbai Office', 45),
('Spice Retail Ltd', 'Mr. Khan', '9876512347', '33AABCP1236C1Z7', 'Chennai Office', 30);

INSERT INTO vehicles (vehicle_number, vehicle_type, make, capacity_tons, fuel_type, status) VALUES
('PB65BF0325', 'truck', 'Tata', 16.00, 'diesel', 'active'),
('PB65BF0326', 'truck', 'Ashok Leyland', 25.00, 'diesel', 'active'),
('PB65BF0327', 'tempo', 'Mahindra', 7.00, 'diesel', 'active'),
('HR26AB1234', 'container', 'Tata', 32.00, 'diesel', 'active');

INSERT INTO drivers (full_name, phone, license_number, license_expiry, salary_type, salary_amount, status) VALUES
('Rajinder Singh', '9876511111', 'PB0120234567890', '2027-12-31', 'per_trip', 2500.00, 'active'),
('Balwinder Kumar', '9876511112', 'PB0120234567891', '2028-03-15', 'per_trip', 2500.00, 'active'),
('Gurpreet Singh', '9876511113', 'PB0120234567892', '2027-08-20', 'per_km', 8.50, 'active'),
('Harjinder Singh', '9876511114', 'PB0120234567893', '2028-01-10', 'fixed', 35000.00, 'active');

INSERT INTO bank_accounts (account_name, bank_name, account_number, ifsc_code, account_type, opening_balance, current_balance, is_primary, bank_api_enabled, bank_api_provider) VALUES
('PSRC Main Account', 'ICICI Bank', '123456789012', 'ICIC0001234', 'current', 250000.00, 250000.00, TRUE, FALSE, 'icici'),
('PSRC Secondary', 'HDFC Bank', '987654321098', 'HDFC0005678', 'current', 100000.00, 100000.00, FALSE, FALSE, 'hdfc');
