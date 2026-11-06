# SSO & Identity FAQ

**Last updated:** May 12, 2026
**Audience:** Customers and prospects
**Classification:** Public

---

**Does Tidewell support single sign-on (SSO)?**
Yes. Tidewell supports SAML 2.0 single sign-on on the **Enterprise** plan. SSO is not available on the Team or Business plans.

**Which identity providers work with Tidewell SSO?**
Any identity provider that supports SAML 2.0. We provide setup guides for Okta, Microsoft Entra ID, Google Workspace, and OneLogin.

**Can we require all users to sign in through SSO?**
Yes, on the Enterprise plan. Admins can turn on **SSO enforcement**, which blocks password sign-in for everyone in the workspace except a designated break-glass Admin account.

**Do you support SCIM for automated user provisioning?**
Yes, on the **Enterprise** plan. SCIM 2.0 lets your identity provider create, update, and deactivate Tidewell users automatically. When you deactivate a user in your identity provider, their Tidewell access is removed at the next sync, typically within a few minutes.

**What about just-in-time (JIT) provisioning?**
Enterprise workspaces using SAML SSO can turn on JIT provisioning. New users are created automatically with the Viewer role the first time they sign in through SSO. Admins can change the default role.

**Is multi-factor authentication (MFA) available?**
Yes, on **all plans**. Users can enroll an authenticator app (TOTP) or a hardware security key. Admins on any plan can **require MFA** for everyone in their workspace.

**If we use SSO, do we still need Tidewell MFA?**
When SSO enforcement is on, MFA is handled by your identity provider. Tidewell MFA still applies to the break-glass Admin account.

**Can we control session length?**
Enterprise Admins can set an idle session timeout between 15 minutes and 24 hours. On other plans, sessions expire after 12 hours of inactivity.

**Can we restrict access by IP address?**
Yes. IP allowlisting is available on the Enterprise plan.

**How do API keys work?**
Admins and Editors can create API keys on all plans. Keys can be scoped to read-only or read-write access, can be given an expiry date, and can be revoked at any time. Creating and revoking keys is recorded in the workspace audit log.

**Where can I see who signed in and what they changed?**
Enterprise Admins can view and export the workspace audit log in the admin console. Customers on other plans can request an export from support.

**How do we upgrade to get SSO and SCIM?**
Contact your account manager or sales@tidewelldata.example.

---

### Feature availability by plan

| Feature | Team | Business | Enterprise |
|---|---|---|---|
| Workspace roles (Admin, Editor, Viewer) | ✓ | ✓ | ✓ |
| MFA (optional or required) | ✓ | ✓ | ✓ |
| API keys with scopes and expiry | ✓ | ✓ | ✓ |
| SAML SSO | — | — | ✓ |
| SSO enforcement | — | — | ✓ |
| SCIM provisioning | — | — | ✓ |
| JIT provisioning | — | — | ✓ |
| Custom session timeout | — | — | ✓ |
| IP allowlisting | — | — | ✓ |
| Self-serve audit log export | — | — | ✓ |
