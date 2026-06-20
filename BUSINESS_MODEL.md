# CBTrading Business Model

## Summary

CBTrading runs a **commission-based (consignment) wholesale** business. A wholesaler receives
product shipments from suppliers, sells those products to customers, tracks customer due,
tracks what it owes each supplier (net payable), earns commission on supplier sales, and
manages a pool of reusable crates.

It is an internal operating tool, not a public marketplace. An **admin** creates wholesaler
accounts; each **wholesaler** runs its own business through the portal.

> Consignment means the wholesaler sells the supplier's goods on the supplier's behalf,
> keeps a commission, and pays the supplier the rest.

## Main Actors

```text
Admin
  Creates wholesaler users + business profiles.
  Maintains the global product catalog and the global crate-type catalog.

Wholesaler
  Owns the shop/business account.
  Receives shipments (lots) from suppliers, sells to customers, owns crates.
  Tracks customer due, supplier net payable / advances, commission, stock, crates, history.

Supplier
  Sends shipments (lots) to one wholesaler.
  Commission rate is negotiated PER SHIPMENT, usually after the goods sell.
  Receives money FROM the wholesaler. The supplier never pays the wholesaler.
  May hold wholesaler crates for transporting shipments.

Permanent Customer
  Has a wholesaler customer account.
  Can buy on due, partially pay, or fully pay.
  Can borrow crates and return them later.

One-Time Customer
  No account. Must pay the full sale amount immediately.
  No crate tracking. Stored only as a name/phone snapshot on the sale for history.
```

## Business Flow

```text
1.  Admin creates the wholesaler account and seeds the product + crate-type catalogs.
2.  Wholesaler adds its suppliers and customers.
3.  Supplier sends a shipment (a "lot"); the wholesaler records it (Add Shipment).
4.  Receiving a shipment creates lot-scoped inventory for that supplier + product + variety.
5.  A customer buys product; the sale is taken from a specific shipment lot.
6.  The sale decreases that lot's inventory.
7.  The sale increases the customer's due only for the unpaid part (permanent customers).
8.  The sale accrues to the supplier's net payable (see Supplier Payable below).
9.  Commission is applied per lot once the lot's rate is set.
10. Every sale, payment, and crate movement also writes a transaction-history row.
```

## Product Model

Products are a **global catalog** (not owned by any wholesaler). A product has optional
varieties (categories), and a variety may use Lot1..Lot200 sub-lots.

```text
Product:  Mango, Watermelon, Pineapple …
Variety:  Mango → Himsagar, Fazli, Lengra …
```

Price is **not** stored on the product — the market price changes, so the sale price is
entered at sale time.

## Shipments And Inventory

A shipment is the unit of consignment accounting (one "lot"). One shipment is for **one
product**, but can contain many varieties/lot lines.

```text
supplier_deliveries     one row per shipment (header)
supplier_delivery_items one row per variety/lot line
inventory               lot-scoped stock (one row per delivery item), keyed by
                        wholesaler · supplier · product · variety · sub-lot · unit
```

**Auto-naming:** a shipment name is generated as `Product_TotalQtyUnit_MonthDay`
(e.g. `Mango_215Crate_June6`). The name is a human label, editable later; the lot's true
identifier is its id. Adding a shipment shows a confirmation ("alarm") modal first because
it changes stock and is significant.

Estimated value / advance fields were removed from the Add Shipment form — they are not
part of the model.

## Sales Model

Selling is **shipment-wise**: the seller picks the supplier, then the shipment, then the
product/variety line (searchable). Inventory always decrements in pack units (`quantity`).
A sale may be priced per pack unit (`quantity × unitPrice`) or **per kg** when a sale
weight is entered (`saleWeightKg × unitPrice`, unitPrice = per-kg rate).

### Permanent customer
```text
pay full / pay partial / pay nothing (full due)
→ customer due increases by (net sale − paid now)
→ the sale accrues to the supplier's net payable
→ inventory decreases; transaction history row created
```

### One-time customer
```text
must pay the full sale amount; no account, no crate tracking
→ inventory decreases; transaction history row created; no customer due
```

## Supplier Payable, Commission, Expense (consignment)

The wholesaler's balance with a supplier is a **single running net figure**, computed live
across **all** of that supplier's shipments:

```text
Supplier net due = opening due
                 + Σ total sold              (sale value of the supplier's goods)
                 − Σ commission              (per lot: sold × lot commission rate)
                 − Σ expense                 (per lot: labour / transport / others)
                 − Σ payments to supplier    (money the wholesaler paid)
```

- **Commission** is the wholesaler's earning. It is a **deduction** from what the supplier
  is owed — never a separate payment. The rate is set per shipment, usually after selling.
- **Expense** (Labour, Transport, Others) is booked against a shipment and is also a
  **deduction** from the supplier's payable — never a separate payment.
