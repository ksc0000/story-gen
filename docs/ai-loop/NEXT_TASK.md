# Implement Replicate Webhook / Prediction ID Management

## Context

The product roadmap lists "Replicate webhook / prediction ID 管理" under the "未実装" (Unimplemented) section (0. Current Achievements). This feature is essential for robust monitoring and reliability of image generation using Replicate, allowing for better tracking of individual predictions and handling of asynchronous callbacks. This task aims to implement the foundational backend components for this management.

## Objective

Implement backend logic to store Replicate prediction IDs for image generation requests and process webhook notifications to update job statuses. This task focuses on the core data persistence and processing, without immediate UI implications.

## Allowed Scope

- `functions/src/` (for backend logic, Firestore interactions, Replicate API calls)
- `types/` (for defining new data
