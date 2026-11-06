# SOC 2 Type II Report Summary and Bridge Letter

**Prepared by:** Tidewell Security & Compliance
**Date:** July 15, 2026
**Classification:** Confidential — shared under NDA

*This document summarizes Tidewell's most recent SOC 2 Type II report and includes the current bridge letter. It does not replace the full report, which is available to customers and prospects under a non-disclosure agreement.*

---

## Part 1: Report Summary

| Item | Detail |
|---|---|
| Report type | SOC 2 Type II |
| Service organization | Tidewell Data, Inc. |
| Services in scope | Tidewell Sync and Tidewell Insights |
| Trust Services Criteria | Security, Availability, Confidentiality |
| Examination period | January 1, 2025 – December 31, 2025 |
| Independent auditor | Calder & Reyes LLP, Certified Public Accountants |
| Report issue date | March 20, 2026 |
| Auditor's opinion | Unqualified |
| Exceptions noted | None |

### Scope

The examination covered the systems, people, and processes Tidewell uses to deliver Tidewell Sync and Tidewell Insights, including:

- Production infrastructure in AWS us-east-1 and eu-west-1
- The Tidewell web application and API
- Supporting processes: access management, change management, vulnerability management, incident response, vendor management, backup and recovery, and personnel security

### Subservice organizations

Tidewell uses Amazon Web Services (AWS) for infrastructure hosting. The report uses the **carve-out method** for AWS. This means AWS's own controls, such as physical security of data centers, are not tested in Tidewell's report. Customers can review AWS's SOC 2 report through AWS Artifact.

### Complementary user entity controls

Tidewell's controls assume customers perform certain controls on their side. Key examples:

- Customers manage which of their users have access to their Tidewell workspace and remove access when a user leaves.
- Customers enable MFA or single sign-on for their users where available.
- Customers protect the credentials they use to connect Tidewell to their source systems and warehouses.
- Customers notify Tidewell promptly of any suspected unauthorized use of their account.

### History

| Report | Period | Result |
|---|---|---|
| SOC 2 Type I | As of June 30, 2023 | Unqualified |
| SOC 2 Type II | July 1, 2023 – June 30, 2024 | Unqualified |
| SOC 2 Type II | January 1, 2025 – December 31, 2025 | Unqualified, no exceptions |

Tidewell moved its audit period to the calendar year in 2025. Controls operated continuously between the 2024 and 2025 report periods.

---

## Part 2: Bridge Letter

**Date:** July 15, 2026
**To:** Customers and prospective customers of Tidewell Data, Inc.
**Re:** Period from January 1, 2026 to June 30, 2026

Tidewell's most recent SOC 2 Type II report covers the period January 1, 2025 through December 31, 2025. This letter covers the period from the end of that report through June 30, 2026 (the "bridge period").

Management of Tidewell Data, Inc. confirms that, to the best of our knowledge:

1. There have been no material changes to the system of internal controls described in the SOC 2 Type II report during the bridge period.
2. We are not aware of any material control failures or security incidents during the bridge period that would affect the conclusions of the report.
3. Our next SOC 2 Type II examination, covering January 1, 2026 through December 31, 2026, is underway with Calder & Reyes LLP. We expect the report to be issued in the first quarter of 2027.

This letter is provided by Tidewell management. It has not been examined by an independent auditor and does not provide the same level of assurance as a SOC 2 report.

Sincerely,

Head of Security
Tidewell Data, Inc.
