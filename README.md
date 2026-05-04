# PSRC Transportation Management System (TMS)

A complete, production-ready Transportation Management System built for Panjab South Road Carrier Pvt. Ltd.

## 🚀 Features

### Fleet Management
- Vehicle master with RC, Insurance, Fitness, Permit tracking
- Driver management with license expiry alerts
- Vehicle-Driver assignment
- Maintenance records and scheduling
- Fuel log tracking
- Document expiry alerts

### Order & Trip Management
- Order creation with cargo details
- Trip assignment (Vehicle + Driver)
- Real-time status tracking: Pending → Confirmed → Loaded → In Transit → Delivered
- E-Way Bill integration placeholder
- POD (Proof of Delivery) management
- Trip expense tracking

### Billing & Invoicing
- Auto-invoice generation from orders
- GST compliance (IGST/SGST/CGST)
- Multiple invoice statuses: Draft → Sent → Paid → Partial → Overdue
- Credit/Debit notes
- Payment tracking

### Accounting
- Chart of Accounts
- General Ledger
- Journal entries
- Trial Balance
- Profit & Loss Statement
- Accounts Receivable/Payable

### Banking
- Multiple bank account management
- Payment/Receipt vouchers
- Bank reconciliation
- Bank API integration placeholder (ICICI, HDFC, Razorpay)
- Transaction history

### Reporting & Analytics
- Trip-wise profitability
- Vehicle utilization
- Driver performance
- Client-wise revenue
- GST summary for filing
- Expense breakdown with charts

### Dashboard
- Real-time KPIs
- Revenue trends
- Document expiry alerts
- Today's trips overview
- Top clients

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   React     │────▶│   Node.js   │────▶│  PostgreSQL │
│  Frontend   │     │   Backend   │     │   Database  │
│  (Port 80)  │     │ (Port 5000) │     │ (Port 5432) │
└─────────────┘     └─────────────┘     └─────────────┘
```

## 🛠️ Tech Stack

- **Frontend**: React 18, Tailwind CSS, Recharts, Lucide Icons
- **Backend**: Node.js, Express, JWT Authentication
- **Database**: PostgreSQL 15
- **Deployment**: Docker, Docker Compose, Nginx

## 📦 Installation

### Prerequisites
- Docker & Docker Compose installed
- Linux server (Ubuntu 20.04+ recommended)
- Minimum 2GB RAM, 20GB storage

### Quick Start (Production)

```bash
# 1. Clone or upload the project to your server
cd psrc-tms

# 2. Run the deployment script
./deploy.sh
```

### Manual Setup

```bash
# 1. Configure environment
cp backend/.env.example backend/.env
nano backend/.env  # Edit with your credentials

# 2. Start services
docker-compose up -d

# 3. Check health
curl http://localhost/api/health
```

### Development Setup

```bash
# Backend
cd backend
npm install
cp .env.example .env
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm start
```

## 🔐 Default Credentials

| Role      | Email             | Password |
|-----------|-------------------|----------|
| Admin     | admin@psrc.in     | password |
| Manager   | manager@psrc.in   | password |
| Accountant| accounts@psrc.in  | password |

**⚠️ Change these immediately after first login!**

## 📁 Project Structure

```
psrc-tms/
├── backend/
│   ├── src/
│   │   ├── server.js          # Main server
│   │   ├── config/            # Configuration
│   │   ├── database/
│   │   │   ├── db.js          # DB connection
│   │   │   └── schema.sql     # Database schema
│   │   ├── routes/
│   │   │   ├── auth.js        # Authentication
│   │   │   ├── vehicles.js    # Fleet API
│   │   │   ├── drivers.js     # Driver API
│   │   │   ├── orders.js      # Order API
│   │   │   ├── trips.js       # Trip API
│   │   │   ├── clients.js     # Client API
│   │   │   ├── invoices.js    # Billing API
│   │   │   ├── accounting.js  # Accounting API
│   │   │   ├── banking.js     # Banking API
│   │   │   ├── reports.js     # Reports API
│   │   │   └── dashboard.js   # Dashboard API
│   │   └── middleware/
│   │       ├── auth.js        # JWT auth
│   │       └── validate.js    # Validation
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── pages/             # All pages
│   │   ├── components/        # Layout, Sidebar
│   │   └── context/           # Auth context
│   ├── Dockerfile
│   └── package.json
├── docker/
│   └── nginx.conf
├── docker-compose.yml
├── deploy.sh
└── README.md
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Fleet
- `GET /api/vehicles` - List vehicles
- `POST /api/vehicles` - Create vehicle
- `GET /api/vehicles/:id` - Vehicle details
- `POST /api/vehicles/:id/maintenance` - Add maintenance
- `POST /api/vehicles/:id/fuel` - Add fuel log

### Orders & Trips
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `GET /api/trips` - List trips
- `POST /api/trips` - Create trip
- `PUT /api/trips/:id/status` - Update trip status

### Billing
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `PUT /api/invoices/:id/status` - Update invoice status

### Accounting
- `GET /api/accounting/chart-of-accounts` - Chart of accounts
- `GET /api/accounting/transactions` - Transactions
- `GET /api/accounting/trial-balance` - Trial balance
- `GET /api/accounting/profit-loss` - P&L statement

### Banking
- `GET /api/banking/accounts` - Bank accounts
- `GET /api/banking/transactions` - Bank transactions
- `POST /api/banking/vouchers` - Create voucher

### Reports
- `GET /api/reports/trip-profitability` - Trip profits
- `GET /api/reports/vehicle-utilization` - Vehicle usage
- `GET /api/reports/driver-performance` - Driver stats
- `GET /api/reports/client-revenue` - Client revenue
- `GET /api/reports/gst-summary` - GST data
- `GET /api/reports/expense-breakdown` - Expenses

## 🔒 Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Rate limiting
- Helmet security headers
- CORS protection
- Input validation
- SQL injection prevention (parameterized queries)

## 📊 Database Schema

The system includes 20+ tables:
- `users`, `user_sessions` - Authentication
- `vehicles`, `drivers`, `vehicle_drivers` - Fleet
- `orders`, `trips`, `trip_stops`, `trip_expenses` - Operations
- `clients`, `locations`, `rate_contracts` - Masters
- `invoices`, `invoice_items`, `credit_notes` - Billing
- `chart_of_accounts`, `transactions` - Accounting
- `bank_accounts`, `bank_transactions`, `payment_vouchers` - Banking
- `audit_logs` - Audit trail

## 🚀 Deployment Checklist

- [ ] Change default passwords
- [ ] Update `.env` with production values
- [ ] Configure SSL certificates
- [ ] Set up domain/DNS
- [ ] Configure firewall (ports 80, 443, 5000)
- [ ] Set up automated PostgreSQL backups
- [ ] Configure log rotation
- [ ] Set up monitoring (optional)
- [ ] Test bank API integration (when ready)
- [ ] Configure email for invoice notifications

## 📝 License

Private - For PSRC Internal Use Only

## 🤝 Support

For deployment assistance or customization:
1. Review the code comments
2. Check API documentation
3. Contact your development team

---
**Built with ❤️ for PSRC Logistics**
