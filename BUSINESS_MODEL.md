# CBTrading Business Model

## Summary

CBTrading supports a commission-based wholesaler business. A wholesaler receives products from suppliers, sells those products to customers, tracks customer due, tracks supplier payable, earns commission from supplier sales, and manages reusable crates.

The current system is built for the wholesaler's daily operating workflow, not a public marketplace. Admin creates wholesaler accounts. Wholesalers use the portal to operate their own business.

## Main Actors

```text
Admin
  Creates wholesaler users and wholesaler business profiles.

Wholesaler
  Owns the shop/business account.
  Receives product shipments from suppliers.
  Sells product to customers.
  Owns crates.
  Tracks all due, payable, commission, stock, payments, and transaction history.

Supplier
  Provides products to a specific wholesaler.
  Has a commission rate under that wholesaler.
  May hold wholesaler crates for shipment.
  Receives product sale money from the wholesaler.
  Pays commission/expense money to the wholesaler.

Permanent Customer
  Has a wholesaler customer account.
  Can buy on due, partially pay, or fully pay.
  Can receive crates with product and later return them.
  May have Jamanot balance for crates.

One-Time Customer
  Has no customer account.
  Must pay full sale amount immediately.
  Does not receive crate/Jamanot tracking.
  Sale stores name/phone snapshot only for history.
```

## Business Flow

```text
1. Admin creates wholesaler account.
2. Wholesaler adds suppliers and customers.
3. Product catalog exists globally, for example Mango or Watermelon.
4. Product categories belong to product, for example Mango -> Himsagar, Fazli, Lengra.
5. Supplier sends shipment to wholesaler.
6. Wholesaler records shipment in Add Products.
7. Inventory increases for that wholesaler, supplier account, product, and category.
8. Customer buys product.
9. Sale decreases inventory.
10. Sale updates customer due if permanent customer did not fully pay.
11. Sale adds full sale amount to supplier payable even if customer bought on due.
12. Sale calculates supplier commission.
13. Sale creates transaction history.
14. Later payments/crate returns update balances and also create transaction history.
```

## Product Model

Products are general catalog items and are not owned by a wholesaler.

```text
Product examples:
  Mango
  Watermelon
  Pineapple

Category examples:
  Mango -> Himsagar
  Mango -> Fazli
  Mango -> Lengra
```

Rules:

```text
Product may have categories or no categories.
Wholesaler/supplier relation is with inventory, not category.
Price is not fixed on product because market price changes.
Sale-time price is entered when sale occurs.
```

## Supplier Shipment And Inventory

When a supplier sends product, the wholesaler records it as a supplier delivery.

Example:

```text
Supplier: Dhakar Bablu
Product: Mango
Category: Himsagar
Quantity: 100
Unit: BOX
```

Result:

```text
supplier_deliveries row is created
supplier_delivery_items row is created
inventory is created or increased
stock_ledger records stock IN
```

Inventory is tracked by:

```text
wholesaler
supplier account
product
category if present
unit
quantity_on_hand
```

## Sales Model

A sale is a transaction and also a source business record.

### Permanent Customer Sale

A permanent customer can:

```text
pay full amount
pay partial amount
pay nothing now and keep full due
```

Accounting result:

```text
customer due increases by net sale amount minus paid amount
supplier payable increases by full sale amount
commission is calculated for supplier profile/reporting
inventory decreases
transaction history is created
```

### One-Time Customer Sale

A one-time customer:

```text
must pay full sale amount
has no customer account
cannot use crate/Jamanot flow
is stored only as name/phone snapshot on the sale
```

Accounting result:

```text
inventory decreases
supplier payable increases by full sale amount
transaction history is created
no customer due is created
```

## Supplier Payable And Commission

Supplier relation is independent from customer payment timing.

Important rule:

```text
When supplier product is sold, the full sale amount is added to supplier payable, even if customer bought on due.
```

Example:

```text
Sale amount: 10,000
Customer paid now: 2,000
Customer due: 8,000
Supplier payable increases: 10,000
Commission rate: 5%
Commission earned: 500
```

This matches the business reality: the wholesaler owes the supplier based on the supplier's sold product, not based on when the customer pays.

## Customer Due And Jamanot

Customer due is money the permanent customer owes the wholesaler for products.

Jamanot is crate-related money. It is held/settled when crates are given and returned.

Rules:

