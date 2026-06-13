# Implement Firebase App Check Enforcement

## Context

The product roadmap indicates that Firebase App Check is "計画策定済み、enforcement 未実施" (plan formulated, enforcement not yet implemented). Firebase App Check helps protect backend resources (Firestore, Cloud Functions) from abuse, ensuring only trusted clients can access them. Given the completion of core generation reliability (Phase 4 closure) and the ongoing limited rollout (Phase 5 Cohort B), strengthening the application's security and reliability infrastructure is a logical next step to prevent potential abuse and ensure stability.

## Objective

Implement enforcement for Firebase App Check across all relevant Firebase services (Firestore, Cloud Functions) to verify incoming requests originate from legitimate instances of the application.

## Allowed Scope

-   `firebase/`: Add App Check configuration to Firebase project settings
