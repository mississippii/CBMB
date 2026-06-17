package org.example.model.enums;

/**
 * Lifecycle of a single day's cash book.
 * OPEN   — movements are live, no physical count locked in yet.
 * CLOSED — the day has been reconciled and the counted cash recorded.
 */
public enum CashDayStatus {
    OPEN,
    CLOSED
}
