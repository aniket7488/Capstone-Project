package com.quizcap.controller;

import com.quizcap.dto.ProgressSummaryDto;
import com.quizcap.dto.ResultDto;
import com.quizcap.service.ProgressService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for user progress and result history.
 *
 * GET /api/progress/me         – full result history for the current user
 * GET /api/progress/me/summary – aggregated stats (completed lessons, avg score)
 *
 * All endpoints require a valid JWT.
 */
@RestController
@RequestMapping("/api/progress")
public class ProgressController {

    @Autowired private ProgressService progressService;

    /** Returns the authenticated user's complete quiz result history. */
    @GetMapping("/me")
    public ResponseEntity<List<ResultDto>> getMyResults(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(progressService.getMyResults(userDetails.getUsername()));
    }

    /** Returns aggregated progress stats for the Dashboard page. */
    @GetMapping("/me/summary")
    public ResponseEntity<ProgressSummaryDto> getSummary(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(progressService.getSummary(userDetails.getUsername()));
    }
}
