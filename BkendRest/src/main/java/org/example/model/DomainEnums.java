package org.example.model;

public final class DomainEnums {

    private DomainEnums() {
    }

    public enum AccountReferenceType {
        SALE,
        PAYMENT,
        SUPPLIER_COMMISSION,
        SUPPLIER_EXPENSE,
        SUPPLIER_SETTLEMENT,
        DUE_ADJUSTMENT,
        OPENING_DUE
    }

    public enum BoxMovementType {
        PURCHASE,
        GIVEN_TO_CUSTOMER,
        RETURNED_FROM_CUSTOMER,
        GIVEN_TO_SUPPLIER,
        RETURNED_FROM_SUPPLIER,
        LOST,
        DAMAGED,
        ADJUSTMENT
    }

    public enum BoxReferenceType {
        SALE,
        PAYMENT,
        SUPPLIER_DELIVERY,
        MANUAL
    }

    public enum BoxTypeName {
        BANGLA,
        CHINA
    }

    public enum BoxLedgerPartyType {
        WHOLESALER,
        WHOLESALER_CUSTOMER,
        WHOLESALER_SUPPLIER
    }

    public enum InventoryStatus {
        ACTIVE,
        STOCK_OUT,
        DISABLED
    }

    public enum PartyType {
        WHOLESALER_CUSTOMER,
        WHOLESALER_SUPPLIER
    }

    public enum PaymentMethod {
        CASH,
        BANK,
        BKASH,
        NAGAD,
        OTHER,
        NONE
    }

    public enum PaymentType {
        CASH_RECEIVE,
        BOX_RETURN,
        CASH_AND_BOX_RETURN
    }

    public enum PostStatus {
        POSTED,
        CANCELLED
    }

    public enum RecordStatus {
        ACTIVE,
        DISABLED
    }

    public enum SaleType {
        PAY_INSTANT,
        PAY_LATER
    }

    public enum SettlementType {
        COMMISSION_PAYOUT,
        EXPENSE_PAYOUT,
        ADVANCE_PAYMENT,
        ADJUSTMENT
    }

    public enum StockDirection {
        IN,
        OUT
    }

    public enum StockReferenceType {
        SUPPLIER_DELIVERY,
        SALE,
        ADJUSTMENT
    }

    public enum TransactionType {
        SALE,
        PAYMENT
    }

    public enum UnitType {
        PCS,
        KG,
        DOZEN,
        BOX,
        BAG,
        MOUND
    }

    public enum UserRole {
        ADMIN,
        WHOLESALER
    }
}
