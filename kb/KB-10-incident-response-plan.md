# Incident Response Plan

**Document version:** 2.0
**Effective date:** January 15, 2026
**Plan owner:** Head of Security
**Parent policy:** Information Security Policy
**Review cycle:** Annual, and after every SEV1 or SEV2 incident
**Classification:** Internal — summary may be shared with customers on request

---

## 1. Purpose

This plan describes how Tidewell detects, responds to, and recovers from security incidents, and how Tidewell communicates with customers when an incident affects them.

## 2. Scope

This plan covers security incidents affecting Tidewell production systems, corporate systems, personnel, and data, including customer data. Service outages without a security cause are handled under the Business Continuity & Disaster Recovery Plan, but they use the same severity levels.

## 3. Definitions

**Security event:** An observed occurrence that may indicate a security problem, such as an alert, an unusual sign-in, or a report from an employee or customer.

**Security incident:** A security event that the Security team confirms has compromised, or is reasonably likely to have compromised, the confidentiality, integrity, or availability of Tidewell systems or data.

**Customer-impacting incident:** A security incident in which customer data has been, or is reasonably believed to have been, accessed, disclosed, altered, or destroyed without authorization.

## 4. Severity Levels

| Severity | Description | Examples |
|---|---|---|
| SEV1 — Critical | Confirmed unauthorized access to customer data, or active attacker in production | Data exfiltration; compromised production credentials in active use |
| SEV2 — High | Likely compromise or significant exposure, not yet confirmed | Customer data exposed through misconfiguration; malware on an engineer's laptop with production access |
| SEV3 — Medium | Limited impact, contained | Compromised corporate account with no Restricted data access; phishing email clicked but no credentials entered |
| SEV4 — Low | Minimal or no impact | Policy violation with no data exposure; blocked attack attempt |

The Incident Commander may raise or lower severity as facts become clear.

## 5. Roles

**Incident Commander (IC).** Leads the response, makes decisions, and sets severity. The Head of Security or a designated senior security engineer serves as IC for SEV1 and SEV2 incidents.

**Technical Lead.** Directs investigation and containment work.

**Communications Lead.** Drafts internal updates and customer notifications. Works with Legal and the customer success team.

**Legal Counsel.** Advises on notification obligations, law enforcement contact, and evidence preservation.

**Scribe.** Keeps a timeline of actions and decisions.

For SEV1 incidents, the CTO and CEO are informed within 1 hour of the severity being set.

## 6. Response Phases

**6.1 Detection and reporting.** Incidents may be detected through monitoring alerts, reports from personnel, customers, or vendors, or security researchers. All personnel must report suspected incidents to the Security team immediately through the incident channel or security@tidewelldata.example.

**6.2 Triage.** The Security team assesses each report, determines whether it is a security incident, and sets an initial severity. Target triage times: SEV1 within 30 minutes, SEV2 within 2 hours, SEV3 within 1 business day.

**6.3 Containment.** The team limits the spread and impact of the incident. Actions may include revoking credentials, isolating systems, blocking network traffic, or disabling affected features.

**6.4 Investigation.** The team determines what happened, how, which systems and data were affected, and which customers are impacted. Evidence is preserved according to Legal Counsel's guidance.

**6.5 Eradication and recovery.** The team removes the cause, restores affected systems from known-good sources, and confirms systems are operating normally.

**6.6 Post-incident review.** A blameless review is completed within 10 business days of closing any SEV1 or SEV2 incident. The review covers timeline, root cause, what went well, what didn't, and follow-up actions with owners and due dates.

## 7. Customer Notification

7.1 If an incident is confirmed as **customer-impacting**, Tidewell will notify affected customers **within 72 hours** of confirming the incident.

7.2 Notifications are sent to the customer's designated security contact, or to the account's Admin users if no security contact is on file.

7.3 The initial notification includes, to the extent known at the time:
- A description of what happened
- The categories of data involved
- The time period affected
- Actions Tidewell has taken and plans to take
- Any recommended actions for the customer
- A contact for further questions

7.4 Tidewell provides updates as the investigation progresses and a final summary once the incident is closed.

## 8. External Parties

Legal Counsel decides whether regulators or law enforcement must be notified. Tidewell supports customers who must notify their own regulators or data subjects, including by providing incident details needed for those notifications.

## 9. Testing and Training

9.1 This plan is tested at least annually through a tabletop exercise involving Security, Engineering, Legal, and Communications.

9.2 Personnel in incident roles receive training on this plan when they take on the role and after major updates.

9.3 Findings from tests are tracked to completion like post-incident actions.

## 10. Revision History

| Version | Date | Summary |
|---|---|---|
| 1.0 | July 1, 2022 | Initial plan |
| 1.3 | April 1, 2024 | Added Communications Lead role |
| 2.0 | January 15, 2026 | Restructured severity levels; added triage time targets; clarified customer notification content |
