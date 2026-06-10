package org.example.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import org.example.model.SupplierDelivery;
import org.example.model.WholesalerSupplier;
import org.example.model.enums.SettlementType;
import org.example.repository.SaleItemRepository;
import org.example.repository.SupplierDeliveryRepository;
import org.example.repository.SupplierExpenseRepository;
import org.example.repository.SupplierSettlementRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Single source of truth for a supplier's net due (consignment model):
 *   opening + total sold − commission − expense − payments to supplier.
 * Commission is per-lot (sold × rate); expense is a deduction; payments are
 * PRODUCT_PAYMENT settlements. Negative result = wholesaler overpaid (supplier holds
 * credit / advance). Settling a shipment never affects this.
 */
@Service
public class SupplierDueService {

    private final SaleItemRepository saleItemRepository;
    private final SupplierDeliveryRepository supplierDeliveryRepository;
    private final SupplierExpenseRepository supplierExpenseRepository;
    private final SupplierSettlementRepository supplierSettlementRepository;

    public SupplierDueService(
            SaleItemRepository saleItemRepository,
            SupplierDeliveryRepository supplierDeliveryRepository,
            SupplierExpenseRepository supplierExpenseRepository,
            SupplierSettlementRepository supplierSettlementRepository
    ) {
        this.saleItemRepository = saleItemRepository;
        this.supplierDeliveryRepository = supplierDeliveryRepository;
        this.supplierExpenseRepository = supplierExpenseRepository;
        this.supplierSettlementRepository = supplierSettlementRepository;
    }

    @Transactional(readOnly = true)
    public BigDecimal netDue(Long wholesalerId, WholesalerSupplier account) {
        BigDecimal opening = zero(account.getOpeningDue());
        BigDecimal totalSold = zero(saleItemRepository.sumLineTotalBySupplier(wholesalerId, account.getId()));
        BigDecimal commission = BigDecimal.ZERO;
        for (SupplierDelivery lot : supplierDeliveryRepository
                .findByWholesaler_IdAndWholesalerSupplier_IdOrderByDeliveryDateDesc(wholesalerId, account.getId())) {
            BigDecimal rate = lot.getCommissionRate();
            if (rate == null || rate.signum() == 0) {
                continue;
            }
            BigDecimal sold = zero(saleItemRepository.sumLineTotalByDelivery(lot.getId()));
            commission = commission.add(sold.multiply(rate).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP));
        }
        BigDecimal expense = zero(supplierExpenseRepository.sumAmountBySupplier(wholesalerId, account.getId()));
        BigDecimal payments = zero(supplierSettlementRepository.sumAmountBySupplierAndType(
                wholesalerId, account.getId(), SettlementType.PRODUCT_PAYMENT));
        return opening.add(totalSold).subtract(commission).subtract(expense).subtract(payments)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal zero(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}
