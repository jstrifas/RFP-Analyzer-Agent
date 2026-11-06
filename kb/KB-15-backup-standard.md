# Backup Standard

**Document version:** 1.2
**Effective date:** March 1, 2026
**Standard owner:** Platform Engineering
**Parent policy:** Business Continuity & Disaster Recovery Plan
**Review cycle:** Annual
**Classification:** Internal — may be shared with customers on request

---

## 1. Purpose

This standard defines how Tidewell backs up production data so it can be restored after data loss, corruption, or a disaster.

## 2. Scope

This standard covers all production databases and object storage that hold customer data, account data, or configuration needed to run Tidewell Sync and Tidewell Insights.

## 3. Backup Requirements

| Requirement | Standard |
|---|---|
| Frequency | Automated **daily** full snapshots of all production databases |
| Point-in-time recovery | Enabled on all production databases, allowing restore to any point within the retention window |
| Retention | **35 days**, after which backups are deleted automatically |
| Encryption | All backups are encrypted with **AES-256** using AWS KMS |
| Location | Backups are stored in the **same AWS region** as the source data |
| Isolation | Backups are stored in a separate AWS account with restricted access |
| Immutability | Backups cannot be modified or deleted before the end of their retention period |

## 4. Access

4.1 Access to backups is limited to a small group of Platform Engineering staff approved by the Head of Security.

4.2 Restores to production require approval from the VP of Engineering or the Recovery Lead during a declared disaster.

4.3 All backup access and restore actions are logged.

## 5. Monitoring

5.1 Every backup job is monitored. A failed backup triggers an alert to Platform Engineering.

5.2 A failed daily backup must be investigated and a successful backup completed within 24 hours.

## 6. Restore Testing

6.1 Platform Engineering performs a test restore of a sample production database **every quarter** to confirm backups are complete and usable.

6.2 A full restore test is included in the annual disaster recovery test described in the Business Continuity & Disaster Recovery Plan.

6.3 Test results are documented and kept as SOC 2 evidence.

## 7. Deleted Data

Data deleted from production remains in backups until those backups expire, up to a maximum of 35 days. See the Data Retention & Deletion Policy.

## 8. Revision History

| Version | Date | Summary |
|---|---|---|
| 1.0 | October 1, 2022 | Initial standard |
| 1.1 | January 15, 2025 | Moved backups to a separate AWS account; added immutability |
| 1.2 | March 1, 2026 | Added quarterly sample restore tests |
