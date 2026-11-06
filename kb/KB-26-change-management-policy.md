# Change Management Policy

**Document version:** 1.3
**Effective date:** February 15, 2026
**Policy owner:** VP of Engineering
**Parent policy:** Information Security Policy
**Review cycle:** Annual
**Classification:** Internal — may be shared with customers on request

---

## 1. Purpose

This policy makes sure changes to Tidewell production systems are planned, reviewed, tested, and reversible, so they don't cause outages or security problems.

## 2. Scope

This policy covers all changes to production environments, including application code, infrastructure, network and security configuration, database schemas, and third-party services that production depends on.

## 3. Change Types

| Type | Description | Approval |
|---|---|---|
| **Standard** | Routine, low-risk changes deployed through the CI/CD pipeline, such as most code releases | Peer-reviewed pull request, as required by the Secure SDLC Policy |
| **Significant** | Changes with higher risk, such as database migrations on large tables, network or IAM changes, or changes to encryption or logging | Peer review plus approval from the owning engineering manager; Security Engineering approval for security-related changes |
| **Emergency** | Urgent changes needed to fix an active incident or critical vulnerability | Approval from the Incident Commander or an engineering manager; full review completed afterward |

## 4. Requirements for All Changes

4.1 Every change is tracked, either as a pull request or as a change record, showing who requested it, who approved it, and when it was deployed.

4.2 Changes are tested in staging before production, except for emergency changes where waiting would cause more harm.

4.3 Every change must have a rollback plan. Code deployments can be rolled back through the CI/CD pipeline.

4.4 Infrastructure changes are made through infrastructure-as-code. Manual changes in the AWS console are not permitted except in emergencies.

4.5 The person who approves a change cannot be the same person who authored it.

## 5. Significant Changes

5.1 Significant changes include a written plan describing the change, the risk, the test approach, the rollback plan, and any expected customer impact.

5.2 Changes expected to cause customer-visible downtime are scheduled in a maintenance window and announced on the status page at least 5 business days in advance.

## 6. Emergency Changes

6.1 Emergency changes may skip staging and pre-approval only when necessary to resolve an active incident or a Critical vulnerability.

6.2 Every emergency change must be reviewed and documented within 2 business days after deployment.

## 7. Monitoring

7.1 Deployments are logged automatically.

7.2 Error rates and key service health metrics are monitored after each deployment, and automated rollback is triggered if they exceed set thresholds.

7.3 Security Engineering reviews a sample of changes each quarter to confirm this policy is being followed.

## 8. Revision History

| Version | Date | Summary |
|---|---|---|
| 1.0 | August 1, 2022 | Initial policy |
| 1.2 | March 1, 2025 | Added automated rollback on error thresholds |
| 1.3 | February 15, 2026 | Clarified significant change approvals |
