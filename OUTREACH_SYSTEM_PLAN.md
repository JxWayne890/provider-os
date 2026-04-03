# ProviderOS Cold Email Outreach System — Master Plan

## Domain Strategy
- **Root domain:** theprovidersystem.com (PROTECTED — never used for cold outreach)
- **Sending subdomain:** go.theprovidersystem.com (dedicated cold outreach only)
- **From address:** e.g. john@go.theprovidersystem.com
- **DNS managed in:** Cloudflare
- **Email provider:** Resend (paid plan — 50,000 emails/month)

## Email Authentication (Cloudflare DNS for go.theprovidersystem.com)
- SPF record for go.theprovidersystem.com
- DKIM records (CNAME values from Resend)
- DMARC record for go.theprovidersystem.com
- Exact values provided by Resend after domain verification

## Warmup Schedule
- Day 1-3: 20 emails/day
- Day 4-7: 50 emails/day
- Week 2: 100 emails/day
- Week 3: 200 emails/day
- Week 4+: 500+ emails/day (scale based on performance)
- Auto-throttle if bounce rate exceeds 3%
- Sends staggered throughout the day (not blasted at once)
- Weekday-only sending

## Frontend (New "Outreach" tab in ProviderOS)
1. **CSV Import** — drag-and-drop, column mapping, preview, import to Supabase
2. **Email Template Editor** — merge tags ({{company}}, {{city}}, {{state}}, {{website}}), live preview, subject line editor
3. **Campaign Scheduler** — daily limit (auto from warmup), send time, weekday toggle, start/pause
4. **Campaign Dashboard** — sent/remaining/failed, monthly usage meter (against 50k), warmup progress, estimated completion, activity log

## Backend
- Relay server endpoints for batch sending, unsubscribe handling, bounce webhooks
- Cron/scheduler for daily batch execution
- Sends via Resend through existing relay server

## Supabase Tables
- `campaigns` — template, settings, status, created_at
- `campaign_leads` — each lead + send status (queued/sending/sent/opened/clicked/replied/bounced/failed)
- `suppression_list` — global list of emails that must never be contacted (unsubscribed, bounced, replied)
- `send_log` — per-send record with timestamps, batch ID, delivery status

## Suppression & Compliance
- Every email includes an unsubscribe link
- Unsubscribe landing page (public, no auth): "You have been unsubscribed. Thank you for your time."
- Unsubscribed contacts flagged in suppression_list — never emailed again
- Bounced contacts auto-suppressed
- Replied contacts auto-suppressed
- Global suppression table checked before every send

## Safety Guardrails
- Hard monthly cap (50,000)
- Daily volume follows warmup curve
- Bounce rate > 3% → auto-pause
- Staggered sends across sending window
- No re-mailing anyone who bounced, unsubscribed, or replied
- theprovidersystem.com DNS completely untouched

## Target List
- 10,000 med spa leads
- CSV with: Company Name, Email, Verification Status, City, State, Country, Website

## Build Order
1. Supabase tables + suppression schema
2. DNS setup guidance for go.theprovidersystem.com
3. Relay server endpoints (send, unsubscribe, bounce webhook)
4. Unsubscribe pages (public)
5. CSV import UI
6. Template editor UI
7. Campaign scheduler + warmup logic
8. Campaign dashboard
9. Testing with small batch
10. Go live with warmup

## Email Tracking & Analytics
- **Open tracking** — invisible 1x1 pixel, logs who/when/how many times/device
- **Link click tracking** — all links wrapped through go.theprovidersystem.com/track/click/[id]
- **CTA button tracking** — tracked separately for conversion rate
- **Unsubscribe click tracking** — logged as specific event, auto-triggers suppression
- **Reply detection** — Resend webhook, auto-flags as "Replied", suppresses from future sends
- **Bounce detection** — hard bounce = permanent suppression, soft bounce = retry once then suppress
- **Engagement scoring** — Opened +1, Clicked +3, CTA clicked +5, Replied +10, Multiple opens +2
- **Hot lead auto-flagging** — leads above threshold auto-flag in CRM with notification

## Built-in Booking System (No Calendly)
- Public booking page at go.theprovidersystem.com/book?ref=[lead_id]
- Pulls live availability from Google Calendar (free/busy API)
- Lead picks day → time → fills name/email/phone → confirmed
- System auto-creates:
  - Google Calendar event with Google Meet link
  - Session in ProviderOS Sessions tab
  - Confirmation email to the lead with Meet link
  - Notification in ProviderOS dashboard
  - Lead status updated to "Booked" in campaign
- Clean, branded, mobile-friendly booking page
- No double-booking (real-time calendar sync)
- Source tracking: "Cold Email Campaign" tagged on each booking

## Core Offer to Med Spas
- High-quality websites with SEO + AEO (AI Engine Optimization)
- City + service page combinations to rank higher on Google AND ChatGPT
- Help med spas get found organically through search and AI answers

## Email Link Strategy
**Links to include in outreach emails:**
1. **Primary CTA:** "Book a 15-Min Call" → go.theprovidersystem.com/book?ref={{lead_id}} (tracked)
2. **Social proof:** "See our work" → theprovidersystem.com/projects (tracked)
3. **Service context:** "How we help healthcare businesses" → theprovidersystem.com/industries/healthcare (tracked)
4. **Lead gen angle:** "Automate your lead generation" → theprovidersystem.com/services/lead-generation-automation (tracked)
5. **Free value:** "Get a free automation audit" → theprovidersystem.com/diagnostic (tracked)

**Suggested email template structure:**
- Subject line with {{company}} merge tag
- 2-3 sentence pitch about websites + SEO/AEO for med spas
- Link to /projects for social proof
- CTA button: Book a 15-min call → booking page
- Footer: unsubscribe link

**All links wrapped through go.theprovidersystem.com/track/click/[id] for click tracking**

## Website Research & Lead Scoring Engine (NEW)
- Crawl each lead's website URL from the CSV
- Analyze HTML structure: meta tags, h1s, SSL, mobile viewport, schema markup, tech stack, page count, city/service pages
- Score 0-10 (10 = most likely to buy):
  - 10: No website at all
  - 9: Website unreachable/broken
  - 7-8: Website exists but major issues (no SSL, no SEO, old template)
  - 5-6: Decent website but no city/service pages, no AEO
  - 3-4: Okay website, missing AEO/schema
  - 1-2: Good website already
- Store full analysis as JSONB on campaign_leads
- Priority ranking: highest-score leads get emailed first during warmup

## AI-Personalized Email Generation (NEW)
- Uses Gemini API (already configured) to generate personalized subject + body per lead
- Input: lead data + website analysis + campaign template
- Output: personalized email that references specific findings from their website
- No website → "I noticed {{company}} doesn't have a website yet..."
- Bad website → "I took a look at {{website}} and noticed..."
- Decent website → "Your site looks good but I noticed you're missing city-specific pages..."
- Fallback to template-based personalization if AI unavailable
- All personalized emails reviewable/editable before sending

## Updated Campaign Workflow
Import CSV → Research Websites → AI Personalize → Review → Schedule & Send
- Hottest leads (score 9-10) sent first during warmup week 1
- Score 7-8 sent week 2
- Score 5-6 sent week 3
- Score 1-4 sent last
