package org.example.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import org.example.dto.SaleCancellationResponse;
import org.example.exception.BadRequestException;
import org.example.model.AccountBalance;
import org.example.model.AccountLedger;
import org.example.model.BoxBalance;
import org.example.model.BoxInventory;
import org.example.model.BoxLedger;
import org.example.model.Inventory;
import org.example.model.Sale;
import org.example.model.SaleItem;
import org.example.model.StockLedger;
import org.example.model.Transaction;
import org.example.model.Wholesaler;
import org.example.model.WholesalerCustomer;
import org.example.model.WholesalerSupplier;
import org.example.model.enums.AccountReferenceType;
import org.example.model.enums.BoxLedgerPartyType;
import org.example.model.enums.BoxMovementType;
import org.example.model.enums.BoxReferenceType;
import org.example.model.enums.InventoryStatus;
import org.example.model.enums.PartyType;
import org.example.model.enums.PostStatus;
import org.example.model.enums.SettlementStatus;
import org.example.model.enums.StockDirection;
import org.example.model.enums.StockReferenceType;
import org.example.model.enums.TransactionType;
import org.example.repository.AccountBalanceRepository;
import org.example.repository.AccountLedgerRepository;
import org.example.repository.BoxBalanceRepository;
import org.example.repository.BoxInventoryRepository;
import org.example.repository.BoxLedgerRepository;
import org.example.repository.InventoryRepository;
import org.example.repository.SaleItemRepository;
import org.example.repository.SaleRepository;
import org.example.repository.StockLedgerRepository;
import org.example.repository.TransactionRepository;
import org.example.repository.WholesalerCustomerRepository;
import org.example.repository.WholesalerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cancels a POSTED sale by writing reversing entries — original rows are never deleted.
 * Refuses cancellation when:
 *   - sale is already CANCELLED
 *   - the sale's shipment is already SETTLED (financial close would have to be reopened too)
 *   - reversal would underflow box_inventory (crates already moved by a later payment)
 *
 * Reversal sources:
 *   AccountLedger SALE debit       → write DUE_ADJUSTMENT credit for netAmount.
 *   AccountLedger PAYMENT credit   → write DUE_ADJUSTMENT debit for paidAmount.
 *   Supplier AccountLedger SALE    → write DUE_ADJUSTMENT debit for saleAmount.
 *   StockLedger SALE OUT           → write ADJUSTMENT IN; restore inventory.qty_on_hand.
 *   BoxLedger GIVEN_TO_CUSTOMER    → write RETURNED_FROM_CUSTOMER; flip box_inventory + box_balance.
 */
@Service
public class SaleCancellationService {

    private final WholesalerRepository wholesalerRepository;
    private final SaleRepository saleRepository;
    private final SaleItemRepository saleItemRepository;
    private final InventoryRepository inventoryRepository;
    private final StockLedgerRepository stockLedgerRepository;
    private final AccountBalanceRepository accountBalanceRepository;
    private final AccountLedgerRepository accountLedgerRepository;
    private final BoxLedgerRepository boxLedgerRepository;
    private final BoxBalanceRepository boxBalanceRepository;
    private final BoxInventoryRepository boxInventoryRepository;
    private final WholesalerCustomerRepository wholesalerCustomerRepository;
    private final TransactionRepository transactionRepository;
    private final AccountBalanceService accountBalanceService;

    public SaleCancellationService(
            WholesalerRepository wholesalerRepository,
            SaleRepository saleRepository,
            SaleItemRepository saleItemRepository,
            InventoryRepository inventoryRepository,
            StockLedgerRepository stockLedgerRepository,
            AccountBalanceRepository accountBalanceRepository,
            AccountLedgerRepository accountLedgerRepository,
            BoxLedgerRepository boxLedgerRepository,
            BoxBalanceRepository boxBalanceRepository,
            BoxInventoryRepository boxInventoryRepository,
            WholesalerCustomerRepository wholesalerCustomerRepository,
            TransactionRepository transactionRepository,
            AccountBalanceService accountBalanceService
    ) {
        this.wholesalerRepository = wholesalerRepository;
        this.saleRepository = saleRepository;
        this.saleItemRepository = saleItemRepository;
        this.inventoryRepository = inventoryRepository;
        this.stockLedgerRepository = stockLedgerRepository;
        this.accountBalanceRepository = accountBalanceRepository;
        this.accountLedgerRepository = accountLedgerRepository;
        this.boxLedgerRepository = boxLedgerRepository;
        this.boxBalanceRepository = boxBalanceRepository;
        this.boxInventoryRepository = boxInventoryRepository;
        this.wholesalerCustomerRepository = wholesalerCustomerRepository;
        this.transactionRepository = transactionRepository;
        this.accountBalanceService = accountBalanceService;
    }

