package org.example.dto;

import java.util.List;

public record CustomerProfileResponse(
        CustomerAccountResponse account,
        List<TransactionResponse> transactions
) {
}
