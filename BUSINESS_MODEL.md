# CBTrading: Middleman Commission-Based Business Model

## Executive Summary

**CBTrading** is a middleman marketplace where the business owner acts as an intermediary between **agricultural suppliers** (farmers/producers) and **customers** (retailers/end consumers). The middleman purchases products from suppliers, sells them to customers at retail prices, and earns commission from suppliers based on sales volume. All operational costs (transportation, harvesting, packaging, labor) are borne by the supplier.

**Core Revenue Model:** Commission-based | 5% per 100 Taka of sales (example)

**Daily Transaction Volume:** ~5,000 transactions

---

## Business Model Overview

### How It Works

```
┌──────────────────────────────────────────────────────────────────┐
│                    CBTRADING BUSINESS FLOW                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│                          SUPPLIER                               │
│                   (Mango, Pineapple, etc)                       │
│                            │                                    │
│                ┌───────────┼───────────┐                        │
│                │           │           │                        │
│                v           v           v                        │
│            Mangoes    Pineapples    Other                       │
│            (Himsagar,  (Yellow,      Fruits                     │
│             Fazli,      Green)                                  │
│             Langra)                                             │
│                │           │           │                        │
│    ┌───────────────────────────────────────────────┐           │
│    │  Supplier sends products in boxes/crates     │           │
│    │  (bearing all operational costs)             │           │
│    └───────────────────────────────────────────────┘           │
│                │                                                │
│                v                                                │
│    ┌─────────────────────────────────┐                         │
│    │     CBTRADING (Middleman)       │                         │
│    │         SHOP                    │                         │
│    │  ✓ Receives products            │                         │
│    │  ✓ Manages inventory            │                         │
│    │  ✓ Handles customers            │                         │
│    │  ✓ Tracks sales                 │                         │
│    │  ✓ Records payments             │                         │
│    │  ✓ Manages boxes                │                         │
│    └─────────────────────────────────┘                         │
│                │                                                │
│    ┌───────────────────────────────────────────────┐           │
│    │           RETAIL SALES OCCUR                  │           │
│    │  • Permanent Customers (Buy on Credit)        │           │
│    │  • Cash Customers (Pay Immediately)           │           │
│    └───────────────────────────────────────────────┘           │
│                │                                                │
│                v                                                │
│    ┌─────────────────────────────────┐                         │
│    │  SETTLEMENT & COMMISSION        │                         │
│    │  Sales Revenue → Supplier Acc   │                         │
│    │  Supplier receives: 95%         │                         │
│    │  Middleman commission: 5%       │                         │
│    └─────────────────────────────────┘                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Key Components

### 0. **ADMIN BOX INVENTORY SYSTEM** ⭐⭐⭐

```
┌──────────────────────────────────────────────────────────────────────────┐
│                  MIDDLEMAN/ADMIN BOX INVENTORY                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  The Middleman owns a FIXED amount of boxes (like capital)              │
│  Increases ONLY by buying new boxes                                     │
│  Decreases when boxes are: given out, lost, or damaged                  │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│ TOTAL BOXES OWNED BY ADMIN                                              │
│                                                                          │
│  Started with:           200 wooden crates                              │
│  + Bought new (2024):    100 wooden crates                              │
│  = TOTAL OWNED:          300 wooden crates                              │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│ BOX ALLOCATION/LOCATION                                                 │
│                                                                          │
│  Total Boxes Owned:                300 crates     (100%)               │
│  ├─→ In Shop Storage:              85 crates      (28%)                │
│  ├─→ With Suppliers:               14 crates      (5%)                 │
│  ├─→ With Customers:               201 crates     (67%)                │
│  └─→ Lost/Damaged/Missing:         0 crates       (0%)                 │
│                                                                          │
│  Verification: 85 + 14 + 201 + 0 = 300 ✓                               │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│ AVAILABLE FOR USE (Inventory Balance)                                   │
│                                                                          │
│  In Shop Storage:        85 crates ← Can be used for next transactions  │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│ BOXES DUE TO ADMIN (Outstanding/Accountability)                         │
│                                                                          │
│  From Suppliers:         14 boxes due                                   │
│  From Customers:         201 boxes due                                  │
│  TOTAL:                  215 boxes owed to Admin                        │
│                                                                          │
│  When they return → increases "In Shop Storage"                         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

KEY FORMULA:

  TOTAL BOXES = Initial Boxes + Boxes Purchased - Boxes Lost/Damaged

  AVAILABLE BOXES IN SHOP = Total Boxes - (With Suppliers + With Customers + Lost/Damaged)

  BOXES DUE = (Boxes Given to Suppliers + Boxes with Customers)
```

### 1. **Box Inventory Transactions** ⭐

```
HOW BOX INVENTORY CHANGES:

INCREASE:
  ├─ Admin buys new boxes
  │  └─ Transaction: Box Purchase (increases total inventory)
  └─ Boxes returned from suppliers/customers
     └─ Transaction: Box Return (increases "In Shop" storage)

DECREASE:
  ├─ Boxes given to suppliers (for product transport)
  │  └─ Transaction: Box Given Out (to Supplier)
  ├─ Boxes given to customers (with products)
  │  └─ Transaction: Box Given Out (to Customer)
  ├─ Boxes lost/damaged
  │  └─ Transaction: Box Lost/Damaged (removed from inventory)
  └─ Boxes not returned (tracked as liability)
     └─ Transaction: Box Accountability

EXAMPLE TIMELINE:

Day 1: Start
  Total: 200 boxes, In Shop: 200

Day 2: Admin buys boxes
  Purchase: +100 boxes
  Total: 300 boxes, In Shop: 200 (100 pending delivery)

Day 3: Boxes delivered
  Total: 300 boxes, In Shop: 300

Day 4: Give boxes to Supplier
  Give: -50 boxes to Supplier
  Total: 300 boxes, In Shop: 250, With Suppliers: 50

Day 5: Give boxes to Customer
  Give: -30 boxes to Customer
  Total: 300 boxes, In Shop: 220, With Customers: 30, With Suppliers: 50

Day 10: Customer returns boxes
  Return: +25 boxes from Customer
  Total: 300 boxes, In Shop: 245, With Customers: 5 (still owes 5), With Suppliers: 50
```

### 2. **Core Actors**

```
┌─────────────┐
│  SUPPLIER   │  (Farmer/Producer)
│             │  • Grows/produces products
│  Mangoes    │  • Bears all operational costs
│  Pineapple  │  • Ships in boxes/crates
│  Other      │  • Receives commission from sales
└─────────────┘
       │
       │ Sends products
       │ (sometimes advance payment)
       │
       v
