# CBTrading: System Architecture & Project Overview

## Project Summary

**CBTrading** is a comprehensive commission-based middleman marketplace platform. The system manages transactions between agricultural suppliers and customers, handling inventory, payments, and commission calculations. The platform processes ~5,000 transactions daily with multiple frontends for different user types.

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CBTrading Platform                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │   Supplier  │  │  Admin/     │  │   Customer  │  │  Mobile  │ │
│  │  Dashboard  │  │  Middleman  │  │  Dashboard  │  │   App    │ │
│  │ (React)     │  │  Dashboard  │  │  (React)    │  │(Flutter) │ │
│  │             │  │  (React)    │  │             │  │          │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └────┬─────┘ │
│         │                │                │              │        │
│         └────────────────┼────────────────┼──────────────┘        │
│                          │                │                       │
│                   ┌──────v────────────────v──────┐                │
│                   │   API Gateway / REST API     │                │
│                   │   (Java Spring Boot)         │                │
│                   └──────┬────────────┬───────────┘                │
│                          │            │                           │
│         ┌────────────────┴───┬────────┴────────────────┐          │
│         │                    │                         │          │
│    ┌────v───────┐   ┌───────v────────┐   ┌──────────v─────┐     │
│    │ Auth       │   │ Transaction    │   │ Box/Inventory  │     │
│    │ Service    │   │ Service        │   │ Service        │     │
│    └────────────┘   └────────────────┘   └────────────────┘     │
│         │                    │                       │            │
│    ┌────v───────┐   ┌───────v────────┐   ┌──────────v─────┐     │
│    │ User/Role  │   │ Order          │   │ Box Tracking   │     │
│    │ Management │   │ Management     │   │ Management     │     │
│    └────────────┘   └────────────────┘   └────────────────┘     │
│         │                    │                       │            │
│         └────────────────┬───┴───────────────────────┘            │
│                          │                                        │
│                   ┌──────v──────────────┐                         │
│                   │   MySQL 8 / InnoDB  │                         │
│                   │   (Primary Data)    │                         │
│                   └────────────────────┘                          │
│                                                                     │
│  Optional Services:                                               │
│  • Redis Cache (Performance)                                      │
│  • Message Queue (Async Processing)                               │
│  • File Storage (Reports, Invoices)                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Frontend Applications

### 1. **Admin/Middleman Dashboard** (Implemented ✓)
- **Technology:** React + Vite + Tailwind CSS
- **Location:** `/Portal`
- **Features:**
  - Box inventory management and tracking
  - Sales settlement & commission calculations
  - Supplier management and coordination
  - Customer management and credit tracking
  - Transaction history and reporting
  - Dashboard analytics

### 2. **Supplier Dashboard** (Planned)
- **Technology:** React + Vite + Tailwind CSS
- **Features:**
  - View product deliveries
  - Track sales performance
  - Monitor commission earnings
  - Manage box returns
  - Payment history

### 3. **Customer/Retail App** (Planned)
- **Technology:** React + Vite + Tailwind CSS
- **Features:**
  - Browse product catalog
  - Place orders
  - Track purchases
  - Manage credit account
  - Payment tracking

### 4. **Mobile App** (Future)
- **Technology:** Flutter (Cross-platform iOS/Android)
- **Features:**
  - Quick order placement
  - Push notifications
  - Offline-first capability
  - Payment integration

---

## Backend Services Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Java Spring Boot Backend                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              REST API Controllers                    │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  • AuthController       • TransactionController      │  │
│  │  • UserController       • BoxInventoryController     │  │
│  │  • SupplierController   • PaymentController          │  │
│  │  • CustomerController   • ReportController           │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Service Layer                           │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  • AuthService              • TransactionService     │  │
│  │  • UserService              • CommissionService      │  │
│  │  • SupplierService          • BoxService             │  │
│  │  • CustomerService          • PaymentService         │  │
│  │  • ReportService            • NotificationService    │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Repository Layer (Data Access)         │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  • UserRepository           • TransactionRepository  │  │
│  │  • SupplierRepository       • BoxRepository          │  │
│  │  • CustomerRepository       • PaymentRepository      │  │
│  │  • OrderRepository          • SettlementRepository   │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Database Models/Entities                │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  • User                     • Transaction            │  │
│  │  • Supplier                 • Order                  │  │
│  │  • Customer                 • Box                    │  │
│  │  • Product                  • Payment/Settlement     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Complete Transaction Journey

