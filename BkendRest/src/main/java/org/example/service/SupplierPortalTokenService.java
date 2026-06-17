package org.example.service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.example.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Lightweight signed token for the read-only supplier portal. This is not a
 * replacement for full application auth, but it prevents callers from changing
 * the supplier id in the URL after login.
 */
@Service
public class SupplierPortalTokenService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final long TOKEN_TTL_SECONDS = 7L * 24L * 60L * 60L;

    private final String secret;

    public SupplierPortalTokenService(@Value("${app.supplier-portal.token-secret:dev-supplier-portal-secret-change-me}") String secret) {
        this.secret = secret;
    }

    public String issue(Long supplierId) {
        long expiresAt = Instant.now().getEpochSecond() + TOKEN_TTL_SECONDS;
        String payload = supplierId + ":" + expiresAt;
        String signature = sign(payload);
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString((payload + ":" + signature).getBytes(StandardCharsets.UTF_8));
    }

    public void requireValid(Long supplierId, String token) {
        if (token == null || token.isBlank()) {
            throw new BadRequestException("Supplier portal session is missing. Please sign in again.");
        }

        String decoded;
        try {
            decoded = new String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Supplier portal session is invalid. Please sign in again.");
        }

        String[] parts = decoded.split(":", 3);
        if (parts.length != 3) {
            throw new BadRequestException("Supplier portal session is invalid. Please sign in again.");
        }

        long tokenSupplierId;
        long expiresAt;
        try {
            tokenSupplierId = Long.parseLong(parts[0]);
            expiresAt = Long.parseLong(parts[1]);
        } catch (NumberFormatException ex) {
            throw new BadRequestException("Supplier portal session is invalid. Please sign in again.");
        }

        if (!Long.valueOf(tokenSupplierId).equals(supplierId)) {
            throw new BadRequestException("Supplier portal session does not match this supplier.");
        }
        if (expiresAt < Instant.now().getEpochSecond()) {
            throw new BadRequestException("Supplier portal session has expired. Please sign in again.");
        }

        String payload = parts[0] + ":" + parts[1];
        if (!constantTimeEquals(sign(payload), parts[2])) {
            throw new BadRequestException("Supplier portal session is invalid. Please sign in again.");
        }
    }

    private String sign(String payload) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to sign supplier portal token.", ex);
        }
    }

    private boolean constantTimeEquals(String left, String right) {
        if (left == null || right == null) {
            return false;
        }
        byte[] a = left.getBytes(StandardCharsets.UTF_8);
        byte[] b = right.getBytes(StandardCharsets.UTF_8);
        if (a.length != b.length) {
            return false;
        }
        int result = 0;
        for (int i = 0; i < a.length; i++) {
            result |= a[i] ^ b[i];
        }
        return result == 0;
    }
}
