package org.example.controller;

import org.example.dto.PnLRequest;
import org.example.dto.PnLResponse;
import org.example.service.ProfitLossService;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/wholesalers/{wholesalerId}/reports")
public class ReportController {

    private final ProfitLossService profitLossService;

    public ReportController(ProfitLossService profitLossService) {
        this.profitLossService = profitLossService;
    }

    @PostMapping("/pnl")
    public PnLResponse pnl(
            @PathVariable Long wholesalerId,
            @RequestBody(required = false) PnLRequest request
    ) {
        return profitLossService.generate(wholesalerId, request);
    }
}
