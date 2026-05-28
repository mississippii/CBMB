package org.example.controller;

import org.example.dto.CrateDashboardResponse;
import org.example.dto.CrateLossStatsResponse;
import org.example.dto.CrateQuantityRequest;
import org.example.dto.SellCratesRequest;
import org.example.dto.SetCratePriceRequest;
import org.example.service.CrateService;
import java.util.Map;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/wholesalers/{wholesalerId}/crates")
public class CrateController {

    private final CrateService crateService;

    public CrateController(CrateService crateService) {
        this.crateService = crateService;
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

    /**
     * Mark a previously-absorbed lost/damaged record as compensated by a customer
     * or supplier. Posts a receivable on that party's account_ledger and stamps
     * the box_ledger row so the P&L stops counting it as a wholesaler-borne cost.
     */
    @PostMapping("/types/set-price")
    public CrateDashboardResponse setCratePrice(
            @PathVariable Long wholesalerId,
            @RequestBody SetCratePriceRequest request
    ) {
        return crateService.setCratePrice(wholesalerId, request);
    }

    @PostMapping("/loss/{boxLedgerId}/compensate")
    public CrateDashboardResponse markLossCompensated(
            @PathVariable Long wholesalerId,
            @PathVariable Long boxLedgerId,
            @RequestBody CrateQuantityRequest request
    ) {
        return crateService.markLossCompensated(wholesalerId, boxLedgerId, request);
    }

    @PostMapping("/sell")
    public CrateDashboardResponse sellCrates(
            @PathVariable Long wholesalerId,
            @RequestBody SellCratesRequest request
    ) {
        return crateService.sellCrates(wholesalerId, request);
    }
}
