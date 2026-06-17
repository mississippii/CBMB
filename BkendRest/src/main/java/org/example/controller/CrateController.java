package org.example.controller;

import org.example.dto.CrateDashboardResponse;
import org.example.dto.CrateLossStatsResponse;
import org.example.dto.CrateQuantityRequest;
import org.example.dto.CrateTypeResponse;
import org.example.dto.SellCratesRequest;
import org.example.dto.SetCratePriceRequest;
import org.example.service.CrateService;
import org.example.service.CrateTypeService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/wholesalers/{wholesalerId}/crates")
public class CrateController {

    private final CrateService crateService;
    private final CrateTypeService crateTypeService;

    public CrateController(CrateService crateService, CrateTypeService crateTypeService) {
        this.crateService = crateService;
        this.crateTypeService = crateTypeService;
    }

    /** Active global crate-type catalog — used to populate crate forms. */
    @PostMapping("/types/catalog")
    public List<CrateTypeResponse> listCrateTypes(@PathVariable Long wholesalerId) {
        return crateTypeService.list(false);
    }

    @PostMapping("/dashboard")
    public CrateDashboardResponse getDashboard(@PathVariable Long wholesalerId) {
        return crateService.getDashboard(wholesalerId);
    }

    @PostMapping("/purchase/create")
    public CrateDashboardResponse addBoxes(
            @PathVariable Long wholesalerId,
            @RequestBody CrateQuantityRequest request
    ) {
        return crateService.addBoxes(wholesalerId, request);
    }

    @PostMapping("/lost-damaged/create")
    public CrateDashboardResponse markLostOrDamaged(
            @PathVariable Long wholesalerId,
            @RequestBody CrateQuantityRequest request
    ) {
        return crateService.markLostOrDamaged(wholesalerId, request);
    }

    @PostMapping("/loss-stats")
    public CrateLossStatsResponse getLossStats(
            @PathVariable Long wholesalerId,
            @RequestBody(required = false) Map<String, Integer> body
    ) {
        Integer months = body == null ? null : body.get("months");
        return crateService.getLossStats(wholesalerId, months);
    }

    /** Set / update the wholesaler's purchase cost for a crate type (used to value losses). */
    @PostMapping("/types/set-price")
    public CrateDashboardResponse setCratePrice(
            @PathVariable Long wholesalerId,
            @RequestBody SetCratePriceRequest request
    ) {
        return crateService.setCratePrice(wholesalerId, request);
    }

    @PostMapping("/sell")
    public CrateDashboardResponse sellCrates(
            @PathVariable Long wholesalerId,
            @RequestBody SellCratesRequest request
    ) {
        return crateService.sellCrates(wholesalerId, request);
    }
}
