package org.example.controller;

import org.example.dto.BoxDashboardResponse;
import org.example.dto.BoxQuantityRequest;
import org.example.service.BoxService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/wholesalers/{wholesalerId}/boxes")
public class BoxController {

    private final BoxService boxService;

    public BoxController(BoxService boxService) {
        this.boxService = boxService;
    }

    @PostMapping("/dashboard")
    public BoxDashboardResponse getDashboard(@PathVariable Long wholesalerId) {
        return boxService.getDashboard(wholesalerId);
    }

    @PostMapping("/purchase/create")
    public BoxDashboardResponse addBoxes(
            @PathVariable Long wholesalerId,
            @RequestBody BoxQuantityRequest request
    ) {
        return boxService.addBoxes(wholesalerId, request);
    }

    @PostMapping("/lost-damaged/create")
    public BoxDashboardResponse markLostOrDamaged(
            @PathVariable Long wholesalerId,
            @RequestBody BoxQuantityRequest request
    ) {
        return boxService.markLostOrDamaged(wholesalerId, request);
    }
}
