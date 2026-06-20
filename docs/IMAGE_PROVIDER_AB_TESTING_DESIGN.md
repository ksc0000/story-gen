# Design Document: Image Provider Comparison and A/B Testing Framework

## 1. Summary
This document outlines the framework for systematically comparing and A/B testing different image generation providers and models within the EhonAI ecosystem. By leveraging the existing `ImageProvider` abstraction, we can evaluate new models (e.g., Flux variants, OpenAI models, or other providers) against our current production baseline in terms of quality, speed, and cost.

## 2. Context
The `ImageProvider` abstraction (PR #315, PR #241, PR #250) has unified the interface for image generation. However, selecting which provider to use currently relies on hardcoded defaults or manual overrides (`p5PageExperiment`). As the product moves from MVP to a data-driven optimization phase, we need a systematic way to test improvements (e.g., newer models like Flux 1.1 Pro or cost-effective OpenAI models) without manual intervention for every user or risking regressions.

## 3. Goals
*   **Optimize Image Quality**: Systematically measure and improve illustration quality across all defined axes (prompt completeness, visual consistency, artifact avoidance) as defined in `docs/QUALITY_METRICS.md`.
*   **Reduce Generation Latency**: Identify providers and configurations that minimize wall-clock duration for users, targeting a P95 story generation time of < 120s.
*   **Minimize Cost**: Optimize the cost-to-quality ratio. Ensure that each price tier (Ume, Take, Matsu) uses the most cost-effective provider that satisfies its quality gate.
*   **Improve Character Consistency**: Evaluate how different models handle character reference images and visual bibles, especially for "all_pages" consistency mode.
*   **Data-Driven Decision Making**: Replace ad-hoc smoke tests with a formalized A/B testing framework that provides statistically significant results.

## 4. Architecture Overview

### 4.1 Existing Abstraction Layer
The framework builds upon the following:
*   **`ImageProvider` Interface**: Normalizes the request/response cycle and error classification across Replicate, OpenAI, and future providers.
*   **`ImageAdapterFactory`**: Handles the instantiation of specific provider adapters based on an `ImageModelProfile`.
*   **`GenerationEventLogger`**: Records structured logs for all generation outcomes, providing the raw data for analysis.

### 4.2 Experimentation Engine (Proposed)
We will introduce a `ProviderExperimentEngine` that intercepts the profile resolution logic within the `generateBook` orchestration flow.

#### Key Components:
1.  **Experiment Registry**: A configuration mapping that defines active experiments, their cohorts (groups), and eligibility rules.
2.  **Deterministic Cohort Assignment**: Logic to assign a `userId` or `bookId` to a specific experiment group based on a stable hash.
3.  **Experiment Context Propagation**: Passing experiment metadata through `ImageGenerationMetadata` to ensure every downstream log event is tagged with the relevant experiment ID and cohort ID.

## 5. Metrics and Evaluation

### 5.1 Quantitative Metrics (Automated)
Data collected via `logGenerationEvent` and aggregated in Cloud Logging or exported to BigQuery.
*   **Success Rate**: Ratio of `page_image_succeeded` to `page_image_failed`.
*   **Latency**: Average and P95 `durationMs` per successful generation.
*   **Retry Rate**: Number of attempts required per successful image.
*   **Error Distribution**: Frequency of specific `ErrorCode` values (e.g., E005 safety rejections vs. TIMEOUT).
*   **Cost Efficiency**: Estimated USD cost per successful generation, enabling ROI analysis for premium models.

### 5.2 Qualitative Metrics (LLM & Human)
Integrating results from the Quality Review system:
*   **Illustration Quality Score (0-100)**: Aggregated scores from LLM auto-review (Gemini 1.5 Flash).
*   **Character Consistency Score**: Evaluation of identity retention across pages.
*   **Artifact Rate**: Detection frequency of visual artifacts, gibberish text, or anatomical issues.

## 6. Experiment Design

### 6.1 Configuration Schema
Experiments will be defined via a central registry. Initially, this will be a code-based configuration in `functions/src/lib/experiment-registry.ts`.

```typescript
export interface ImageExperiment {
  id: string; // e.g., "flux-1.1-pro-vs-base"
  status: 'active' | 'concluded' | 'draft';
  variants: {
    cohortId: string; // "control", "variant_a"
    profileOverride?: ImageModelProfile;
    // Allows testing different prompt strategies or parameters within the same provider
    configOverride?: Record<string, any>;
    weight: number; // probability (e.g., 0.5 for 50%)
  }[];
  eligibility: {
    plans?: ProductPlan[];
    creationModes?: CreationMode[];
    languages?: string[];
    userWhitelist?: string[]; // For "Cohort B" style limited rollouts
  };
}
```

### 6.2 Assignment Logic (Deterministic Hashing)
To ensure a consistent user experience, assignment must be stable for the duration of an experiment.
*   **Algorithm**: `sha256(userId + experimentId) % 100`.
*   **Consistency**: A user will always see the same model for every page in a book and across multiple books during the same experiment.

## 7. Technical Feasibility & Safety

### 7.1 Privacy Invariants
*   **PII Protection**: Experiment IDs and Cohort IDs are system identifiers and contain no PII.
*   **Prompt Isolation**: Prompts remain isolated within the `ImageProvider` request and are never logged alongside experiment metadata in structured events.

### 7.2 Fault Tolerance
*   **Fallback Safety**: If an experimental profile fails, the system must respect the existing fallback chain (e.g., falling back to `klein_fast`).
*   **Configuration Errors**: If an experiment configuration is malformed, the system must default to the production baseline (`pro_consistent`).

### 7.3 Performance Impact
*   **Minimal Overhead**: Profile resolution via hashing adds < 1ms to the orchestration phase, ensuring no impact on overall book generation latency.

## 8. Implementation Roadmap

### Phase 1: Observability & Baseline (Week 1)
*   **Unified Logging**: Ensure all non-page generation paths (Cover, Character Reference) use the `ImageProvider` pattern.
*   **Cost Tracking**: Implement cost estimation logic in `ReplicateImageAdapter` and `OpenAIImageAdapter`.

### Phase 2: Static Multi-Provider Support (Week 2)
*   Formalize the `generationOverride` pattern in `functions/src/generate-book.ts`.
*   Migrate manual `p5PageExperiment` checks to a centralized `ImageModelPolicy` module.

### Phase 3: Dynamic A/B Framework (Week 3)
*   Implement `ProviderExperimentEngine`.
*   Update `logGenerationEvent` to include `experimentId` and `experimentCohort`.
*   Deploy first "Shadow Test" (running a new model in parallel but using the baseline result) to verify latency and success rate.

### Phase 4: Full A/B Rollout (Week 4)
*   Enable live A/B testing for "Cohort B" users.
*   Automate BigQuery dashboarding for experiment analysis.

## 9. Preliminary Type Definitions

Proposed additions to `functions/src/lib/types.ts`:

```typescript
/** Metadata to be attached to generation events for A/B testing */
export interface ExperimentMetadata {
  experimentId: string;
  cohortId: string;
}
```

Update to `ImageGenerationMetadata` in `functions/src/lib/image-provider.ts`:
```typescript
export interface ImageGenerationMetadata {
  // ... existing fields ...
  experimentId?: string;
  experimentCohort?: string;
}
```

## 10. Potential Follow-up Tasks
1.  [ ] Create `functions/src/lib/experiment-engine.ts` with hashing logic.
2.  [ ] Extend `ImageGenerationResult` to include `estimatedCostUsd`.
3.  [ ] Refactor `generate-book.ts` to call `experimentEngine.resolveProfile()`.
4.  [ ] Build a "Provider Comparison" dashboard in the Admin UI.
