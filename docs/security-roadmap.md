# Security Roadmap

## Firebase App Check preparation

- App Check helps verify that requests come from the official EhonAI web app before they reach Firestore, Storage, or Cloud Functions.
- On web, we can start with reCAPTCHA Enterprise or another supported provider.
- The safest rollout is phased:
  - monitoring only first
  - then Cloud Functions enforcement
  - then Firestore / Storage enforcement
- Development environments should use debug tokens so local work is not blocked.
- Functions that trigger image generation or other AI cost should be the highest-priority protection targets.

## Suggested rollout order

1. Enable App Check in monitoring mode for the web app
2. Measure failed / suspicious requests
3. Enforce App Check on AI-cost Functions first
4. Enforce App Check on Firestore and Storage after client coverage is confirmed

## Notes

- This document is planning-only. App Check is not enforced yet.
- Product-plan gating and monthly quota checks should eventually be combined with App Check for stronger abuse prevention.