┌─────────────────────┐
│   CBTRADING SHOP    │  (Middleman)
│                     │  • Receives products
│  Core Business:     │  • Manages inventory
│  • Buying/Selling   │  • Sells to customers
│  • Payments         │  • Tracks sales
│  • Records          │  • Manages boxes
└─────────────────────┘
       │
       ├─────────────┬──────────────┐
       v             v              v
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ PERMANENT    │ │ CASH         │ │  BOX         │
│ CUSTOMERS    │ │ CUSTOMERS    │ │  MANAGEMENT  │
│              │ │              │ │              │
│ Buy on       │ │ Pay cash     │ │ Track boxes: │
│ Credit       │ │ immediately  │ │ • Given out  │
│              │ │              │ │ • Returned   │
│ Pay later    │ │ One-time or  │ │ • Missing    │
│              │ │ regular      │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
```

### 2. **Product Categories**

**Example: Mango Supplier**

```
Supplier: "Mango Farm XYZ"
├── Product: Mango
│   ├── Category 1: Himsagar
│   │   ├── Quality: Premium (5 Taka/piece)
│   │   └── Quality: Regular (3 Taka/piece)
│   ├── Category 2: Fazli
│   │   ├── Seasonal: June-July
│   │   └── Price: 4 Taka/piece
│   └── Category 3: Langra
│       ├── Seasonal: July-August
│       └── Price: 6 Taka/piece
└── Commission Rate: 5% on total sales
```

### 3. **Customer Types**

| Customer Type | Payment Method | Payment Timing | Tracking | Box Tracking |
|---|---|---|---|---|
| **Permanent Customers** | Credit | Pays weekly/monthly | Maintain due account | Track boxes held |
| **Cash Customers** | Cash | Immediate | No credit tracking | Track boxes held |
| **Both types** | Box Management | N/A | Return empty boxes | **View boxes holding** ⭐ |

---

## Supplier & Customer Box Property ⭐⭐⭐

### Supplier Profile - Box Holding

When viewing a Supplier's profile/account, the system displays:

```
┌─────────────────────────────────────────────────────┐
│  SUPPLIER: Mango Farm XYZ                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Basic Info:                                        │
│  ├─ Name: Mango Farm XYZ                           │
│  ├─ Contact: 0171-XXXXXXX                          │
│  ├─ Location: Chapainawabganj                      │
│  └─ Status: Active                                 │
│                                                     │
│  Financial Info:                                    │
│  ├─ Commission Rate: 5%                            │
│  ├─ Total Sales: 50,000 TK                         │
│  ├─ Commission Earned: 2,500 TK                    │
│  ├─ Amount Due (Payment): 500 TK                   │
│  └─ Last Settlement: 2024-05-08                    │
│                                                     │
│  ⭐ BOX HOLDING (NEW):                             │
│  ├─ Wooden Crates: 8 crates ← Currently holding   │
│  ├─ Plastic Crates: 0 crates                      │
│  └─ TOTAL BOXES HELD: 8 crates ⭐                 │
│                                                     │
│  Box History (Last 7 days):                        │
│  ├─ 2024-05-08: Given 10 crates                   │
│  ├─ 2024-05-05: Returned 2 crates                 │
│  └─ CURRENT BALANCE: 8 crates                     │
│                                                     │
│          [ VIEW BOX TIMELINE ]  [ FOLLOW UP ]      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Customer Profile - Box Holding

When viewing a Customer's profile/account, the system displays:

```
┌─────────────────────────────────────────────────────┐
│  CUSTOMER: Doly Store                              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Basic Info:                                        │
│  ├─ Name: Doly Store                              │
│  ├─ Owner: Dolly Ahmed                             │
│  ├─ Phone: 0181-XXXXXXX                            │
│  ├─ Address: Dhaka                                 │
│  ├─ Type: Permanent Customer                       │
│  └─ Status: Active                                 │
│                                                     │
│  Financial Info:                                    │
│  ├─ Total Purchases: 5,000 TK                      │
│  ├─ Total Paid: 3,000 TK                           │
│  ├─ Amount Due (Credit): 2,000 TK                  │
│  ├─ Days Overdue: 7 days                           │
│  └─ Last Payment: 2024-05-05                       │
│                                                     │
│  ⭐ BOX HOLDING (NEW):                             │
│  ├─ Wooden Crates: 5 crates ← Currently holding   │
│  ├─ Plastic Crates: 2 crates ← Currently holding  │
│  └─ TOTAL BOXES HELD: 7 crates ⭐                 │
│                                                     │
│  Box History (Last 30 days):                       │
│  ├─ 2024-05-08: Given 10 crates                   │
│  ├─ 2024-05-02: Returned 3 crates                 │
│  └─ CURRENT BALANCE: 7 crates                     │
│                                                     │
│          [ VIEW BOX TIMELINE ]  [ FOLLOW UP ]      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Revenue & Commission Model

### Commission Calculation

```
Daily Example:

Supplier: Mango Farm XYZ
Commission Rate: 5%

Sales Details:
┌─────────────────────────────────────────────┐
│ Product      │ Quantity │ Rate │ Revenue   │
├──────────────┼──────────┼──────┼──────────┤
│ Himsagar     │ 200 pcs  │ 5 TK │ 1,000 TK │
│ Fazli        │ 150 pcs  │ 4 TK │ 600 TK  │
│ Langra       │ 100 pcs  │ 6 TK │ 600 TK  │
├──────────────┼──────────┼──────┼──────────┤
│ TOTAL SALES  │          │      │ 2,200 TK │
└─────────────────────────────────────────────┘

Commission Breakdown:
Total Sales:           2,200 TK (100%)
├─→ Supplier Receives: 2,090 TK (95%)
└─→ Middleman Keeps:   110 TK   (5% commission)

Monthly Revenue (assuming 2,200 TK/day):
30 days × 2,200 TK × 5% = 3,300 TK commission
```

### Revenue Streams

```
MIDDLEMAN REVENUE SOURCES
├─ Direct Commission
│  └─ 5% of all supplier sales (primary revenue)
├─ Other Services (Optional Future)
│  ├─ Box rental fees
│  ├─ Storage fees
│  ├─ Delivery charges
│  └─ Administrative fees
└─ Margin on Non-Commission Products
   └─ If buying at wholesale & selling at retail
