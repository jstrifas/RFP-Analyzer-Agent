# Information Security Policy

**Document version:** 3.2
**Effective date:** February 1, 2026
**Supersedes:** Version 2.4 (effective March 1, 2023)
**Policy owner:** Head of Security
**Approved by:** Chief Technology Officer
**Review cycle:** Annual
**Classification:** Internal — may be shared with customers on request

---

## 1. Purpose

This policy establishes how Tidewell Data, Inc. ("Tidewell") protects the confidentiality, integrity, and availability of its information and systems, including data entrusted to Tidewell by its customers. It sets the top-level requirements that all other Tidewell security policies and standards must follow.

## 2. Scope

This policy applies to:

- All Tidewell employees, contractors, and interns ("personnel").
- All systems used to build, operate, or support Tidewell products, including production infrastructure hosted on AWS, corporate SaaS applications, and company-issued devices.
- All data processed by Tidewell, including customer data, personal data, and Tidewell's own business information.

## 3. Roles and Responsibilities

**Chief Technology Officer (CTO).** Accountable executive for the information security program. Approves this policy and major changes to the security program.

**Head of Security.** Owns the security program day to day. Maintains this policy and its supporting standards, oversees risk assessments, leads security incident response, and reports on security posture to the executive team at least quarterly.

**Security & Compliance team.** Implements and monitors security controls, manages the SOC 2 program, responds to customer security questionnaires, and supports audits.

**Engineering managers.** Ensure their teams follow secure development and change management requirements.

**All personnel.** Follow this policy, complete required security training, and report suspected security incidents immediately.

## 4. Governance

4.1 The information security program is reviewed by the executive team at least annually.

4.2 All security policies and standards are reviewed at least annually and updated when business, legal, or technical changes require it.

4.3 Exceptions to any security policy must be documented, risk-assessed, approved by the Head of Security, and time-limited to a maximum of 12 months.

4.4 Tidewell maintains a risk register. Risks are assessed at least annually following the Risk Assessment Methodology.

## 5. Data Classification

All Tidewell information is classified into one of four levels:

| Level | Description | Examples |
|---|---|---|
| Restricted | Highest sensitivity. Unauthorized disclosure could cause severe harm. | Customer data, credentials, encryption keys |
| Confidential | Sensitive business information. | Contracts, financials, security reports |
| Internal | For Tidewell personnel only. | Internal wikis, roadmaps |
| Public | Approved for public release. | Marketing site, Trust Center |

Customer data is always classified as **Restricted**.

## 6. Core Security Requirements

**6.1 Identity and access.** Access to systems is granted on a least-privilege basis and requires a documented business need. Multi-factor authentication (MFA) is **required for all internal systems and all production access**, with no exceptions. Details are in the Access Control Policy.

**6.2 Encryption.** Restricted data must be encrypted at rest and in transit. Details are in the Encryption Standard.

**6.3 Logging and monitoring.** Security-relevant events on production systems are logged centrally and monitored. Details are in the Logging & Monitoring Standard.

**6.4 Secure development.** All code changes to production systems require peer review and automated security checks before deployment. Details are in the Secure SDLC Policy and Change Management Policy.

**6.5 Vulnerability management.** Tidewell scans its infrastructure and application dependencies for vulnerabilities and remediates findings within defined timeframes. Details are in the Vulnerability Management Standard.

**6.6 Vendor management.** Vendors that access Restricted or Confidential data are reviewed before onboarding and at least annually thereafter. Details are in the Third-Party Risk Management Policy.

**6.7 Data retention.** Data is retained only as long as required for business, contractual, or legal reasons. Details are in the Data Retention & Deletion Policy.

**6.8 Incident response.** Suspected security incidents must be reported immediately to the Security team. Incidents are handled according to the Incident Response Plan.

**6.9 Business continuity.** Tidewell maintains and tests plans to recover critical services. Details are in the Business Continuity & Disaster Recovery Plan.

**6.10 Endpoints.** Company-issued devices must be enrolled in device management, have full-disk encryption enabled, and receive security updates automatically.

## 7. Personnel Security

7.1 Background checks are completed for all new hires before their start date, where permitted by local law.

7.2 All personnel complete security awareness training during onboarding and annually thereafter.

7.3 All personnel sign a confidentiality agreement and acknowledge this policy and the Acceptable Use Policy before receiving system access.

7.4 Access for departing personnel is removed within 24 hours of their last working day.

## 8. Compliance

8.1 Tidewell maintains a SOC 2 Type II program and undergoes an independent examination annually.

8.2 Violations of this policy may result in disciplinary action, up to and including termination of employment or contract.

## 9. Related Documents

- Access Control Policy
- Encryption Standard
- Logging & Monitoring Standard
- Data Retention & Deletion Policy
- Incident Response Plan
- Secure SDLC Policy
- Change Management Policy
- Vulnerability Management Standard
- Third-Party Risk Management Policy
- Business Continuity & Disaster Recovery Plan
- Acceptable Use Policy
- Risk Assessment Methodology

## 10. Revision History

| Version | Date | Summary |
|---|---|---|
| 2.4 | March 1, 2023 | Annual review |
| 3.0 | January 15, 2025 | Restructured policy framework; added data classification levels |
| 3.1 | May 1, 2025 | Updated roles after security team reorganization |
| 3.2 | February 1, 2026 | MFA made mandatory for all internal systems; exception limit set to 12 months |
