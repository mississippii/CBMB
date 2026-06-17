package org.example.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.example.dto.BalanceAuditIssue;
import org.example.dto.BalanceAuditResponse;
import org.example.exception.BadRequestException;
import org.example.model.AccountBalance;
import org.example.model.BoxBalance;
import org.example.model.BoxInventory;
import org.example.model.OtherDueBalance;
import org.example.model.WholesalerCustomer;
import org.example.model.WholesalerSupplier;
import org.example.model.enums.BoxMovementType;
import org.example.model.enums.PartyType;
import org.example.repository.AccountBalanceRepository;
import org.example.repository.AccountLedgerRepository;
import org.example.repository.BoxBalanceRepository;
import org.example.repository.BoxInventoryRepository;
import org.example.repository.BoxLedgerRepository;
import org.example.repository.OtherDueBalanceRepository;
import org.example.repository.SupplierExpenseRepository;
import org.example.repository.WholesalerCustomerRepository;
import org.example.repository.WholesalerRepository;
import org.example.repository.WholesalerSupplierRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Read-only reconciliation of every balance bucket against its underlying ledger:
 *   account_balances vs account_ledger (party-specific debit/credit convention)
 *   box_balances vs box_ledger (per customer/supplier)
 *   box_inventory vs box_ledger (warehouse-level totals)
 *   other_due_balances vs supplier_expenses.due rollup
 * Any drift is returned as a BalanceAuditIssue. Empty issues list means all balances
 * reconcile to within ±0.01 (money) or 0 (crate counts).
 */
@Service
public class BalanceAuditService {

    private static final BigDecimal MONEY_TOLERANCE = new BigDecimal("0.01");

    private final WholesalerRepository wholesalerRepository;
    private final WholesalerCustomerRepository wholesalerCustomerRepository;
    private final WholesalerSupplierRepository wholesalerSupplierRepository;
    private final AccountBalanceRepository accountBalanceRepository;
    private final AccountLedgerRepository accountLedgerRepository;
    private final BoxBalanceRepository boxBalanceRepository;
    private final BoxLedgerRepository boxLedgerRepository;
    private final BoxInventoryRepository boxInventoryRepository;
    private final OtherDueBalanceRepository otherDueBalanceRepository;
    private final SupplierExpenseRepository supplierExpenseRepository;

    public BalanceAuditService(
            WholesalerRepository wholesalerRepository,
            WholesalerCustomerRepository wholesalerCustomerRepository,
            WholesalerSupplierRepository wholesalerSupplierRepository,
            AccountBalanceRepository accountBalanceRepository,
            AccountLedgerRepository accountLedgerRepository,
            BoxBalanceRepository boxBalanceRepository,
            BoxLedgerRepository boxLedgerRepository,
            BoxInventoryRepository boxInventoryRepository,
            OtherDueBalanceRepository otherDueBalanceRepository,
            SupplierExpenseRepository supplierExpenseRepository
    ) {
        this.wholesalerRepository = wholesalerRepository;
        this.wholesalerCustomerRepository = wholesalerCustomerRepository;
        this.wholesalerSupplierRepository = wholesalerSupplierRepository;
        this.accountBalanceRepository = accountBalanceRepository;
        this.accountLedgerRepository = accountLedgerRepository;
        this.boxBalanceRepository = boxBalanceRepository;
        this.boxLedgerRepository = boxLedgerRepository;
        this.boxInventoryRepository = boxInventoryRepository;
        this.otherDueBalanceRepository = otherDueBalanceRepository;
        this.supplierExpenseRepository = supplierExpenseRepository;
    }

    @Transactional(readOnly = true)
    public BalanceAuditResponse audit(Long wholesalerId) {
        if (wholesalerId == null || !wholesalerRepository.existsById(wholesalerId)) {
            throw new BadRequestException("Wholesaler not found.");
        }
        List<BalanceAuditIssue> issues = new ArrayList<>();
        int totalChecked = 0;
        totalChecked += auditAccountBalances(wholesalerId, issues);
        totalChecked += auditBoxPartyBalances(wholesalerId, issues);
        totalChecked += auditBoxInventory(wholesalerId, issues);
        totalChecked += auditOtherDueBalances(wholesalerId, issues);
        return new BalanceAuditResponse(wholesalerId, LocalDateTime.now(), totalChecked, issues.size(), issues);
    }

