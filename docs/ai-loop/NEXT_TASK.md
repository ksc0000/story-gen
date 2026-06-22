# Implement Replicate Webhook Receiver for Image Generation Status Updates

## Context

The product roadmap lists "Replicate webhook / prediction ID 管理" under `未実装`. While prediction IDs are already being stored in Firestore as `providerJobId` (as observed in `functions/src/image/providers/replicate/ReplicateImageProvider.ts`), the next logical step to fully "manage" these predictions and improve real-time status updates is to implement a webhook receiver. This will allow Replicate to notify our system directly about the status of image generation predictions, rather than relying solely on polling. This task focuses specifically on creating the webhook endpoint and updating Firestore based on incoming events.

## Objective

Create a new Firebase Cloud Function (HTTP endpoint) to receive status updates from Replicate via web
