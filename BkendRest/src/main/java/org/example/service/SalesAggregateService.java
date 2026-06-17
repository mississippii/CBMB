package org.example.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;
import org.example.dto.SalesAggregateRequest;
import org.example.dto.SalesAggregateResponse;
import org.example.exception.BadRequestException;
import org.example.repository.SaleItemRepository;
import org.example.repository.SaleRepository;
import org.example.repository.WholesalerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Selling-money aggregation across the product hierarchy.
 *
 * One endpoint backs four breakdowns (product / category / sub-category / supplier) plus
 * a no-group summary. Filters cascade: pass productId to scope inside a product, plus
 * categoryId to scope further, etc. Commission is computed from the live shipment
 * commission_rate, not the per-sale snapshot, so changing a rate post-sale flows through.
 */
@Service
public class SalesAggregateService {

    private final WholesalerRepository wholesalerRepository;
    private final SaleItemRepository saleItemRepository;
    private final SaleRepository saleRepository;

    public SalesAggregateService(WholesalerRepository wholesalerRepository,
                                 SaleItemRepository saleItemRepository,
                                 SaleRepository saleRepository) {
        this.wholesalerRepository = wholesalerRepository;
        this.saleItemRepository = saleItemRepository;
        this.saleRepository = saleRepository;
    }

    @Transactional(readOnly = true)
    public SalesAggregateResponse aggregate(Long wholesalerId, SalesAggregateRequest request) {
        if (wholesalerId == null || !wholesalerRepository.existsById(wholesalerId)) {
            throw new BadRequestException("Wholesaler not found.");
        }
        SalesAggregateRequest req = request == null ? new SalesAggregateRequest(null, null, null, null, null, null, null) : request;
        GroupBy groupBy = parseGroupBy(req.groupBy());

        List<Object[]> summaryRows = saleItemRepository.aggregateSummary(
                wholesalerId, req.from(), req.to(), req.productId(), req.categoryId(), req.subCategoryId(), req.supplierAccountId()
        );
        List<Object[]> moneyRows = saleRepository.aggregateSaleMoney(
                wholesalerId, req.from(), req.to(), req.productId(), req.categoryId(), req.subCategoryId(), req.supplierAccountId(), null
        );
        Object[] summaryRow = summaryRows.isEmpty() ? null : summaryRows.get(0);
        Object[] moneyRow = moneyRows.isEmpty() ? null : moneyRows.get(0);
        SalesAggregateResponse.Summary summary = toSummary(summaryRow, moneyRow);

        List<SalesAggregateResponse.Group> groups = List.of();
        if (groupBy != null) {
            List<Object[]> rows = switch (groupBy) {
                case PRODUCT -> saleItemRepository.aggregateGroupByProduct(
                        wholesalerId, req.from(), req.to(), req.productId(), req.categoryId(), req.subCategoryId(), req.supplierAccountId());
                case CATEGORY -> saleItemRepository.aggregateGroupByCategory(
                        wholesalerId, req.from(), req.to(), req.productId(), req.categoryId(), req.subCategoryId(), req.supplierAccountId());
                case SUB_CATEGORY -> saleItemRepository.aggregateGroupBySubCategory(
                        wholesalerId, req.from(), req.to(), req.productId(), req.categoryId(), req.subCategoryId(), req.supplierAccountId());
                case SUPPLIER -> saleItemRepository.aggregateGroupBySupplier(
                        wholesalerId, req.from(), req.to(), req.productId(), req.categoryId(), req.subCategoryId(), req.supplierAccountId());
                case SHIPMENT -> saleItemRepository.aggregateGroupByShipment(
                        wholesalerId, req.from(), req.to(), req.productId(), req.categoryId(), req.subCategoryId(), req.supplierAccountId());
            };
            groups = rows.stream().map(SalesAggregateService::toGroup).toList();
        }
        return new SalesAggregateResponse(summary, groupBy == null ? null : groupBy.wire, groups);
    }

    private static SalesAggregateResponse.Summary toSummary(Object[] itemRow, Object[] moneyRow) {
        BigDecimal totalSold = itemRow == null ? BigDecimal.ZERO : bd(itemRow[0]);
        BigDecimal totalQty = itemRow == null ? BigDecimal.ZERO : bd(itemRow[1]);
        BigDecimal commission = itemRow == null ? BigDecimal.ZERO : bd(itemRow[2]);
        long count = itemRow == null ? 0L : ((Number) itemRow[3]).longValue();
        BigDecimal cashAtSale = moneyRow == null ? BigDecimal.ZERO : bd(moneyRow[0]);
        BigDecimal dueCreated = moneyRow == null ? BigDecimal.ZERO : bd(moneyRow[1]);
        return new SalesAggregateResponse.Summary(
                money(totalSold), money(cashAtSale), money(dueCreated),
                quantity(totalQty), money(commission), count
        );
    }

    private static SalesAggregateResponse.Group toGroup(Object[] row) {
        Long id = row[0] == null ? null : ((Number) row[0]).longValue();
        String name = row[1] == null ? "Uncategorized" : row[1].toString();
        BigDecimal totalSold = bd(row[2]);
        BigDecimal totalQty = bd(row[3]);
        BigDecimal commission = bd(row[4]);
        long count = ((Number) row[5]).longValue();
        return new SalesAggregateResponse.Group(id, name, money(totalSold), quantity(totalQty), money(commission), count);
    }

    private static GroupBy parseGroupBy(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT).replace('-', '_');
        return switch (normalized) {
            case "PRODUCT" -> GroupBy.PRODUCT;
            case "CATEGORY", "VARIETY" -> GroupBy.CATEGORY;
            case "SUB_CATEGORY", "SUBCATEGORY", "LOT" -> GroupBy.SUB_CATEGORY;
            case "SUPPLIER" -> GroupBy.SUPPLIER;
            case "SHIPMENT", "DELIVERY" -> GroupBy.SHIPMENT;
            default -> throw new BadRequestException("Invalid groupBy. Allowed: product, category, subCategory, supplier, shipment.");
        };
    }

    private static BigDecimal bd(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal bd) return bd;
        if (value instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return BigDecimal.ZERO;
    }

    private static BigDecimal money(BigDecimal value) {
        return value.setScale(0, RoundingMode.CEILING);
    }

    private static BigDecimal quantity(BigDecimal value) {
        return value.setScale(3, RoundingMode.HALF_UP);
    }

    private enum GroupBy {
        PRODUCT("product"),
        CATEGORY("category"),
        SUB_CATEGORY("subCategory"),
        SUPPLIER("supplier"),
        SHIPMENT("shipment");

        final String wire;

        GroupBy(String wire) {
            this.wire = wire;
        }
    }
}
