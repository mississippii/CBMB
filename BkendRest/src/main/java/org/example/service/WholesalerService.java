package org.example.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.example.dto.CrateTypeQuantity;
import org.example.dto.CreateCustomerRequest;
import org.example.dto.CreateSupplierRequest;
import org.example.dto.CustomerAccountResponse;
import org.example.dto.CustomerProfileResponse;
import org.example.dto.SupplierAccountResponse;
import org.example.dto.SupplierProfileResponse;
import org.example.exception.BadRequestException;
import java.util.Locale;
import org.example.model.AccountBalance;
import org.example.model.BoxBalance;
import org.example.model.Customer;
import org.example.model.Supplier;
import org.example.model.Wholesaler;
import org.example.model.WholesalerCustomer;
import org.example.model.WholesalerSupplier;
import org.example.model.enums.PartyType;
import org.example.model.enums.RecordStatus;
import org.example.repository.AccountBalanceRepository;
import org.example.repository.BoxBalanceRepository;
import org.example.repository.CustomerRepository;
import org.example.repository.PaymentRepository;
import org.example.repository.SaleItemRepository;
import org.example.repository.SaleRepository;
import org.example.repository.SupplierRepository;
import org.example.repository.SupplierSettlementRepository;
import org.example.repository.WholesalerCustomerRepository;
import org.example.repository.WholesalerRepository;
import org.example.repository.WholesalerSupplierRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WholesalerService {

    private final WholesalerRepository wholesalerRepository;
    private final SupplierRepository supplierRepository;
    private final WholesalerSupplierRepository wholesalerSupplierRepository;
    private final CustomerRepository customerRepository;
    private final WholesalerCustomerRepository wholesalerCustomerRepository;
    private final AccountBalanceRepository accountBalanceRepository;
    private final BoxBalanceRepository boxBalanceRepository;
    private final SaleItemRepository saleItemRepository;
    private final SaleRepository saleRepository;
    private final PaymentRepository paymentRepository;
    private final SupplierSettlementRepository supplierSettlementRepository;
    private final SupplierDueService supplierDueService;
    private final TransactionService transactionService;

    public WholesalerService(
            WholesalerRepository wholesalerRepository,
            SupplierRepository supplierRepository,
            WholesalerSupplierRepository wholesalerSupplierRepository,
            CustomerRepository customerRepository,
            WholesalerCustomerRepository wholesalerCustomerRepository,
            AccountBalanceRepository accountBalanceRepository,
            BoxBalanceRepository boxBalanceRepository,
            SaleItemRepository saleItemRepository,
            SaleRepository saleRepository,
            PaymentRepository paymentRepository,
            SupplierSettlementRepository supplierSettlementRepository,
            SupplierDueService supplierDueService,
            TransactionService transactionService
    ) {
        this.wholesalerRepository = wholesalerRepository;
        this.supplierRepository = supplierRepository;
        this.wholesalerSupplierRepository = wholesalerSupplierRepository;
        this.customerRepository = customerRepository;
        this.wholesalerCustomerRepository = wholesalerCustomerRepository;
        this.accountBalanceRepository = accountBalanceRepository;
        this.boxBalanceRepository = boxBalanceRepository;
        this.saleItemRepository = saleItemRepository;
        this.saleRepository = saleRepository;
        this.paymentRepository = paymentRepository;
        this.supplierSettlementRepository = supplierSettlementRepository;
        this.supplierDueService = supplierDueService;
        this.transactionService = transactionService;
    }

    /**
     * Supplier net due (consignment model):
     *   opening + total sold − commission − expense − payments to supplier.
     * Commission is per-lot (sold × rate); expense is a deduction; payments are
     * PRODUCT_PAYMENT settlements. A negative result means the wholesaler has overpaid
     * (advance / supplier holds credit). Settle never affects this.
     */
    private BigDecimal computeSupplierDue(Long wholesalerId, WholesalerSupplier account) {
        return supplierDueService.netDue(wholesalerId, account);
    }

    @Transactional
    public SupplierAccountResponse createSupplier(Long wholesalerId, CreateSupplierRequest request) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        String name = requireText(request.name(), "Supplier name is required.");
        String phone = requireText(request.phone(), "Supplier phone is required.");
        String businessName = clean(request.businessName());
        String location = clean(request.location());

        Supplier supplier = supplierRepository.findByPhone(phone)
                .orElseGet(() -> {
                    Supplier newSupplier = new Supplier();
                    newSupplier.setName(name);
                    newSupplier.setBusinessName(businessName);
                    newSupplier.setPhone(phone);
                    newSupplier.setAddress(location);
                    newSupplier.setStatus(RecordStatus.ACTIVE);
                    return supplierRepository.save(newSupplier);
                });

        boolean changed = false;
        if (businessName != null && !businessName.isBlank() && supplier.getBusinessName() == null) {
            supplier.setBusinessName(businessName);
            changed = true;
        }
        if (location != null && !location.isBlank() && (supplier.getAddress() == null || supplier.getAddress().isBlank())) {
            supplier.setAddress(location);
            changed = true;
        }
        if (changed) {
            supplierRepository.save(supplier);
        }

        if (wholesalerSupplierRepository.existsByWholesaler_IdAndSupplier_Id(wholesalerId, supplier.getId())) {
            throw new BadRequestException("Supplier is already connected to this wholesaler.");
        }

        WholesalerSupplier account = new WholesalerSupplier();
        account.setWholesaler(wholesaler);
        account.setSupplier(supplier);
        account.setCommissionRate(nonNegative(request.commissionRate(), "Commission rate cannot be negative."));
        account.setOpeningDue(nonNegative(request.openingDue(), "Opening due cannot be negative."));
        account.setStatus(RecordStatus.ACTIVE);

        return toSupplierResponse(wholesalerSupplierRepository.save(account));
    }

    @Transactional
    public SupplierAccountResponse updateSupplier(Long wholesalerId, org.example.dto.UpdateSupplierRequest request) {
        if (request == null || request.accountId() == null) {
            throw new BadRequestException("Supplier account id is required.");
        }
        WholesalerSupplier account = wholesalerSupplierRepository
                .findByWholesaler_IdAndId(wholesalerId, request.accountId())
                .orElseThrow(() -> new BadRequestException("Supplier account not found."));

        Supplier supplier = account.getSupplier();
        String name = requireText(request.name(), "Supplier name is required.");
        supplier.setName(name);
        supplier.setBusinessName(clean(request.businessName()));
        supplier.setAddress(clean(request.location()));
        supplierRepository.save(supplier);

        account.setCommissionRate(nonNegative(request.commissionRate(), "Commission rate cannot be negative."));
        return toSupplierResponse(wholesalerSupplierRepository.save(account));
    }

    @Transactional(readOnly = true)
    public List<SupplierAccountResponse> listSuppliers(Long wholesalerId, boolean includeDisabled) {
        findWholesaler(wholesalerId);
        var rows = includeDisabled
                ? wholesalerSupplierRepository.findByWholesaler_IdOrderByCreatedAtDesc(wholesalerId)
                : wholesalerSupplierRepository.findByWholesaler_IdAndStatusOrderByCreatedAtDesc(wholesalerId, RecordStatus.ACTIVE);
        return rows.stream().map(this::toSupplierResponse).toList();
    }

    @Transactional
    public SupplierAccountResponse disableSupplier(Long wholesalerId, Long accountId) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        if (accountId == null) throw new BadRequestException("Supplier account id is required.");
        WholesalerSupplier account = wholesalerSupplierRepository.findByWholesaler_IdAndId(wholesalerId, accountId)
                .orElseThrow(() -> new BadRequestException("Supplier account not found."));

        if (account.getStatus() != RecordStatus.ACTIVE) {
            throw new BadRequestException("Supplier is already disabled.");
        }

        BigDecimal due = computeSupplierDue(wholesaler.getId(), account);
        int crateTotal = crateDueTotal(wholesaler.getId(), PartyType.WHOLESALER_SUPPLIER, account.getId());
        if (due.signum() > 0) {
            throw new BadRequestException("Cannot disable — outstanding due ৳" + due.toPlainString() + ". Settle first.");
        }
        if (crateTotal > 0) {
            throw new BadRequestException("Cannot disable — " + crateTotal + " crates still with supplier. Settle crates first.");
        }

        account.setStatus(RecordStatus.DISABLED);
        return toSupplierResponse(wholesalerSupplierRepository.save(account));
    }

    @Transactional
    public SupplierAccountResponse enableSupplier(Long wholesalerId, Long accountId) {
        findWholesaler(wholesalerId);
        if (accountId == null) throw new BadRequestException("Supplier account id is required.");
        WholesalerSupplier account = wholesalerSupplierRepository.findByWholesaler_IdAndId(wholesalerId, accountId)
                .orElseThrow(() -> new BadRequestException("Supplier account not found."));
        account.setStatus(RecordStatus.ACTIVE);
        return toSupplierResponse(wholesalerSupplierRepository.save(account));
    }

    @Transactional
    public CustomerAccountResponse createCustomer(Long wholesalerId, CreateCustomerRequest request) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        String name = requireText(request.name(), "Customer name is required.");
        String phone = requireText(request.phone(), "Customer phone is required.");
        String ownerName = clean(request.ownerName());
        String address = clean(request.address());

        Customer customer = customerRepository.findByPhone(phone)
                .orElseGet(() -> {
                    Customer newCustomer = new Customer();
                    newCustomer.setName(name);
                    newCustomer.setOwnerName(ownerName);
                    newCustomer.setPhone(phone);
                    newCustomer.setAddress(address);
                    newCustomer.setStatus(RecordStatus.ACTIVE);
                    return customerRepository.save(newCustomer);
                });

        WholesalerCustomer account = wholesalerCustomerRepository
                .findByWholesaler_IdAndCustomer_Id(wholesalerId, customer.getId())
                .orElseGet(() -> {
                    WholesalerCustomer newAccount = new WholesalerCustomer();
                    newAccount.setWholesaler(wholesaler);
                    newAccount.setCustomer(customer);
                    return newAccount;
                });
        if (account.getId() != null && account.getStatus() == RecordStatus.ACTIVE) {
            throw new BadRequestException("Customer is already connected to this wholesaler.");
        }
        account.setOpeningDue(nonNegative(request.openingDue(), "Opening due cannot be negative."));
        account.setStatus(RecordStatus.ACTIVE);

        return toCustomerResponse(wholesalerCustomerRepository.save(account));
    }

    @Transactional(readOnly = true)
    public List<CustomerAccountResponse> listCustomers(Long wholesalerId, boolean includeDisabled) {
        findWholesaler(wholesalerId);
        var rows = includeDisabled
                ? wholesalerCustomerRepository.findByWholesaler_IdOrderByCreatedAtDesc(wholesalerId)
                : wholesalerCustomerRepository.findByWholesaler_IdAndStatusOrderByCreatedAtDesc(wholesalerId, RecordStatus.ACTIVE);
        return rows.stream().map(this::toCustomerResponse).toList();
    }

    @Transactional
    public CustomerAccountResponse disableCustomer(Long wholesalerId, Long accountId) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        if (accountId == null) throw new BadRequestException("Customer account id is required.");
        WholesalerCustomer account = wholesalerCustomerRepository.findByWholesaler_IdAndId(wholesalerId, accountId)
                .orElseThrow(() -> new BadRequestException("Customer account not found."));

        if (account.getStatus() != RecordStatus.ACTIVE) {
            throw new BadRequestException("Customer is already disabled.");
        }

        BigDecimal due = currentBalance(wholesaler.getId(), PartyType.WHOLESALER_CUSTOMER, account.getId(), account.getOpeningDue());
        int crateTotal = crateDueTotal(wholesaler.getId(), PartyType.WHOLESALER_CUSTOMER, account.getId());
        if (due.signum() > 0) {
            throw new BadRequestException("Cannot disable — customer owes ৳" + due.toPlainString() + ". Settle first.");
        }
        if (crateTotal > 0) {
            throw new BadRequestException("Cannot disable — customer still holds " + crateTotal + " crates. Recover first.");
        }

        account.setStatus(RecordStatus.DISABLED);
        return toCustomerResponse(wholesalerCustomerRepository.save(account));
    }

    @Transactional
    public CustomerAccountResponse enableCustomer(Long wholesalerId, Long accountId) {
        findWholesaler(wholesalerId);
        if (accountId == null) throw new BadRequestException("Customer account id is required.");
        WholesalerCustomer account = wholesalerCustomerRepository.findByWholesaler_IdAndId(wholesalerId, accountId)
                .orElseThrow(() -> new BadRequestException("Customer account not found."));
        account.setStatus(RecordStatus.ACTIVE);
        return toCustomerResponse(wholesalerCustomerRepository.save(account));
    }

    @Transactional(readOnly = true)
    public CustomerProfileResponse getCustomerProfile(Long wholesalerId, Long wholesalerCustomerId) {
        findWholesaler(wholesalerId);
        if (wholesalerCustomerId == null) {
            throw new BadRequestException("Customer account id is required.");
        }
        WholesalerCustomer account = wholesalerCustomerRepository.findByWholesaler_IdAndId(wholesalerId, wholesalerCustomerId)
                .orElseThrow(() -> new BadRequestException("Customer profile not found."));
        return new CustomerProfileResponse(
                toCustomerResponse(account),
                transactionService.listCustomerTransactions(wholesalerId, wholesalerCustomerId)
        );
    }

    @Transactional(readOnly = true)
    public SupplierProfileResponse getSupplierProfile(Long wholesalerId, Long wholesalerSupplierId) {
        findWholesaler(wholesalerId);
        if (wholesalerSupplierId == null) {
            throw new BadRequestException("Supplier account id is required.");
        }
        WholesalerSupplier account = wholesalerSupplierRepository.findByWholesaler_IdAndId(wholesalerId, wholesalerSupplierId)
                .orElseThrow(() -> new BadRequestException("Supplier profile not found."));
        SupplierAccountResponse supplier = toSupplierResponse(account);
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime tomorrowStart = todayStart.plusDays(1);
        BigDecimal todaySale = saleItemRepository.sumLineTotalBySupplierBetween(wholesalerId, wholesalerSupplierId, todayStart, tomorrowStart);
        BigDecimal todayCommission = saleItemRepository.sumCommissionBySupplierBetween(wholesalerId, wholesalerSupplierId, todayStart, tomorrowStart);
        BigDecimal totalCommission = zeroIfNull(supplier.totalCommissionEarned());

        return new SupplierProfileResponse(
                supplier,
                zeroIfNull(todaySale),
                zeroIfNull(todayCommission),
                zeroIfNull(supplier.totalSales()),
                totalCommission,
                zeroIfNull(supplier.currentDue()),
                transactionService.listSupplierTransactions(wholesalerId, wholesalerSupplierId)
        );
    }

    private Wholesaler findWholesaler(Long wholesalerId) {
        if (wholesalerId == null) {
            throw new BadRequestException("Wholesaler id is required.");
        }
        return wholesalerRepository.findById(wholesalerId)
                .orElseThrow(() -> new BadRequestException("Wholesaler not found."));
    }

    private SupplierAccountResponse toSupplierResponse(WholesalerSupplier account) {
        Supplier supplier = account.getSupplier();
        Long wholesalerId = account.getWholesaler().getId();
        BigDecimal currentDue = computeSupplierDue(wholesalerId, account);
        List<CrateTypeQuantity> crateDues = crateDues(wholesalerId, PartyType.WHOLESALER_SUPPLIER, account.getId());
        return new SupplierAccountResponse(
                account.getId(),
                wholesalerId,
                supplier.getId(),
                supplier.getName(),
                supplier.getBusinessName(),
                supplier.getPhone(),
                supplier.getAddress(),
                account.getCommissionRate(),
                account.getOpeningDue(),
                currentDue,
                saleItemRepository.sumLineTotalBySupplier(wholesalerId, account.getId()),
                saleItemRepository.sumCommissionBySupplier(wholesalerId, account.getId()),
                crateDues,
                crateTotal(crateDues),
                account.getStatus().name(),
                account.getCreatedAt()
        );
    }

    private CustomerAccountResponse toCustomerResponse(WholesalerCustomer account) {
        Customer customer = account.getCustomer();
        Long wholesalerId = account.getWholesaler().getId();
        BigDecimal salePaid = saleRepository.sumPaidAmountByCustomer(wholesalerId, account.getId());
        BigDecimal laterPaid = paymentRepository.sumCashAmountByCustomer(wholesalerId, account.getId());
        List<CrateTypeQuantity> crateDues = crateDues(wholesalerId, PartyType.WHOLESALER_CUSTOMER, account.getId());
        return new CustomerAccountResponse(
                account.getId(),
                wholesalerId,
                customer.getId(),
                customer.getName(),
                customer.getOwnerName(),
                customer.getPhone(),
                customer.getAddress(),
                account.getOpeningDue(),
                currentBalance(wholesalerId, PartyType.WHOLESALER_CUSTOMER, account.getId(), account.getOpeningDue()),
                saleRepository.sumNetAmountByCustomer(wholesalerId, account.getId()),
                salePaid.add(laterPaid),
                crateDues,
                crateTotal(crateDues),
                account.getStatus().name(),
                account.getCreatedAt()
        );
    }

    private BigDecimal currentBalance(Long wholesalerId, PartyType partyType, Long partyAccountId, BigDecimal openingDue) {
        return accountBalanceRepository
                .findByWholesaler_IdAndPartyTypeAndPartyAccountId(wholesalerId, partyType, partyAccountId)
                .map(AccountBalance::getBalance)
                .orElse(openingDue == null ? BigDecimal.ZERO : openingDue);
    }

    /** Per-type crate dues for a party — one entry per crate type that has a non-zero balance. */
    private List<CrateTypeQuantity> crateDues(Long wholesalerId, PartyType partyType, Long partyAccountId) {
        java.util.Map<String, Long> byType = new java.util.LinkedHashMap<>();
        for (BoxBalance balance : boxBalanceRepository.findByWholesaler_IdAndPartyTypeAndPartyAccountId(wholesalerId, partyType, partyAccountId)) {
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

    private int crateDueTotal(Long wholesalerId, PartyType partyType, Long partyAccountId) {
        return crateTotal(crateDues(wholesalerId, partyType, partyAccountId));
    }

    private int crateTotal(List<CrateTypeQuantity> dues) {
        return (int) dues.stream().mapToLong(CrateTypeQuantity::quantity).sum();
    }


    private BigDecimal zeroIfNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private BigDecimal nonNegative(BigDecimal value, String message) {
        BigDecimal normalized = value == null ? BigDecimal.ZERO : value;
        if (normalized.signum() < 0) {
            throw new BadRequestException(message);
        }
        return normalized;
    }

    private String requireText(String value, String message) {
        String cleaned = clean(value);
        if (cleaned == null || cleaned.isBlank()) {
            throw new BadRequestException(message);
        }
        return cleaned;
    }

    private String clean(String value) {
        return value == null ? null : value.trim();
    }
}
