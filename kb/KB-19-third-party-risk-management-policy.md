# Third-Party Risk Management Policy

**Document version:** 1.3
**Effective date:** March 1, 2026
**Policy owner:** Head of Security
**Parent policy:** Information Security Policy
**Review cycle:** Annual
**Classification:** Internal — may be shared with customers on request

---

## 1. Purpose

This policy describes how Tidewell evaluates and monitors the vendors it relies on, so that third parties do not create unmanaged risk to Tidewell or its customers.

## 2. Scope

This policy applies to all vendors, contractors, and service providers that access Tidewell systems, process Tidewell data, or support Tidewell's production services. Vendors that process customer personal data are also **subprocessors** and are listed on the public Subprocessor List.

## 3. Vendor Tiers

| Tier | Definition | Examples |
|---|---|---|
| Tier 1 — Critical | Processes customer data, or its failure would stop Tidewell services | Cloud hosting, logging, support ticketing |
| Tier 2 — Significant | Processes Confidential data or account data | Billing, email delivery |
| Tier 3 — Low | No access to Confidential or Restricted data | Office software, travel booking |

## 4. Before Onboarding

4.1 The business owner submits a vendor request describing the service, the data involved, and the business need.

4.2 Security & Compliance assigns a tier and reviews the vendor before any contract is signed or data is shared:

| Review step | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Security questionnaire | Required | Required | Not required |
| SOC 2 report or equivalent independent assessment | Required | Preferred | Not required |
| Data processing agreement | Required if personal data is processed | Required if personal data is processed | Not required |
| Security Engineering approval | Required | Required | Not required |

4.3 Findings that create unacceptable risk must be resolved, or formally accepted through the exception process, before onboarding.

4.4 Adding or replacing a subprocessor requires 30 days' notice to customers, as set out in Tidewell's Data Processing Addendum.

## 5. Ongoing Monitoring

5.1 Tier 1 and Tier 2 vendors are **reviewed at least annually**. The review includes their latest independent assessment and any security incidents they have disclosed.

5.2 Vendors must notify Tidewell of security incidents affecting Tidewell data under the terms of their contracts.

## 6. Offboarding

When a vendor relationship ends, Tidewell removes the vendor's access, confirms return or deletion of Tidewell data, and updates the Subprocessor List where applicable.

## 7. Critical Vendor Continuity

For each Tier 1 vendor, the business owner documents what would happen if the vendor became unavailable and identifies an alternative or workaround. These plans support the Business Continuity & Disaster Recovery Plan.

## 8. Revision History

| Version | Date | Summary |
|---|---|---|
| 1.0 | November 1, 2022 | Initial policy |
| 1.2 | March 1, 2025 | Added vendor tiers |
| 1.3 | March 1, 2026 | Added critical vendor continuity requirement |
