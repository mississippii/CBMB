package org.example.controller;

import org.example.dto.CloseCashDayRequest;
import org.example.dto.DailyCashRequest;
import org.example.dto.DailyCashResponse;
import org.example.service.CashReconciliationService;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Day-end cash book: debit/credit drawer reconciliation and day-close.
 */
@RestController
@RequestMapping("/wholesalers/{wholesalerId}/cash")
public class CashController {

    private final CashReconciliationService cashReconciliationService;

    public CashController(CashReconciliationService cashReconciliationService) {
        this.cashReconciliationService = cashReconciliationService;
    }

    @PostMapping("/daily")
    public DailyCashResponse daily(@PathVariable Long wholesalerId,
                                   @RequestBody(required = false) DailyCashRequest request) {
        return cashReconciliationService.daily(wholesalerId, request == null ? null : request.date());
    }

    @PostMapping("/close")
    public DailyCashResponse close(@PathVariable Long wholesalerId,
                                   @RequestBody CloseCashDayRequest request) {
        return cashReconciliationService.close(wholesalerId, request);
    }

    @PostMapping("/reopen")
    public DailyCashResponse reopen(@PathVariable Long wholesalerId,
                                    @RequestBody(required = false) DailyCashRequest request) {
        return cashReconciliationService.reopen(wholesalerId, request == null ? null : request.date());
    }
}
