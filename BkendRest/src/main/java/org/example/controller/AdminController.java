package org.example.controller;

import java.util.List;
import org.example.dto.CreateWholesalerRequest;
import org.example.dto.WholesalerResponse;
import org.example.service.AdminWholesalerService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/admin")
public class AdminController {

    private final AdminWholesalerService adminWholesalerService;

    public AdminController(AdminWholesalerService adminWholesalerService) {
        this.adminWholesalerService = adminWholesalerService;
    }

    @GetMapping("/hello")
    public String hello() {
        return "Hello Admin";
    }

    @GetMapping("/wholesalers")
    public List<WholesalerResponse> listWholesalers() {
        return adminWholesalerService.listWholesalers();
    }

    @PostMapping("/wholesalers")
    @ResponseStatus(HttpStatus.CREATED)
    public WholesalerResponse createWholesaler(@RequestBody CreateWholesalerRequest request) {
        return adminWholesalerService.createWholesaler(request);
    }
}
