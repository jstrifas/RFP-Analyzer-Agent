# Information Security Policy

> **SUPERSEDED.** This version was replaced by version 3.2, effective February 1, 2026. It is retained for audit history only.

**Document version:** 2.4
**Effective date:** March 1, 2023
**Policy owner:** Director of Engineering
**Approved by:** Chief Technology Officer
**Review cycle:** Annual
**Classification:** Internal

---

## 1. Purpose

This policy describes how Tidewell Data, Inc. ("Tidewell") protects its information systems and the data it holds, including data belonging to customers.

## 2. Scope

This policy applies to all Tidewell employees and contractors, and to all systems used to run and support the Tidewell product, including AWS production infrastructure, corporate applications, and company laptops.

## 3. Roles and Responsibilities

**Chief Technology Officer.** Accountable for information security at Tidewell and approves this policy.

**Director of Engineering.** Owns this policy and coordinates security work across engineering teams.

**Security Engineer(s).** Implement security tooling, monitor alerts, and support audits.

**All employees and contractors.** Follow this policy and report security concerns to their manager or the security channel.

## 4. Governance

4.1 This policy is reviewed at least annually.

4.2 Exceptions to this policy must be approved by the Director of Engineering. Exceptions do not have a maximum duration but should be revisited during the annual review.

## 5. Data Handling

5.1 Tidewell classifies data as **Confidential**, **Internal**, or **Public**.

5.2 Customer data is classified as **Confidential**.

5.3 Confidential data must not be stored on personal devices or shared through personal email or file-sharing accounts.

## 6. Security Requirements

**6.1 Access.** Access to systems is granted based on job role. Access to production systems requires manager approval.

**6.2 Multi-factor authentication.** MFA is **required for production systems and the AWS console**. MFA is **recommended but optional** for other internal tools, such as the wiki, project tracker, and chat.

**6.3 Passwords.** Passwords must be at least 12 characters and must be changed **every 90 days**.

**6.4 Encryption.** Customer data must be encrypted at rest and in transit.

**6.5 Logging.** Production systems must log security-relevant events.

**6.6 Code changes.** Changes to production code require review by at least one other engineer.

**6.7 Vulnerabilities.** Vulnerabilities are prioritized by severity and fixed as quickly as practical.

**6.8 Backups.** Production databases are backed up regularly.

**6.9 Incidents.** Suspected security incidents must be reported to the security channel immediately.

## 7. Personnel Security

7.1 New employees complete security awareness training during their first month.

7.2 All employees sign a confidentiality agreement before receiving system access.

7.3 When an employee leaves Tidewell, their access is removed **within 3 business days** of their last working day.

## 8. Compliance

8.1 Tidewell is preparing for a SOC 2 examination.

8.2 Violations of this policy may result in disciplinary action.

## 9. Revision History

| Version | Date | Summary |
|---|---|---|
| 2.0 | January 10, 2022 | Major revision for SOC 2 readiness |
| 2.3 | June 1, 2022 | Added password requirements |
| 2.4 | March 1, 2023 | Annual review; no material changes |
