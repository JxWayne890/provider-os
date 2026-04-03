# MEGA BUILD PROMPT — ProviderOS Outreach Research Engine + AI Personalization

## PURPOSE
You are adding a **website research, lead scoring, and AI-personalized email generation** layer to an existing cold email outreach system in ProviderOS. The outreach infrastructure already exists (campaigns, CSV import, templates, scheduling, tracking, booking, unsubscribe). You are now adding the intelligence layer that:
1. Crawls each lead's website to analyze its quality
2. Scores each lead on how likely they are to need/buy a new website
3. Uses AI to generate hyper-personalized email copy based on real website findings
4. Prioritizes which leads get emailed first based on their score

## CRITICAL CONTEXT
- **Project root:** This directory (the-provider's-business-os)
- **Stack:** React 19 + TypeScript + Vite (port 3000), Supabase (database + realtime), Node.js relay server (port 3001, scripts/server.mjs), Resend (email), Google APIs (calendar)
- **Existing outreach components that already work:** OutreachManager.tsx, CampaignList.tsx, CampaignDetail.tsx, CSVImporter.tsx, EmailTemplateEditor.tsx, CampaignScheduler.tsx, OutreachAnalytics.tsx, BookingPage.tsx, UnsubscribePage.tsx
- **Existing server actions:** send_campaign_email, send_batch, unsubscribe, get_warmup_limit, get_available_slots, create_booking
- **Existing Supabase tables:** campaigns, campaign_leads, suppression_list, send_log, tracking_events, bookings
- **Design system:** Swiss mineral aesthetic — #121212 black, #B8860B gold, white cards, font-serif headings, rounded-xl, lucide-react icons. Match existing UI exactly.
- **Read these files FIRST before any changes:** App.tsx, types.ts, services/dataService.ts, scripts/server.mjs, components/CampaignDetail.tsx, components/OutreachManager.tsx

## THE BUSINESS CONTEXT
John sells high-quality websites with SEO + AEO (AI Engine Optimization) to med spas. His CSV has 10,000 med spa leads with: Company Name, Email, City, State, Country, Website URL. The website URL is the research target — by analyzing each lead's current website, the system can:
- Determine if they need a website at all
- Identify specific weaknesses to reference in the email
- Score them so the hottest prospects get contacted first
- Generate email copy that feels like a human researched them personally

## WHAT TO BUILD — IN THIS EXACT ORDER

### PHASE 1: Database Schema Updates
Add new columns to the existing `campaign_leads` table. Create migration file `supabase/outreach_research.sql`:

```sql
-- Add research columns to campaign_leads
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS website_status TEXT DEFAULT 'pending' 
  CHECK (website_status IN ('pending','crawling','crawled','no_website','error'));
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS website_score INTEGER DEFAULT 0;
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS website_analysis JSONB DEFAULT '{}';
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS personalized_subject TEXT;
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS personalized_body TEXT;
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS personalization_status TEXT DEFAULT 'pending'
  CHECK (personalization_status IN ('pending','generating','done','error'));
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS research_completed_at TIMESTAMPTZ;
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS priority_rank INTEGER DEFAULT 0;
```

The `website_analysis` JSONB will store:
```json
{
  "hasWebsite": true/false,
  "isReachable": true/false,
  "httpStatus": 200,
  "hasSSL": true/false,
  "isMobileResponsive": true/false,
  "hasSchemaMarkup": true/false,
  "metaTitle": "...",
  "metaDescription": "...",
  "h1Tags": [...],
  "cityServicePages": false,
  "estimatedPageCount": 5,
  "techStack": ["wordpress", "wix", etc.],
  "loadTimeMs": 2300,
  "seoIssues": ["no meta description", "no h1 tag", "no SSL", ...],
  "overallAssessment": "outdated Wix template, no SEO, no city pages, no schema markup",
  "keyFindings": ["site uses generic Wix template", "only 5 pages", "no location-specific content"]
}
```

### PHASE 2: Types Updates
Add to `types.ts`:
```typescript
export interface WebsiteAnalysis {
  hasWebsite: boolean;
  isReachable: boolean;
  httpStatus: number;
  hasSSL: boolean;
  isMobileResponsive: boolean;
  hasSchemaMarkup: boolean;
  metaTitle: string;
  metaDescription: string;
  h1Tags: string[];
  cityServicePages: boolean;
  estimatedPageCount: number;
  techStack: string[];
  loadTimeMs: number;
  seoIssues: string[];
  overallAssessment: string;
  keyFindings: string[];
}

export type WebsiteStatus = 'pending' | 'crawling' | 'crawled' | 'no_website' | 'error';
export type PersonalizationStatus = 'pending' | 'generating' | 'done' | 'error';
```

Update `CampaignLead` interface to include new fields: websiteStatus, websiteScore, websiteAnalysis, personalizedSubject, personalizedBody, personalizationStatus, researchCompletedAt, priorityRank.

### PHASE 3: Relay Server — Website Research Endpoints
Add these new actions to `scripts/server.mjs`:

**1. `research_website`** — Takes: url, campaign_lead_id
- Fetch the URL with a 10-second timeout
- If no website column or empty → return { hasWebsite: false, score: 10 }
- If connection refused / DNS error → return { hasWebsite: false, isReachable: false, score: 9 }
- If HTTP error (4xx, 5xx) → return { isReachable: false, httpStatus: xxx, score: 8 }
- If reachable, parse the HTML and extract:
  - `<title>` tag → metaTitle
  - `<meta name="description">` → metaDescription
  - All `<h1>` tags → h1Tags
  - Check for `<meta name="viewport">` → isMobileResponsive
  - Check for `<script type="application/ld+json">` → hasSchemaMarkup
  - Check URL scheme for SSL
  - Look for patterns indicating tech stack: "wp-content" (WordPress), "wix.com" (Wix), "squarespace" (Squarespace), "shopify" (Shopify), etc.
  - Count internal links to estimate page count
  - Look for city/service combination pages (links containing city names + service keywords like "botox", "laser", "facial", "medspa")
  - Measure response time
  - Identify SEO issues: missing title, missing description, missing h1, no SSL, no viewport, no schema markup, no city pages
- Calculate website_score (0-10, where 10 = most likely to buy):
  - No website at all: 10
  - Website unreachable/broken: 9
  - Website exists but has 5+ SEO issues: 7-8
  - Website exists, some SEO issues, no city/service pages: 5-6
  - Website exists, decent SEO, no AEO/schema: 3-4
  - Website is solid with good SEO and structure: 1-2
- Return the full analysis JSON + score
- Update the campaign_lead row in Supabase with results

**2. `research_batch`** — Takes: campaign_id, batch_size (default 50)
- Query next N campaign_leads where website_status = 'pending'
- For each, call research_website
- Stagger requests: 1 every 2 seconds (don't hammer servers)
- Update each lead's website_status, website_score, website_analysis, research_completed_at
- After all research done, update priority_rank for the entire campaign (ORDER BY website_score DESC)
- Return summary: { researched: N, noWebsite: X, broken: Y, avgScore: Z }

**3. `personalize_email`** — Takes: campaign_lead_id, campaign_id
- Fetch the campaign (to get the template) and the campaign_lead (to get analysis)
- Build a prompt for Gemini (already configured via VITE_GOOGLE_API_KEY) or use the relay to call an AI model:

```
You are a cold email personalization expert. You write casual, human-sounding outreach emails.

CONTEXT:
- Sender: John W Johnson, The Provider System (theprovidersystem.com)
- Service: High-performance websites with SEO + AEO (AI Engine Optimization) for med spas
- What we do: Build websites with city + service page combinations that rank on Google AND ChatGPT

LEAD INFO:
- Company: {{companyName}}
- City: {{city}}, {{state}}
- Website: {{website}}
- Website Score: {{websiteScore}}/10 (10 = needs us most)
- Website Analysis: {{websiteAnalysis.overallAssessment}}
- Key Findings: {{websiteAnalysis.keyFindings}}
- SEO Issues: {{websiteAnalysis.seoIssues}}

TEMPLATE TO PERSONALIZE:
Subject: {{campaign.subject_template}}
Body: {{campaign.body_template}}

RULES:
1. Tone: casual bar conversation, spartan. No fancy language.
2. Reference 1-2 SPECIFIC things about their website (or lack thereof) — this proves you actually looked
3. If they have no website, lead with that as the biggest opportunity
4. If their website is bad, mention ONE specific issue tactfully (not insulting)
5. If their website is decent, focus on what's MISSING (city pages, AEO, schema)
6. Keep the subject line lowercase and under 60 chars
7. Keep the body under 150 words
8. Do NOT use the word "personalized" or "customized" or anything that sounds automated
9. Include merge tags [BOOKING_LINK] and [UNSUBSCRIBE_LINK] — they'll be replaced at send time

Return JSON:
{"subject": "...", "body": "..."}
```

- Store the result in personalized_subject and personalized_body on the campaign_lead
- Set personalization_status = 'done'

**4. `personalize_batch`** — Takes: campaign_id, batch_size (default 25)
- Query next N campaign_leads where website_status = 'crawled' AND personalization_status = 'pending'
- Order by website_score DESC (personalize hottest leads first)
- For each, call personalize_email
- Stagger: 1 every 3 seconds (respect AI rate limits)
- Return summary: { personalized: N, errors: X }

### PHASE 4: Update send_batch Logic
Modify the existing `send_batch` action in server.mjs:
- When selecting leads to send, prefer leads that have personalized_subject AND personalized_body
- If a lead has personalized copy, use that instead of the campaign template
- If a lead doesn't have personalized copy yet, fall back to the campaign template with basic merge tags
- Order sends by priority_rank (highest website_score first)

### PHASE 5: Data Service Updates
Add to `services/dataService.ts`:
- `triggerResearchBatch(campaignId: string, batchSize?: number)` — calls relay research_batch
- `triggerPersonalizeBatch(campaignId: string, batchSize?: number)` — calls relay personalize_batch
- `fetchCampaignResearchStats(campaignId: string)` — returns: { total, pending, crawled, noWebsite, errors, avgScore, scoreDistribution }
- `fetchCampaignPersonalizationStats(campaignId: string)` — returns: { total, pending, done, errors }
- Update `rowToCampaignLead` and `campaignLeadToRow` to include new fields

### PHASE 6: Frontend — Research & Personalization UI
Update `components/CampaignDetail.tsx` to add a new tab/section between Import and Template:

#### 6A: Research Tab (new tab in CampaignDetail)
Add a new tab called "Research" between "Import CSV" and "Template":

**Research Dashboard:**
- Progress bar: "Researched 3,200 / 10,141 leads"
- Score distribution chart (bar chart showing how many leads scored 1-2, 3-4, 5-6, 7-8, 9-10)
- Stats cards: No Website (count), Broken Website (count), Needs Work (count), Decent (count), Good (count)
- "Start Research" button → triggers research_batch in a loop (batches of 50 until all done)
- "Pause Research" button
- Research status per lead visible in the leads table (new columns: Score, Website Status)
- Auto-refreshes progress every 5 seconds while research is running

**Score breakdown tooltip on hover:**
- 9-10: "No website / unreachable — highest priority"
- 7-8: "Website exists but major issues — very likely to buy"
- 5-6: "Decent website but missing SEO/city pages — good prospect"
- 3-4: "Okay website, missing AEO — moderate prospect"
- 1-2: "Good website — lower priority"

#### 6B: Personalization Tab (new tab after Research)
- Progress bar: "Personalized 1,500 / 10,141 leads"
- "Start Personalization" button → triggers personalize_batch in a loop
- "Pause" button
- Preview panel: click any lead to see their personalized subject + body side-by-side with the original template
- Edit button on each lead's personalized copy (manual override)
- Filter: show only personalized, show only pending, filter by score range
- Stats: avg personalization time, completion estimate

#### 6C: Update Leads Table
The existing leads table in CampaignDetail should add sortable columns:
- **Score** (0-10, color-coded: green 9-10, yellow 5-8, gray 1-4)
- **Website Status** (icon: checkmark=crawled, spinner=crawling, x=error, dash=no website)
- **Personalized** (checkmark or pending)
- **Priority** (rank number)
- Sortable by score, filterable by score range
- Click a row to expand and see full website analysis + personalized email preview

#### 6D: Update Campaign Flow
The CampaignDetail tabs should now be in this order:
1. **Leads** (existing) — shows imported leads with new score/status columns
2. **Import CSV** (existing) — drag-and-drop import
3. **Research** (NEW) — website crawling + scoring
4. **Personalize** (NEW) — AI email generation
5. **Template** (existing) — fallback template for non-personalized leads
6. **Schedule** (existing) — warmup/send settings

The campaign workflow becomes:
Import CSV → Research Websites → AI Personalize → Review → Schedule & Send

### PHASE 7: Smart Send Priority
Update the campaign scheduler logic:
- Leads with score 9-10 get sent in the first week of warmup (these are the hottest — no website or broken)
- Leads with score 7-8 get sent in week 2 (bad websites)
- Leads with score 5-6 get sent in week 3 (need SEO/city pages)
- Leads with score 1-4 get sent last (already have decent websites)
- Within each tier, randomize order so it doesn't look automated
- This means your warmup period naturally targets the best prospects first

### PHASE 8: Dashboard Integration
Add to the main Dashboard component:
- New card: "Outreach Pipeline" showing: X leads researched, Y personalized, Z ready to send
- Score distribution mini-chart
- "Top 10 Hot Leads" list (score 9-10 with no website) with quick-send option

## IMPLEMENTATION RULES

### For website research:
- Use Node.js `fetch` with a 10-second timeout per website
- Set User-Agent to a standard browser string (not "bot")
- DO NOT follow more than 2 redirects
- DO NOT fetch more than the homepage HTML (no deep crawling)
- Parse HTML with regex or basic string matching — do NOT add a heavy dependency like puppeteer or cheerio. Use built-in DOMParser concepts or simple regex for meta tags, h1s, links, etc.
- If a website takes longer than 10 seconds, mark as score 8 (slow = bad)
- Cache results — never re-crawl the same URL in the same campaign

### For AI personalization:
- Use the Gemini API that's already configured (import.meta.env.VITE_GOOGLE_API_KEY / process.env.GEMINI_API_KEY)
- If Gemini is not available, fall back to a simple template-based personalization using the website analysis data (no AI needed — just fill in the blanks based on score and findings)
- Rate limit: max 20 requests/minute to Gemini
- Each personalized email must feel like a human wrote it after spending 2 minutes looking at their website
- Never mention the score or the word "analysis" in the email

### For the frontend:
- Research and personalization run as background jobs — the UI polls for progress
- Show real-time progress with a progress bar that updates every 5 seconds
- Don't block the UI while research/personalization runs
- All new UI must match the existing Swiss mineral design system exactly

## SAFETY RULES
1. Never crawl more than 1 website per 2 seconds (be respectful)
2. Never send personalized emails without letting the user preview them first
3. Store all research data — never re-crawl unnecessarily
4. If a website blocks the request, mark as score 6 (they have a website, it's protected)
5. Never include the actual website analysis in the email — only use it to inform the tone
6. Respect robots.txt — if a site says no, mark it as score 5 and move on

## ENVIRONMENT VARIABLES
No new env vars needed — the system already has:
- `VITE_GOOGLE_API_KEY` / `GEMINI_API_KEY` — for AI personalization
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — for database
- `RELAY_AUTH_TOKEN` — for server auth

## FILE MODIFICATION MAP
**Existing files to modify:**
- `supabase/outreach_research.sql` (NEW — migration for new columns)
- `types.ts` — add WebsiteAnalysis interface, update CampaignLead
- `services/dataService.ts` — add research/personalization functions, update mappers
- `scripts/server.mjs` — add research_website, research_batch, personalize_email, personalize_batch actions. Modify send_batch to use personalized copy.
- `components/CampaignDetail.tsx` — add Research and Personalize tabs, update leads table with score/status columns
- `components/OutreachAnalytics.tsx` — add score distribution chart, research stats
- `components/Dashboard.tsx` — add outreach pipeline card
- `App.tsx` — no changes needed (outreach routing already exists)

**New files to create:**
- `components/WebsiteResearchPanel.tsx` — research progress UI, score distribution, start/pause controls
- `components/PersonalizationPanel.tsx` — personalization progress, preview, edit override
- `components/LeadScoreBar.tsx` — small reusable score visualization component (colored bar 0-10)

## QUALITY REQUIREMENTS
- All new components must match the existing Swiss mineral design system
- Mobile responsive
- TypeScript strict — proper types
- Error handling on every async operation
- Loading states with progress bars (not just spinners)
- No console.error spam — use console.warn for expected failures
- Build must pass: `npx vite build`

## AFTER COMPLETING ALL PHASES
1. Run `npx vite build` and fix any errors
2. Test the research flow: import a CSV → start research → verify scores appear
3. Test the personalization flow: run personalize → verify personalized emails appear
4. Verify that send_batch uses personalized copy when available
5. List any manual steps remaining
6. Summarize what was built and the new campaign workflow
