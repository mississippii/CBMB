# CBTrading Backend Service Guide

## Purpose

`BkendRest` is the Spring Boot backend for CBTrading. It currently provides authentication, admin wholesaler management, and wholesaler supplier/customer account APIs.

The backend is designed around this model:

- One admin user can create wholesalers.
- Each wholesaler has one user account.
- Suppliers and customers are global identity records.
- A wholesaler connects to suppliers/customers through link tables.
- Supplier/customer balances are unique per wholesaler through those link tables.

## Tech Stack

- Java 21
- Spring Boot 4.0.6
- Spring Web MVC
- Spring Data JPA
- MySQL 8
- Spring Security Crypto for password hashing
- Springdoc OpenAPI / Swagger UI
- Maven Wrapper

## Directory Structure

```text
BkendRest/
  src/main/java/org/example/
    config/          Beans and OpenAPI config
    controller/      REST controllers
    dto/             Request and response DTO records
    exception/       Custom exceptions
    model/           JPA entities
    repository/      Spring Data repositories
    service/         Business logic
    BackendRestApp.java
  src/main/resources/
    application.yaml
  pom.xml
```

## Database Configuration

Current config is in:

```text
src/main/resources/application.yaml
```

Current datasource:

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/CBM_Schema
    username: veer
    password: 1234
```

Server:

```yaml
server:
  port: 8080
  address: 192.168.0.177
```

JPA currently uses:

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: update
```

For production, replace `ddl-auto: update` with migrations such as Flyway or Liquibase.

## Run Commands

```bash
./mvnw test
./mvnw spring-boot:run
```

Swagger UI:

```text
http://192.168.0.177:8080/swagger-ui.html
```

OpenAPI JSON:

```text
http://192.168.0.177:8080/v3/api-docs
```

## Current Controllers

```text
AuthController
AdminController
WholesalerController
ApiExceptionHandler
```

## Auth API

Endpoint:

```http
POST /auth/login
```

Payload:

```json
{
  "email": "tanvir@admin.com",
  "password": "Adm!n@123"
}
```

Response:

```json
{
  "id": 1,
  "wholesalerId": null,
  "email": "tanvir@admin.com",
  "fullName": "Tanvir hasan",
  "role": "ADMIN",
  "status": "ACTIVE"
}
```

For a wholesaler user, `wholesalerId` must contain that user's wholesaler row id.

Password handling:

- BCrypt hashes are verified with `PasswordEncoder`.
- Plain text comparison is temporarily supported for the manually inserted admin password.
- Production should migrate the admin password to BCrypt and remove plain text fallback.

## Admin APIs

Base path:

```http
/admin
```

List wholesalers:

```http
GET /admin/wholesalers
```

Create wholesaler:

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

Create wholesaler behavior:

- Inserts into `users`.
- Role is fixed to `WHOLESALER`.
- Status is fixed to `ACTIVE`.
- Password is stored as BCrypt.
- Inserts into `wholesalers`.
- `wholesalers.user_id` references `users.id`.

## Wholesaler APIs

Base path:

```http
/wholesalers/{wholesalerId}
```

List supplier accounts:

```http
GET /wholesalers/{wholesalerId}/suppliers
```

Create/connect supplier:

```http
POST /wholesalers/{wholesalerId}/suppliers
```

Payload:

```json
{
  "name": "Mango Supplier Ltd",
  "phone": "01711111111",
  "address": "Chapainawabganj, Rajshahi",
  "commissionRate": 5.00,
  "openingDue": 10000.00
}
```

Behavior:

- Finds a global supplier by phone.
- If not found, inserts into `suppliers`.
- Inserts into `wholesaler_suppliers`.
- Rejects duplicate connection for the same wholesaler and supplier.

List customer accounts:

```http
GET /wholesalers/{wholesalerId}/customers
```

Create/connect customer:

```http
POST /wholesalers/{wholesalerId}/customers
```

Payload:

```json
{
  "name": "Doly Store",
  "ownerName": "Doly Ahmed",
  "phone": "01811111111",
  "address": "Mirpur, Dhaka",
  "openingDue": 5000.00,
  "jamanotBalance": 1000.00
}
```

Behavior:

- Finds a global customer by phone.
- If not found, inserts into `customers`.
- Inserts into `wholesaler_customers`.
- Rejects duplicate connection for the same wholesaler and customer.

## Current Database Tables

### users

Purpose: authentication and role identity.

Important columns:

```text
id
name
email
password_hash
role             ADMIN, WHOLESALER
status           ACTIVE, DISABLED
created_at
updated_at
```

### wholesalers

Purpose: business profile for a wholesaler user.

Important columns:

```text
id
user_id
business_name
phone
address
status
created_at
updated_at
```

Relationship:

```text
users 1:1 wholesalers
```

### suppliers

Purpose: global supplier identity shared across wholesalers.

Important columns:

```text
id
name
phone
address
status
created_at
updated_at
```

### wholesaler_suppliers

Purpose: wholesaler-specific supplier account.

Important columns:

```text
id
wholesaler_id
supplier_id
commission_rate
opening_due
status
created_at
updated_at
```

Relationships:

```text
wholesalers 1:N wholesaler_suppliers
suppliers   1:N wholesaler_suppliers
```

### customers

Purpose: global customer identity shared across wholesalers.

Important columns:

```text
id
name
owner_name
phone
address
status
created_at
updated_at
```

### wholesaler_customers

Purpose: wholesaler-specific customer account.

Important columns:

```text
id
wholesaler_id
customer_id
opening_due
jamanot_balance
status
created_at
updated_at
```

Relationships:

```text
wholesalers 1:N wholesaler_customers
customers   1:N wholesaler_customers
```

## Current Service Classes

```text
AuthService
AdminWholesalerService
WholesalerService
```

Responsibilities:

- `AuthService`: validates login and returns role/profile info.
- `AdminWholesalerService`: creates and lists wholesalers.
- `WholesalerService`: creates/lists supplier and customer accounts for a wholesaler.

## Current Limitations

These areas still need backend implementation:

- Products and supplier deliveries
- Product stock table
- Sales transaction table
- Payment table
- Partitioned transaction/payment tables
- Box inventory and box movement tables
- Customer due recalculation through persisted transactions
- Supplier commission and expense settlement
- PDF/export endpoint
- JWT/session security
- Role-based authorization filters
- Database migrations

## Production Notes

Before production:

- Replace plain admin password fallback with BCrypt only.
- Add JWT or session-based authentication.
- Add role-based authorization to protect admin and wholesaler APIs.
- Replace `ddl-auto: update` with migration scripts.
- Add indexes for phone lookup and wholesaler account lookups.
- Add transaction/payment partitioning when those tables are created.
- Add integration tests for create wholesaler, login, create supplier, create customer.
- Move database credentials into environment variables.

