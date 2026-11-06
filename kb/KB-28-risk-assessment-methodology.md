# Risk Assessment Methodology

**Document version:** 1.2
**Effective date:** March 1, 2026
**Owner:** Head of Security
**Parent policy:** Information Security Policy
**Review cycle:** Annual
**Classification:** Internal — may be shared with customers on request

---

## 1. Purpose

This document explains how Tidewell identifies, rates, and manages information security risks.

## 2. When Risk Assessments Happen

- A full risk assessment is completed **at least annually**.
- Targeted assessments are completed when Tidewell launches a major new product feature, adds a Tier 1 vendor, enters a new hosting region, or experiences a SEV1 security incident.

## 3. Identifying Risks

Risks are identified through workshops with Engineering, Security, Legal, and business leaders, and from:
- Security incidents and near misses
- Vulnerability scanning and penetration test results
- Vendor reviews
- Audit findings
- Changes in laws or customer requirements

## 4. Rating Risks

Each risk is rated on **likelihood** and **impact**, each on a scale of 1 to 5.

| Score | Likelihood | Impact |
|---|---|---|
| 1 | Rare | Negligible |
| 2 | Unlikely | Minor |
| 3 | Possible | Moderate |
| 4 | Likely | Major |
| 5 | Almost certain | Severe |

**Risk score = likelihood × impact**, giving a score between 1 and 25.

| Risk score | Rating | Required action |
|---|---|---|
| 15–25 | High | Treatment plan within 30 days; reported to the executive team |
| 8–14 | Medium | Treatment plan within 90 days |
| 1–7 | Low | Monitor; may be accepted |

## 5. Treating Risks

For each risk, the risk owner chooses one of four responses:
- **Reduce:** add or improve controls
- **Avoid:** stop the activity that creates the risk
- **Transfer:** shift the risk to another party through a contract
- **Accept:** accept the risk as it is

Accepting a High risk requires approval from the CTO. Accepting a Medium risk requires approval from the Head of Security.

## 6. Risk Register

6.1 All risks are recorded in the risk register with their owner, rating, treatment, and status.

6.2 The Head of Security reviews the register quarterly and presents High risks to the executive team.

6.3 The register is reviewed during Tidewell's annual SOC 2 examination.

## 7. Revision History

| Version | Date | Summary |
|---|---|---|
| 1.0 | November 1, 2022 | Initial methodology |
| 1.2 | March 1, 2026 | Added triggers for targeted assessments |
