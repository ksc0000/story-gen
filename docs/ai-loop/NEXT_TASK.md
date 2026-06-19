# Implement Admin Operation Audit Logging

## Context

The product roadmap lists "admin operation audit log" as an unimplemented feature under Phase 0. Implementing this will improve accountability and observability of administrative actions within the system, which is crucial for overall system reliability and quality management. This task focuses on establishing the core logging mechanism.

## Objective

Implement a basic system to log administrative operations (e.g., manual quality review submissions, book status changes performed by an admin) to Firestore.

## Allowed Scope

- `functions/`: Implement a new callable function or modify existing admin-triggered functions to write audit logs.
- `src/lib/`: Define new types or interfaces for audit log entries.
- `src/admin/`: Integrate logging calls into existing admin-only functions (e.g.,
