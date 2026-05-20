package org.example.service;

import java.util.List;
import org.example.dto.TransactionResponse;
import org.example.exception.BadRequestException;
import org.example.model.Payment;
import org.example.model.Sale;
import org.example.model.SaleItem;
import org.example.model.Transaction;
import org.example.model.WholesalerCustomer;
import org.example.model.WholesalerSupplier;
import org.example.repository.PaymentRepository;
import org.example.repository.SaleItemRepository;
import org.example.repository.SaleRepository;
import org.example.repository.TransactionRepository;
import org.example.repository.WholesalerCustomerRepository;
import org.example.repository.WholesalerRepository;
import org.example.repository.WholesalerSupplierRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TransactionService {

    private final WholesalerRepository wholesalerRepository;
    private final TransactionRepository transactionRepository;
    private final WholesalerCustomerRepository wholesalerCustomerRepository;
    private final WholesalerSupplierRepository wholesalerSupplierRepository;
    private final SaleRepository saleRepository;
    private final SaleItemRepository saleItemRepository;
    private final PaymentRepository paymentRepository;

    public TransactionService(
            WholesalerRepository wholesalerRepository,
            TransactionRepository transactionRepository,
            WholesalerCustomerRepository wholesalerCustomerRepository,
            WholesalerSupplierRepository wholesalerSupplierRepository,
            SaleRepository saleRepository,
            SaleItemRepository saleItemRepository,
            PaymentRepository paymentRepository
    ) {
        this.wholesalerRepository = wholesalerRepository;
        this.transactionRepository = transactionRepository;
        this.wholesalerCustomerRepository = wholesalerCustomerRepository;
        this.wholesalerSupplierRepository = wholesalerSupplierRepository;
        this.saleRepository = saleRepository;
        this.saleItemRepository = saleItemRepository;
        this.paymentRepository = paymentRepository;
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> listTransactions(Long wholesalerId) {
        if (wholesalerId == null || !wholesalerRepository.existsById(wholesalerId)) {
            throw new BadRequestException("Wholesaler not found.");
        }
        return transactionRepository.findByWholesalerIdOrderByCreatedAtDesc(wholesalerId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> listCustomerTransactions(Long wholesalerId, Long wholesalerCustomerId) {
        if (wholesalerId == null || !wholesalerRepository.existsById(wholesalerId)) {
            throw new BadRequestException("Wholesaler not found.");
        }
        return transactionRepository.findByWholesalerIdAndWholesalerCustomerIdOrderByCreatedAtDesc(wholesalerId, wholesalerCustomerId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> listSupplierTransactions(Long wholesalerId, Long wholesalerSupplierId) {
        if (wholesalerId == null || !wholesalerRepository.existsById(wholesalerId)) {
            throw new BadRequestException("Wholesaler not found.");
        }
        return transactionRepository.findByWholesalerIdAndWholesalerSupplierIdOrderByCreatedAtDesc(wholesalerId, wholesalerSupplierId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private TransactionResponse toResponse(Transaction transaction) {
        PartySnapshot party = resolveParty(transaction);
        SaleItem item = transaction.getSaleId() == null
                ? null
                : saleItemRepository.findFirstBySale_Id(transaction.getSaleId()).orElse(null);
        Payment payment = transaction.getPaymentId() == null
                ? null
                : paymentRepository.findFirstByWholesalerIdAndId(transaction.getWholesalerId(), transaction.getPaymentId()).orElse(null);
        return new TransactionResponse(
                transaction.getId(),
                transaction.getTransactionType().name(),
                transaction.getSaleId(),
                transaction.getPaymentId(),
                transaction.getWholesalerCustomerId(),
                party.customerName(),
                party.customerPhone(),
                transaction.getWholesalerSupplierId(),
                party.supplierName(),
                party.supplierPhone(),
                item == null ? null : item.getProduct().getId(),
                item == null ? null : item.getProduct().getName(),
                item == null || item.getCategory() == null ? null : item.getCategory().getId(),
                item == null || item.getCategory() == null ? null : item.getCategory().getName(),
                item == null ? null : item.getQuantity(),
                item == null ? null : item.getUnit().name(),
                item == null ? null : item.getUnitPrice(),
                transaction.getSaleAmount(),
                transaction.getPaymentAmount(),
                transaction.getDueAmount(),
                payment == null ? 0 : payment.getBoxesReturned(),
                payment == null ? java.math.BigDecimal.ZERO : payment.getJamanotAmount(),
                payment == null ? null : payment.getPaymentType().name(),
                transaction.getDescription(),
                transaction.getCreatedAt()
        );
    }

    private PartySnapshot resolveParty(Transaction transaction) {
        String customerName = null;
        String customerPhone = null;
        String supplierName = null;
        String supplierPhone = null;

        if (transaction.getWholesalerCustomerId() != null) {
            WholesalerCustomer customer = wholesalerCustomerRepository.findById(transaction.getWholesalerCustomerId()).orElse(null);
            if (customer != null) {
                customerName = customer.getCustomer().getName();
                customerPhone = customer.getCustomer().getPhone();
            }
        }

        if (transaction.getSaleId() != null) {
            Sale sale = saleRepository.findById(transaction.getSaleId()).orElse(null);
            if (sale != null && customerName == null) {
                customerName = sale.getCustomerNameSnapshot();
                customerPhone = sale.getCustomerPhoneSnapshot();
            }
            SaleItem item = saleItemRepository.findFirstBySale_Id(transaction.getSaleId()).orElse(null);
            if (item != null) {
                supplierName = item.getWholesalerSupplier().getSupplier().getName();
                supplierPhone = item.getWholesalerSupplier().getSupplier().getPhone();
            }
        }

        if (transaction.getWholesalerSupplierId() != null && supplierName == null) {
            WholesalerSupplier supplier = wholesalerSupplierRepository.findById(transaction.getWholesalerSupplierId()).orElse(null);
            if (supplier != null) {
                supplierName = supplier.getSupplier().getName();
                supplierPhone = supplier.getSupplier().getPhone();
            }
        }

        return new PartySnapshot(customerName, customerPhone, supplierName, supplierPhone);
    }

    private record PartySnapshot(String customerName, String customerPhone, String supplierName, String supplierPhone) {
    }
}
