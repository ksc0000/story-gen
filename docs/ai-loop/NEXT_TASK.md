# Implement Diagnostic Script for Scheduler Job Verification

## Context

The product roadmap for EhonAI highlights `Phase 1: Reliability First` as nearing completion, but several operational verification steps remain outstanding before full closure. Specifically, confirming the successful execution of critical scheduled jobs like `saveDailySloSnapshot`, `saveWeeklySloSnapshot`, and `cleanupStaleGeneration` with real production data is a remaining task. While general production smoke tests are in progress (Jules #277), a dedicated diagnostic tool would streamline the verification of these specific scheduler jobs, which are crucial for SLO reporting and data hygiene. This task aims to provide a worker agent with an implementable tool to assist in this verification.

## Objective

Develop a standalone diagnostic script that can be run manually to verify the successful execution and output