    @Transactional
    public SaleCancellationResponse cancelSale(Long wholesalerId, Long saleId, String reason) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        Sale sale = saleRepository.findById(saleId)
                .orElseThrow(() -> new BadRequestException("Sale not found."));
        if (!sale.getWholesaler().getId().equals(wholesalerId)) {
            throw new BadRequestException("Sale does not belong to this wholesaler.");
        }
        if (sale.getStatus() != PostStatus.POSTED) {
            throw new BadRequestException("Sale is already " + sale.getStatus().name() + ".");
        }

        List<SaleItem> items = saleItemRepository.findBySale_Id(saleId);
        for (SaleItem item : items) {
            if (item.getDelivery() != null && item.getDelivery().getSettlementStatus() == SettlementStatus.SETTLED) {
                throw new BadRequestException("Cannot cancel: the sale's shipment is already settled. Reopen the settlement first or post a corrective adjustment.");
            }
        }

        String cleanReason = reason == null || reason.isBlank() ? "Cancellation of sale #" + saleId : "Cancellation of sale #" + saleId + " — " + reason.trim();

        BigDecimal customerBalanceAfter = reverseCustomerSide(wholesaler, sale, cleanReason);
        BigDecimal supplierBalanceAfter = reverseSupplierSide(wholesaler, sale, items, cleanReason);
        ReverseInventoryResult invResult = reverseInventoryAndStock(wholesaler, sale, items, cleanReason);
        CrateReversalResult crateResult = reverseCrateMovements(wholesaler, sale, cleanReason);

        sale.setStatus(PostStatus.CANCELLED);
        sale.setNote(joinNote(sale.getNote(), cleanReason));
        saleRepository.save(sale);

        Transaction tx = new Transaction();
        tx.setWholesalerId(wholesalerId);
        tx.setTransactionType(TransactionType.PAYMENT);
        tx.setSaleId(sale.getId());
        tx.setWholesalerCustomerId(sale.getWholesalerCustomer() == null ? null : sale.getWholesalerCustomer().getId());
        tx.setWholesalerSupplierId(items.isEmpty() ? null : items.get(0).getWholesalerSupplier().getId());
        tx.setSaleAmount(BigDecimal.ZERO);
        tx.setPaymentAmount(BigDecimal.ZERO);
        tx.setDueAmount(customerBalanceAfter == null ? BigDecimal.ZERO : customerBalanceAfter);
        tx.setDescription(cleanReason);
        tx = transactionRepository.save(tx);

