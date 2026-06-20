package org.example.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.example.dto.CrateTypeQuantity;
import org.example.dto.SaleDetailResponse;
import org.example.dto.SupplierDeliveryResponse;
import org.example.dto.SupplierPortalOverviewResponse;
import org.example.dto.SupplierPortalShipmentResponse;
import org.example.dto.TransactionResponse;
import org.example.exception.BadRequestException;
import org.example.model.BoxBalance;
import org.example.model.Supplier;
import org.example.model.Wholesaler;
import org.example.model.WholesalerSupplier;
import org.example.model.enums.PartyType;
import org.example.repository.BoxBalanceRepository;
import org.example.repository.SupplierDeliveryRepository;
import org.example.repository.SupplierRepository;
import org.example.repository.WholesalerSupplierRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Read-only queries for the supplier portal. A supplier may supply several
 * wholesalers (one wholesaler_suppliers account each); everything here is
 * aggregated across those accounts and never mutates state.
 */
@Service
public class SupplierPortalService {

    private final SupplierRepository supplierRepository;
    private final WholesalerSupplierRepository wholesalerSupplierRepository;
    private final SupplierDeliveryRepository supplierDeliveryRepository;
    private final SupplierDueService supplierDueService;
    private final SupplierDeliveryService supplierDeliveryService;
    private final TransactionService transactionService;
    private final SaleService saleService;
    private final BoxBalanceRepository boxBalanceRepository;

    public SupplierPortalService(
            SupplierRepository supplierRepository,
            WholesalerSupplierRepository wholesalerSupplierRepository,
            SupplierDeliveryRepository supplierDeliveryRepository,
            SupplierDueService supplierDueService,
            SupplierDeliveryService supplierDeliveryService,
            TransactionService transactionService,
            SaleService saleService,
            BoxBalanceRepository boxBalanceRepository
    ) {
        this.supplierRepository = supplierRepository;
        this.wholesalerSupplierRepository = wholesalerSupplierRepository;
        this.supplierDeliveryRepository = supplierDeliveryRepository;
        this.supplierDueService = supplierDueService;
        this.supplierDeliveryService = supplierDeliveryService;
        this.transactionService = transactionService;
        this.saleService = saleService;
        this.boxBalanceRepository = boxBalanceRepository;
    }

    @Transactional(readOnly = true)
    public SupplierPortalOverviewResponse overview(Long supplierId) {
        Supplier supplier = findSupplier(supplierId);

        List<SupplierPortalOverviewResponse.WholesalerLink> links = new ArrayList<>();
        BigDecimal totalPayable = BigDecimal.ZERO;
        BigDecimal totalAdvance = BigDecimal.ZERO;
        for (WholesalerSupplier account : wholesalerSupplierRepository.findBySupplier_IdOrderByCreatedAtDesc(supplierId)) {
            Wholesaler wholesaler = account.getWholesaler();
            BigDecimal netDue = supplierDueService.netDue(wholesaler.getId(), account);
            int shipmentCount = supplierDeliveryRepository
                    .findByWholesaler_IdAndWholesalerSupplier_IdOrderByDeliveryDateDesc(wholesaler.getId(), account.getId())
                    .size();
            List<CrateTypeQuantity> crateDues = crateDues(wholesaler.getId(), account.getId());
            links.add(new SupplierPortalOverviewResponse.WholesalerLink(
                    account.getId(),
                    wholesaler.getId(),
                    wholesaler.getBusinessName(),
                    wholesaler.getUser() == null ? null : wholesaler.getUser().getName(),
                    wholesaler.getPhone(),
                    wholesaler.getAddress(),
                    account.getCommissionRate(),
                    account.getStatus().name(),
                    netDue,
                    shipmentCount,
                    crateDues,
                    (int) crateDues.stream().mapToLong(CrateTypeQuantity::quantity).sum()
            ));
            if (netDue.signum() >= 0) {
                totalPayable = totalPayable.add(netDue);
            } else {
                totalAdvance = totalAdvance.add(netDue.abs());
            }
        }

        return new SupplierPortalOverviewResponse(
                supplier.getId(),
                supplier.getName(),
                supplier.getBusinessName(),
                supplier.getPhone(),
                totalPayable,
                totalAdvance,
                links
        );
    }

