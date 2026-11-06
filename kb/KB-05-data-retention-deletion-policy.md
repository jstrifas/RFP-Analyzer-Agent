# Data Retention & Deletion Policy

**Document version:** 2.1
**Effective date:** March 15, 2026
**Policy owner:** Head of Security
**Approved by:** Chief Technology Officer and General Counsel
**Review cycle:** Annual
**Classification:** Internal — may be shared with customers on request

---

## 1. Purpose

This policy defines how long Tidewell Data, Inc. ("Tidewell") keeps different types of data and how that data is deleted at the end of its retention period. Tidewell keeps data only as long as it is needed for business, contractual, legal, or security purposes.

## 2. Scope

This policy covers all data Tidewell stores or processes, including customer data, logs, backups, and Tidewell business records, in production and corporate systems.

## 3. Definitions

**Customer data:** Any data a customer sends to Tidewell or that Tidewell processes on a customer's behalf through Tidewell Sync or Tidewell Insights, including records synced from connected source systems and connection metadata.

**Account data:** Information about a customer's Tidewell account, such as user names, email addresses, billing contacts, and plan details.

**Audit logs:** Records of security-relevant actions, including user sign-ins, permission changes, API key creation and revocation, configuration changes, and administrative actions by Tidewell personnel.

**Termination:** The end of a customer's subscription, whether by expiry, cancellation, or contract termination.

## 4. Retention Schedule

| Data type | Retention period | Notes |
|---|---|---|
| Customer data (active subscription) | For the duration of the subscription | Customers can delete synced records or connections at any time from their workspace |
| Customer data (after termination) | Deleted within **30 days** of termination | See Section 5 |
| Account data | Duration of the subscription plus 30 days | Billing records are kept longer; see below |
| Billing and invoicing records | 7 years | Required for tax and accounting obligations |
| **Audit logs** | **1 year** | Kept for security investigations and compliance evidence |
| Application logs | 30 days | Used for troubleshooting; customer data is masked before logging where technically possible |
| Backups | 35 days | Backups roll off automatically; see Section 6 |
| Support tickets | 3 years after ticket closure | Customers can request earlier deletion |
| Security incident records | 5 years after incident closure | |

Where a law, regulation, or court order requires Tidewell to keep data longer, that requirement takes priority over this schedule. The Security team and General Counsel must approve any such hold, and the data is deleted once the hold is lifted.

## 5. Deletion at Termination

5.1 When a customer's subscription ends, Tidewell disables the customer's connections and stops all data syncing immediately.

5.2 The customer may export their configuration and any data still held in Tidewell during the 30 days after termination by contacting support.

5.3 Within **30 days** of termination, Tidewell permanently deletes the customer's data from all production systems.

5.4 On written request, Tidewell will delete customer data sooner than 30 days after termination. The request must come from an authorized administrator of the customer's account.

5.5 Tidewell provides written confirmation of deletion on request.

## 6. Backups

Backups are encrypted and retained for 35 days. Data deleted from production systems remains in backups until those backups expire, up to a maximum of 35 days. Tidewell does not restore deleted customer data from backups except to recover from a service outage or data loss event, and in that case re-applies any deletion requests made since the backup was taken.

## 7. Deletion Methods

- **Cloud storage and databases:** Data is deleted using the storage provider's deletion functions. Because all data at rest is encrypted, deleted data cannot be recovered once the underlying storage is released.
- **Company devices:** Devices are securely wiped before reissue or disposal.
- **Paper records:** Tidewell does not routinely keep customer data on paper. Any paper containing Restricted or Confidential information is shredded.

## 8. Customer Requests

Customers may ask Tidewell to delete specific data, for example to meet a data subject request under GDPR or CCPA. Tidewell will act on verified requests within 30 days.

## 9. Responsibilities

The Security team monitors compliance with this policy. Engineering teams are responsible for making sure the systems they own apply the retention periods in Section 4 automatically wherever possible.

## 10. Revision History

| Version | Date | Summary |
|---|---|---|
| 1.0 | April 1, 2022 | Initial policy |
| 2.0 | February 1, 2025 | Added audit log definition and retention; added support ticket retention |
| 2.1 | March 15, 2026 | Clarified early-deletion requests; updated approvers |