```

---

## Business Workflow

### Daily Operations

```
┌─ MORNING ─────────────────────────────────────┐
│ 1. Operator arrives at shop                   │
│ 2. Checks inventory from previous day         │
│ 3. Prepares for customer arrivals             │
└────────────────────────────────────────────────┘
              ↓
┌─ THROUGHOUT DAY ──────────────────────────────┐
│ EVERY SALE TRANSACTION:                       │
│                                               │
│ Customer approaches → Select Product          │
│         ↓                                      │
│ Product Details Recorded                      │
│ ├─ Product name                              │
│ ├─ Supplier name                             │
│ ├─ Quantity                                  │
│ ├─ Unit price                                │
│ ├─ Total amount                              │
│ └─ Customer name                             │
│         ↓                                      │
│ Payment Type?                                 │
│ ├─ CASH → Receive immediately                │
│ └─ CREDIT → Record in customer account       │
│         ↓                                      │
│ Box Transaction (if applicable)              │
│ ├─ Boxes given out                           │
│ ├─ Empty boxes received                      │
│ └─ Update box count                          │
│         ↓                                      │
│ Update Inventory                             │
│ ├─ Decrease product stock                    │
│ └─ Update supplier account                   │
│         ↓                                      │
│ Save to Digital System                       │
└────────────────────────────────────────────────┘
              ↓
┌─ END OF DAY ───────────────────────────────────┐
│ 1. Reconcile cash received                    │
│ 2. Verify all sales entered                  │
│ 3. Check inventory accuracy                  │
│ 4. Generate daily report                     │
│ 5. Backup data                               │
└────────────────────────────────────────────────┘
```

---

## System Architecture & Modules

### Module 1: Supplier Management

```
SUPPLIER MODULE
├─ Supplier Information
│  ├─ Name, contact, location
│  ├─ Bank details for payment
│  └─ Tax/registration info
├─ Product Catalog
│  ├─ Products (Mango, Pineapple, etc)
│  ├─ Categories (Himsagar, Fazli, etc)
│  ├─ Unit price per category
│  └─ Quantity in stock
├─ Commission Settings
│  ├─ Commission percentage
│  ├─ Advance payments made
│  └─ Settlement frequency
└─ Supplier Account
   ├─ Total sales
   ├─ Commission earned
   ├─ Advances/payments
   └─ Current balance due
```

### Module 2: Product & Inventory Management

```
INVENTORY MODULE
├─ Product Tracking
│  ├─ Product ID
│  ├─ Supplier ID
│  ├─ Category
│  ├─ Current quantity
│  ├─ Unit price
│  ├─ Date received
│  └─ Expiry/freshness date (if applicable)
├─ Inventory Movement
│  ├─ Stock IN (from supplier)
│  ├─ Stock OUT (sold to customer)
│  └─ Stock RETURN (if applicable)
└─ Stock Reports
   ├─ Current inventory levels
   ├─ Fast-moving products
   └─ Slow-moving products
```

### Module 3: Customer Management

```
CUSTOMER MODULE
├─ Customer Profile
│  ├─ Customer ID
│  ├─ Name, phone, address
│  ├─ Type (Permanent / Cash)
│  └─ Customer since (date)
├─ Transaction History
│  ├─ All purchases
│  ├─ Amounts paid
│  ├─ Dates
│  └─ Payment method
├─ Credit Tracking (for Permanent Customers)
│  ├─ Total credit limit
│  ├─ Amount outstanding (due)
│  ├─ Days outstanding
│  └─ Payment history
└─ Box Management
   ├─ Boxes given to customer
   ├─ Boxes returned
   ├─ Missing boxes liability
   └─ Box count status
```

### Module 4: Box/Crate Tracking System

**GOAL: Track "BOXES DUE" - How many boxes are outstanding from suppliers and customers**

```
BOX TRACKING MODULE (Loan/Accountability System)
├─ Box Types & Inventory
│  ├─ Wooden crate (capacity: 50kg)
│  ├─ Plastic crate (capacity: 30kg)
│  └─ Other types
│  
├─ SUPPLIER BOX ACCOUNTABILITY
│  ├─ Boxes given to supplier (for product shipment)
│  ├─ Boxes returned from supplier
│  ├─ BOXES DUE FROM SUPPLIER (Given - Returned)
│  └─ Missing/damaged boxes liability
│  
├─ CUSTOMER BOX ACCOUNTABILITY
│  ├─ Boxes given to customer (with purchased products)
│  ├─ Boxes returned from customer (when customer returns next time)
│  ├─ BOXES DUE FROM CUSTOMER (Given - Returned)
│  └─ Missing/damaged boxes liability
│  
└─ Box Reports
   ├─ Supplier Box Due Report
   ├─ Customer Box Due Report
   ├─ Missing box list with liability
   ├─ Box depreciation/value tracking
   └─ Box reconciliation report
```

**Example: Box Due Concept**

```
SUPPLIER: Mango Farm XYZ
├─ Boxes Given (This Year):     100 crates
├─ Boxes Returned:               92 crates
└─ BOXES DUE (Outstanding):      8 crates ← They owe us 8 boxes

CUSTOMER: Doly Store
├─ Boxes Given (This Month):    15 crates
├─ Boxes Returned:              10 crates
└─ BOXES DUE (Outstanding):      5 crates ← They owe us 5 boxes
```

### Module 5: Sales & Transaction Module

```
SALES MODULE
├─ Sale Entry
│  ├─ Sale ID (auto-generated)
│  ├─ Date & Time
│  ├─ Customer name
│  ├─ Product details
│  │  ├─ Product name
│  │  ├─ Supplier
│  │  ├─ Category
│  │  ├─ Quantity
│  │  └─ Unit price
│  ├─ Total amount
│  ├─ Payment type (Cash/Credit)
│  └─ Boxes transaction (if applicable)
├─ Sale Types
│  ├─ Permanent Customer (Credit)
│  └─ Cash Customer (Immediate payment)
└─ Commission Calculation
   └─ Automatically calculated based on supplier rate
```

### Module 6: Accounting & Payment Settlement

```
ACCOUNTING MODULE
├─ Payment Recording
│  ├─ Payment from customer
│  ├─ Payment to supplier
│  ├─ Advance payments
│  └─ Other expenses
├─ Supplier Settlement
│  ├─ Total sales amount
│  ├─ Commission calculation
│  ├─ Amount to transfer
│  ├─ Payment status
│  └─ Payment date
├─ Customer Payments
│  ├─ Payment received
│  ├─ Outstanding balance
│  ├─ Payment date
│  └─ Payment method
└─ Financial Reports
   ├─ Daily cash report
   ├─ Supplier balance report
   ├─ Customer due report
   └─ Profit/Commission report