    @Transactional(readOnly = true)
    public List<SupplierPortalShipmentResponse> shipments(Long supplierId, Long wholesalerId) {
        findSupplier(supplierId);

        List<SupplierPortalShipmentResponse> result = new ArrayList<>();
        for (WholesalerSupplier account : wholesalerSupplierRepository.findBySupplier_IdOrderByCreatedAtDesc(supplierId)) {
            Wholesaler wholesaler = account.getWholesaler();
            if (wholesalerId != null && !wholesaler.getId().equals(wholesalerId)) {
                continue;
            }
            for (SupplierDeliveryResponse shipment
                    : supplierDeliveryService.listShipmentsForSupplier(wholesaler.getId(), account.getId())) {
                result.add(new SupplierPortalShipmentResponse(wholesaler.getId(), wholesaler.getBusinessName(), shipment));
            }
        }
        result.sort(Comparator.comparing(
                (SupplierPortalShipmentResponse r) -> r.shipment().deliveryDate(),
                Comparator.nullsLast(Comparator.reverseOrder())));
        return result;
    }


    @Transactional(readOnly = true)
    public List<TransactionResponse> sales(Long supplierId, Long accountId) {
        WholesalerSupplier account = findSupplierAccount(supplierId, accountId);
        return transactionService.listSupplierTransactions(account.getWholesaler().getId(), account.getId())
                .stream()
                .filter(t -> "SALE".equals(t.transactionType()))
                .toList();
    }

    @Transactional(readOnly = true)
    public SaleDetailResponse saleDetail(Long supplierId, Long accountId, Long saleId) {
        WholesalerSupplier account = findSupplierAccount(supplierId, accountId);
        return saleService.detailForSupplier(account.getWholesaler().getId(), saleId, account.getId());
    }

    /** Crates this supplier currently holds from the wholesaler, per type (non-zero only). */
    private List<CrateTypeQuantity> crateDues(Long wholesalerId, Long accountId) {
        Map<String, Long> byType = new LinkedHashMap<>();
        for (BoxBalance balance : boxBalanceRepository
                .findByWholesaler_IdAndPartyTypeAndPartyAccountId(wholesalerId, PartyType.WHOLESALER_SUPPLIER, accountId)) {
            int due = balance.getBoxesDue() == null ? 0 : balance.getBoxesDue();
            if (due == 0) {
                continue;
            }
            String typeName = balance.getBoxType().getName() == null ? "" : balance.getBoxType().getName().toUpperCase(Locale.ROOT);
            byType.merge(typeName, (long) due, Long::sum);
        }
        return byType.entrySet().stream()
                .map(e -> new CrateTypeQuantity(e.getKey(), e.getValue()))
                .toList();
    }

    private WholesalerSupplier findSupplierAccount(Long supplierId, Long accountId) {
        findSupplier(supplierId);
        if (accountId == null) {
            throw new BadRequestException("Supplier account is required.");
        }
        WholesalerSupplier account = wholesalerSupplierRepository.findById(accountId)
                .orElseThrow(() -> new BadRequestException("Supplier account not found."));
        if (account.getSupplier() == null || !account.getSupplier().getId().equals(supplierId)) {
            throw new BadRequestException("Supplier account not found.");
        }
        return account;
    }

    private Supplier findSupplier(Long supplierId) {
        if (supplierId == null) {
            throw new BadRequestException("Supplier is required.");
        }
        return supplierRepository.findById(supplierId)
                .orElseThrow(() -> new BadRequestException("Supplier not found."));
    }
}