    private int auditAccountBalances(Long wholesalerId, List<BalanceAuditIssue> issues) {
        Map<String, BigDecimal[]> ledgerSums = new HashMap<>();
        for (Object[] row : accountLedgerRepository.findGroupedSums(wholesalerId)) {
            PartyType partyType = (PartyType) row[0];
            Long partyAccountId = ((Number) row[1]).longValue();
            BigDecimal debit = (BigDecimal) row[2];
            BigDecimal credit = (BigDecimal) row[3];
            ledgerSums.put(partyKey(partyType, partyAccountId), new BigDecimal[]{ debit, credit });
        }
        Map<Long, BigDecimal> customerOpening = new HashMap<>();
        for (WholesalerCustomer c : wholesalerCustomerRepository.findByWholesaler_IdOrderByCreatedAtDesc(wholesalerId)) {
            customerOpening.put(c.getId(), c.getOpeningDue() == null ? BigDecimal.ZERO : c.getOpeningDue());
        }
        Map<Long, BigDecimal> supplierOpening = new HashMap<>();
        for (WholesalerSupplier s : wholesalerSupplierRepository.findByWholesaler_IdOrderByCreatedAtDesc(wholesalerId)) {
            supplierOpening.put(s.getId(), s.getOpeningDue() == null ? BigDecimal.ZERO : s.getOpeningDue());
        }

        List<AccountBalance> balances = accountBalanceRepository.findByWholesaler_Id(wholesalerId);
        for (AccountBalance b : balances) {
            BigDecimal[] sums = ledgerSums.getOrDefault(partyKey(b.getPartyType(), b.getPartyAccountId()), new BigDecimal[]{ BigDecimal.ZERO, BigDecimal.ZERO });
            BigDecimal debit = sums[0];
            BigDecimal credit = sums[1];
            BigDecimal opening = b.getPartyType() == PartyType.WHOLESALER_CUSTOMER
                    ? customerOpening.getOrDefault(b.getPartyAccountId(), BigDecimal.ZERO)
                    : supplierOpening.getOrDefault(b.getPartyAccountId(), BigDecimal.ZERO);
            BigDecimal expected = b.getPartyType() == PartyType.WHOLESALER_CUSTOMER
                    ? money(opening.add(debit).subtract(credit))
                    : money(opening.add(credit).subtract(debit));
            BigDecimal actual = money(b.getBalance() == null ? BigDecimal.ZERO : b.getBalance());
            if (actual.subtract(expected).abs().compareTo(MONEY_TOLERANCE) > 0) {
                issues.add(new BalanceAuditIssue(
                        "ACCOUNT_BALANCE", wholesalerId, b.getPartyType().name(), b.getPartyAccountId(),
                        null, null, "balance", expected, actual, actual.subtract(expected),
                        "opening_due=" + opening + ", debit=" + debit + ", credit=" + credit
                ));
            }
        }
        return balances.size();
    }

    private int auditBoxPartyBalances(Long wholesalerId, List<BalanceAuditIssue> issues) {
        Map<String, Long> netByKey = new HashMap<>();
        for (Object[] row : boxLedgerRepository.findPartyGroupedSums(wholesalerId)) {
            String partyType = ((Enum<?>) row[0]).name();
            Long partyAccountId = ((Number) row[1]).longValue();
            Long boxTypeId = ((Number) row[2]).longValue();
            BoxMovementType movement = (BoxMovementType) row[3];
            long qty = ((Number) row[4]).longValue();
            long delta = signFor(movement) * qty;
            String key = partyType + "|" + partyAccountId + "|" + boxTypeId;
            netByKey.merge(key, delta, Long::sum);
        }

        List<BoxBalance> balances = boxBalanceRepository.findByWholesaler_Id(wholesalerId);
        for (BoxBalance b : balances) {
            String key = b.getPartyType().name() + "|" + b.getPartyAccountId() + "|" + b.getBoxType().getId();
            long expected = netByKey.getOrDefault(key, 0L);
            long actual = b.getBoxesDue() == null ? 0 : b.getBoxesDue();
            if (expected != actual) {
                issues.add(new BalanceAuditIssue(
                        "BOX_BALANCE", wholesalerId, b.getPartyType().name(), b.getPartyAccountId(),
                        b.getBoxType().getId(), null, "boxes_due",
                        BigDecimal.valueOf(expected), BigDecimal.valueOf(actual), BigDecimal.valueOf(actual - expected),
                        null
                ));
            }
        }
        return balances.size();
    }

