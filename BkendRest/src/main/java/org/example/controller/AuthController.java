package org.example.controller;

import org.example.dto.AdminResponse;
import org.example.dto.CreateAdminRequest;
import org.example.dto.LoginRequest;
import org.example.dto.LoginResponse;
import org.example.dto.SupplierPhoneLoginRequest;
import org.example.service.AdminSetupService;
import org.example.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final AdminSetupService adminSetupService;

    public AuthController(AuthService authService, AdminSetupService adminSetupService) {
        this.authService = authService;
        this.adminSetupService = adminSetupService;
    }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/supplier-login")
    public LoginResponse supplierLogin(@RequestBody SupplierPhoneLoginRequest request) {
        return authService.supplierLogin(request);
    }

    @PostMapping("/admin/create")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminResponse createAdmin(@RequestBody CreateAdminRequest request) {
        return adminSetupService.createAdmin(request);
    }
}
