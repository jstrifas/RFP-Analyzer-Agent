# Data Residency & Hosting FAQ

**Last updated:** June 18, 2026
**Audience:** Customers and prospects
**Classification:** Public

---

**Where is tenant data hosted?**
Tidewell hosts tenant data on Amazon Web Services (AWS) in one of two regions:

| Hosting region | AWS region | Location |
|---|---|---|
| US | us-east-1 | N. Virginia, United States |
| EU | eu-west-1 | Ireland |

These are the only two hosting regions Tidewell currently offers.

**What counts as tenant data?**
Tenant data is everything that belongs to a customer's Tidewell tenant: records synced from connected source systems, sync history, connection settings, the credentials used to connect to source systems and warehouses, and Insights dashboards and saved queries.

**How is our hosting region chosen?**
You choose your hosting region when your tenant is created. EU-based customers are placed in the EU region by default.

**Can we move to a different region later?**
Yes, on the Enterprise plan. Region migration is a scheduled, assisted process. Contact your account manager to plan it. During migration, syncs are paused for a scheduled window.

**Does tenant data ever leave our hosting region?**
Tenant data is stored and processed in your hosting region, and backups stay in the same region. Recovery after a disaster also happens within your region.

There are two limited exceptions:
- **Support tickets** and the information you choose to include in them are handled by our support ticketing provider, which processes data in the United States and Germany.
- **Error and log metadata** may be processed by our monitoring providers as listed on the Subprocessor List. Record contents are masked before they reach these providers.

See the Subprocessor List for processing locations.

**Does data pass through Tidewell's systems when it syncs to our warehouse?**
Yes. Sync workers in your hosting region read data from your source systems, apply your configured transformations, and write it to your warehouse. Data staged during a sync is deleted within 24 hours after the sync completes.

**Can Tidewell staff outside our region access tenant data?**
Tidewell staff can only access a tenant's data through a support session that an Admin in that tenant grants. Every action taken during a support session is logged.

**Is tenant data kept separate from other customers' data?**
Yes. Every tenant is logically isolated. See the Product Security Whitepaper for details.

**How is tenant data protected at rest and in transit?**
Tenant data is encrypted at rest with AES-256 and in transit with TLS 1.2 or higher. Encryption keys are kept in the same region as the data they protect.
