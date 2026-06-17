package org.example.controller;

import java.util.List;
import java.util.Map;
import org.example.dto.CreateExpenseBatchRequest;
import org.example.dto.CreateExpenseRequest;
import org.example.dto.ExpenseCategoryResponse;
import org.example.dto.ExpenseResponse;
import org.example.dto.ProfileRequest;
import org.example.dto.SupplierStatementResponse;
import org.example.service.ExpenseService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/wholesalers/{wholesalerId}/expenses")
public class ExpenseController {

    private final ExpenseService expenseService;

    public ExpenseController(ExpenseService expenseService) {
        this.expenseService = expenseService;
    }

    @PostMapping("/categories")
    public List<ExpenseCategoryResponse> listCategories(@PathVariable Long wholesalerId) {
        return expenseService.listCategories(wholesalerId);
    }

    @PostMapping("/create")
    @ResponseStatus(HttpStatus.CREATED)
    public ExpenseResponse createExpense(
            @PathVariable Long wholesalerId,
            @RequestBody CreateExpenseRequest request
    ) {
        return expenseService.createExpense(wholesalerId, request);
    }

    @PostMapping("/create-batch")
    @ResponseStatus(HttpStatus.CREATED)
    public List<ExpenseResponse> createExpenses(
            @PathVariable Long wholesalerId,
            @RequestBody CreateExpenseBatchRequest request
    ) {
        return expenseService.createExpenses(wholesalerId, request);
    }

    @PostMapping("/list")
    public List<ExpenseResponse> listExpenses(
            @PathVariable Long wholesalerId,
            @RequestBody ProfileRequest request
    ) {
        return expenseService.listSupplierExpenses(wholesalerId, request == null ? null : request.accountId());
    }

    @PostMapping("/statement")
    public SupplierStatementResponse statement(
            @PathVariable Long wholesalerId,
            @RequestBody Map<String, Object> body
    ) {
        Long accountId = body.get("accountId") == null ? null : Long.valueOf(body.get("accountId").toString());
        String period = body.get("period") == null ? "all" : body.get("period").toString();
        return expenseService.getStatement(wholesalerId, accountId, period);
    }
}
