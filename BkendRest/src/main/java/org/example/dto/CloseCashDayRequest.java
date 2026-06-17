package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Close (reconcile) a day's cash drawer.
 *  - date          business day being closed (null = today)
 *  - openingCash   override for the carried-forward float (null = use computed)
 *  - countedCash   physically counted drawer cash (required)
 *  - note          optional remark, e.g. explanation of a variance
 */
public record CloseCashDayRequest(
        LocalDate date,
        BigDecimal openingCash,
        BigDecimal countedCash,
        String note
) {
}
