# BkendRest Project Guide

## API List

This API plan is based on the current Portal frontend design. Development should implement backend APIs first, verify them with Swagger/Postman, and then connect the frontend section by section.

### Already Started

#### Auth

- `POST /auth/login`
  - Login by email and password.
  - Returns authenticated user info, role, and `wholesalerId` when the user is a wholesaler.

#### Admin

- `GET /admin/me`
  - Returns logged-in admin profile.

- `GET /admin/wholesalers`
  - Lists wholesalers created by admin.

- `POST /admin/wholesalers`
  - Creates a wholesaler user and wholesaler profile.

#### Wholesaler Accounts

- `GET /wholesalers/{wholesalerId}/suppliers`
  - Lists suppliers connected to a wholesaler.

- `POST /wholesalers/{wholesalerId}/suppliers`
  - Creates or connects a supplier account for a wholesaler.

- `GET /wholesalers/{wholesalerId}/customers`
  - Lists customers connected to a wholesaler.

- `POST /wholesalers/{wholesalerId}/customers`
  - Creates or connects a customer account for a wholesaler.

#### Product Catalog

- `GET /products`
  - Lists active products with their active categories.
  - Used by Add Products dropdowns.

#### Supplier Shipment / Add Product

- `POST /wholesalers/{wholesalerId}/supplier-deliveries`
  - Receives supplier shipment.
  - Wholesaler selects supplier, product, category, and enters quantity.
  - Updates `supplier_deliveries`, `supplier_delivery_items`, `inventory`, and `stock_ledger`.

### APIs Needed Next

#### 1. Store Inventory

Used by the default wholesaler landing page and sale product dropdown.

- `GET /wholesalers/{wholesalerId}/inventory`

Optional query parameters:

```text
supplierId=
productId=
status=ACTIVE/STOCK_OUT
```

Response should include:

```text
inventoryId
wholesalerSupplierId
supplierName
supplierPhone
productId
productName
categoryId
categoryName
quantityOnHand
unit
status
lastUpdated
```

#### 2. Sales

Used by `+New Sale`.

- `POST /wholesalers/{wholesalerId}/sales`
- `GET /wholesalers/{wholesalerId}/sales`

Payload should include:

```text
wholesalerCustomerId OR oneTimeCustomer
inventoryId
quantity
unitPrice
paymentAmount
saleType=PAY_INSTANT/PAY_LATER
boxesGiven
jamanotAmount
note
```

The sale API must update:

```text
sales
sale_items
inventory
stock_ledger
transactions
customer due/account ledger
supplier commission due
box ledger/balance when boxes are given
```

#### 3. Payments

Used by Payment page.

- `POST /wholesalers/{wholesalerId}/payments`
- `GET /wholesalers/{wholesalerId}/payments`

Payload should include:

```text
partyType=CUSTOMER/SUPPLIER
partyAccountId
paymentMode=CASH/BOX/BOTH
cashAmount
boxType returns
jamanotAmount
note
```

The payment API must update:

```text
payments
transactions
account balance
customer jamanot
box balances
box inventory
box ledger
```

#### 4. Transactions Dashboard

Used by transaction list, filters, and export.

- `GET /wholesalers/{wholesalerId}/transactions`

Query parameters:

```text
type=SALE/PAYMENT
fromDate=
toDate=
phone=
page=
size=
```

- `GET /wholesalers/{wholesalerId}/transactions/export`
  - Can return PDF later.
  - Initial implementation may return filtered report data and let frontend print/export.

#### 5. Box Dashboard

Used by Box Dashboard.

- `GET /wholesalers/{wholesalerId}/boxes/dashboard`
  - Returns total boxes, in shop, with suppliers, with customers, lost/damaged, and per-type breakdown.

- `POST /wholesalers/{wholesalerId}/boxes/purchase`
  - Adds newly purchased boxes to wholesaler inventory.

- `POST /wholesalers/{wholesalerId}/boxes/lost-damaged`
  - Marks boxes as lost or damaged.

Later box APIs:

- `GET /wholesalers/{wholesalerId}/boxes/ledger`
- `GET /wholesalers/{wholesalerId}/boxes/balances`

#### 6. Supplier Profile

Used by supplier detail page.

- `GET /wholesalers/{wholesalerId}/suppliers/{wholesalerSupplierId}`
- `GET /wholesalers/{wholesalerId}/suppliers/{wholesalerSupplierId}/inventory`
- `GET /wholesalers/{wholesalerId}/suppliers/{wholesalerSupplierId}/transactions`
- `GET /wholesalers/{wholesalerId}/suppliers/{wholesalerSupplierId}/due-summary`

#### 7. Customer Profile

Used by customer detail page.

- `GET /wholesalers/{wholesalerId}/customers/{wholesalerCustomerId}`
- `GET /wholesalers/{wholesalerId}/customers/{wholesalerCustomerId}/transactions`
- `GET /wholesalers/{wholesalerId}/customers/{wholesalerCustomerId}/due-summary`
- `GET /wholesalers/{wholesalerId}/customers/{wholesalerCustomerId}/box-summary`

### Recommended Implementation Order

1. `GET /wholesalers/{wholesalerId}/inventory`
2. Connect landing page and sale product dropdown to real inventory.
3. `POST /wholesalers/{wholesalerId}/sales`
4. `GET /wholesalers/{wholesalerId}/transactions`
5. `POST /wholesalers/{wholesalerId}/payments`
6. Box dashboard APIs.
7. Supplier/customer detail APIs.

This order keeps development stable because inventory is the base for sales, and sales/payments are the base for transactions.
