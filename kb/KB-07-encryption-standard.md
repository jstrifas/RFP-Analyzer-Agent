# Encryption Standard

**Document version:** 1.3
**Effective date:** April 1, 2026
**Standard owner:** Security Engineering
**Parent policy:** Information Security Policy
**Review cycle:** Annual
**Classification:** Internal — may be shared with customers on request

---

## 1. Purpose

This standard sets the minimum encryption requirements for protecting Tidewell and customer data at rest and in transit.

## 2. Scope

This standard applies to all Tidewell production systems, backups, logs, and corporate systems that store Restricted or Confidential data, as defined in the Information Security Policy.

## 3. Encryption at Rest

3.1 All Restricted and Confidential data at rest must be encrypted using **AES-256** or an equivalent-strength algorithm approved by Security Engineering.

3.2 This requirement covers:
- Production databases and their read replicas
- Object storage (Amazon S3) used for customer data, staging, and exports
- Block storage volumes attached to production compute
- Backups and snapshots
- Log storage

3.3 Encryption at rest is applied by default at the storage layer. Engineers may not create production storage resources with encryption disabled. Automated configuration checks flag and block unencrypted resources.

3.4 Company laptops must have full-disk encryption enabled before they are issued.

## 4. Encryption in Transit

4.1 All external connections to Tidewell services must use **TLS 1.2 or higher**. TLS 1.0 and 1.1 are disabled.

4.2 Only strong cipher suites approved by Security Engineering are enabled. Cipher configuration is reviewed at least annually.

4.3 Connections from Tidewell to customer source systems and data warehouses use TLS where the destination supports it. Where a customer's destination supports additional connection security options, such as SSH tunneling or private network connectivity, those options can be enabled per connection.

4.4 Internal service-to-service traffic within production carrying Restricted data must be encrypted in transit.

4.5 HTTP Strict Transport Security (HSTS) is enabled on all public Tidewell web domains.

## 5. Key Management

5.1 Encryption keys for data at rest are managed through **AWS Key Management Service (KMS)**.

5.2 Keys are separated by region. Keys used for EU customer data are created and stored in eu-west-1, and keys for US customer data in us-east-1.

5.3 KMS keys used to encrypt data at rest are rotated automatically every year.

5.4 Access to key administration is limited to a small group in Security Engineering. Use of keys is logged through AWS CloudTrail.

5.5 Keys may not be exported from KMS in plaintext.

## 6. Secrets and Credentials

6.1 Credentials that customers provide to connect Tidewell to their source systems and warehouses, such as API tokens, passwords, and OAuth refresh tokens, are encrypted with a dedicated KMS key before storage and are never written to logs.

6.2 Application secrets are stored in a managed secrets service. Secrets may not be stored in source code, configuration files, or chat tools.

6.3 Passwords for Tidewell user accounts are stored only as salted hashes using a modern, slow hashing algorithm.

## 7. Certificates

7.1 TLS certificates for Tidewell domains are issued and renewed automatically.

7.2 Certificate expiry is monitored, with alerts sent at least 14 days before expiry.

## 8. Exceptions

Exceptions to this standard follow the exception process in the Information Security Policy.

## 9. Revision History

| Version | Date | Summary |
|---|---|---|
| 1.0 | June 1, 2022 | Initial standard |
| 1.1 | March 1, 2024 | Disabled TLS 1.0 and 1.1 |
| 1.2 | February 1, 2025 | Added regional key separation |
| 1.3 | April 1, 2026 | Added connection security options for customer destinations |
