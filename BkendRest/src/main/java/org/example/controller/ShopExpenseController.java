package org.example.controller;

import java.util.List;
import org.example.dto.CreateShopExpenseRequest;
import org.example.dto.ExpenseCategoryResponse;
import org.example.dto.ShopExpenseListRequest;
import org.example.dto.ShopExpenseResponse;
import org.example.service.ShopExpenseService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/wholesalers/{wholesalerId}/shop-expenses")
public class ShopExpenseController {

    private final ShopExpenseService shopExpenseService;

    public ShopExpenseController(ShopExpenseService shopExpenseService) {
        this.shopExpenseService = shopExpenseService;
    }

    @PostMapping("/categories")
    public List<ExpenseCategoryResponse> listCategories(@PathVariable Long wholesalerId) {
        return shopExpenseService.listShopCategories(wholesalerId).stream()
                .map(c -> new ExpenseCategoryResponse(c.getId(), c.getName()))
                .toList();
    }

    @PostMapping("/create")
    @ResponseStatus(HttpStatus.CREATED)
    public ShopExpenseResponse create(@PathVariable Long wholesalerId, @RequestBody CreateShopExpenseRequest request) {
        return shopExpenseService.create(wholesalerId, request);
    }

    @PostMapping("/list")
    public List<ShopExpenseResponse> list(
            @PathVariable Long wholesalerId,
            @RequestBody(required = false) ShopExpenseListRequest request
    ) {
        return shopExpenseService.list(
                wholesalerId,
                request == null ? null : request.from(),
                request == null ? null : request.to()
        );
    }

    @PostMapping("/{expenseId}/cancel")
    public ShopExpenseResponse cancel(
            @PathVariable Long wholesalerId,
            @PathVariable Long expenseId,
            @RequestBody(required = false) java.util.Map<String, String> body
    ) {
        String reason = body == null ? null : body.get("reason");
        return shopExpenseService.cancel(wholesalerId, expenseId, reason);
    }
}
