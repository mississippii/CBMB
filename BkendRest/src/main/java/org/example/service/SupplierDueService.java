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
        // Sum each shipment's net payable, computed IDENTICALLY to
        // SupplierDeliveryService.toDeliveryResponse (commission ceiled per shipment, then
        // sold − commission − expense). This way the account balance always equals the sum
        // of the per-shipment net payables shown in the supplier profile, with no rounding
        // drift: positive lots add to the supplier payable, negative lots (where the
        // wholesaler is out of pocket) add to the advance held by the supplier. Keep the two
        // formulas in sync.
        BigDecimal shipmentsNet = BigDecimal.ZERO;
        for (SupplierDelivery lot : supplierDeliveryRepository
                .findByWholesaler_IdAndWholesalerSupplier_IdOrderByDeliveryDateDesc(wholesalerId, account.getId())) {
            BigDecimal sold = zero(saleItemRepository.sumLineTotalByDelivery(lot.getId()));
            BigDecimal rate = lot.getCommissionRate();
            BigDecimal commission = (rate == null || rate.signum() == 0) ? BigDecimal.ZERO
                    : sold.multiply(rate).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)
                        .setScale(0, RoundingMode.CEILING);
            BigDecimal expense = zero(supplierExpenseRepository.sumAmountByDelivery(lot.getId()));
            shipmentsNet = shipmentsNet.add(sold.subtract(commission).subtract(expense));
        }
        BigDecimal payments = zero(supplierSettlementRepository.sumAmountBySupplierAndType(
                wholesalerId, account.getId(), SettlementType.PRODUCT_PAYMENT));
        // UP = round magnitude away from zero, so a fractional advance (negative balance)
        // rounds UP in size rather than shrinking toward zero (the bug this fixes).
        return opening.add(shipmentsNet).subtract(payments).setScale(0, RoundingMode.UP);
    }

    private static BigDecimal zero(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}
