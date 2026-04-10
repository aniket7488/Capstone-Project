package com.quizcap.controller;

import com.quizcap.dto.SyncRequest;
import com.quizcap.dto.SyncResponse;
import com.quizcap.service.SyncService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for offline data synchronisation.
 *
 * POST /api/sync/results – bulk upload of offline-stored quiz results
 *
 * Called automatically by the React frontend's syncManager.js when the
 * browser detects that internet connectivity has been restored.
 * The endpoint is idempotent: re-sending the same data does not create duplicates.
 */
@RestController
@RequestMapping("/api/sync")
public class SyncController {

    @Autowired private SyncService syncService;

    /**
     * Accepts a batch of offline quiz results and persists them.
     *
     * @param request     batch payload { results: [...] }
     * @param userDetails the authenticated student
     * @return SyncResponse with counts of synced/failed records
     */
    @PostMapping("/results")
    public ResponseEntity<SyncResponse> syncResults(
            @Valid @RequestBody SyncRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        SyncResponse response = syncService.syncResults(request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }
}