        Long supplierAccountId = items.isEmpty() ? null : items.get(0).getWholesalerSupplier().getId();
        return new SaleCancellationResponse(
                sale.getId(),
                sale.getStatus().name(),
                sale.getWholesalerCustomer() == null ? null : sale.getWholesalerCustomer().getId(),
                customerBalanceAfter,
                supplierBalanceAfter,
                supplierAccountId,
                crateResult.cratesReturned(),
                tx.getId(),
                LocalDateTime.now()
        );
    }

    private BigDecimal reverseCustomerSide(Wholesaler wholesaler, Sale sale, String reason) {
        WholesalerCustomer customer = sale.getWholesalerCustomer();
        if (customer == null) {
            return null; // ONE_TIME sale never touched customer balance
        }
        AccountBalance balance = accountBalanceService.getOrCreate(
                wholesaler, PartyType.WHOLESALER_CUSTOMER, customer.getId(), customer.getOpeningDue());
        BigDecimal netAmount = money(sale.getNetAmount());
        BigDecimal paidAmount = money(sale.getPaidAmount());
        BigDecimal newBalance = money(balance.getBalance().subtract(netAmount).add(paidAmount));
        balance.setBalance(newBalance);
        accountBalanceRepository.save(balance);

        if (netAmount.signum() > 0) {
            writeAccountAdjustment(wholesaler, PartyType.WHOLESALER_CUSTOMER, customer.getId(),
                    sale.getId(), BigDecimal.ZERO, netAmount, reason + " — reverse sale debit");
        }
        if (paidAmount.signum() > 0) {
            writeAccountAdjustment(wholesaler, PartyType.WHOLESALER_CUSTOMER, customer.getId(),
                    sale.getId(), paidAmount, BigDecimal.ZERO, reason + " — reverse cash-with-sale credit");
        }
        return newBalance;
    }

    private BigDecimal reverseSupplierSide(Wholesaler wholesaler, Sale sale, List<SaleItem> items, String reason) {
        if (items.isEmpty()) {
            return null;
        }
        WholesalerSupplier supplier = items.get(0).getWholesalerSupplier();
        BigDecimal saleAmount = money(sale.getNetAmount());
        if (saleAmount.signum() <= 0) {
            return null;
        }
        AccountBalance balance = accountBalanceService.getOrCreate(
                wholesaler, PartyType.WHOLESALER_SUPPLIER, supplier.getId(), supplier.getOpeningDue());
        BigDecimal newBalance = money(balance.getBalance().subtract(saleAmount));
        balance.setBalance(newBalance);
        accountBalanceRepository.save(balance);

        writeAccountAdjustment(wholesaler, PartyType.WHOLESALER_SUPPLIER, supplier.getId(),
                sale.getId(), saleAmount, BigDecimal.ZERO, reason + " — reverse supplier sale credit");
        return newBalance;
    }

    private ReverseInventoryResult reverseInventoryAndStock(Wholesaler wholesaler, Sale sale, List<SaleItem> items, String reason) {
        for (SaleItem item : items) {
            Inventory inventory = findInventoryFor(wholesaler.getId(), item);
            if (inventory != null) {
                BigDecimal restored = (inventory.getQuantityOnHand() == null ? BigDecimal.ZERO : inventory.getQuantityOnHand()).add(item.getQuantity());
                inventory.setQuantityOnHand(restored);
                inventory.setStatus(InventoryStatus.ACTIVE);
                inventoryRepository.save(inventory);
            }

            StockLedger ledger = new StockLedger();
            ledger.setWholesaler(wholesaler);
            ledger.setWholesalerSupplier(item.getWholesalerSupplier());
            ledger.setProduct(item.getProduct());
            ledger.setCategory(item.getCategory());
            ledger.setReferenceType(StockReferenceType.ADJUSTMENT);
            ledger.setReferenceId(sale.getId());
            ledger.setDirection(StockDirection.IN);
            ledger.setQuantity(item.getQuantity());
            ledger.setNote(reason);
            stockLedgerRepository.save(ledger);
        }
        return new ReverseInventoryResult();
    }

    private Inventory findInventoryFor(Long wholesalerId, SaleItem item) {
        if (item.getDelivery() == null) {
            return null;
        }
        Long productId = item.getProduct().getId();
        Long categoryId = item.getCategory() == null ? null : item.getCategory().getId();
        Long subCategoryId = item.getSubCategory() == null ? null : item.getSubCategory().getId();
        var unit = item.getUnit();
        if (categoryId == null) {
            return inventoryRepository.findByWholesaler_IdAndDelivery_IdAndProduct_IdAndCategoryIsNullAndSubCategoryIsNullAndUnit(
                    wholesalerId, item.getDelivery().getId(), productId, unit).orElse(null);
        }
        if (subCategoryId == null) {
            return inventoryRepository.findByWholesaler_IdAndDelivery_IdAndProduct_IdAndCategory_IdAndSubCategoryIsNullAndUnit(
                    wholesalerId, item.getDelivery().getId(), productId, categoryId, unit).orElse(null);
        }
        return inventoryRepository.findByWholesaler_IdAndDelivery_IdAndProduct_IdAndCategory_IdAndSubCategory_IdAndUnit(
                wholesalerId, item.getDelivery().getId(), productId, categoryId, subCategoryId, unit).orElse(null);
    }

    private CrateReversalResult reverseCrateMovements(Wholesaler wholesaler, Sale sale, String reason) {
        WholesalerCustomer customer = sale.getWholesalerCustomer();
        int totalCrates = 0;
        List<BoxLedger> entries = boxLedgerRepository.findByWholesaler_IdAndReferenceTypeAndReferenceId(
                wholesaler.getId(), BoxReferenceType.SALE, sale.getId());
        for (BoxLedger entry : entries) {
            if (entry.getMovementType() != BoxMovementType.GIVEN_TO_CUSTOMER) {
                // Unexpected — sale only writes GIVEN_TO_CUSTOMER today.
                continue;
            }
            int qty = entry.getQuantity();
            if (customer == null) {
                continue;
            }
            BoxInventory inv = boxInventoryRepository
                    .findByWholesaler_IdAndBoxType_Id(wholesaler.getId(), entry.getBoxType().getId())
                    .orElseThrow(() -> new BadRequestException("Crate inventory missing for " + entry.getBoxType().getName() + "."));
            if (inv.getWithCustomers() < qty) {
                throw new BadRequestException("Cannot cancel: " + entry.getBoxType().getName() + " crate inventory with_customers (" + inv.getWithCustomers() + ") < " + qty + ". Customer may have already returned crates.");
            }
            BoxBalance balance = boxBalanceRepository
                    .findByWholesaler_IdAndPartyTypeAndPartyAccountIdAndBoxType_Id(
                            wholesaler.getId(), PartyType.WHOLESALER_CUSTOMER, customer.getId(), entry.getBoxType().getId())
                    .orElseThrow(() -> new BadRequestException("Crate balance missing for customer."));
            if (balance.getBoxesDue() < qty) {
                throw new BadRequestException("Cannot cancel: customer crate due (" + balance.getBoxesDue() + ") < " + qty + ".");
            }

            inv.setInHand(inv.getInHand() + qty);
            inv.setWithCustomers(inv.getWithCustomers() - qty);
            boxInventoryRepository.save(inv);

            balance.setBoxesDue(balance.getBoxesDue() - qty);
            boxBalanceRepository.save(balance);

            BoxLedger reversal = new BoxLedger();
            reversal.setWholesaler(wholesaler);
            reversal.setBoxType(entry.getBoxType());
            reversal.setPartyType(BoxLedgerPartyType.WHOLESALER_CUSTOMER);
            reversal.setPartyAccountId(customer.getId());
            reversal.setMovementType(BoxMovementType.RETURNED_FROM_CUSTOMER);
            reversal.setQuantity(qty);
            reversal.setReferenceType(BoxReferenceType.SALE);
            reversal.setReferenceId(sale.getId());
            reversal.setNote(reason);
            boxLedgerRepository.save(reversal);

            totalCrates += qty;
        }

        return new CrateReversalResult(totalCrates);
    }

    private void writeAccountAdjustment(Wholesaler wholesaler, PartyType partyType, Long partyAccountId,
                                        Long saleId, BigDecimal debit, BigDecimal credit, String note) {
        AccountLedger ledger = new AccountLedger();
        ledger.setWholesaler(wholesaler);
        ledger.setPartyType(partyType);
        ledger.setPartyAccountId(partyAccountId);
        ledger.setReferenceType(AccountReferenceType.DUE_ADJUSTMENT);
        ledger.setReferenceId(saleId);
        ledger.setDebit(money(debit));
        ledger.setCredit(money(credit));
        ledger.setNote(note);
        accountLedgerRepository.save(ledger);
    }

    private Wholesaler findWholesaler(Long wholesalerId) {
        if (wholesalerId == null) {
            throw new BadRequestException("Wholesaler id is required.");
        }
        return wholesalerRepository.findById(wholesalerId)
                .orElseThrow(() -> new BadRequestException("Wholesaler not found."));
    }

    private static String joinNote(String existing, String addition) {
        if (existing == null || existing.isBlank()) return addition;
        return existing + " | " + addition;
    }

    private static BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private record ReverseInventoryResult() {
    }

    private record CrateReversalResult(int cratesReturned) {
    }
}
