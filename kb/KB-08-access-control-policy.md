# Access Control Policy

**Document version:** 2.2
**Effective date:** February 1, 2026
**Policy owner:** Head of Security
**Parent policy:** Information Security Policy
**Review cycle:** Annual
**Classification:** Internal — may be shared with customers on request

---

## 1. Purpose

This policy defines how Tidewell grants, reviews, and removes access to its systems and data, so that people and services have only the access they need to do their jobs.

## 2. Scope

This policy applies to all Tidewell personnel and service accounts, and to all production infrastructure, corporate systems, and SaaS applications used by Tidewell. Section 9 describes the access controls available to customers inside their own Tidewell workspaces.

## 3. Principles

**Least privilege.** Access is limited to the minimum needed to perform a role.

**Need to know.** Access to Restricted data, including customer data, requires a specific business reason.

**Separation of duties.** No single person can both approve and carry out a high-risk change to production access.

**Role-based access.** Access is granted through predefined roles wherever possible, not to individuals one by one.

## 4. Authentication

4.1 Every person must use a unique, individually assigned account. Shared accounts are not permitted, except for documented break-glass accounts in Section 7.

4.2 Personnel sign in to corporate systems through Tidewell's central identity provider using single sign-on.

4.3 **Multi-factor authentication is required** for the identity provider, all production access, and all systems that store Restricted or Confidential data. Phishing-resistant methods, such as hardware security keys or platform passkeys, are required for production access.

4.4 Passwords, where still used, must be at least 14 characters and must not appear on known breached-password lists. Tidewell does not require periodic password rotation unless a compromise is suspected.

## 5. Granting Access

5.1 New access requests are submitted through the access request system and must include a business reason.

5.2 Access to production systems requires approval from the requester's manager and from Security Engineering.

5.3 Standard role-based access is provisioned automatically on a person's start date based on their team and role.

5.4 Production access is **time-limited**. Engineers request elevated access for a defined task, and it expires automatically after a maximum of 8 hours.

## 6. Access Reviews

6.1 Access to production systems and to systems that store Restricted data is reviewed **quarterly**.

6.2 Access to all other corporate systems is reviewed at least annually.

6.3 Managers confirm or remove access for each person on their team. Access that is not confirmed within 14 days of the review start is removed.

6.4 Review results are documented and kept as SOC 2 evidence.

## 7. Privileged and Break-Glass Access

7.1 AWS root account credentials are stored securely, protected by hardware MFA, and used only in emergencies.

7.2 Break-glass accounts are used only during an incident when normal access methods are unavailable. Every use triggers an alert to the Security team and is reviewed afterward.

## 8. Changes and Removal

8.1 When a person changes roles, access that is no longer needed is removed within 5 business days.

8.2 When a person leaves Tidewell, all access is removed **within 24 hours** of their last working day. For involuntary departures, access is removed at or before the time the person is notified.

8.3 Service account credentials are rotated when any person with access to them leaves Tidewell.

## 9. Customer Workspace Access Controls

9.1 Each customer workspace has its own users and roles. Tidewell provides three built-in roles on all plans:

| Role | Can do |
|---|---|
| Admin | Manage users, billing, connections, and workspace settings |
| Editor | Create and manage connections and syncs |
| Viewer | View connections, sync status, and Insights dashboards |

9.2 Customers can require MFA for all users in their workspace. Single sign-on and automated user provisioning availability depends on the customer's plan.

9.3 **Tidewell support staff cannot access a customer's workspace** unless an Admin in that workspace grants a support session. Support sessions expire after 5 days or when the Admin revokes them, whichever is sooner. All actions during a support session are logged.

## 10. Revision History

| Version | Date | Summary |
|---|---|---|
| 1.0 | May 1, 2022 | Initial policy |
| 2.0 | March 1, 2024 | Introduced time-limited production access |
| 2.1 | January 15, 2025 | Removed periodic password rotation requirement |
| 2.2 | February 1, 2026 | Phishing-resistant MFA required for production access |
