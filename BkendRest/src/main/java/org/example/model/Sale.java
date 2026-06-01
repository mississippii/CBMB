package org.example.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.example.model.enums.PostStatus;
import org.example.model.enums.SaleType;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "sales",
        indexes = {
                @jakarta.persistence.Index(name = "idx_sales_wholesaler_date", columnList = "wholesaler_id,sale_date"),
                @jakarta.persistence.Index(name = "idx_sales_customer_date", columnList = "wholesaler_customer_id,sale_date"),
                @jakarta.persistence.Index(name = "idx_sales_wh_customer_date", columnList = "wholesaler_id,wholesaler_customer_id,sale_date"),
                @jakarta.persistence.Index(name = "idx_sales_customer_phone", columnList = "wholesaler_id,customer_phone_snapshot,sale_date")
        })
@org.hibernate.annotations.Check(constraints = "gross_amount >= 0 and discount_amount >= 0 and net_amount >= 0 and paid_amount >= 0 and due_amount >= 0 and boxes_given >= 0")
@org.hibernate.annotations.Check(constraints = "customer_type in ('PERMANENT','ONE_TIME')")
public class Sale {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wholesaler_id", nullable = false)
    private Wholesaler wholesaler;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wholesaler_customer_id")
    private WholesalerCustomer wholesalerCustomer;

    @Column(name = "customer_name_snapshot", length = 160)
    private String customerNameSnapshot;

    @Column(name = "customer_phone_snapshot", length = 30)
    private String customerPhoneSnapshot;

    @Column(name = "customer_type", nullable = false, length = 20)
    private String customerType = "PERMANENT";

    @Column(name = "sale_date", nullable = false)
    private LocalDateTime saleDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "sale_type", nullable = false)
    private SaleType saleType;

    @Column(name = "gross_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal grossAmount = BigDecimal.ZERO;

    @Column(name = "discount_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "net_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal netAmount = BigDecimal.ZERO;

    @Column(name = "paid_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(name = "due_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal dueAmount = BigDecimal.ZERO;

    @Column(name = "boxes_given", nullable = false)
    private Integer boxesGiven = 0;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PostStatus status = PostStatus.POSTED;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