```
┌─────────────────────────────────────────────────────────────────┐
│  TRANSACTION LIFECYCLE IN CBTRADING                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. PRODUCT ARRIVAL                                             │
│     ├─ Supplier sends products in boxes                         │
│     ├─ Admin receives & records inventory                       │
│     └─ Box status: "In Storage"                                 │
│                          │                                      │
│                          v                                      │
│  2. PRODUCT DISPLAY                                             │
│     ├─ Admin adds product to system                             │
│     ├─ Frontend displays available products                     │
│     └─ Customer browses catalog                                 │
│                          │                                      │
│                          v                                      │
│  3. CUSTOMER ORDER                                              │
│     ├─ Customer selects items                                   │
│     ├─ Payment: Cash or Credit                                  │
│     └─ Order created in system                                  │
│                          │                                      │
│                          v                                      │
│  4. FULFILLMENT                                                 │
│     ├─ Products packed in box                                   │
│     ├─ Box assigned to customer                                 │
│     └─ Box status: "With Customer"                              │
│                          │                                      │
│                          v                                      │
│  5. SETTLEMENT & COMMISSION                                     │
│     ├─ Daily/Weekly settlement calculated                       │
│     ├─ Sales total → Supplier Account (95%)                     │
│     ├─ Commission earned → Middleman (5%)                       │
│     ├─ Box tracking status updated                              │
│     └─ Payment recorded                                         │
│                          │                                      │
│                          v                                      │
│  6. BOX RETURN/TRACKING                                         │
│     ├─ Customer returns empty box                               │
│     ├─ Box status: "In Storage"                                 │
│     └─ Box available for reuse                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key System Components

### **User Types & Roles**

```
┌─────────────────────────────────────────────────────────────┐
│                    USER ECOSYSTEM                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ADMIN/MIDDLEMAN                                            │
│  ├─ Manages all suppliers                                   │
│  ├─ Manages all customers                                   │
│  ├─ Tracks inventory & boxes                                │
│  ├─ Calculates commissions                                  │
│  └─ Generates reports & settlements                         │
│                                                             │
│  SUPPLIER                                                   │
│  ├─ Sends product orders                                    │
│  ├─ Tracks deliveries                                       │
│  ├─ Monitors commission earnings                            │
│  └─ Manages box returns                                     │
│                                                             │
│  CUSTOMER (Retail)                                          │
│  ├─ Permanent customers (credit)                            │
│  ├─ Cash customers                                          │
│  ├─ Places orders                                           │
│  └─ Tracks purchases & payments                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### **Box Inventory System**

```
TOTAL BOXES OWNED
    ├─ In Storage (Ready for use)
    ├─ With Suppliers (Delivery)
    ├─ With Customers (Product delivery)
    └─ Lost/Damaged/Missing

REAL-TIME TRACKING: Every box movement logged
```

### **Commission Model**

