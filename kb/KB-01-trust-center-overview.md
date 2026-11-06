# Tidewell Trust Center

**Last updated:** July 8, 2026
**Owner:** Security & Compliance
**Classification:** Public

---

## About Tidewell Data

Tidewell Data, Inc. helps companies move customer data where it needs to go. Our core product, **Tidewell Sync**, connects SaaS applications (CRMs, billing systems, support tools, and marketing platforms) to cloud data warehouses and keeps them in sync. **Tidewell Insights** is an optional analytics add-on that lets business teams explore synced data without writing SQL.

Tidewell was founded in 2018 and is headquartered in the United States. We serve mid-market and enterprise customers across software, retail, financial services, and media.

We know that when you connect Tidewell to your systems, you are trusting us with some of your most important data. This page summarizes how we protect it and links to the documents your security and procurement teams usually ask for.

## Compliance

**SOC 2 Type II.** Tidewell has completed a SOC 2 Type II examination covering the Security, Availability, and Confidentiality Trust Services Criteria. The most recent report covers the period **January 1, 2025 through December 31, 2025**. The report is available to customers and prospects under a non-disclosure agreement. A bridge letter covering the period since the report end date is available on request.

**Privacy regulations.** Tidewell supports customers' obligations under GDPR and CCPA. Our Data Processing Addendum (DPA) is available to all customers and is incorporated into our standard subscription agreement.

## Infrastructure

Tidewell runs entirely on Amazon Web Services (AWS). We do not own or operate physical data centers.

- **US customers** are hosted in the AWS **us-east-1** (N. Virginia) region.
- **EU customers** are hosted in the AWS **eu-west-1** (Ireland) region.

Production workloads are deployed across multiple Availability Zones within each region for resilience.

## Data Protection

- **Encryption at rest:** Customer data is encrypted at rest using AES-256.
- **Encryption in transit:** All connections to Tidewell use TLS 1.2 or higher.
- **Tenant isolation:** Each customer's data is logically separated, and access is enforced at the application and database layers.
- **AI and model training:** Tidewell does **not** use customer data to train machine learning or AI models. See our AI & Data Usage Statement.

## Access and Identity

Tidewell staff access production systems under the principle of least privilege. Access requires multi-factor authentication and is reviewed quarterly. Customers can manage user roles within their own Tidewell workspace. Single sign-on options vary by plan; see the SSO & Identity FAQ.

## Availability

Tidewell offers a **99.9% monthly uptime commitment** for customers on the **Business** and **Enterprise** plans. Current and historical system status is published on our status page.

## Security Testing

Tidewell engages an independent third party to perform a penetration test of the Tidewell platform at least annually. We also run continuous vulnerability scanning of our infrastructure and application dependencies.

## Incident Response

Tidewell maintains a documented Incident Response Plan that is tested at least annually. If a security incident affects your data, we will notify you in accordance with our Incident Response Plan and your agreement with us.

## Policy Library

The following documents are available to customers and prospects. Some require an NDA.

| Document | Availability |
|---|---|
| Information Security Policy | On request |
| SOC 2 Type II Report + Bridge Letter | Under NDA |
| Data Processing Addendum | Public |
| Subprocessor List | Public |
| Data Retention & Deletion Policy | On request |
| Incident Response Plan (summary) | On request |
| Encryption Standard | On request |
| Business Continuity & Disaster Recovery Plan (summary) | On request |
| Penetration Test Summary Letter | On request |
| AI & Data Usage Statement | Public |

## Contact

Security questions and questionnaire requests: **security@tidewelldata.example**
To report a suspected vulnerability or security issue: **security@tidewelldata.example**
