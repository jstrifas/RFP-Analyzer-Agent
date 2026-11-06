# Business Continuity & Disaster Recovery Plan

**Document version:** 1.5
**Effective date:** March 1, 2026
**Plan owner:** VP of Engineering
**Parent policy:** Information Security Policy
**Review cycle:** Annual, and after any disaster recovery event
**Classification:** Internal — summary may be shared with customers on request

---

## 1. Purpose

This plan describes how Tidewell keeps critical services running during a disruption and how it recovers production systems and data after a disaster.

## 2. Scope

This plan covers the Tidewell Sync and Tidewell Insights production environments in AWS us-east-1 and eu-west-1, the systems that support them, and the people and processes needed to operate them. Corporate systems are covered in Section 9.

## 3. Recovery Objectives

| Objective | Target | Meaning |
|---|---|---|
| **Recovery Point Objective (RPO)** | **1 hour** | The maximum amount of data, measured in time, that could be lost in a disaster |
| **Recovery Time Objective (RTO)** | **4 hours** | The maximum time to restore production service after a disaster is declared |

These targets apply to production customer-facing services. Sync jobs that were in progress when a disruption began are automatically retried after recovery, so data from customers' source systems is re-synced rather than lost.

## 4. Resilience by Design

4.1 **Multiple Availability Zones.** Production services run across at least three AWS Availability Zones in each region. If one Availability Zone fails, traffic shifts to the others automatically, usually without customer impact.

4.2 **Managed databases.** Production databases run with standby replicas in a separate Availability Zone and fail over automatically.

4.3 **Stateless application tier.** Application servers hold no permanent data and can be replaced automatically.

4.4 **Infrastructure as code.** Production infrastructure is defined in code and can be rebuilt from version control.

4.5 **In-region recovery.** Recovery takes place within the same AWS region where a customer's data is hosted. EU customer data is recovered in eu-west-1 and US customer data in us-east-1. Customer data is not moved to another region as part of recovery.

## 5. Disaster Scenarios

| Scenario | Primary response |
|---|---|
| Failure of one Availability Zone | Automatic failover to remaining Availability Zones |
| Database failure or corruption | Failover to standby replica, or point-in-time restore from backup |
| Accidental deletion of data or infrastructure | Restore from backup; rebuild infrastructure from code |
| Security incident requiring rebuild | Rebuild from known-good code and restore from backup, coordinated with the Incident Response Plan |
| Extended failure of a regional AWS service | Restore affected services from backups and infrastructure code within the region as AWS capacity allows |
| Loss of a critical vendor | Switch to documented alternatives; see the Third-Party Risk Management Policy |

## 6. Declaring a Disaster

6.1 The VP of Engineering, the Head of Security, or the engineering incident lead can declare a disaster.

6.2 A disaster is declared when an outage is expected to exceed 1 hour, or when data may need to be restored from backup.

6.3 Once declared, the RTO clock starts and the recovery team follows the runbooks for the relevant scenario.

## 7. Roles

**Recovery Lead.** Coordinates recovery and decides on recovery steps.

**Engineering responders.** Execute runbooks and verify restored systems.

**Communications Lead.** Posts updates on the Tidewell status page at least every 60 minutes during a declared disaster and notifies affected Enterprise customers directly.

## 8. Testing

8.1 Disaster recovery is tested **at least annually** by restoring production databases from backup into an isolated environment and measuring the time to restore and the data recovered against the RPO and RTO.

8.2 The most recent test was completed on **March 11, 2026**. Databases were restored in 2 hours 40 minutes, with data loss within the RPO. No major findings were identified.

8.3 Test results and follow-up actions are documented and reviewed by the VP of Engineering.

## 9. Business Continuity for Corporate Operations

9.1 Tidewell is a remote-first company. Employees can work from any location with internet access, so the loss of an office does not interrupt operations.

9.2 Critical corporate tools, including email, chat, the identity provider, and source code hosting, are cloud-based SaaS services.

9.3 Each department maintains a list of critical responsibilities and at least one backup person for each.

## 10. Revision History

| Version | Date | Summary |
|---|---|---|
| 1.0 | October 1, 2022 | Initial plan |
| 1.3 | February 1, 2025 | Added in-region recovery requirement |
| 1.5 | March 1, 2026 | Updated with 2026 test results; added disaster declaration criteria |
