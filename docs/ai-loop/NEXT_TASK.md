# Implement Backend Logic for PDF Output

## Context

The product roadmap has identified PDF output as a desired feature, and a design draft (`docs/PDF_OUTPUT_DESIGN.md`, PR #402) has already been completed. This task focuses on implementing the initial backend logic required to generate a PDF of a completed book, following the existing design. This is a key step towards enabling users to download and print their stories.

## Objective

Implement the backend function to generate a PDF for a given `BookDoc`, converting its content (story text and image URLs) into a structured PDF format. This initial implementation will focus on core PDF generation without complex styling or advanced layout features, aiming for a readable output.

## Allowed Scope

- `functions/src/` (for new PDF generation logic
