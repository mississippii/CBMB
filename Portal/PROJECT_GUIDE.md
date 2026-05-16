# CBTrading Portal Frontend Guide

## Purpose

`Portal` is the React frontend for CBTrading. It currently supports two logged-in experiences:

- `ADMIN`: minimal admin dashboard for viewing admin info and creating wholesalers.
- `WHOLESALER`: operational dashboard for managing suppliers, customers, boxes, product entry, sales, payments, and transactions.

The active business focus is wholesaler development. The portal no longer uses demo supplier/customer data for the wholesaler workspace. It loads supplier and customer accounts from the backend for the logged-in wholesaler.

## Tech Stack

- React 19
- Vite 8
- React Router 7
- Tailwind CSS through Vite tooling
- ESLint

## Directory Structure

```text
Portal/
  src/
    components/       Reusable dashboard components
    context/          AuthContext and DataContext
    pages/            Login, AdminDashboard, Dashboard
    assets/           Static frontend assets
    App.jsx           Route protection and top-level app routing
    main.jsx          React entry point
    index.css         Main styling
  package.json        Scripts and dependencies
```

## Environment

The frontend reads the backend base URL from:

```text
VITE_API_BASE_URL
```

If the variable is not provided, it falls back to:

```text
http://192.168.0.177:8080
```

## Run Commands

```bash
npm install
npm run dev
npm run lint
npm run build
```

## Auth Flow

Login is handled in `src/context/AuthContext.jsx`.

The portal calls:

```http
POST /auth/login
```

Expected response:

```json
{
  "id": 2,
  "wholesalerId": 1,
  "email": "wholesaler@example.com",
  "fullName": "Wholesaler Name",
  "role": "WHOLESALER",
  "status": "ACTIVE"
}
```

For admin users, `wholesalerId` can be `null`.

For wholesaler users, `wholesalerId` is required. If saved browser auth is old and missing `wholesalerId`, the frontend clears it and forces a fresh login.

## Routes

```text
/login       Login page
/admin       Admin-only dashboard
/dashboard   Wholesaler-only dashboard
/            Redirects based on logged-in role
```

Route protection is implemented in `src/App.jsx`.

## Admin Frontend

Admin page file:

```text
src/pages/AdminDashboard.jsx
```

Admin can:

- View current admin account info.
- View wholesalers.
- Add a wholesaler.

Add wholesaler calls:

```http
POST /admin/wholesalers
```

Payload:

```json
{
  "name": "Wholesaler User",
  "email": "wholesaler@example.com",
  "password": "StrongPass123",
  "businessName": "Wholesaler Business",
  "phone": "01700000000",
  "address": "Dhaka"
}
```

## Wholesaler Frontend

Main page file:

```text
src/pages/Dashboard.jsx
```

Current left-side sections:

- Box Dashboard
- Add Products
- Suppliers
- Customers
- Transactions
- Payments

The dashboard reads live supplier and customer data from `DataContext`.

## Data Loading

Data file:

```text
src/context/DataContext.jsx
```

When a wholesaler logs in, the frontend loads:

```http
GET /wholesalers/{wholesalerId}/suppliers
GET /wholesalers/{wholesalerId}/customers
```

The frontend maps backend account rows into the existing UI shape. Some values are still frontend-local until their backend tables are created, such as:

- transactions
- supplier products
- box inventory
- daily sales totals
- box movement

## Supplier Creation

UI file:

```text
src/components/SuppliersList.jsx
```

The Add Supplier form calls:

```http
POST /wholesalers/{wholesalerId}/suppliers
```

Payload sent to backend:

```json
{
  "name": "Mango Supplier Ltd",
  "phone": "01711111111",
  "address": "Chapainawabganj, Rajshahi",
  "commissionRate": 5,
  "openingDue": 10000
}
```

Backend behavior:

- Creates a global supplier if phone is new.
- Reuses the existing supplier if phone already exists.
- Creates a wholesaler-specific supplier account row.
- Prevents duplicate connection for the same wholesaler and supplier.

## Customer Creation

UI file:

```text
src/components/CustomersList.jsx
```

The Add Customer form calls:

```http
POST /wholesalers/{wholesalerId}/customers
```

Payload sent to backend:

```json
{
  "name": "Doly Store",
  "ownerName": "Doly Ahmed",
  "phone": "01811111111",
  "address": "Mirpur, Dhaka",
  "openingDue": 5000,
  "jamanotBalance": 1000
}
```

Backend behavior:

- Creates a global customer if phone is new.
- Reuses the existing customer if phone already exists.
- Creates a wholesaler-specific customer account row.
- Prevents duplicate connection for the same wholesaler and customer.

## Current Frontend Limitations

The following areas still mostly run in frontend state and need backend APIs/tables later:

- Add Products
- Product stock update
- Sales
- Payments
- Transactions
- Box dashboard and box inventory
- Supplier/customer due recalculation from transaction tables
- PDF export from persisted transaction data

## Development Notes

- Do not reintroduce hardcoded demo business data into `DataContext`.
- Use backend data for all wholesaler-specific records as APIs become available.
- When changing login response shape, update `AuthContext` and route guards together.
- Keep admin and wholesaler experiences role-separated.

