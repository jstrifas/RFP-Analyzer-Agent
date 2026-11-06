# Tidewell Product Security Whitepaper

**Version:** 2026.1
**Published:** May 2026
**Classification:** Public

---

## 1. Introduction

Tidewell Sync moves data between the SaaS applications a company runs on and the data warehouse where it analyzes that data. Tidewell Insights lets business teams explore that data. Because Tidewell sits in the path of a customer's data, security is part of the product's design, not an add-on.

This whitepaper explains how the Tidewell platform is built to protect **workspace data**, meaning all data that belongs to a customer's Tidewell workspace. That includes records synced from source systems, sync history and metadata, connection settings and credentials, and Insights dashboards and saved queries.

## 2. Architecture Overview

The Tidewell platform has three main layers.

**Control plane.** The web application and API where customers configure connections, schedule syncs, manage users, and view results. The control plane stores configuration and metadata, not bulk synced records.

**Data plane.** Sync workers that read from source systems, apply transformations, and write to destination warehouses. Sync workers run in short-lived, isolated containers. Each sync job runs in its own container, which is destroyed when the job ends.

**Insights service.** Runs queries for Tidewell Insights against a customer's synced data and renders dashboards.

Each layer runs separately in both hosting regions: US (AWS us-east-1) and EU (AWS eu-west-1). A workspace is assigned to one region, and all three layers for that workspace run in that region.

## 3. Workspace Isolation

Tidewell is a multi-tenant service. Workspace data is kept logically separate at every layer:

- **Application layer.** Every request is checked against the signed-in user's workspace. The application cannot return records from another workspace, even if a request is manipulated.
- **Database layer.** Every table containing workspace data is keyed by workspace ID, and database-level row security policies enforce that queries only return rows for the current workspace.
- **Data plane.** Sync containers are created for a single workspace's job and are never reused across workspaces.
- **Encryption.** Connection credentials for each workspace are encrypted with a workspace-specific data key.

Workspace isolation is covered by automated tests on every release and is included in the scope of Tidewell's annual third-party penetration test.

## 4. Data Flow and Staging

When a sync runs, workspace data moves from the source system, through a sync worker, to the destination warehouse. Some large syncs stage data temporarily in encrypted object storage in the workspace's region. **Staged data is deleted within 24 hours after the sync completes.** Tidewell does not keep a permanent copy of synced records beyond what is needed for Insights and sync history.

## 5. Encryption

- **At rest:** All workspace data is encrypted with **AES-256**. Keys are managed in AWS KMS and stay in the same region as the data they protect.
- **In transit:** All connections to Tidewell use **TLS 1.2 or higher**. Connections from Tidewell to source systems and warehouses use TLS where supported, and customers can enable SSH tunneling or private network connectivity for destinations that support it.
- **Credentials:** The credentials customers provide to connect their systems are encrypted separately and are never shown again in the application or written to logs.

## 6. Identity and Access

- Customers manage access to their workspace with built-in roles: Admin, Editor, and Viewer.
- MFA is available and can be required on all plans. SAML SSO, SCIM provisioning, and IP allowlisting are available on the Enterprise plan.
- Tidewell staff cannot access workspace data unless a workspace Admin grants a time-limited support session. All actions during a support session are logged.
- Production access by Tidewell engineers is time-limited, requires phishing-resistant MFA, and is logged.

## 7. Logging

Security-relevant actions in each workspace, such as sign-ins, permission changes, connection changes, API key creation, and data exports, are recorded in the workspace audit log. Record contents are masked before any data reaches Tidewell's logging and error monitoring providers.

## 8. Secure Development

All code changes are peer reviewed and pass automated security checks, including static analysis, dependency scanning, and secret scanning, before deployment. Production workspace data is never used in development or testing environments.

## 9. Availability

Production services run across multiple Availability Zones in each region. Tidewell commits to 99.9% monthly uptime on the Business and Enterprise plans and publishes status on its status page.

## 10. AI and Workspace Data

Tidewell does not use workspace data to train machine learning or AI models.

## 11. Compliance

Tidewell maintains a SOC 2 Type II report covering Security, Availability, and Confidentiality. The report is available under NDA through the Trust Center.
