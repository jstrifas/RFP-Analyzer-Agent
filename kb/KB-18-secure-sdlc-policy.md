# Secure Software Development Lifecycle (SDLC) Policy

**Document version:** 1.4
**Effective date:** February 15, 2026
**Policy owner:** VP of Engineering
**Parent policy:** Information Security Policy
**Review cycle:** Annual
**Classification:** Internal — may be shared with customers on request

---

## 1. Purpose

This policy makes sure security is built into how Tidewell designs, writes, tests, and releases software.

## 2. Scope

This policy applies to all code and infrastructure configuration deployed to Tidewell production environments, including application code, infrastructure-as-code, and CI/CD pipeline configuration.

## 3. Design

3.1 New features that change how customer data is stored, accessed, or transmitted, or that add new external integrations, require a **security design review** with Security Engineering before development begins.

3.2 Design reviews identify threats, required controls, and any changes to logging, access, or data retention.

## 4. Source Code Management

4.1 All code is stored in Tidewell's version control system. Access follows the Access Control Policy.

4.2 The main branch of every production repository is protected. Direct commits are blocked.

4.3 Secrets must never be committed to source code. Automated secret scanning runs on every commit and blocks pushes that contain credentials.

## 5. Code Review

5.1 Every change to production code requires a pull request approved by **at least one engineer other than the author**.

5.2 Changes to authentication, authorization, encryption, or logging code also require approval from a member of Security Engineering.

5.3 Reviewers check for correctness, security issues, and adherence to Tidewell's secure coding guidelines.

## 6. Automated Security Testing

Every pull request must pass the following checks before it can be merged:

| Check | Purpose |
|---|---|
| Static application security testing (SAST) | Finds common coding flaws such as injection and unsafe input handling |
| Dependency scanning | Flags third-party libraries with known vulnerabilities |
| Secret scanning | Blocks committed credentials |
| Infrastructure-as-code scanning | Flags insecure cloud configuration, such as unencrypted storage or public access |
| Automated tests | Unit and integration tests must pass |

Findings are rated and fixed according to the Vulnerability Management Standard. A pull request with an unresolved Critical or High finding cannot be merged.

## 7. Environments

7.1 Development, staging, and production are separate environments in separate AWS accounts.

7.2 **Production customer data is never copied to development or staging.** Testing uses synthetic data.

## 8. Release

8.1 Changes are deployed to production only through the automated CI/CD pipeline. Manual changes to production are not permitted outside the emergency process in the Change Management Policy.

8.2 Deployments are logged and can be rolled back.

## 9. Developer Training

Engineers complete secure coding training when they join and annually thereafter. The training covers common web application vulnerabilities and Tidewell's secure coding guidelines.

## 10. Third-Party Code

New open-source dependencies are checked for license compatibility, maintenance activity, and known vulnerabilities before being added.

## 11. Revision History

| Version | Date | Summary |
|---|---|---|
| 1.0 | August 1, 2022 | Initial policy |
| 1.2 | February 1, 2025 | Added infrastructure-as-code scanning |
| 1.4 | February 15, 2026 | Security Engineering approval required for auth, encryption, and logging changes |