```

---

## Database Tables


### Core Tables

```
1. SUPPLIERS TABLE
   ├─ supplier_id (PK)
   ├─ name
   ├─ contact_phone
   ├─ location
   ├─ bank_details
   ├─ status (active/inactive)
   ├─ ⭐ boxes_holding_wooden (current boxes this supplier has)
   ├─ ⭐ boxes_holding_plastic (current boxes this supplier has)
   ├─ ⭐ total_boxes_holding (total boxes currently with supplier)
   └─ notes

2. PRODUCTS TABLE
   ├─ product_id (PK)
   ├─ supplier_id (FK)
   ├─ product_name
   ├─ category
   ├─ unit_price
   ├─ quantity_in_stock
   ├─ date_received
   ├─ unit (pcs, kg, dozen, etc)
   └─ status

3. PRODUCT_CATEGORIES TABLE
   ├─ category_id (PK)
   ├─ supplier_id (FK)
   ├─ product_id (FK)
   ├─ category_name (e.g., Himsagar, Fazli)
   ├─ unit_price
   └─ description

4. CUSTOMERS TABLE
   ├─ customer_id (PK)
   ├─ name
   ├─ phone
   ├─ address
   ├─ customer_type (Permanent/Cash)
   ├─ credit_limit (if permanent)
   ├─ date_registered
   ├─ status
   ├─ ⭐ boxes_holding_wooden (current boxes this customer has)
   ├─ ⭐ boxes_holding_plastic (current boxes this customer has)
   ├─ ⭐ total_boxes_holding (total boxes currently with customer)
   └─ notes

5. SALES TABLE
   ├─ sale_id (PK)
   ├─ customer_id (FK)
   ├─ supplier_id (FK)
   ├─ sale_date
   ├─ total_amount
   ├─ payment_type (Cash/Credit)
   ├─ status
   └─ operator_id

6. SALE_ITEMS TABLE
   ├─ sale_item_id (PK)
   ├─ sale_id (FK)
   ├─ product_id (FK)
   ├─ quantity
   ├─ unit_price
   ├─ amount
   └─ category

7. PAYMENTS TABLE
   ├─ payment_id (PK)
   ├─ customer_id (FK) [for customer payments]
   ├─ supplier_id (FK) [for supplier payments]
   ├─ amount
   ├─ payment_date
   ├─ payment_type (Received/Paid)
   ├─ payment_method
   └─ reference

