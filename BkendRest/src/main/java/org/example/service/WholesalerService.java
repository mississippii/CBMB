package org.example.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.example.dto.CreateCustomerRequest;
import org.example.dto.CreateSupplierRequest;
import org.example.dto.CustomerAccountResponse;
import org.example.dto.ReceiveSupplierDeliveryItemRequest;
import org.example.dto.ReceiveSupplierDeliveryRequest;
import org.example.dto.SupplierAccountResponse;
import org.example.dto.SupplierDeliveryItemResponse;
import org.example.dto.SupplierDeliveryResponse;
import org.example.exception.BadRequestException;
import org.example.model.Category;
import org.example.model.Customer;
import org.example.model.Inventory;
import org.example.model.Product;
import org.example.model.enums.RecordStatus;
import org.example.model.enums.InventoryStatus;
import org.example.model.enums.PostStatus;
import org.example.model.enums.StockDirection;
import org.example.model.enums.StockReferenceType;
import org.example.model.enums.UnitType;
import org.example.model.StockLedger;
import org.example.model.Supplier;
import org.example.model.SupplierDelivery;
import org.example.model.SupplierDeliveryItem;
import org.example.model.Wholesaler;
import org.example.model.WholesalerCustomer;
import org.example.model.WholesalerSupplier;
import org.example.repository.CategoryRepository;
import org.example.repository.CustomerRepository;
import org.example.repository.InventoryRepository;
import org.example.repository.ProductRepository;
import org.example.repository.StockLedgerRepository;
import org.example.repository.SupplierRepository;
import org.example.repository.SupplierDeliveryItemRepository;
import org.example.repository.SupplierDeliveryRepository;
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
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final InventoryRepository inventoryRepository;
    private final SupplierDeliveryRepository supplierDeliveryRepository;
    private final SupplierDeliveryItemRepository supplierDeliveryItemRepository;
    private final StockLedgerRepository stockLedgerRepository;

    public WholesalerService(
            WholesalerRepository wholesalerRepository,
            SupplierRepository supplierRepository,
            WholesalerSupplierRepository wholesalerSupplierRepository,
            CustomerRepository customerRepository,
            WholesalerCustomerRepository wholesalerCustomerRepository,
            ProductRepository productRepository,
            CategoryRepository categoryRepository,
            InventoryRepository inventoryRepository,
            SupplierDeliveryRepository supplierDeliveryRepository,
            SupplierDeliveryItemRepository supplierDeliveryItemRepository,
            StockLedgerRepository stockLedgerRepository
    ) {
        this.wholesalerRepository = wholesalerRepository;
        this.supplierRepository = supplierRepository;
        this.wholesalerSupplierRepository = wholesalerSupplierRepository;
        this.customerRepository = customerRepository;
        this.wholesalerCustomerRepository = wholesalerCustomerRepository;
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.inventoryRepository = inventoryRepository;
        this.supplierDeliveryRepository = supplierDeliveryRepository;
        this.supplierDeliveryItemRepository = supplierDeliveryItemRepository;
        this.stockLedgerRepository = stockLedgerRepository;
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

    @Transactional
    public SupplierDeliveryResponse receiveSupplierDelivery(Long wholesalerId, ReceiveSupplierDeliveryRequest request) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        if (request.wholesalerSupplierId() == null) {
            throw new BadRequestException("Wholesaler supplier account id is required.");
        }

        WholesalerSupplier wholesalerSupplier = wholesalerSupplierRepository
                .findById(request.wholesalerSupplierId())
                .orElseThrow(() -> new BadRequestException("Supplier account not found."));

        if (!wholesalerSupplier.getWholesaler().getId().equals(wholesalerId)) {
            throw new BadRequestException("Supplier account does not belong to this wholesaler.");
        }

        if (request.items() == null || request.items().isEmpty()) {
            throw new BadRequestException("At least one delivery item is required.");
        }

        SupplierDelivery delivery = new SupplierDelivery();
        delivery.setWholesaler(wholesaler);
        delivery.setWholesalerSupplier(wholesalerSupplier);
        delivery.setDeliveryDate(request.deliveryDate() == null ? LocalDateTime.now() : request.deliveryDate());
        delivery.setNote(clean(request.note()));
        delivery.setStatus(PostStatus.POSTED);
        delivery.setTotalQuantity(BigDecimal.ZERO);
        delivery = supplierDeliveryRepository.save(delivery);

        BigDecimal totalQuantity = BigDecimal.ZERO;
        List<SupplierDeliveryItemResponse> itemResponses = new ArrayList<>();

        for (ReceiveSupplierDeliveryItemRequest itemRequest : request.items()) {
            DeliveryItemContext itemContext = receiveDeliveryItem(wholesaler, wholesalerSupplier, delivery, itemRequest);
            totalQuantity = totalQuantity.add(itemContext.deliveryItem().getQuantity());
            itemResponses.add(toDeliveryItemResponse(itemContext.deliveryItem(), itemContext.inventory()));
        }

        delivery.setTotalQuantity(totalQuantity);
        delivery = supplierDeliveryRepository.save(delivery);

        return new SupplierDeliveryResponse(
                delivery.getId(),
                wholesaler.getId(),
                wholesalerSupplier.getId(),
                delivery.getDeliveryDate(),
                delivery.getTotalQuantity(),
                delivery.getStatus().name(),
                delivery.getNote(),
                itemResponses
        );
    }

    private DeliveryItemContext receiveDeliveryItem(
            Wholesaler wholesaler,
            WholesalerSupplier wholesalerSupplier,
            SupplierDelivery delivery,
            ReceiveSupplierDeliveryItemRequest request
    ) {
        BigDecimal quantity = positive(request.quantity(), "Quantity must be greater than zero.");
        UnitType requestedUnit = parseUnit(request.unit());
        Product product = resolveProduct(request, requestedUnit);
        UnitType unit = clean(request.unit()) == null ? product.getDefaultUnit() : requestedUnit;
        if (product.getDefaultUnit() != unit) {
            throw new BadRequestException("Delivery unit must match the selected product unit.");
        }
        Category category = resolveCategory(request, product);

        SupplierDeliveryItem deliveryItem = new SupplierDeliveryItem();
        deliveryItem.setWholesaler(wholesaler);
        deliveryItem.setDelivery(delivery);
        deliveryItem.setProduct(product);
        deliveryItem.setCategory(category);
        deliveryItem.setQuantity(quantity);
        deliveryItem.setUnit(unit);
        deliveryItem.setNote(clean(request.note()));
        deliveryItem = supplierDeliveryItemRepository.save(deliveryItem);

        Inventory inventory = inventoryRepository
                .findByWholesaler_IdAndWholesalerSupplier_IdAndProduct_IdAndCategory_IdAndUnit(
                        wholesaler.getId(),
                        wholesalerSupplier.getId(),
                        product.getId(),
                        category.getId(),
                        unit
                )
                .orElseGet(() -> {
                    Inventory newInventory = new Inventory();
                    newInventory.setWholesaler(wholesaler);
                    newInventory.setWholesalerSupplier(wholesalerSupplier);
                    newInventory.setProduct(product);
                    newInventory.setCategory(category);
                    newInventory.setQuantityOnHand(BigDecimal.ZERO);
                    newInventory.setUnit(unit);
                    return newInventory;
                });
        inventory.setQuantityOnHand(inventory.getQuantityOnHand().add(quantity));
        inventory.setStatus(InventoryStatus.ACTIVE);
        inventory = inventoryRepository.save(inventory);

        StockLedger stockLedger = new StockLedger();
        stockLedger.setWholesaler(wholesaler);
        stockLedger.setWholesalerSupplier(wholesalerSupplier);
        stockLedger.setProduct(product);
        stockLedger.setCategory(category);
        stockLedger.setReferenceType(StockReferenceType.SUPPLIER_DELIVERY);
        stockLedger.setReferenceId(delivery.getId());
        stockLedger.setDirection(StockDirection.IN);
        stockLedger.setQuantity(quantity);
        stockLedger.setNote(clean(request.note()));
        stockLedgerRepository.save(stockLedger);

        return new DeliveryItemContext(deliveryItem, inventory);
    }

    private Product resolveProduct(ReceiveSupplierDeliveryItemRequest request, UnitType requestedUnit) {
        if (request.productId() != null) {
            return productRepository.findById(request.productId())
                    .orElseThrow(() -> new BadRequestException("Product not found."));
        }

        String productName = requireText(request.productName(), "Product name is required.");
        return productRepository.findByNameIgnoreCase(productName)
                .orElseThrow(() -> new BadRequestException("Product must exist before receiving supplier stock."));
    }

    private Category resolveCategory(ReceiveSupplierDeliveryItemRequest request, Product product) {
        if (request.categoryId() != null) {
            Category category = categoryRepository.findById(request.categoryId())
                    .orElseThrow(() -> new BadRequestException("Category not found."));
            if (!category.getProduct().getId().equals(product.getId())) {
                throw new BadRequestException("Category does not belong to the selected product.");
            }
            return category;
        }

        String categoryName = requireText(request.categoryName(), "Category name is required.");
        String grade = clean(request.grade());
        String categoryGrade = grade == null ? "" : grade;
        return categoryRepository.findByProduct_IdAndNameIgnoreCaseAndGrade(product.getId(), categoryName, categoryGrade)
                .orElseThrow(() -> new BadRequestException("Category must exist before receiving supplier stock."));
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

    private SupplierDeliveryItemResponse toDeliveryItemResponse(
            SupplierDeliveryItem deliveryItem,
            Inventory inventory
    ) {
        Category category = deliveryItem.getCategory();
        Product product = deliveryItem.getProduct();
        return new SupplierDeliveryItemResponse(
                deliveryItem.getId(),
                inventory.getId(),
                product.getId(),
                product.getName(),
                category.getId(),
                category.getName(),
                category.getGrade(),
                deliveryItem.getQuantity(),
                deliveryItem.getUnit().name(),
                inventory.getQuantityOnHand(),
                deliveryItem.getNote()
        );
    }

    private BigDecimal nonNegative(BigDecimal value, String message) {
        BigDecimal normalized = value == null ? BigDecimal.ZERO : value;
        if (normalized.signum() < 0) {
            throw new BadRequestException(message);
        }
        return normalized;
    }

    private BigDecimal positive(BigDecimal value, String message) {
        BigDecimal normalized = value == null ? BigDecimal.ZERO : value;
        if (normalized.signum() <= 0) {
            throw new BadRequestException(message);
        }
        return normalized;
    }

    private UnitType parseUnit(String value) {
        String cleaned = clean(value);
        if (cleaned == null || cleaned.isBlank()) {
            return UnitType.PCS;
        }
        try {
            return UnitType.valueOf(cleaned.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid unit. Allowed values: PCS, KG, DOZEN, BOX, BAG, MOUND.");
        }
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

    private record DeliveryItemContext(SupplierDeliveryItem deliveryItem, Inventory inventory) {
    }
}