```
Sales Revenue = 100%
├─ Supplier Gets = 95% (Producer earnings)
├─ Middleman Commission = 5% (Service fee)
└─ Calculated on total sales volume
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   DEPLOYMENT STRUCTURE                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  FRONTEND TIER (CDN/Static)                                 │
│  ├─ Admin Dashboard (React SPA)                             │
│  ├─ Supplier Dashboard (React SPA)                          │
│  ├─ Customer Dashboard (React SPA)                          │
│  └─ Mobile App (Native/Flutter)                             │
│                                                             │
│  API TIER (Java Spring Boot)                                │
│  ├─ Load Balancer                                           │
│  ├─ Multiple API instances (horizontal scaling)             │
│  └─ Health checks & auto-recovery                           │
│                                                             │
│  DATA TIER                                                  │
│  ├─ MySQL 8 / InnoDB (Primary database)                     │
│  ├─ Redis (Cache layer)                                     │
│  ├─ Backup & replication                                    │
│  └─ Read replicas for reporting                             │
│                                                             │
│  SUPPORTING SERVICES                                        │
│  ├─ Message Queue (Order processing)                        │
│  ├─ File Storage (Invoices, reports)                        │
│  └─ Email/SMS Gateway (Notifications)                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend (Web)** | React 18, Vite, Tailwind CSS, Context API |
| **Frontend (Mobile)** | Flutter, Dart |
| **Backend** | Java Spring Boot, Spring Data JPA |
| **Database** | MySQL 8+ / InnoDB |
| **Cache** | Redis (optional) |
| **Message Queue** | RabbitMQ/Kafka (optional) |
| **API** | REST (JSON), potentially GraphQL |
| **Authentication** | JWT tokens, OAuth2 |
| **Deployment** | Docker, Kubernetes (optional) |

---

## Production MySQL Schema

The production data model uses **MySQL 8 / InnoDB**, role-based access, and strict
`wholesaler_id` scoping. The current portal is a wholesaler workspace. Admin is a
platform role that creates wholesalers and assigns access.

Roles:

- **ADMIN**: platform owner/operator. Creates wholesalers and manages users.
- **WHOLESALER**: stockist/wholesaler user. Can only read/write rows under the `wholesaler_id` from their `wholesalers` profile.

Core rules:

```text
Identity tables are global: suppliers and customers are unique by phone.
Business-account link tables are wholesaler-scoped: wholesaler_suppliers and wholesaler_customers.
Every wholesaler API query must filter by wholesaler_id.
Supplier/customer due, stock, payment, boxes, and transactions must use link-table ids.
Operational writes must use database transactions.
Ledger tables are the source of truth.
Balance tables are current summaries for fast dashboard reads.
transactions and payments are high-volume partitioned tables.
```

### Current Foundation Tables

These are the first tables created in `CBM_Schema`. They establish login, wholesaler
business profile, and global supplier/customer identity with per-wholesaler account
links.

```text
users
wholesalers
suppliers
wholesaler_suppliers
customers
wholesaler_customers
```

Current cardinality:

```text
users 1:0..1 wholesalers
wholesalers 1:N wholesaler_suppliers
suppliers 1:N wholesaler_suppliers
wholesalers 1:N wholesaler_customers
customers 1:N wholesaler_customers
```

Important interpretation:

```text
suppliers and customers are global identity tables.
wholesaler_suppliers and wholesaler_customers are the actual business accounts.
All future due, stock, payment, box, and transaction rows should reference the account link ids.
```

### Role-Based Multi-Wholesaler ERD

```mermaid
erDiagram
    USERS {
        BIGINT id PK
        VARCHAR name
        VARCHAR email UK
        VARCHAR password_hash
        ENUM role "ADMIN, WHOLESALER"
        ENUM status "ACTIVE, DISABLED"
        DATETIME created_at
        DATETIME updated_at
    }

    WHOLESALERS {
        BIGINT id PK
        BIGINT user_id FK "unique"
        VARCHAR business_name
        VARCHAR phone UK
        TEXT address
        ENUM status "ACTIVE, DISABLED"
        DATETIME created_at
        DATETIME updated_at
    }

    SUPPLIERS {
        BIGINT id PK
        VARCHAR name
        VARCHAR phone UK
        TEXT address
        ENUM status "ACTIVE, DISABLED"
        DATETIME created_at
        DATETIME updated_at
    }

    WHOLESALER_SUPPLIERS {
        BIGINT id PK
        BIGINT wholesaler_id FK
        BIGINT supplier_id FK
        DECIMAL commission_rate
        DECIMAL opening_due
        ENUM status "ACTIVE, DISABLED"
        DATETIME created_at
        DATETIME updated_at
    }

    CUSTOMERS {
        BIGINT id PK
        VARCHAR name
        VARCHAR owner_name
        VARCHAR phone UK
        TEXT address
        ENUM status "ACTIVE, DISABLED"
        DATETIME created_at
        DATETIME updated_at
    }

    WHOLESALER_CUSTOMERS {
        BIGINT id PK
        BIGINT wholesaler_id FK
        BIGINT customer_id FK
        DECIMAL opening_due
        DECIMAL jamanot_balance
        ENUM status "ACTIVE, DISABLED"
        DATETIME created_at
        DATETIME updated_at
    }

    PRODUCTS {
        BIGINT id PK
        BIGINT wholesaler_id FK
        BIGINT wholesaler_supplier_id FK
        VARCHAR name
        VARCHAR category
        ENUM unit "PCS, KG, DOZEN, BOX"
        DECIMAL default_unit_price
        ENUM status "IN_STOCK, STOCK_OUT, DISABLED"
        DATETIME created_at
        DATETIME updated_at
    }

    PRODUCT_STOCKS {
        BIGINT id PK
        BIGINT wholesaler_id FK
        BIGINT product_id FK
        DECIMAL quantity
        DECIMAL average_cost
        DATETIME updated_at
    }

    STOCK_LEDGER {
        BIGINT id PK
        BIGINT wholesaler_id FK
        BIGINT product_id FK
        ENUM reference_type "SUPPLIER_DELIVERY, SALE, ADJUSTMENT"
        BIGINT reference_id
        ENUM direction "IN, OUT"
        DECIMAL quantity
        DECIMAL unit_price
        TEXT note
        DATETIME created_at
    }

    SUPPLIER_DELIVERIES {
        BIGINT id PK
        BIGINT wholesaler_id FK
        BIGINT wholesaler_supplier_id FK
        DATETIME delivery_date
        DECIMAL total_value
        TEXT note
        DATETIME created_at
    }

    SUPPLIER_DELIVERY_ITEMS {
        BIGINT id PK
        BIGINT wholesaler_id FK
        BIGINT delivery_id FK
        BIGINT product_id FK
        DECIMAL quantity
        DECIMAL unit_price
        DECIMAL line_total
    }

    SALES {
        BIGINT id PK
        BIGINT wholesaler_id FK
        BIGINT wholesaler_customer_id FK
        DATETIME sale_date
        DECIMAL gross_amount
        DECIMAL paid_amount
        DECIMAL due_amount
        INT wooden_boxes_given
        INT plastic_boxes_given
        DECIMAL jamanot_charged
        ENUM status "POSTED, CANCELLED"
        DATETIME created_at
    }

    SALE_ITEMS {
        BIGINT id PK
        BIGINT sale_id FK
        BIGINT wholesaler_id FK
        BIGINT wholesaler_supplier_id FK
        BIGINT product_id FK
        DECIMAL quantity
        DECIMAL unit_price
        DECIMAL line_total
        DECIMAL commission_rate
        DECIMAL commission_amount
    }

    TRANSACTIONS {
        BIGINT id PK
        BIGINT wholesaler_id FK
        ENUM transaction_type "SALE, PAYMENT"
        BIGINT sale_id FK
        BIGINT payment_id FK
        BIGINT wholesaler_supplier_id FK
        BIGINT wholesaler_customer_id FK
        DECIMAL sale_amount
        DECIMAL payment_amount
        TEXT description
        DATETIME created_at PK
    }

    PAYMENTS {
        BIGINT id PK
        BIGINT wholesaler_id FK
        ENUM party_type "WHOLESALER_CUSTOMER, WHOLESALER_SUPPLIER"
        BIGINT party_account_id
        ENUM payment_mode "CASH_RECEIVE, BOX_RECEIVE, CASH_AND_BOX_RECEIVE, CASH_PAY"
        ENUM cash_direction "IN, OUT, NONE"
        DECIMAL cash_amount
        INT wooden_boxes_received
        INT plastic_boxes_received
        DECIMAL jamanot_amount
        ENUM payment_method "CASH, BANK, BKASH, NAGAD, OTHER, NONE"
        TEXT note
        DATETIME created_at PK
    }

    ACCOUNT_LEDGER {
        BIGINT id PK
        BIGINT wholesaler_id FK
        ENUM party_type "WHOLESALER_CUSTOMER, WHOLESALER_SUPPLIER"
        BIGINT party_account_id
        ENUM reference_type "SALE, PAYMENT, SUPPLIER_COMMISSION, EXPENSE, DUE_ADJUSTMENT"
        BIGINT reference_id
        DECIMAL debit
        DECIMAL credit
        TEXT note
        DATETIME created_at
    }

    ACCOUNT_BALANCES {
        BIGINT id PK
        BIGINT wholesaler_id FK
        ENUM party_type "WHOLESALER_CUSTOMER, WHOLESALER_SUPPLIER"
        BIGINT party_account_id
        DECIMAL balance
        DATETIME updated_at
    }

    EXPENSE_CATEGORIES {
        BIGINT id PK
        BIGINT wholesaler_id FK
        VARCHAR name
        ENUM status "ACTIVE, DISABLED"
    }

    SUPPLIER_EXPENSES {
        BIGINT id PK
        BIGINT wholesaler_id FK
        BIGINT wholesaler_supplier_id FK
        BIGINT category_id FK
        DECIMAL amount
        DECIMAL paid_amount
        DECIMAL due_amount
        TEXT note
        DATETIME expense_date
        DATETIME created_at
    }

    OTHER_DUE_BALANCES {
        BIGINT id PK
        BIGINT wholesaler_id FK
        BIGINT wholesaler_supplier_id FK
        BIGINT category_id FK
        DECIMAL due_amount
        DATETIME updated_at
    }

    BOX_TYPES {
        BIGINT id PK
        BIGINT wholesaler_id FK
        VARCHAR name
        ENUM status "ACTIVE, DISABLED"
    }

    BOX_INVENTORY {
        BIGINT id PK
        BIGINT wholesaler_id FK
        BIGINT box_type_id FK
        INT total_owned
        INT in_hand
        INT with_customers
        INT with_suppliers
        INT lost_damaged
        DATETIME updated_at
    }

    BOX_LEDGER {
        BIGINT id PK
        BIGINT wholesaler_id FK
        BIGINT box_type_id FK
        ENUM party_type "WHOLESALER_CUSTOMER, WHOLESALER_SUPPLIER, WHOLESALER"
        BIGINT party_account_id
        ENUM movement_type "PURCHASE, GIVEN_TO_CUSTOMER, RETURNED_FROM_CUSTOMER, GIVEN_TO_SUPPLIER, RETURNED_FROM_SUPPLIER, LOST, DAMAGED, ADJUSTMENT"
        INT quantity
        ENUM reference_type "SALE, PAYMENT, MANUAL, SUPPLIER_DELIVERY"
        BIGINT reference_id
        TEXT note
        DATETIME created_at
    }

    BOX_BALANCES {
        BIGINT id PK
        BIGINT wholesaler_id FK
        ENUM party_type "WHOLESALER_CUSTOMER, WHOLESALER_SUPPLIER"
        BIGINT party_account_id
        BIGINT box_type_id FK
        INT boxes_due
        DATETIME updated_at
    }

    USERS ||--o| WHOLESALERS : "login owns business profile"
    WHOLESALERS ||--o{ WHOLESALER_SUPPLIERS : "has supplier accounts"
    WHOLESALERS ||--o{ WHOLESALER_CUSTOMERS : "has customer accounts"
    WHOLESALERS ||--o{ PRODUCTS : "owns"
    WHOLESALERS ||--o{ SUPPLIER_DELIVERIES : "receives"
    WHOLESALERS ||--o{ SALES : "records"
    WHOLESALERS ||--o{ TRANSACTIONS : "dashboard ledger"
    WHOLESALERS ||--o{ PAYMENTS : "records"
    WHOLESALERS ||--o{ ACCOUNT_LEDGER : "owns"
    WHOLESALERS ||--o{ ACCOUNT_BALANCES : "summarizes"
    WHOLESALERS ||--o{ EXPENSE_CATEGORIES : "defines"
    WHOLESALERS ||--o{ SUPPLIER_EXPENSES : "records"
    WHOLESALERS ||--o{ OTHER_DUE_BALANCES : "summarizes"
    WHOLESALERS ||--o{ BOX_TYPES : "defines"
    WHOLESALERS ||--o{ BOX_INVENTORY : "tracks"
    WHOLESALERS ||--o{ BOX_LEDGER : "records"
    WHOLESALERS ||--o{ BOX_BALANCES : "summarizes"

    SUPPLIERS ||--o{ WHOLESALER_SUPPLIERS : "connects to wholesalers"
    CUSTOMERS ||--o{ WHOLESALER_CUSTOMERS : "connects to wholesalers"
    WHOLESALER_SUPPLIERS ||--o{ PRODUCTS : "supplies"
    WHOLESALER_SUPPLIERS ||--o{ SUPPLIER_DELIVERIES : "sends"
    SUPPLIER_DELIVERIES ||--o{ SUPPLIER_DELIVERY_ITEMS : "contains"
    WHOLESALER_SUPPLIERS ||--o{ SALE_ITEMS : "earns commission from"
    WHOLESALER_SUPPLIERS ||--o{ SUPPLIER_EXPENSES : "may owe expenses"
    WHOLESALER_CUSTOMERS ||--o{ SALES : "buys"
    PRODUCTS ||--|| PRODUCT_STOCKS : "current stock"
    PRODUCTS ||--o{ STOCK_LEDGER : "stock movements"
    PRODUCTS ||--o{ SUPPLIER_DELIVERY_ITEMS : "received as"
    PRODUCTS ||--o{ SALE_ITEMS : "sold as"
    SALES ||--o{ SALE_ITEMS : "contains"
    SALES ||--o{ TRANSACTIONS : "appears as sale"
    SALES ||--o{ STOCK_LEDGER : "reduces stock"
    SALES ||--o{ ACCOUNT_LEDGER : "creates customer due"
    PAYMENTS ||--o{ TRANSACTIONS : "appears as payment"
    PAYMENTS ||--o{ ACCOUNT_LEDGER : "settles due"
    PAYMENTS ||--o{ BOX_LEDGER : "may include box return"
    EXPENSE_CATEGORIES ||--o{ SUPPLIER_EXPENSES : "classifies"
    BOX_TYPES ||--o{ BOX_INVENTORY : "inventory by type"
    BOX_TYPES ||--o{ BOX_LEDGER : "movements by type"
    BOX_TYPES ||--o{ BOX_BALANCES : "due by type"
```

### Cardinality Map

This diagram focuses only on relationship cardinality. It is easier to use while
implementing repositories, DTOs, joins, and service-level validations.

#### Simple Box View

Use this view when you want to read the relationship as two table names with a
direct `1:N`, `1:1`, or `0:1` label.

```mermaid
flowchart LR
    USERS[USERS] -- "1:1" --> WHOLESALERS[WHOLESALERS]
    WHOLESALERS -- "1:N" --> WHOLESALER_SUPPLIERS[WHOLESALER_SUPPLIERS]
    SUPPLIERS[SUPPLIERS] -- "1:N" --> WHOLESALER_SUPPLIERS
    WHOLESALERS -- "1:N" --> WHOLESALER_CUSTOMERS[WHOLESALER_CUSTOMERS]
    CUSTOMERS[CUSTOMERS] -- "1:N" --> WHOLESALER_CUSTOMERS
    WHOLESALERS -- "1:N" --> PRODUCTS[PRODUCTS]
    WHOLESALERS -- "1:N" --> SALES[SALES]
    WHOLESALERS -- "1:N" --> PAYMENTS[PAYMENTS]
    WHOLESALERS -- "1:N" --> TRANSACTIONS[TRANSACTIONS]

    WHOLESALER_SUPPLIERS -- "1:N" --> PRODUCTS
    WHOLESALER_SUPPLIERS -- "1:N" --> SUPPLIER_DELIVERIES[SUPPLIER_DELIVERIES]
    SUPPLIER_DELIVERIES -- "1:N" --> SUPPLIER_DELIVERY_ITEMS[SUPPLIER_DELIVERY_ITEMS]
    PRODUCTS -- "1:0..1" --> PRODUCT_STOCKS[PRODUCT_STOCKS]
    PRODUCTS -- "1:N" --> STOCK_LEDGER[STOCK_LEDGER]

    WHOLESALER_CUSTOMERS -- "1:N" --> SALES
    SALES -- "1:N" --> SALE_ITEMS[SALE_ITEMS]
    WHOLESALER_SUPPLIERS -- "1:N" --> SALE_ITEMS
    PRODUCTS -- "1:N" --> SALE_ITEMS

    SALES -- "1:0..1" --> TXN_SALE[TRANSACTIONS]
    PAYMENTS -- "1:0..1" --> TXN_PAYMENT[TRANSACTIONS]

    WHOLESALER_SUPPLIERS -- "1:N" --> SUPPLIER_EXPENSES[SUPPLIER_EXPENSES]
    EXPENSE_CATEGORIES[EXPENSE_CATEGORIES] -- "1:N" --> SUPPLIER_EXPENSES
    WHOLESALER_SUPPLIERS -- "1:N" --> OTHER_DUE_BALANCES[OTHER_DUE_BALANCES]
    EXPENSE_CATEGORIES -- "1:N" --> OTHER_DUE_BALANCES

    BOX_TYPES[BOX_TYPES] -- "1:0..1" --> BOX_INVENTORY[BOX_INVENTORY]
    BOX_TYPES -- "1:N" --> BOX_LEDGER[BOX_LEDGER]
    BOX_TYPES -- "1:N" --> BOX_BALANCES[BOX_BALANCES]
```

#### Crow-Foot View

```mermaid
erDiagram
    USERS ||--o| WHOLESALERS : "1 wholesaler user has 0..1 business profile"
    WHOLESALERS ||--o{ WHOLESALER_SUPPLIERS : "1 wholesaler has 0..many supplier accounts"
    SUPPLIERS ||--o{ WHOLESALER_SUPPLIERS : "1 global supplier connects to 0..many wholesalers"
    WHOLESALERS ||--o{ WHOLESALER_CUSTOMERS : "1 wholesaler has 0..many customer accounts"
    CUSTOMERS ||--o{ WHOLESALER_CUSTOMERS : "1 global customer connects to 0..many wholesalers"
    WHOLESALERS ||--o{ PRODUCTS : "1 wholesaler has 0..many products"
    WHOLESALERS ||--o{ SALES : "1 wholesaler records 0..many sales"
    WHOLESALERS ||--o{ PAYMENTS : "1 wholesaler records 0..many payments"
    WHOLESALERS ||--o{ TRANSACTIONS : "1 wholesaler has 0..many dashboard entries"
    WHOLESALERS ||--o{ BOX_TYPES : "1 wholesaler defines 0..many box types"

    WHOLESALER_SUPPLIERS ||--o{ PRODUCTS : "1 supplier account can supply 0..many products"
    WHOLESALER_SUPPLIERS ||--o{ SUPPLIER_DELIVERIES : "1 supplier account sends 0..many deliveries"
    SUPPLIER_DELIVERIES ||--|{ SUPPLIER_DELIVERY_ITEMS : "1 delivery has 1..many items"
    PRODUCTS ||--o| PRODUCT_STOCKS : "1 product has 0..1 stock summary"
    PRODUCTS ||--o{ STOCK_LEDGER : "1 product has 0..many stock movements"
    PRODUCTS ||--o{ SUPPLIER_DELIVERY_ITEMS : "1 product can appear in 0..many delivery items"

    WHOLESALER_CUSTOMERS ||--o{ SALES : "1 customer account has 0..many sales"
    SALES ||--|{ SALE_ITEMS : "1 sale has 1..many sale items"
    WHOLESALER_SUPPLIERS ||--o{ SALE_ITEMS : "1 supplier account can appear in 0..many sale items"
    PRODUCTS ||--o{ SALE_ITEMS : "1 product can appear in 0..many sale items"

    SALES ||--o| TRANSACTIONS : "1 sale creates 0..1 transaction entry"
    PAYMENTS ||--o| TRANSACTIONS : "1 payment creates 0..1 transaction entry"

    WHOLESALER_SUPPLIERS ||--o{ SUPPLIER_EXPENSES : "1 supplier account has 0..many expense rows"
    EXPENSE_CATEGORIES ||--o{ SUPPLIER_EXPENSES : "1 category has 0..many expenses"
    WHOLESALER_SUPPLIERS ||--o{ OTHER_DUE_BALANCES : "1 supplier account has 0..many other due balances"
    EXPENSE_CATEGORIES ||--o{ OTHER_DUE_BALANCES : "1 category has 0..many due balances"

    BOX_TYPES ||--o| BOX_INVENTORY : "1 box type has 0..1 inventory summary"
    BOX_TYPES ||--o{ BOX_LEDGER : "1 box type has 0..many movements"
    BOX_TYPES ||--o{ BOX_BALANCES : "1 box type has 0..many party balances"
```

Polymorphic cardinality rules:

```text
PAYMENTS.party_type + party_account_id:
  WHOLESALER_CUSTOMER 1 -> 0..many PAYMENTS
  WHOLESALER_SUPPLIER 1 -> 0..many PAYMENTS

ACCOUNT_LEDGER.party_type + party_account_id:
  WHOLESALER_CUSTOMER 1 -> 0..many ACCOUNT_LEDGER rows
  WHOLESALER_SUPPLIER 1 -> 0..many ACCOUNT_LEDGER rows

ACCOUNT_BALANCES.party_type + party_account_id:
  WHOLESALER_CUSTOMER 1 -> 0..1 ACCOUNT_BALANCES row
  WHOLESALER_SUPPLIER 1 -> 0..1 ACCOUNT_BALANCES row

BOX_LEDGER.party_type + party_account_id:
  WHOLESALER_CUSTOMER 1 -> 0..many BOX_LEDGER rows
  WHOLESALER_SUPPLIER 1 -> 0..many BOX_LEDGER rows
  WHOLESALER 1 -> 0..many BOX_LEDGER rows for purchase/lost/damaged/adjustment

BOX_BALANCES.party_type + party_account_id + box_type_id:
  WHOLESALER_CUSTOMER + BOX_TYPE -> 0..1 BOX_BALANCES row
  WHOLESALER_SUPPLIER + BOX_TYPE -> 0..1 BOX_BALANCES row
```

User-to-wholesaler rule:

```text
ADMIN users:
  no wholesalers row is required

WHOLESALER users:
  wholesalers.user_id is required
  wholesalers.user_id is UNIQUE
  one wholesaler login user maps to one wholesaler business profile
```

Global identity rule:

```text
suppliers:
  one row per real supplier identity, unique by phone

wholesaler_suppliers:
  one row per wholesaler-supplier business account
  all supplier due, commission, stock, payment, and box activity uses this id

customers:
  one row per real customer identity, unique by phone

wholesaler_customers:
  one row per wholesaler-customer business account
  all customer due, jamanot, sale, payment, and box activity uses this id
```

### Partitioned High-Volume Tables

`transactions` and `payments` must be partitioned because they grow fastest and are
used by dashboard filters, exports, and daily reports. Use monthly range partitions
on `created_at`. In MySQL, every unique key on a partitioned table must include the
partition column, so use composite primary keys such as `(id, created_at)`.

For MySQL partitioned tables, keep `sale_id`, `payment_id`,
`wholesaler_supplier_id`, and `wholesaler_customer_id` as indexed reference columns
and enforce cross-table validity in the
service transaction. Do not depend on database foreign keys inside the partitioned
`transactions` and `payments` tables.

Recommended structure:

```sql
CREATE TABLE transactions (
  id BIGINT NOT NULL AUTO_INCREMENT,
  wholesaler_id BIGINT NOT NULL,
  transaction_type ENUM('SALE','PAYMENT') NOT NULL,
  sale_id BIGINT NULL,
  payment_id BIGINT NULL,
  wholesaler_supplier_id BIGINT NULL,
  wholesaler_customer_id BIGINT NULL,
  sale_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  payment_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  description TEXT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id, created_at),
  KEY idx_txn_wh_date (wholesaler_id, created_at),
  KEY idx_txn_wh_type_date (wholesaler_id, transaction_type, created_at),
  KEY idx_txn_wh_supplier_date (wholesaler_id, wholesaler_supplier_id, created_at),
  KEY idx_txn_wh_customer_date (wholesaler_id, wholesaler_customer_id, created_at)
)
PARTITION BY RANGE COLUMNS(created_at) (
  PARTITION p202605 VALUES LESS THAN ('2026-06-01'),
  PARTITION p202606 VALUES LESS THAN ('2026-07-01'),
  PARTITION pmax VALUES LESS THAN (MAXVALUE)
);

CREATE TABLE payments (
  id BIGINT NOT NULL AUTO_INCREMENT,
  wholesaler_id BIGINT NOT NULL,
  party_type ENUM('WHOLESALER_CUSTOMER','WHOLESALER_SUPPLIER') NOT NULL,
  party_account_id BIGINT NOT NULL,
  payment_mode ENUM('CASH_RECEIVE','BOX_RECEIVE','CASH_AND_BOX_RECEIVE','CASH_PAY') NOT NULL,
  cash_direction ENUM('IN','OUT','NONE') NOT NULL DEFAULT 'NONE',
  cash_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  wooden_boxes_received INT NOT NULL DEFAULT 0,
  plastic_boxes_received INT NOT NULL DEFAULT 0,
  jamanot_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  payment_method ENUM('CASH','BANK','BKASH','NAGAD','OTHER','NONE') NOT NULL DEFAULT 'CASH',
  note TEXT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id, created_at),
  KEY idx_pay_wh_party_date (wholesaler_id, party_type, party_account_id, created_at),
  KEY idx_pay_wh_date (wholesaler_id, created_at)
)
PARTITION BY RANGE COLUMNS(created_at) (
  PARTITION p202605 VALUES LESS THAN ('2026-06-01'),
  PARTITION p202606 VALUES LESS THAN ('2026-07-01'),
  PARTITION pmax VALUES LESS THAN (MAXVALUE)
);
```

Partition maintenance:

```text
Create the next monthly partition before each month starts.
Keep pmax as a safety partition.
Archive old partitions only after reports and audits are complete.
Never update created_at after insert.
```

### Accuracy Rules For High Volume

1. A wholesaler user can only read/write rows where `wholesaler_id` matches their `wholesalers.id`.
2. Supplier product receiving must use `wholesaler_suppliers.id` and create `supplier_deliveries`, `supplier_delivery_items`, `stock_ledger`, `product_stocks`, and optional `box_ledger` rows in one database transaction.
3. A sale must use `wholesaler_customers.id` and `wholesaler_suppliers.id`, then create `sales`, `sale_items`, `stock_ledger`, customer `account_ledger`, supplier commission `account_ledger`, `account_balances`, optional `box_ledger`, `box_balances`, `box_inventory`, and one partitioned `transactions` row in one database transaction.
4. A customer payment may include cash, box return, and jamanot in one request. It must create one partitioned `payments` row, one partitioned `transactions` row, account ledger updates, box ledger updates, jamanot update, and balance updates atomically.
5. A supplier payment may settle commission due and/or supplier expense due. It must update `payments`, `account_ledger`, `account_balances`, `supplier_expenses` or `other_due_balances` when applicable.
6. Balance rows must be updated with row locking, for example `SELECT ... FOR UPDATE`, before changing due, stock, jamanot, or box balances.
7. The transaction dashboard should query the partitioned `transactions` table by `wholesaler_id`, date range, type, `wholesaler_supplier_id`, and `wholesaler_customer_id`.
8. Phone number search should first resolve `customers.phone` or `suppliers.phone`, then resolve the matching link-table row for the current wholesaler before querying `transactions`.

### Tenant Indexing Strategy

Every high-volume table should start important indexes with `wholesaler_id`.

```text
users:              UNIQUE (email), (role, status)
wholesalers:        UNIQUE (user_id), UNIQUE (phone), (status)
suppliers:          UNIQUE (phone), (status)
wholesaler_suppliers: UNIQUE (wholesaler_id, supplier_id), (supplier_id), (wholesaler_id, status)
customers:          UNIQUE (phone), (status)
wholesaler_customers: UNIQUE (wholesaler_id, customer_id), (customer_id), (wholesaler_id, status)
products:           (wholesaler_id, wholesaler_supplier_id), (wholesaler_id, status)
product_stocks:     UNIQUE (wholesaler_id, product_id)
stock_ledger:       (wholesaler_id, product_id, created_at)
supplier_deliveries:(wholesaler_id, wholesaler_supplier_id, delivery_date)
sales:              (wholesaler_id, sale_date), (wholesaler_id, wholesaler_customer_id, sale_date)
sale_items:         (wholesaler_id, wholesaler_supplier_id), (wholesaler_id, product_id)
transactions:       (wholesaler_id, created_at), (wholesaler_id, transaction_type, created_at), (wholesaler_id, wholesaler_supplier_id, created_at), (wholesaler_id, wholesaler_customer_id, created_at)
payments:           (wholesaler_id, party_type, party_account_id, created_at), (wholesaler_id, created_at)
account_ledger:     (wholesaler_id, party_type, party_account_id, created_at)
account_balances:   UNIQUE (wholesaler_id, party_type, party_account_id)
supplier_expenses:  (wholesaler_id, wholesaler_supplier_id, expense_date), (wholesaler_id, category_id, expense_date)
other_due_balances: UNIQUE (wholesaler_id, wholesaler_supplier_id, category_id)
box_ledger:         (wholesaler_id, party_type, party_account_id, created_at)
box_balances:       UNIQUE (wholesaler_id, party_type, party_account_id, box_type_id)
```

---

## Project Timeline & Milestones

```
┌────────────────────────────────────────────────────────┐
│                  DEVELOPMENT PHASES                    │
├────────────────────────────────────────────────────────┤
│                                                        │
│  PHASE 1: Foundation ✓ (COMPLETED)                    │
│  ├─ Backend: User, auth, basic services              │
│  ├─ Frontend: Admin dashboard demo                    │
│  └─ Database: Initial schema & setup                  │
│                                                        │
│  PHASE 2: Core Features (IN PROGRESS)                 │
│  ├─ Backend: Transaction, settlement, commission     │
│  ├─ Backend: Box inventory tracking                   │
│  ├─ Frontend: Complete admin features                │
│  └─ Integration testing                              │
│                                                        │
│  PHASE 3: Multi-Frontend Expansion (PLANNED)          │
│  ├─ Supplier dashboard                               │
│  ├─ Customer dashboard                               │
│  └─ Mobile app (Flutter)                              │
│                                                        │
│  PHASE 4: Optimization & Scaling (FUTURE)             │
│  ├─ Performance tuning                                │
│  ├─ Caching strategy                                  │
│  ├─ Load testing                                      │
│  └─ Deployment automation                             │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Key Metrics & Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| **Daily Transactions** | ~5,000 | Peak capacity design |
| **API Response Time** | < 200ms | 95th percentile |
| **System Availability** | 99.5% | Uptime SLA |
| **Database Connections** | Connection pooling | Max 100 concurrent |
| **Cache Hit Ratio** | > 80% | For frequently accessed data |

---

## Security & Compliance

- **Authentication:** JWT-based with refresh tokens
- **Authorization:** Role-based access control (RBAC)
- **Data Encryption:** HTTPS/TLS for transit, encrypted storage
- **Database Security:** User isolation, SQL injection prevention
- **Audit Logging:** Transaction tracking for compliance
- **Payment Security:** PCI DSS compliance (if handling cards)

---

## Next Steps

1. Complete core backend services (transactions, settlements)
2. Build complete admin dashboard with all features
3. Develop supplier dashboard application
4. Develop customer dashboard application
5. Mobile app development (Flutter)
6. Performance optimization & load testing
7. Deployment & scaling infrastructure