8. ADMIN_BOX_INVENTORY TABLE ⭐⭐⭐ (NEW - Middleman's Box Stock)
   ├─ inventory_id (PK)
   ├─ box_type (Wooden Crate / Plastic Crate / etc)
   ├─ total_boxes_owned (initial + purchased - lost/damaged)
   ├─ boxes_in_shop_storage (available for use)
   ├─ boxes_with_suppliers (currently with suppliers)
   ├─ boxes_with_customers (currently with customers)
   ├─ boxes_lost_damaged (removed from circulation)
   ├─ last_updated_date
   └─ notes

9. BOX_PURCHASE_TABLE ⭐ (NEW - When Admin Buys Boxes)
   ├─ purchase_id (PK)
   ├─ box_type (FK to box type)
   ├─ quantity (how many boxes bought)
   ├─ purchase_date
   ├─ unit_cost
   ├─ total_cost
   ├─ supplier_name (who sold the boxes)
   ├─ status (ordered/received/in_stock)
   └─ notes

10. BOX_TRANSACTIONS TABLE
    ├─ box_transaction_id (PK)
    ├─ transaction_type (Given/Returned/Lost/Damaged/Purchased)
    ├─ entity_type (Supplier/Customer/Admin)
    ├─ entity_id (supplier_id or customer_id) (FK)
    ├─ box_type
    ├─ quantity
    ├─ transaction_date
    ├─ box_condition (new/used/damaged)
    └─ notes

11. SUPPLIER_BOX_ACCOUNT TABLE ⭐ (Track Boxes Due from Suppliers)
    ├─ supplier_box_account_id (PK)
    ├─ supplier_id (FK)
    ├─ box_type
    ├─ boxes_given (total boxes given to this supplier)
    ├─ boxes_returned (total boxes returned by this supplier)
    ├─ BOXES_DUE (boxes_given - boxes_returned) ⭐
    ├─ boxes_damaged_liability (boxes marked damaged)
    ├─ last_transaction_date
    └─ notes

12. CUSTOMER_BOX_ACCOUNT TABLE ⭐ (Track Boxes Due from Customers)
    ├─ customer_box_account_id (PK)
    ├─ customer_id (FK)
    ├─ box_type
    ├─ boxes_given (total boxes given to this customer)
    ├─ boxes_returned (total boxes returned by this customer)
    ├─ BOXES_DUE (boxes_given - boxes_returned) ⭐
    ├─ boxes_damaged_liability (boxes marked damaged)
    ├─ last_transaction_date
    └─ notes

13. SUPPLIER_ACCOUNTS TABLE
    ├─ account_id (PK)
    ├─ supplier_id (FK)
    ├─ total_sales
    ├─ commission_percentage
    ├─ total_commission_earned
    ├─ advance_payments_made
    ├─ amount_due
    ├─ last_settlement_date
    └─ balance

13. CUSTOMER_ACCOUNTS TABLE
    ├─ account_id (PK)
    ├─ customer_id (FK)
    ├─ total_purchases
    ├─ total_paid
    ├─ amount_due
    ├─ days_overdue
    ├─ last_payment_date
    └─ status

12. COMMISSION_SETTINGS TABLE
    ├─ setting_id (PK)
    ├─ supplier_id (FK)
    ├─ commission_percentage
    ├─ effective_date
    ├─ status
    └─ notes
```

---

## Data Flow & Relationships

```
┌────────────────────────────────────────────────────────────────┐
│                      DATA RELATIONSHIPS                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ SUPPLIERS                                                     │
│    ├─→ PRODUCTS (1 supplier : many products)                  │
│    │   ├─→ PRODUCT_CATEGORIES (1 product : many categories)   │
│    │   │   └─→ SALE_ITEMS (via sales)                        │
│    │   │       └─→ SALES                                      │
│    │   │           └─→ CUSTOMERS                              │
│    │   └─→ INVENTORY MOVEMENT                                 │
│    ├─→ COMMISSION_SETTINGS                                    │
│    ├─→ SUPPLIER_ACCOUNTS (1:1 relationship)                   │
│    ├─→ BOX_TRANSACTIONS (boxes given to supplier)             │
│    └─→ PAYMENTS (supplier settlements)                        │
│                                                                │
│ CUSTOMERS                                                     │
│    ├─→ SALES (1 customer : many sales)                        │
│    │   └─→ SALE_ITEMS                                         │
│    ├─→ CUSTOMER_ACCOUNTS (1:1 relationship)                   │
│    ├─→ PAYMENTS (customer payments)                           │
│    └─→ BOX_TRANSACTIONS (boxes given to customer)             │
│                                                                │
│ BOXES                                                         │
│    └─→ BOX_TRANSACTIONS                                       │
│        ├─ Given to: Supplier / Customer                       │
│        └─ Returned from: Supplier / Customer                  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Reports Generated by System

### 1. **Daily Sales Report**

```
Date: 2024-05-10
┌──────────────────────────────────────────────────────────┐
│ Supplier     │ Product    │ Qty │ Rate │ Amount │ Comm   │
├──────────────────────────────────────────────────────────┤
│ Mango Farm   │ Himsagar   │ 200 │ 5TK  │ 1000TK │ 50TK  │
│ Mango Farm   │ Fazli      │ 150 │ 4TK  │ 600TK  │ 30TK  │
│ Pineapple Co │ Yellow     │ 100 │ 6TK  │ 600TK  │ 30TK  │
├──────────────────────────────────────────────────────────┤
│ TOTAL                                 │ 2200TK │ 110TK │
└──────────────────────────────────────────────────────────┘
```

### 2. **Supplier Balance Report**

```
┌──────────────────────────────────────────────────────────┐
│ Supplier     │ Sales   │ Commission │ Paid  │ Due    │
├──────────────────────────────────────────────────────────┤
│ Mango Farm   │ 50,000  │ 2,500      │ 2,000 │ 500    │
│ Pineapple Co │ 30,000  │ 1,500      │ 1,200 │ 300    │
│ Banana Inc   │ 20,000  │ 1,000      │ 1,000 │ 0      │
└──────────────────────────────────────────────────────────┘
```

### 3. **Customer Due Report**

```
┌──────────────────────────────────────────────────────────┐
│ Customer     │ Purchases │ Paid   │ Due    │ Days Owed│
├──────────────────────────────────────────────────────────┤
│ Doly Store   │ 5,000     │ 3,000  │ 2,000  │ 7 days   │
│ Karim Shop   │ 8,000     │ 6,000  │ 2,000  │ 3 days   │
│ Noor Market  │ 3,500     │ 0      │ 3,500  │ 15 days  │
└──────────────────────────────────────────────────────────┘
```

### 3. **Admin Box Inventory Report** ⭐⭐⭐ (NEW)

```
MIDDLEMAN'S BOX INVENTORY STATUS
Date: 2024-05-10

┌─────────────────────────────────────────────────────┐
│         WOODEN CRATES INVENTORY                    │
├─────────────────────────────────────────────────────┤
│ TOTAL BOXES OWNED:                 300 crates     │
│                                                     │
│ Allocation/Location:                               │
│ ├─ In Shop Storage:   85 crates    (28%)  ✓       │
│ ├─ With Suppliers:    14 crates    (5%)           │
│ ├─ With Customers:    201 crates   (67%)          │
│ └─ Lost/Damaged:      0 crates     (0%)           │
│                                                     │
│ Verification: 85 + 14 + 201 + 0 = 300 ✓          │
│                                                     │
│ AVAILABLE FOR NEW TRANSACTIONS: 85 boxes          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│         PLASTIC CRATES INVENTORY                   │
├─────────────────────────────────────────────────────┤
│ TOTAL BOXES OWNED:                 100 crates     │
│                                                     │
│ Allocation/Location:                               │
│ ├─ In Shop Storage:   30 crates    (30%)  ✓       │
│ ├─ With Suppliers:    5 crates     (5%)           │
│ ├─ With Customers:    65 crates    (65%)          │
│ └─ Lost/Damaged:      0 crates     (0%)           │
│                                                     │
│ Verification: 30 + 5 + 65 + 0 = 100 ✓            │
│                                                     │
│ AVAILABLE FOR NEW TRANSACTIONS: 30 boxes          │
└─────────────────────────────────────────────────────┘

TOTAL AVAILABLE BOXES: 115 crates
```

### 4. **Box Purchase History** ⭐ (NEW)

```
When Admin needs more boxes, purchase new ones

┌─────────────────────────────────────────────────────────────┐
│ Date      │ Box Type     │ Qty  │ Cost    │ Status        │
├─────────────────────────────────────────────────────────────┤
│ 2024-01-15│ Wooden       │ 50   │ 5,000TK │ Received ✓    │
│ 2024-02-20│ Plastic      │ 100  │ 3,000TK │ Received ✓    │
│ 2024-03-10│ Wooden       │ 50   │ 5,000TK │ Received ✓    │
│ 2024-04-25│ Wooden       │ 50   │ 5,000TK │ On Order      │
├─────────────────────────────────────────────────────────────┤
│ TOTAL PURCHASED                   │ 18,000TK               │
└─────────────────────────────────────────────────────────────┘

Note: Each purchase INCREASES total_boxes_owned
When boxes arrive → boxes_in_shop_storage increases
```

### 5. **Box Due Report - Suppliers** ⭐

```
Tracking Boxes Outstanding from SUPPLIERS
┌──────────────────────────────────────────────────────┐
│ Supplier         │ Boxes Given │ Returned │ DUE    │
├──────────────────────────────────────────────────────┤
│ Mango Farm XYZ   │ 100 crates  │ 92       │ 8 ← DUE│
│ Pineapple Co     │ 60 crates   │ 56       │ 4 ← DUE│
│ Banana Inc       │ 50 crates   │ 50       │ 0 ✓   │
│ Other Fruits Ltd │ 80 crates   │ 78       │ 2 ← DUE│
├──────────────────────────────────────────────────────┤
│ TOTAL            │ 290 crates  │ 276      │ 14 DUE │
└──────────────────────────────────────────────────────┘

⚠️ Action Required: Follow up with suppliers having boxes due
```

### 5. **Box Due Report - Customers** ⭐

```
Tracking Boxes Outstanding from CUSTOMERS
┌──────────────────────────────────────────────────────┐
│ Customer         │ Boxes Given │ Returned │ DUE    │
├──────────────────────────────────────────────────────┤
│ Doly Store       │ 45 crates   │ 40       │ 5 ← DUE│
│ Karim Shop       │ 60 crates   │ 55       │ 5 ← DUE│
│ Noor Market      │ 35 crates   │ 32       │ 3 ← DUE│
│ Raja Retail      │ 50 crates   │ 50       │ 0 ✓   │
│ Fatima Store     │ 30 crates   │ 28       │ 2 ← DUE│
├──────────────────────────────────────────────────────┤
│ TOTAL            │ 220 crates  │ 205      │ 15 DUE │
└──────────────────────────────────────────────────────┘

⚠️ Action Required: Collect boxes from customers with outstanding boxes
```

### 6. **Commission Report**

```
┌──────────────────────────────────────────────────────────┐
│ Period: May 2024                                        │
├──────────────────────────────────────────────────────────┤
│ Total Sales Value:      500,000 TK                       │
│ Total Commission (5%):  25,000 TK                        │
│ Supplier Payouts:       475,000 TK                       │
│ Operating Costs:        3,000 TK                         │
│ Net Profit:             22,000 TK                        │
└──────────────────────────────────────────────────────────┘
```

---

## Admin Dashboard & Authentication ⭐⭐⭐

### Admin Login System (Simple & Direct)

```
┌────────────────────────────────────────────────────────┐
│              CBTrading - Admin Login                  │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │                                                  │ │
│  │  Email or Username:                             │ │
│  │  ┌──────────────────────────────────────────┐  │ │
│  │  │ admin@cbtrading.com                      │  │ │
│  │  │ (or: admin123)                           │  │ │
│  │  └──────────────────────────────────────────┘  │ │
│  │                                                  │ │
│  │  Password:                                      │ │
│  │  ┌──────────────────────────────────────────┐  │ │
│  │  │ ••••••••                                 │  │ │
│  │  └──────────────────────────────────────────┘  │ │
│  │                                                  │ │
│  │           [ LOGIN BUTTON ]                      │ │
│  │                                                  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Simple Session: Admin logs in → Gets access         │
│  to dashboard → Can manage boxes                      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Admin Database Table (Simple)

```
ADMIN TABLE ⭐ (SIMPLE - No JWT needed)
├─ admin_id (PK)
├─ email (UNIQUE) - For login
├─ username (UNIQUE) - Alternative login
├─ password (hashed with bcrypt)
├─ full_name
├─ phone
├─ created_date
├─ last_login
├─ is_active (true/false)
└─ notes
```

### How Login Works (Simple)

```
1. Admin enters email/username + password on login page
2. System checks ADMIN table
3. If match found:
   ✓ Create simple session/cookie
   ✓ Admin redirected to dashboard
   ✓ Session stays active during use
4. If no match:
   ✗ Show error message
   ✗ Return to login page
5. Admin clicks LOGOUT:
   ✓ Session ends
   ✓ Redirect to login page
```

---

## Admin Dashboard - Box Management

### Box Summary Panel

```
┌─────────────────────────────────────────────────────────────────────┐
│                   ADMIN BOX DASHBOARD                              │
│                                                                     │
│  Welcome: admin@cbtrading.com  [Logout]                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    BOX SUMMARY (Wooden Crates)               │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │                                                              │ │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │ │
│  │  │  TOTAL BOXES   │  │  BOXES DUE     │  │ BOXES IN-HAND  │ │ │
│  │  │                │  │  (Outstanding) │  │ (Undue)        │ │ │
│  │  │     300        │  │      215       │  │      85        │ │ │
│  │  │   crates       │  │    crates      │  │    crates      │ │ │
│  │  │                │  │                │  │                │ │ │
│  │  │ (Fixed Stock)  │  │ (With Suppliers│  │ (Available)    │ │ │
│  │  │                │  │  & Customers)  │  │                │ │ │
│  │  └────────────────┘  └────────────────┘  └────────────────┘ │ │
│  │                                                              │ │
│  │  KEY FORMULA:                                               │ │
│  │  BOXES IN-HAND = TOTAL BOXES - BOXES DUE                   │ │
│  │  85 = 300 - 215 ✓                                           │ │
│  │                                                              │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Admin Actions - Update Boxes

```
┌─────────────────────────────────────────────────────────────────────┐
│                  BOX MANAGEMENT OPTIONS                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [ + ADD NEW BOXES ]  (When purchasing new boxes)                 │
│  └─ Increases: TOTAL BOXES                                        │
│  └─ Opens form: Box Type, Quantity, Cost, Supplier                │
│                                                                     │
│  [ - MARK LOST/DAMAGED ]  (Remove boxes from inventory)           │
│  └─ Decreases: TOTAL BOXES                                        │
│  └─ Opens form: Box Type, Quantity, Reason                        │
│                                                                     │
│  [ 📦 BOX TRANSACTIONS ]  (View all box movements)                │
│  └─ See: Given, Returned, Purchased, Lost, Damaged               │
│                                                                     │
│  [ 👥 BOXES DUE - SUPPLIERS ]  (Boxes outstanding from suppliers) │
│  └─ Track: Mango Farm: 8 boxes, Pineapple Co: 4 boxes, etc       │
│                                                                     │
│  [ 👥 BOXES DUE - CUSTOMERS ]  (Boxes outstanding from customers) │
│  └─ Track: Doly Store: 5 boxes, Karim Shop: 5 boxes, etc         │
│                                                                     │
│  [ 📊 BOX REPORTS ]                                                │
│  └─ View: Inventory, Purchase History, Accountability             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Action 1: ADD NEW BOXES (Increase Inventory)

```
┌────────────────────────────────────────────────────────┐
│         ADD NEW BOXES TO INVENTORY                    │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Box Type:      [ Wooden Crate    ▼ ]                │
│                                                        │
│  Quantity:      [ 50 boxes        ]                   │
│                                                        │
│  Unit Cost:     [ 100 TK          ]                   │
│                                                        │
│  Total Cost:    [ 5,000 TK        ]                   │
│                                                        │
│  Supplier Name: [ XYZ Box Company ]                   │
│                                                        │
│  Purchase Date: [ 2024-05-10      ]                   │
│                                                        │
│  Status:        [ Received ▼ ]                        │
│                 (or: Ordered, In Transit, etc)       │
│                                                        │
│  Notes:         [ Optional notes  ]                   │
│                                                        │
│              [ ADD BOXES ]  [ CANCEL ]                │
│                                                        │
│  After clicking ADD:                                  │
│  ✓ TOTAL BOXES increases from 300 → 350             │
│  ✓ BOXES IN-HAND increases from 85 → 135            │
│  ✓ Transaction logged                               │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Action 2: MARK BOXES LOST/DAMAGED (Decrease Inventory)

```
┌────────────────────────────────────────────────────────┐
│      MARK BOXES LOST OR DAMAGED                       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Box Type:      [ Wooden Crate    ▼ ]                │
│                                                        │
│  Quantity:      [ 2 boxes         ]                   │
│                                                        │
│  Reason:        [ Lost ▼ ]                            │
│                 (or: Damaged, Broken, etc)           │
│                                                        │
│  Description:   [ Dropped in yard ]                   │
│                                                        │
│  Date:          [ 2024-05-10      ]                   │
│                                                        │
│  Notes:         [ Optional notes  ]                   │
│                                                        │
│         [ MARK AS LOST/DAMAGED ]  [ CANCEL ]          │
│                                                        │
│  After clicking MARK:                                 │
│  ✓ TOTAL BOXES decreases from 300 → 298             │
│  ✓ BOXES IN-HAND decreases from 85 → 83             │
│  ✓ Transaction logged                               │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Box Balance Calculation

```
┌─────────────────────────────────────────────────────────────────┐
│              BOX ACCOUNTING FORMULA                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TOTAL BOXES OWNED (Fixed):                                    │
│  = Initial Boxes + Purchases - Lost/Damaged                    │
│  = 200 + 100 - 0 = 300 boxes                                   │
│                                                                 │
│  BOXES DUE (Outstanding):                                      │
│  = (Boxes to Suppliers) + (Boxes to Customers)                │
│  = 14 + 201 = 215 boxes owed to admin                         │
│                                                                 │
│  BOXES IN-HAND / UNDUE (Available):                            │
│  = TOTAL BOXES - BOXES DUE                                     │
│  = 300 - 215 = 85 boxes (in shop storage, ready to use)      │
│                                                                 │
│  Dashboard Display:                                             │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  │ TOTAL: 300       │ │ DUE: 215         │ │ IN-HAND: 85      │
│  │ (Fixed)          │ │ (Outstanding)    │ │ (Available)      │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘
│                                                                 │
│  Verification:                                                  │
│  300 (Total) = 215 (Due) + 85 (In-Hand) ✓                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack Recommendation

### Backend
- **Framework**: Spring Boot (Java) / Node.js (JavaScript)
- **Database**: PostgreSQL
- **API**: REST API / GraphQL

### Frontend
- **Web**: React.js / Vue.js
- **Mobile**: React Native / Flutter (future)
- **UI Library**: Material UI / Ant Design

### Infrastructure
- **Deployment**: Cloud (AWS/Azure/GCP) or VPS
- **Database Hosting**: Managed PostgreSQL
- **Payment Integration**: Bkash/Nagad/Bank API

### Additional Tools
- **Session Management**: Simple Session/Cookie (no JWT needed)
- **Password Encryption**: bcrypt (hash passwords)
- **Reporting**: ReportLab / Crystal Reports
- **PDF Generation**: Puppeteer / PDFKit
- **Analytics**: Google Analytics / Custom Dashboard

---

## Key Features for MVP (Minimum Viable Product)

### Phase 1: Core Functionality (Week 1-4)
- ✅ **Admin Authentication** (Email/Password login) ⭐
- ✅ **Admin Box Dashboard** (Total, Due, In-Hand boxes) ⭐
- ✅ **Box Management** (Add boxes, Mark lost/damaged) ⭐
- ✅ Supplier registration & product management
- ✅ Customer management (Permanent & Cash)
- ✅ Sales entry with commission calculation
- ✅ Basic payment tracking
- ✅ Daily sales report

### Phase 2: Advanced Features (Week 5-8)
- ✅ Complete box tracking system
- ✅ Box accountability reports (Due from suppliers & customers)
- ✅ Credit management for permanent customers
- ✅ Supplier settlement automation
- ✅ Customer due reports
- ✅ Payment reconciliation

### Phase 3: Optimization (Week 9-12)
- ✅ Analytics dashboard
- ✅ Mobile-responsive interface
- ✅ Barcode integration
- ✅ Bulk invoice printing
- ✅ Data backup & recovery

### Phase 4: Scaling
- ✅ Multi-operator support
- ✅ Role-based access control
- ✅ Advanced analytics
- ✅ Mobile app
- ✅ Offline functionality

---

## Implementation Benefits

### Current Challenges (Manual System)
```
❌ Manual entry errors
❌ Time-consuming record keeping
❌ Difficult to track credits
❌ Box accountability issues
❌ Hard to calculate commissions
❌ No historical records
❌ Difficult scaling
```

### After Implementation (Digital System)
```
✅ Automated data entry
✅ Real-time transaction recording
✅ Automatic due tracking
✅ Complete box audit trail
✅ Instant commission calculation
✅ Full transaction history
✅ Easy to scale to 5,000+ daily transactions
✅ Better decision-making with reports
✅ Reduced fraud
✅ Professional operation
```

---

## Scalability Planning

### Daily Transaction Capacity

```
Current Manual System:     ~500-1,000 transactions/day
Digital System (Phase 1):  ~2,000-3,000 transactions/day
Digital System (Optimized): ~5,000+ transactions/day

Database Performance:
└─ PostgreSQL can handle 10,000+ transactions/day
   with proper indexing & optimization
```

### Growth Roadmap

```
Year 1: Single shop, 2,000-3,000 transactions/day
Year 2: Same shop, 4,000-5,000 transactions/day
Year 3: Expand to 2-3 shops
Year 4+: Regional expansion
```

---

## Conclusion

The **CBTrading Digital Management System** transforms a manual agricultural trading business into a fully automated, scalable operation. By digitizing supplier accounts, customer credits, box tracking, and payment settlement, the system:

1. **Eliminates manual errors** - Automated calculations and records
2. **Improves accountability** - Complete audit trail for all transactions
3. **Enables scaling** - Handle 5,000+ daily transactions effortlessly
4. **Increases profitability** - Better insights & reduced fraud
5. **Provides professional operation** - Digital records & reporting
6. **Supports business growth** - Multi-shop & expansion ready

The system is designed to grow with the business, starting with basic functionality and expanding with advanced features as needed.

---

## Next Steps

1. **Finalize Requirements** - Confirm all business rules and edge cases
2. **Design Database Schema** - Create detailed ER diagram
3. **Develop Backend API** - Implement all modules and services
4. **Build Frontend UI** - Create user-friendly interface
5. **Testing** - Unit, integration, and user acceptance testing
6. **Deployment** - Deploy to production environment
7. **Training** - Train operators on system usage
8. **Go-Live** - Launch and monitor for issues

---

*Document created for CBTrading Business Model*
*Last Updated: May 2024*

---

## Admin System Flow Summary ⭐⭐⭐

```
┌─────────────────────────────────────────────────────────────────────┐
│                     COMPLETE ADMIN WORKFLOW                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  STEP 1: LOGIN                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ Admin enters: email + password                             │   │
│  │ System validates credentials                               │   │
│  │ ✓ Authentication successful → Dashboard                    │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  STEP 2: VIEW BOX DASHBOARD                                         │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                                                            │   │
│  │  WOODEN CRATES:                                           │   │
│  │  ┌──────────────┬──────────────┬──────────────┐           │   │
│  │  │ TOTAL: 300   │ DUE: 215     │ IN-HAND: 85  │           │   │
│  │  │ (Fixed)      │ (Outstanding)│ (Available)  │           │   │
│  │  └──────────────┴──────────────┴──────────────┘           │   │
│  │                                                            │   │
│  │  PLASTIC CRATES:                                          │   │
│  │  ┌──────────────┬──────────────┬──────────────┐           │   │
│  │  │ TOTAL: 100   │ DUE: 70      │ IN-HAND: 30  │           │   │
│  │  │ (Fixed)      │ (Outstanding)│ (Available)  │           │   │
│  │  └──────────────┴──────────────┴──────────────┘           │   │
│  │                                                            │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  STEP 3: UPDATE BOX NUMBERS (if needed)                             │
│                                                                     │
│  OPTION A: ADD NEW BOXES (Increase TOTAL)                          │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ Click: [ + ADD NEW BOXES ]                                │   │
│  │ Fill: Box Type, Quantity, Cost, Supplier                 │   │
│  │ Result:                                                    │   │
│  │   TOTAL: 300 → 350 (increased)                            │   │
│  │   IN-HAND: 85 → 135 (increased)                          │   │
│  │   DUE: 215 (no change)                                    │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  OPTION B: MARK LOST/DAMAGED (Decrease TOTAL)                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ Click: [ - MARK LOST/DAMAGED ]                            │   │
│  │ Fill: Box Type, Quantity, Reason                         │   │
│  │ Result:                                                    │   │
│  │   TOTAL: 300 → 298 (decreased)                            │   │
│  │   IN-HAND: 85 → 83 (decreased)                           │   │
│  │   DUE: 215 (no change)                                    │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  STEP 4: VIEW DETAILED REPORTS                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ [ 👥 BOXES DUE - SUPPLIERS ]                               │   │
│  │ Shows which suppliers owe boxes                            │   │
│  │ Example: Mango Farm: 8 boxes due                          │   │
│  │                                                            │   │
│  │ [ 👥 BOXES DUE - CUSTOMERS ]                               │   │
│  │ Shows which customers owe boxes                            │   │
│  │ Example: Doly Store: 5 boxes due                          │   │
│  │                                                            │   │
│  │ [ 📊 BOX TRANSACTIONS ]                                    │   │
│  │ Timeline of all box movements                              │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  STEP 5: LOGOUT                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ Click: [ LOGOUT ]                                         │   │
│  │ Session ends, returns to login page                       │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Calculations & Formulas ⭐

```
ADMIN BOX ACCOUNTING:

1. TOTAL BOXES (Fixed Stock)
   = Initial Boxes + Purchases - Lost/Damaged
   = 200 + 100 - 0 = 300 crates
   
   Action: Changes only when admin:
   - Buys new boxes (+)
   - Marks boxes as lost/damaged (-)

2. BOXES DUE (Outstanding)
   = Boxes with Suppliers + Boxes with Customers
   = 14 + 201 = 215 crates
   
   Action: Changes only when:
   - Boxes given out to suppliers/customers (+)
   - Boxes returned from suppliers/customers (-)

3. BOXES IN-HAND / UNDUE (Available)
   = TOTAL BOXES - BOXES DUE
   = 300 - 215 = 85 crates
   
   These 85 boxes are in shop storage, ready for use
   in next transactions

VERIFICATION:
TOTAL = IN-HAND + DUE
300 = 85 + 215 ✓

DASHBOARD DISPLAY:
┌───────────────┬───────────────┬───────────────┐
│ TOTAL: 300    │ DUE: 215      │ IN-HAND: 85   │
│ (Fixed)       │ (Outstanding) │ (Available)   │
└───────────────┴───────────────┴───────────────┘
```

---

## Database Tables for Admin System ⭐

```
1. ADMIN TABLE (Login Credentials)
   ├─ admin_id (PK)
   ├─ email (UNIQUE) - For login
   ├─ password (encrypted/hashed) - For authentication
   ├─ full_name
   ├─ phone
   ├─ created_date
   ├─ last_login
   ├─ status (active/inactive)
   └─ role (Super Admin, Admin, etc)

2. ADMIN_BOX_INVENTORY TABLE (Current Stock)
   ├─ inventory_id (PK)
   ├─ admin_id (FK) - Which admin owns
   ├─ box_type
   ├─ total_boxes_owned ⭐ (FIXED - can only change via purchase/loss)
   ├─ boxes_in_shop_storage (IN-HAND)
   ├─ boxes_with_suppliers (DUE from suppliers)
   ├─ boxes_with_customers (DUE from customers)
   ├─ boxes_lost_damaged (removed from inventory)
   ├─ last_updated_date
   └─ notes

3. BOX_PURCHASE_TABLE (When Admin Buys Boxes)
   ├─ purchase_id (PK)
   ├─ admin_id (FK)
   ├─ box_type
   ├─ quantity (how many boxes)
   ├─ purchase_date
   ├─ unit_cost
   ├─ total_cost
   ├─ supplier_name
   ├─ status (ordered/received/in_stock)
   └─ notes
   
   Effect: Increases total_boxes_owned

4. BOX_LOSS_REPORT (When Boxes are Lost/Damaged)
   ├─ loss_id (PK)
   ├─ admin_id (FK)
   ├─ box_type
   ├─ quantity
   ├─ loss_date
   ├─ reason (lost/damaged/broken)
   ├─ description
   └─ notes
   
   Effect: Decreases total_boxes_owned
```

---

*CBTrading Business Model - Complete Documentation*
*Last Updated: May 2024*
