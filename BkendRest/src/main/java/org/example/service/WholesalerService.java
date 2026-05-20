package org.example.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
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
import org.example.model.enums.SettlementType;
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
        this.transactionService = transactionService;
    }

    @Transactional
    public SupplierAccountResponse createSupplier(Long wholesalerId, CreateSupplierRequest request) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        String name = requireText(request.name(), "Supplier name is required.");
        String phone = requireText(request.phone(), "Supplier phone is required.");
        String address = clean(request.address());

        Supplier supplier = supplierRepository.findByPhone(phone)
                .orElseGet(() -> {
                    Supplier newSupplier = new Supplier();
                    newSupplier.setName(name);
                    newSupplier.setPhone(phone);
                    newSupplier.setAddress(address);
                    newSupplier.setStatus(RecordStatus.ACTIVE);
                    return supplierRepository.save(newSupplier);
                });

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

    @Transactional(readOnly = true)
    public List<SupplierAccountResponse> listSuppliers(Long wholesalerId) {
        findWholesaler(wholesalerId);
        return wholesalerSupplierRepository.findByWholesaler_IdOrderByCreatedAtDesc(wholesalerId)
                .stream()
                .map(this::toSupplierResponse)
                .toList();
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
        account.setJamanotBalance(nonNegative(request.jamanotBalance(), "Jamanot balance cannot be negative."));
        account.setStatus(RecordStatus.ACTIVE);

        return toCustomerResponse(wholesalerCustomerRepository.save(account));
    }

    @Transactional(readOnly = true)
    public List<CustomerAccountResponse> listCustomers(Long wholesalerId) {
        findWholesaler(wholesalerId);
        return wholesalerCustomerRepository.findByWholesaler_IdAndStatusOrderByCreatedAtDesc(wholesalerId, RecordStatus.ACTIVE)
                .stream()
                .map(this::toCustomerResponse)
                .toList();
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
        BigDecimal commissionReceived = supplierSettlementRepository.sumAmountBySupplierAndType(wholesalerId, wholesalerSupplierId, SettlementType.COMMISSION_RECEIVE);
        BigDecimal otherExpense = supplierSettlementRepository.sumAmountBySupplierAndType(wholesalerId, wholesalerSupplierId, SettlementType.EXPENSE_RECEIVE);
        BigDecimal totalCommission = zeroIfNull(supplier.totalCommissionEarned());

        return new SupplierProfileResponse(
                supplier,
                zeroIfNull(todaySale),
                zeroIfNull(todayCommission),
                zeroIfNull(supplier.totalSales()),
                totalCommission,
                positive(totalCommission.subtract(zeroIfNull(commissionReceived))),
                zeroIfNull(supplier.currentDue()),
                zeroIfNull(otherExpense),
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
        BigDecimal currentDue = currentBalance(wholesalerId, PartyType.WHOLESALER_SUPPLIER, account.getId(), account.getOpeningDue());
        CrateDue crateDue = crateDue(wholesalerId, PartyType.WHOLESALER_SUPPLIER, account.getId());
        return new SupplierAccountResponse(
                account.getId(),
                wholesalerId,
                supplier.getId(),
                supplier.getName(),
                supplier.getPhone(),
                supplier.getAddress(),
                account.getCommissionRate(),
                account.getOpeningDue(),
                currentDue,
                saleItemRepository.sumLineTotalBySupplier(wholesalerId, account.getId()),
                saleItemRepository.sumCommissionBySupplier(wholesalerId, account.getId()),
                crateDue.bangla(),
                crateDue.china(),
                crateDue.total(),
                account.getStatus().name(),
                account.getCreatedAt()
        );
    }

    private CustomerAccountResponse toCustomerResponse(WholesalerCustomer account) {
        Customer customer = account.getCustomer();
        Long wholesalerId = account.getWholesaler().getId();
        BigDecimal salePaid = saleRepository.sumPaidAmountByCustomer(wholesalerId, account.getId());
        BigDecimal laterPaid = paymentRepository.sumCashAmountByCustomer(wholesalerId, account.getId());
        CrateDue crateDue = crateDue(wholesalerId, PartyType.WHOLESALER_CUSTOMER, account.getId());
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
                account.getJamanotBalance(),
                crateDue.bangla(),
                crateDue.china(),
                crateDue.total(),
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

    private CrateDue crateDue(Long wholesalerId, PartyType partyType, Long partyAccountId) {
        int bangla = 0;
        int china = 0;
        for (BoxBalance balance : boxBalanceRepository.findByWholesaler_IdAndPartyTypeAndPartyAccountId(wholesalerId, partyType, partyAccountId)) {
            String typeName = balance.getBoxType().getName() == null ? "" : balance.getBoxType().getName().toUpperCase(Locale.ROOT);
            if (typeName.equals("CHINA")) {
                china += balance.getBoxesDue();
            } else {
                bangla += balance.getBoxesDue();
            }
        }
        return new CrateDue(bangla, china);
    }

    private record CrateDue(Integer bangla, Integer china) {
        Integer total() {
            return bangla + china;
        }
    }

    private BigDecimal positive(BigDecimal value) {
        BigDecimal normalized = zeroIfNull(value);
        return normalized.signum() < 0 ? BigDecimal.ZERO : normalized;
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
