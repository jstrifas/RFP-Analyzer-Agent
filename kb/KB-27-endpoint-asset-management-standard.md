# Endpoint & Asset Management Standard

**Document version:** 1.2
**Effective date:** February 1, 2026
**Standard owner:** IT
**Parent policy:** Information Security Policy
**Review cycle:** Annual
**Classification:** Internal — may be shared with customers on request

---

## 1. Purpose

This standard defines how Tidewell tracks its IT assets and secures the laptops its personnel use.

## 2. Scope

This standard covers all Tidewell-issued laptops, mobile access to company apps, and all production cloud assets.

## 3. Asset Inventory

3.1 IT maintains an inventory of all Tidewell-issued laptops, including the assigned user, model, serial number, and security status.

3.2 Production cloud assets are tracked automatically through AWS tagging and configuration monitoring. Every production resource must have an owner tag.

3.3 The inventory is reconciled at least quarterly.

## 4. Laptop Security Baseline

Every Tidewell-issued laptop must meet the following before it is issued and at all times afterward:

| Control | Requirement |
|---|---|
| Device management | Enrolled in Tidewell's mobile device management (MDM) system |
| Full-disk encryption | Enabled |
| Operating system updates | Installed automatically; critical updates enforced within 7 days |
| Screen lock | Locks automatically after 5 minutes of inactivity |
| Endpoint protection | Endpoint detection and response (EDR) software installed and running |
| Firewall | Enabled |
| Admin rights | Standard user accounts by default; elevated rights granted only when needed |

4.1 Laptops that fall out of compliance are flagged automatically. If not fixed within 3 days, the laptop loses access to corporate systems until it is compliant again.

4.2 Alerts from EDR software are sent to the Security team's alert queue and handled according to the Incident Response Plan.

## 5. Lost or Stolen Devices

5.1 Personnel must report a lost or stolen device to the Security team immediately.

5.2 The Security team remotely locks the device and revokes its sessions. If the device is not recovered, it is remotely wiped.

## 6. Disposal

6.1 Laptops are securely wiped before being reissued.

6.2 Laptops that are retired are wiped and disposed of through a certified e-waste vendor, which provides a certificate of destruction.

## 7. Revision History

| Version | Date | Summary |
|---|---|---|
| 1.0 | June 1, 2022 | Initial standard |
| 1.1 | March 1, 2025 | Added EDR requirement |
| 1.2 | February 1, 2026 | Added automatic access removal for non-compliant laptops |
