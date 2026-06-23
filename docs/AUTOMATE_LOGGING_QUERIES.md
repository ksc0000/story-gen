# Automating Cloud Logging Saved Queries Deployment

This document describes how to automatically deploy the pre-defined Cloud Logging queries for smoke test observability and SLO triage.

## Overview

The `scripts/apply-saved-queries.mjs` script automates the creation of "Saved Queries" (technically `savedViews` in the Cloud Logging REST API) in the Google Cloud Console. It parses the query definitions directly from `docs/P2_GENERATION_SLO_SAVED_LOGGING_QUERIES.md`, ensuring that the documentation and the live console remain in sync.

## Prerequisites

1.  **Service Account Credentials**: You need a Google Cloud service account with the `roles/logging.admin` role (or at least `logging.views.create` and `logging.views.list`).
2.  **Environment Variable**: Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the path of your service account JSON key file.
    ```bash
    export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account.json"
    ```

## Usage

### Dry Run (Recommended First Step)

Preview which queries will be parsed and what their filters are without making any API calls:

```bash
npm run deploy:logging-queries -- --dry-run
```

### Deployment

Deploy the queries to the default project (`story-gen-8a769`):

```bash
npm run deploy:logging-queries
```

To specify a different project:

```bash
npm run deploy:logging-queries -- --project your-project-id
```

## How it Works

1.  **Parsing**: The script scans `docs/P2_GENERATION_SLO_SAVED_LOGGING_QUERIES.md` for `####` headers (used as the query name) followed by code blocks (used as the filter text).
2.  **Authentication**: It generates a Google-signed JWT using the provided service account and exchanges it for an OAuth2 access token.
3.  **Deduplication**: It lists existing `savedViews` in the project. If a query with the same `displayName` already exists, it skips it to avoid duplicates (and because the REST API for updates requires the internal resource ID).
4.  **Creation**: It sends a `POST` request to the Cloud Logging API to create new `savedViews`.

## Target API Endpoint

The script targets the following REST API endpoint:
`https://logging.googleapis.com/v2/projects/{PROJECT_ID}/locations/global/savedViews`

## Troubleshooting

-   **Auth Errors**: Ensure your service account has `roles/logging.admin`.
-   **No Queries Found**: Check if `docs/P2_GENERATION_SLO_SAVED_LOGGING_QUERIES.md` follows the expected format (`#### Name` followed by a ``` code block).
-   **Proxy Issues**: The script respects `HTTPS_PROXY` environment variables.
