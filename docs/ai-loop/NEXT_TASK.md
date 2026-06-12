# Define LLM Auto Review JSON Schema

## Context

Phase 2 of the roadmap, "Story & Illustration Quality," aims to make generated results "acceptable as a product." A key "unimplemented" item is an `LLM auto review prototype`, and a completion condition for Phase 2 is that the "Future LLM auto review JSON schema が定義されている" (Future LLM auto review JSON schema is defined). This task prepares the groundwork for automating quality assessment by explicitly defining the data structure an LLM would generate after reviewing a book.

We have already implemented a manual quality review UI and score persistence, along with a `Quality Recommendation` system. Defining this schema is the logical next `docs-first` step towards implementing LLM-driven quality analysis and improving our quality regression detection capabilities.

## Objective

Define the JSON schema for an automated quality review performed by an LLM. This schema will serve as the target output structure for future LLM-based
