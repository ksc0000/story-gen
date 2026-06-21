# Implement Firebase App Check Enforcement

## Context

The product roadmap explicitly states that Firebase App Check is "計画策定済み、enforcement 未実施" (plan formulated, enforcement not yet done) under the "一部実装済み" (partially implemented) section. Firebase App Check is a crucial security feature that helps protect backend resources (like Cloud Functions and Firestore) from abuse by ensuring that requests originate from legitimate applications. Implementing enforcement is a foundational step in enhancing the overall security posture of the application.

## Objective

Activate and verify Firebase App Check enforcement for Cloud Functions and Firestore to ensure only legitimate clients can access backend resources, as per the existing plan.

## Allowed Scope

-   `functions/`: For updating Cloud Functions configurations to enforce App Check (`appCheck: true`).
-   `
