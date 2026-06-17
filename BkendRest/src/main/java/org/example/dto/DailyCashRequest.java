package org.example.dto;

import java.time.LocalDate;

/** Request for a single day's cash book. Null date defaults to today. */
public record DailyCashRequest(LocalDate date) {
}