- **Net Payable per lot** (shown in the shipment table) = `total sold − commission − expense`.

### Payments and advances
```text
The supplier never pays the wholesaler. The wholesaler pays the supplier, ad-hoc — NOT
tied to any single shipment. Overpaying is allowed: the excess becomes an ADVANCE
(the net due goes negative) and automatically offsets the next shipment's payable.
```

Example:
```text
Lot sold 6,440 · commission 644 · expense 200  → net payable 5,596
Pay 6,000  → net due = −404  → shown as "Advance Paid 404"
Next lot adds 1,000 payable → net due = 596 (the 404 advance was absorbed)
```

Supplier profile shows two cards: **Supplier Payable** (net due when positive) and
**Advance Paid** (its magnitude when negative) — one is always zero.

### Settlement
"Settle" on a shipment is a **status flag only** (marks a fully-sold lot as closed). It
does **not** move money or change the supplier balance — the balance already reflects the
lot via the formula above. Settling requires the lot's commission rate to be set and all
its stock sold.

## Crate Business Model

Crates are a wholesaler-owned reusable asset (UI says "crate"; some DB tables use `box`).

```text
Crate types are a GLOBAL admin catalog (e.g. BANGLA, CHINA, WOODEN, …) — not a fixed
two-type list. Adding a type propagates to every wholesaler.

Ownership has two legs:
- Wholesaler-owned crates: active stock tracked in `box_inventory`.
- Other-party crates: supplier/customer crates physically in the wholesaler shop, tracked as a liability in `supplier_crate_holdings` / `customer_crate_holdings`.

Crates are type-strict. BANGLA only nets against BANGLA; ENGLISH only nets against ENGLISH.
Crates are netted like money per type: if the wholesaler gave 200 BANGLA and later receives 300 BANGLA from the same party, the party no longer owes BANGLA and the wholesaler now holds 100 BANGLA belonging to that party.

Refundable crate money exists for crate deposits/sales:
- Permanent customer refundable money is stored on `wholesaler_customers.crate_deposit_held`.
- Walk-in refundable crate money comes from crate sale ledger rows and is reduced by walk-in crate refunds.
```

Owned crate locations tracked: in shop · with customers · with suppliers · lost/damaged.
Other-party crates in the shop are shown separately as `Others Crate`; they are not active owned stock and must not be sold/lost/given as wholesaler crates.

```text
Buy 100 BANGLA:                     owned in_shop +100
Customer borrows 20:                owned in_shop -20, with_customers +20, customer crate due +20
Customer returns 12:                owned in_shop +12, with_customers -12, customer crate due -12
Customer returns 30 after owing 20: owned due clears 20; extra 10 becomes Others Crate/customer liability
Supplier takes 10 for shipment:     owned in_shop -10, with_suppliers +10, supplier crate due +10
Supplier returns extra same type:   supplier due clears first; extra becomes Others Crate/supplier liability
Lost/damaged write-off:             removes from owned active inventory, valued at WAC
```

## Payment Model

Money movements are recorded by operation type; all also appear in transaction history.

### Customer payments (`payments`)
```text
customer pays previous due
customer returns crates
customer pays due + returns crates together
customer returns crates and receives refundable crate money
→ cash reduces customer due; returned crates net same-type crate due; depositRefund reduces refundable money held
```

### Supplier money (`supplier_settlements`)
```text
wholesaler pays the supplier (PRODUCT_PAYMENT) — the ONLY supplier money operation
→ reduces the supplier net due; may overpay into an advance (negative due)
```
There are **no** "receive commission" or "receive expense" payment operations — commission
and expense are deductions inside the net payable, not money the supplier hands over.

### Supplier crate operations (crate ledger/balance tables)
```text
wholesaler gives crates to supplier / supplier returns crates
→ updates owned crate location counts when settling wholesaler-owned crates
→ extra returned same-type crates become supplier-owned crates held in the shop (`Others Crate`)
```

## Transaction History

The transaction page shows the wholesaler's unified sale + payment history. `transactions`
is a reporting feed; source truth lives in `sales`, `sale_items`, `payments`,
`supplier_settlements`, `box_ledger`, `account_ledger`, `stock_ledger`.

## Business Invariants

```text
A wholesaler only sees its own rows.
A product sells only if the chosen lot has stock.
One-time customers must pay in full and have no crate tracking.
Permanent customers may pay full / partial / due.
Supplier net due = opening + sold − commission − expense − payments (one running figure).
Commission and expense are deductions, never supplier-paid transactions.
The wholesaler pays the supplier; overpayment becomes an advance (negative due).
Settling a shipment changes status only — it never moves money.
Crate types are a global catalog; owned crates and other-party crates are displayed separately; refundable crate money is tracked and returned when crates are refunded.
Cancelled sales (status CANCELLED) are excluded from all sold/commission/due aggregates.
Every sale / payment / crate movement writes a transaction-history row for audit.
```
