# 🤖 n8n Workflows for Business & Website Making

**Source:** [Zie619/n8n-workflows](https://github.com/Zie619/n8n-workflows) (56k+ ⭐)

These are pre-built automation workflows you can import directly into n8n.

---

## 📥 How to Import
1. Open your n8n instance (self-hosted or cloud)
2. Go to **Workflows** → **Add Workflow** → **Import from File**
3. Select any `.json` file from this folder
4. Configure the credentials (API keys, OAuth) for each service

---

## 🎯 Workflows by Category

### 🔥 Lead Generation
| File | What It Does |
|------|-------------|
| `lead-gen/facebook-lead-ads.json` | Captures Facebook Lead Ads → processes and routes new leads automatically |
| `lead-gen/jotform-trigger.json` | Triggers when someone submits a Jotform on your website → creates contact/task |
| `lead-gen/typeform-clickup.json` | Typeform submission → creates ClickUp task + adds to spreadsheet |

### 💼 CRM (Customer Relationship Management)
| File | What It Does |
|------|-------------|
| `crm/hubspot-webhook-onboard.json` | **Customer Onboarding** — Webhook → sends welcome email → schedules welcome call → assigns CSM |
| `crm/hubspot-automate.json` | HubSpot automation trigger → syncs contacts and deal stages |

### 📧 Email Marketing
| File | What It Does |
|------|-------------|
| `email/mailchimp-cron.json` | Scheduled Mailchimp campaign creation → auto-sends newsletters |
| `email/convertkit-triggered.json` | ConvertKit automation → triggers email sequences on subscriber events |
| `email/gmail-calendar.json` | Gmail + Google Calendar → auto-sends meeting invites and follow-ups |

### 🛒 E-Commerce
| File | What It Does |
|------|-------------|
| `ecommerce/shopify-twitter.json` | Shopify new order → auto-posts to Twitter announcing the sale |

### 📱 Social Media
| File | What It Does |
|------|-------------|
| `social/facebook-update.json` | Facebook page update → routes notifications to your team |

### 📊 SEO & Analytics
| File | What It Does |
|------|-------------|
| `seo/google-analytics-report.json` | **Scheduled GA report** — pulls website analytics data on a cron schedule |

### ✅ Project Management
| File | What It Does |
|------|-------------|
| `project-mgmt/clickup-webhook.json` | ClickUp webhook → responds to task updates, syncs data |
| `project-mgmt/asana-webhook.json` | Asana webhook → triggers automations when tasks are created/updated |

### 🌐 Website
| File | What It Does |
|------|-------------|
| `website/calendly-notion.json` | Calendly booking → auto-creates Notion page with meeting details |
| `website/wordpress-webhook.json` | WordPress webhook → triggers content automation on publish |
| `website/sheets-webhook.json` | Google Sheets webhook → receives form data and logs to spreadsheet |

---

## 🚀 Recommended Stack for Your Business

```
Website Form → n8n Webhook → Google Sheets (log) + Gmail (reply) + CRM (track)
     ↓
Facebook Lead Ads → n8n → HubSpot (contact) + Mailchimp (nurture sequence)
     ↓
Calendly Booking → n8n → Google Calendar (event) + Notion (client page)
     ↓
Shopify Order → n8n → Twitter (announcement) + ClickUp (fulfillment task)
```

---

## 🔗 Full Repo
For all 500+ workflows: https://github.com/Zie619/n8n-workflows