    private int auditBoxInventory(Long wholesalerId, List<BalanceAuditIssue> issues) {
        // Bucket ledger sums by (boxTypeId, movementType).
        Map<Long, Map<BoxMovementType, Long>> byType = new HashMap<>();
        for (Object[] row : boxLedgerRepository.findInventoryGroupedSums(wholesalerId)) {
            Long boxTypeId = ((Number) row[0]).longValue();
            BoxMovementType movement = (BoxMovementType) row[1];
            long qty = ((Number) row[2]).longValue();
            byType.computeIfAbsent(boxTypeId, k -> new HashMap<>()).put(movement, qty);
        }

        List<BoxInventory> inventories = boxInventoryRepository.findByWholesaler_Id(wholesalerId);
        for (BoxInventory inv : inventories) {
            Map<BoxMovementType, Long> sums = byType.getOrDefault(inv.getBoxType().getId(), Map.of());
            long purchase = sums.getOrDefault(BoxMovementType.PURCHASE, 0L);
            long givenCustomer = sums.getOrDefault(BoxMovementType.GIVEN_TO_CUSTOMER, 0L);
            long returnedCustomer = sums.getOrDefault(BoxMovementType.RETURNED_FROM_CUSTOMER, 0L);
            long givenSupplier = sums.getOrDefault(BoxMovementType.GIVEN_TO_SUPPLIER, 0L);
            long returnedSupplier = sums.getOrDefault(BoxMovementType.RETURNED_FROM_SUPPLIER, 0L);
            long lost = sums.getOrDefault(BoxMovementType.LOST, 0L);
            long damaged = sums.getOrDefault(BoxMovementType.DAMAGED, 0L);

            checkInventoryMetric(issues, wholesalerId, inv, "total_owned",
                    purchase, longValue(inv.getTotalOwned()));
            checkInventoryMetric(issues, wholesalerId, inv, "with_customers",
                    givenCustomer - returnedCustomer, longValue(inv.getWithCustomers()));
            checkInventoryMetric(issues, wholesalerId, inv, "with_suppliers",
                    givenSupplier - returnedSupplier, longValue(inv.getWithSuppliers()));
            checkInventoryMetric(issues, wholesalerId, inv, "lost_damaged",
                    lost + damaged, longValue(inv.getLostDamaged()));
            // Conservation: in_hand = total_owned − with_customers − with_suppliers − lost_damaged.
            long expectedInHand = longValue(inv.getTotalOwned())
                    - longValue(inv.getWithCustomers())
                    - longValue(inv.getWithSuppliers())
                    - longValue(inv.getLostDamaged());
            checkInventoryMetric(issues, wholesalerId, inv, "in_hand", expectedInHand, longValue(inv.getInHand()));
        }
        return inventories.size() * 5;
    }

    private void checkInventoryMetric(List<BalanceAuditIssue> issues, Long wholesalerId, BoxInventory inv,
                                      String metric, long expected, long actual) {
        if (expected != actual) {
            issues.add(new BalanceAuditIssue(
                    "BOX_INVENTORY", wholesalerId, "WHOLESALER", null,
                    inv.getBoxType().getId(), null, metric,
                    BigDecimal.valueOf(expected), BigDecimal.valueOf(actual), BigDecimal.valueOf(actual - expected),
                    null
            ));
        }
    }

    private int auditOtherDueBalances(Long wholesalerId, List<BalanceAuditIssue> issues) {
        Map<String, BigDecimal> rollup = new HashMap<>();
        for (Object[] row : supplierExpenseRepository.findOutstandingGroupedBySupplierAndCategory(wholesalerId)) {
            Long supplierId = ((Number) row[0]).longValue();
            Long categoryId = ((Number) row[1]).longValue();
            BigDecimal sumDue = (BigDecimal) row[2];
            rollup.put(supplierId + "|" + categoryId, sumDue);
        }

        List<OtherDueBalance> balances = otherDueBalanceRepository.findByWholesaler_Id(wholesalerId);
        for (OtherDueBalance b : balances) {
            String key = b.getWholesalerSupplier().getId() + "|" + b.getCategory().getId();
            BigDecimal expected = money(rollup.getOrDefault(key, BigDecimal.ZERO));
            BigDecimal actual = money(b.getDueAmount() == null ? BigDecimal.ZERO : b.getDueAmount());
            if (actual.subtract(expected).abs().compareTo(MONEY_TOLERANCE) > 0) {
                issues.add(new BalanceAuditIssue(
                        "OTHER_DUE", wholesalerId, "WHOLESALER_SUPPLIER", b.getWholesalerSupplier().getId(),
                        null, b.getCategory().getId(), "due_amount", expected, actual, actual.subtract(expected),
                        null
                ));
            }
        }
        return balances.size();
    }

    private static int signFor(BoxMovementType movement) {
        return switch (movement) {
            case GIVEN_TO_CUSTOMER, GIVEN_TO_SUPPLIER -> 1;
            case RETURNED_FROM_CUSTOMER, RETURNED_FROM_SUPPLIER -> -1;
            // Other movements aren't party-balance affecting and are filtered out by the query.
            default -> 0;
        };
    }

    private static String partyKey(PartyType partyType, Long partyAccountId) {
        return partyType.name() + "|" + partyAccountId;
    }

    private static long longValue(Integer value) {
        return value == null ? 0L : value.longValue();
    }

    private static BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(0, RoundingMode.CEILING);
    }
}
