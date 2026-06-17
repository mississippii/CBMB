package org.example.dto;

import java.math.BigDecimal;
import java.util.List;

public record SupplierProfileResponse(
        SupplierAccountResponse account,
        BigDecimal todaySale,
        BigDecimal todayCommission,
        BigDecimal totalSale,
        BigDecimal totalCommission,
        BigDecimal supplierDue,
        List<TransactionResponse> transactions
) {
}
