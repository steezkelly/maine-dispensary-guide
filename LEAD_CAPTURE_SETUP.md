# Lead Capture Setup Guide

## 📋 STATUS: MONETIZATION PLANNED — Not Yet Implemented

**Date:** April 5, 2026  
**User Decision:** Wants to implement lead capture monetization but not ready to commit to full framework yet.

**Forms are READY** (enhanced with stage/interest fields) but backend setup is on hold.

**Stack Decision Pending:**
- Formspree + Zapier + Google Sheets (free tier possible)
- OR wait until revenue justifies paid tools

---

## Overview
This guide explains how to set up lead capture from your Maine Dispensary Guide forms to Google Sheets for affiliate marketing follow-up.

## Current Forms (✅ READY)
All forms use Formspree endpoint: `https://formspree.io/f/xvgzlowz`

| Form | Location | Fields Captured |
|------|----------|-----------------|
| Lead Capture | `/download-checklist` | name, email, stage, interest |
| Newsletter | `/` | email, stage |
| Referral Request | `/resources` | name, email, stage, service, message |

## Form Field Names (for Google Sheets)

| Field | Description | Values |
|-------|-------------|--------|
| `name` | Contact name | Text |
| `email` | Email address | email format |
| `stage` | Business stage | `startup`, `operating`, `researching` |
| `interest` | Primary challenge | `licensing`, `banking`, `real-estate`, `operations`, `not-sure` |
| `service` | Service needed (referral) | `legal`, `accounting`, `security`, `real-estate` |
| `message` | Open text | Free text |

## Step 1: Set Up Formspree (Required First)

1. **Create Formspree account** at https://formspree.io
2. **Upgrade to Plus plan** (~$15/mo) - Required for Google Sheets integration
3. **Create a new form** or use existing endpoint `xvgzlowz`
4. **Enable Google Sheets integration** in Formspree dashboard:
   - Go to Integrations → Google Sheets
   - Connect your Google account
   - Create or select a spreadsheet

## Step 2: Set Up Google Sheets

### Option A: Formspree Native Integration (Recommended)
1. In Formspree dashboard, go to your form → Integrations
2. Click "Google Sheets"
3. Create a new spreadsheet or connect existing
4. Map form fields to spreadsheet columns

### Option B: Google Forms Backup
1. Create a Google Form matching the form fields
2. Connect to Google Sheets
3. Use Formspree's webhook → Zapier → Google Sheets (if native integration unavailable)

## Step 3: Lead Routing Strategy

Based on the captured `stage` and `interest` fields:

### Startup Leads (stage = "startup")
**Deliverables:**
- Roadmap PDF (40-page guide)
- Licensing checklist
- Financial benchmark sheet

**Affiliate Targets:**
- Legal services (licensing attorneys)
- Banking (cannabis-friendly banks)
- POS systems (startup packages)

### Operating Leads (stage = "operating")
**Deliverables:**
- Operations audit checklist
- Compliance update guides
- Vendor comparison sheets

**Affiliate Targets:**
- Security firms
- Inventory management providers
- Accounting/280E specialists
- Insurance providers

### Researching Leads (stage = "researching")
**Deliverables:**
- Industry overview email sequence
- Best beginner guides
- Market data reports

**Affiliate Targets:**
- Early nurture only - don't push paid services yet

## Step 4: Email Follow-up Sequences

### Startup Sequence (7 emails over 30 days)
1. Welcome + Roadmap download link
2. "Understanding Maine's licensing process" - Value
3. "Why banking is your biggest early challenge" - Problem awareness
4. "How to find compliant real estate" - Value + affiliate
5. "Legal checklist before you apply" - Affiliate (legal)
6. "Breaking down the 280E tax issue" - Expertise
7. "Ready to talk to a pro?" - Affiliate offer

### Operating Sequence (5 emails over 21 days)
1. Welcome + Operations audit access
2. "Common compliance gaps we see" - Value
3. "Security requirements update" - Affiliate (security)
4. "280E strategies for established operators" - Expertise
5. "Need a vendor intro?" - Affiliate offer

## Step 5: Monetization Actions

### When a lead comes in:

1. **Immediate (Formspree email notification)**
   - You receive email with all field data
   - Check stage + interest

2. **Daily (Google Sheets review)**
   - Review new leads
   - Categorize by segment

3. **Weekly (Outreach)**
   - Startup leads: Send relevant affiliate introductions
   - Operating leads: Send vendor recommendations

### Affiliate Program Targets for Maine:

| Category | Recommended Partners | Commission Type |
|----------|---------------------|-----------------|
| Legal | Maine cannabis attorneys | Flat fee per referral |
| Banking | Maine banks (Kennebec, Machias) | Referral fee |
| POS Systems | Springbig, Blaze | Revenue share |
| Insurance | Cannabis-specific providers | Flat fee |
| Security | Local security firms | Referral fee |

## Metrics to Track

| Metric | Goal |
|--------|------|
| Leads captured/month | 20+ |
| Startup:Operating ratio | 60:30:10 |
| Email open rate | 35%+ |
| Affiliate click rate | 10%+ |
| Conversions (pilot/intros) | 3-5/month |

## Cost Summary

| Tool | Cost | Purpose |
|------|------|---------|
| Formspree Plus | ~$15/mo | Form submissions + Sheets |
| Google Sheets | Free | Lead database |
| Email (Gmail/SendGrid) | Free-$20/mo | Outreach |

**Total minimum cost: $15/mo**

## Next Steps

1. Set up Formspree account and verify form submissions
2. Connect to Google Sheets using native integration
3. Define your affiliate partnerships (start with 2-3)
4. Create email sequence (can use Gmail + Templates)
5. Test the full flow: form submit → Sheets → email follow-up
