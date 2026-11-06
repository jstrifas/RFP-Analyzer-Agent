# Logging & Monitoring Standard

**Document version:** 1.4
**Effective date:** June 1, 2026
**Standard owner:** Security Engineering
**Parent policy:** Information Security Policy
**Review cycle:** Annual
**Classification:** Internal — may be shared with customers on request

---

## 1. Purpose

This standard defines what Tidewell logs, where logs are stored, how long they are kept, and how they are monitored, so Tidewell can detect, investigate, and respond to security events.

## 2. Scope

This standard applies to all Tidewell production infrastructure on AWS, the Tidewell Sync and Tidewell Insights applications, and corporate identity and SaaS systems that store or grant access to Restricted data.

## 3. What We Log

Tidewell systems must log, at a minimum:

**Infrastructure events**
- AWS API activity across all production accounts, captured through AWS CloudTrail
- Network flow logs for production VPCs
- Changes to security groups, IAM roles, and IAM policies

**Application events**
- User sign-in attempts, successful and failed
- MFA enrollment and changes
- Creation, modification, and deletion of data connections
- Creation and revocation of API keys
- Role and permission changes within customer workspaces
- Data export requests

**Administrative events**
- All access to production systems by Tidewell personnel
- All access to customer workspaces by Tidewell support staff, which requires a customer-approved support session
- Changes to logging and monitoring configuration

## 4. Log Content

Each log entry must include:
- Timestamp in UTC
- The identity of the user, service, or system that performed the action
- The action performed and its result (success or failure)
- The source IP address, where available
- The affected resource

Logs must not contain passwords, API keys, session tokens, or unmasked customer record contents.

## 5. Log Storage and Protection

5.1 All logs in scope are sent to a central logging platform in the same AWS region where they were generated. US logs stay in us-east-1 and EU logs stay in eu-west-1.

5.2 Logs are encrypted at rest and in transit.

5.3 Access to the central logging platform is limited to the Security team and a small number of approved platform engineers.

5.4 Logs are write-once. Personnel cannot modify or delete log entries before their retention period ends.

## 6. Retention

| Log type | Retention |
|---|---|
| **Audit logs** (application and administrative events in Section 3) | **90 days** |
| AWS CloudTrail logs | 1 year |
| Network flow logs | 30 days |
| Application debug and error logs | 30 days |

Logs related to an open security investigation are preserved until the investigation is closed, regardless of the periods above.

## 7. Monitoring and Alerting

7.1 Tidewell uses automated detection rules to identify suspicious activity, including:
- Repeated failed sign-in attempts against a single account
- Sign-ins from unusual locations for a given user
- Use of AWS root account credentials
- Disabling of logging or of security tooling
- Creation of IAM users or access keys outside approved automation
- Unusually large data exports

7.2 Alerts are sent to the Security team's alert queue and assigned a severity.

7.3 High and critical severity alerts are escalated according to the Incident Response Plan.

7.4 Detection rules are reviewed at least twice a year and after any security incident.

## 8. Customer Access to Logs

Customers on the **Enterprise** plan can view their workspace's audit log in the Tidewell admin console and export it. Customers on other plans can request an export of their audit log from support.

## 9. Exceptions

Exceptions to this standard follow the exception process in the Information Security Policy.

## 10. Revision History

| Version | Date | Summary |
|---|---|---|
| 1.0 | September 1, 2022 | Initial standard |
| 1.2 | August 1, 2024 | Added network flow logs; added customer audit log export |
| 1.3 | January 10, 2025 | Moved to central logging platform |
| 1.4 | June 1, 2026 | Added detection rules for large data exports; clarified retention table |
