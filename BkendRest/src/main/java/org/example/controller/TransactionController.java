package org.example.controller;

import java.util.List;
import org.example.dto.TransactionListRequest;
import org.example.dto.TransactionResponse;
import org.example.service.TransactionService;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/wholesalers/{wholesalerId}/transactions")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @PostMapping("/list")
    public List<TransactionResponse> listTransactions(
            @PathVariable Long wholesalerId,
            @RequestBody(required = false) TransactionListRequest request
    ) {
        return transactionService.listTransactions(
                wholesalerId,
                request == null ? null : request.from(),
                request == null ? null : request.to()
        );
    }
}