```text
Product sale creates customer due only for permanent customer unpaid amount.
Crate sale can add Jamanot balance.
Customer payment can reduce due.
Customer crate return can reduce crate due and settle/refund Jamanot.
Jamanot can be zero if no money is settled during crate return.
```

## Crate Business Model

The business calls them crates in the UI. Database tables may use `box` names.

Current crate types:

```text
Bangla Crate
China Crate
```

Ownership rule:

```text
Only the wholesaler owns crates.
Supplier and customer can hold/borrow crates.
Crates are not sold as products.
```

Crate locations:

```text
in shop
with customers
with suppliers
lost/damaged
```

Crate movement examples:

```text
Wholesaler buys 100 Bangla crates:
  total_owned +100
  in_hand +100

Permanent customer buys 20 BOX unit mango and receives 20 crates:
  in_hand -20
  with_customers +20
  customer crate due +20

Customer returns 12 crates:
  in_hand +12
  with_customers -12
  customer crate due -12

Supplier takes 10 crates for shipment:
  in_hand -10
  with_suppliers +10
  supplier crate due +10

Supplier returns 10 crates:
  in_hand +10
  with_suppliers -10
  supplier crate due -10
```

## Payment Model

Payment is also shown in transaction history, but source data is split by operation type.

### Customer Payments

Customer payment operations use `payments`.

Supported operations:

```text
customer pays previous due
customer returns crates
customer pays due and returns crates together
```

Effects:

```text
cash received decreases customer due
crate returned decreases crate due
Jamanot amount decreases customer Jamanot balance if refunded/settled
transaction history row is created
```

### Supplier Money Operations

Supplier money operations use `supplier_settlements`.

Supported operations:

```text
wholesaler pays supplier product money
supplier pays commission money to wholesaler
supplier pays other expense money to wholesaler
```

Effects:

```text
product payment decreases supplier payable
commission receive records commission money received
expense receive records expense money received
transaction history row is created
```

### Supplier Crate Operations

Supplier crate operations use crate ledger/balance tables.

Supported operations:

```text
wholesaler gives crates to supplier
supplier returns crates to wholesaler
```

Effects:

```text
box_inventory updates location counts
box_balances updates supplier crate due
box_ledger records movement
transaction history row is created
```

## Transaction History

The transaction page shows sale and payment history for the logged-in wholesaler.

Transaction history includes:

```text
sales
customer due payments
customer crate returns
supplier product payments
supplier commission receives
supplier expense receives
supplier crate give/return events
```

`transactions` is a reporting table. Source truth remains in:

```text
sales
sale_items
payments
supplier_settlements
box_ledger
account_ledger
stock_ledger
```

## Daily Wholesaler Workflow

```text
Morning:
  Check store inventory.
  Check crate dashboard.
  Review supplier/customer due if needed.

Supplier shipment:
  Add product from supplier.
  Select product/category.
  Enter quantity.
  Inventory increases.

Sale:
  Select supplier stock.
  Select customer or one-time customer.
  Enter quantity and sale price.
  Enter payment status.
  If crate unit and permanent customer, enter Bangla/China crate count and Jamanot.
  System updates inventory, customer due, supplier payable, crate state, and transactions.

Payment/crate settlement:
  Choose customer or supplier.
  Select operation type.
  Save payment/crate movement.
  System updates balances and transactions.

Reporting:
  Transaction page filters by date and customer/supplier phone.
  Export generates a transaction report with sale and payment summaries.
```

## Current UI Interpretation

```text
Store Inventory
  Default landing page. Shows available products by supplier/category/quantity.

Crate Dashboard
  Shows owned crates, crates in shop, with customers, with suppliers, lost/damaged.

Supplier Profile
  Shows today sales, today commission, total sales, total commission, supplier payable, crate due, stock.

Customer Profile
  Shows today purchases, today paid, total purchases, total paid, current due, crate Jamanot, crate due.

Payment Page
  Saves customer and supplier payment/crate operations.

Transaction Page
  Shows unified sale/payment history and export.
```

## Business Invariants

```text
A wholesaler only sees their own rows.
A product can be sold only if inventory quantity is available.
One-time customer must pay full sale amount.
One-time customer cannot use crate/Jamanot flow.
Permanent customer can pay full, partial, or due.
Crate quantity given in BOX sale must match sold box quantity.
Supplier payable increases by full supplier sale amount.
Customer due and supplier payable are different balances.
Crates are owned by wholesaler only.
Jamanot belongs to customer crate process, not supplier product process.
Every sale/payment/crate movement must create history for audit.
```
