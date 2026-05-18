package org.example.service;

import java.math.BigDecimal;
import java.util.List;
import org.example.dto.CreateCustomerRequest;
import org.example.dto.CreateSupplierRequest;
import org.example.dto.CustomerAccountResponse;
import org.example.dto.SupplierAccountResponse;
import org.example.exception.BadRequestException;
import org.example.model.Customer;
import org.example.model.DomainEnums.RecordStatus;
import org.example.model.Supplier;
import org.example.model.Wholesaler;
import org.example.model.WholesalerCustomer;
import org.example.model.WholesalerSupplier;
import org.example.repository.CustomerRepository;
import org.example.repository.SupplierRepository;
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

    public WholesalerService(
            WholesalerRepository wholesalerRepository,
            SupplierRepository supplierRepository,
            WholesalerSupplierRepository wholesalerSupplierRepository,
            CustomerRepository customerRepository,
            WholesalerCustomerRepository wholesalerCustomerRepository
    ) {
        this.wholesalerRepository = wholesalerRepository;
        this.supplierRepository = supplierRepository;
        this.wholesalerSupplierRepository = wholesalerSupplierRepository;
        this.customerRepository = customerRepository;
        this.wholesalerCustomerRepository = wholesalerCustomerRepository;
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

        if (wholesalerCustomerRepository.existsByWholesaler_IdAndCustomer_Id(wholesalerId, customer.getId())) {
            throw new BadRequestException("Customer is already connected to this wholesaler.");
        }

        WholesalerCustomer account = new WholesalerCustomer();
        account.setWholesaler(wholesaler);
        account.setCustomer(customer);
        account.setOpeningDue(nonNegative(request.openingDue(), "Opening due cannot be negative."));
        account.setJamanotBalance(nonNegative(request.jamanotBalance(), "Jamanot balance cannot be negative."));
        account.setStatus(RecordStatus.ACTIVE);

        return toCustomerResponse(wholesalerCustomerRepository.save(account));
    }

    @Transactional(readOnly = true)
    public List<CustomerAccountResponse> listCustomers(Long wholesalerId) {
        findWholesaler(wholesalerId);
        return wholesalerCustomerRepository.findByWholesaler_IdOrderByCreatedAtDesc(wholesalerId)
                .stream()
                .map(this::toCustomerResponse)
                .toList();
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
        return new SupplierAccountResponse(
                account.getId(),
                account.getWholesaler().getId(),
                supplier.getId(),
                supplier.getName(),
                supplier.getPhone(),
                supplier.getAddress(),
                account.getCommissionRate(),
                account.getOpeningDue(),
                account.getStatus().name(),
                account.getCreatedAt()
        );
    }

    private CustomerAccountResponse toCustomerResponse(WholesalerCustomer account) {
        Customer customer = account.getCustomer();
        return new CustomerAccountResponse(
                account.getId(),
                account.getWholesaler().getId(),
                customer.getId(),
                customer.getName(),
                customer.getOwnerName(),
                customer.getPhone(),
                customer.getAddress(),
                account.getOpeningDue(),
                account.getJamanotBalance(),
                account.getStatus().name(),
                account.getCreatedAt()
        );
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
