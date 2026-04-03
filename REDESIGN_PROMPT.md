# MEGA BUILD PROMPT — ProviderOS Complete Redesign

## PURPOSE
You are completely redesigning the ProviderOS application — a business CRM and cold email outreach platform. The current design uses gold (#B8860B) and black which are NOT the brand colors. The entire app needs to be modernized with the correct brand identity and made more intuitive, especially the Outreach/Campaign section which is currently confusing.

## CRITICAL CONTEXT
- **Project root:** This directory (the-provider's-business-os)
- **Stack:** React 19 + TypeScript + Vite (port 3000), Supabase, Node.js relay server (port 3001)
- **Read FIRST before any changes:** App.tsx, index.css, types.ts, and every component in components/
- **DO NOT break any existing functionality.** This is a visual redesign — all data fetching, state management, API calls, and business logic must remain exactly the same.
- **DO NOT change scripts/server.mjs or services/dataService.ts** — backend stays untouched.

## BRAND IDENTITY

### Colors (from theprovidersystem.com)
- **Primary Navy:** `#0B3060` — sidebar, headers, primary buttons, key UI elements
- **Gold/Amber:** `#FF9F1C` — accents, highlights, active states, badges, CTAs
- **White:** `#FFFFFF` — card backgrounds, content areas
- **Light Gray:** `#F7F8FA` — page background
- **Dark Text:** `#1A1A2E` — primary text
- **Medium Text:** `#64748B` — secondary/muted text
- **Light Border:** `#E2E8F0` — card borders, dividers
- **Success Green:** `#10B981`
- **Error Red:** `#EF4444`
- **Warning Amber:** `#F59E0B`

### Logo (SVG — from theprovidersystem.com/favicon.svg)
```svg
<svg viewBox="0 0 500 240" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="transparent" />
    <g transform="translate(250, 120)" text-anchor="middle">
        <text y="-60" font-size="70" fill="#0B3060" font-style="italic" font-family="DM Serif Display, serif">The</text>
        <text y="20" font-size="95" fill="#0B3060" font-weight="900" font-family="DM Serif Display, serif">PROVIDER</text>
        <text y="95" font-size="75" fill="#FF9F1C" font-weight="900" letter-spacing="8" font-family="Space Grotesk, sans-serif">SYSTEM</text>
    </g>
</svg>
```

### Typography
- **Headings:** DM Serif Display or font-serif fallback
- **Body:** Inter, system-ui, or font-sans fallback
- **Monospace (data/stats):** JetBrains Mono or font-mono fallback

### Design Principles
- **Modern CRM aesthetic** — think Linear, Notion, or Attio. Clean, minimal, spacious.
- **Navy sidebar** with white/gold text — NOT black
- **White cards** on light gray background
- **Subtle shadows** — `shadow-sm` or `shadow-md`, never heavy
- **Rounded corners** — `rounded-xl` for cards, `rounded-lg` for buttons, `rounded-full` for avatars/badges
- **Generous whitespace** — don't cram elements together
- **Micro-animations** — subtle hover effects, smooth transitions (200-300ms)
- **Mobile-first responsive** — works perfectly on phone, tablet, and desktop

## WHAT TO REDESIGN

### 1. Global CSS (index.css)
Replace ALL existing custom CSS classes (luminous-card, luminous-button-gold, luminous-sidebar, bottom-nav, etc.) with new ones using the correct brand colors:

```css
/* New design system */
.brand-sidebar { background: #0B3060; }
.brand-card { background: white; border: 1px solid #E2E8F0; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.brand-button-primary { background: #0B3060; color: white; border-radius: 12px; font-weight: 600; transition: all 200ms; }
.brand-button-primary:hover { background: #0a2850; }
.brand-button-gold { background: #FF9F1C; color: white; border-radius: 12px; font-weight: 600; }
.brand-button-gold:hover { background: #e8900a; }
.brand-badge { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
```

Keep ALL existing animation classes that work. Just change colors.

### 2. Sidebar (in App.tsx)
Current: Black (#121212) sidebar with gold accents
New: **Navy (#0B3060) sidebar** with:
- Logo SVG at the top (use the SVG from above, scaled to fit ~180px wide)
- White text for nav items
- Gold (#FF9F1C) left border + white text for the active tab
- Subtle hover effect (white/10 background) on inactive items
- Clean icon + label layout
- Settings at the bottom separated by a subtle divider

### 3. Top Header (in App.tsx)
Current: White with basic search
New:
- Clean white header with subtle bottom border
- Search bar with navy icon, rounded-xl, light gray background
- Action button (+ icon) in navy, not black
- Notification bell with gold dot for unread count
- User avatar with initials in navy circle

### 4. Dashboard (components/Dashboard.tsx)
Current: Gold and black themed cards
New:
- Welcome header with user's business name
- KPI cards in white with navy text for values, gold accent for positive trends
- Revenue chart with navy (#0B3060) as the primary line/area color, gold as secondary
- Tax/fiscal section with navy gradient instead of black
- Clean card layout with consistent spacing

### 5. Outreach Section (components/OutreachManager.tsx and sub-components)
**THIS IS THE BIGGEST REDESIGN.** The current tab-heavy layout is confusing.

New structure — **replace tabs with a cleaner flow:**

**Campaign List View:**
- Clean table/card list of campaigns
- Each campaign card shows: name, status badge (draft=gray, active=green, paused=amber), lead count, research progress bar, sent/open/click stats inline
- "New Campaign" button in navy
- Sort by: newest, most leads, highest open rate

**Campaign Detail View (when you click into a campaign):**
Replace the 6 confusing tabs (Leads, Import, Research, Personalize, Template, Schedule) with a **single scrollable page** organized as clear sections with anchor navigation:

```
[Campaign Header — name, status, key stats]
   |
[Section 1: Leads] — count, import button, lead table with score/status
   |
[Section 2: Research] — progress bar, live feed, score distribution
   |
[Section 3: Email Template] — subject, body editor, live preview side-by-side
   |
[Section 4: Schedule & Send] — warmup settings, daily limit, start/pause button
   |
[Section 5: Analytics] — open rate, click rate, reply rate, daily chart
```

A small **sticky sidebar** on the left (inside the campaign detail) showing section links so you can jump between them. On mobile, this becomes a horizontal scroll of section chips.

**Email Preview Section:**
- Split view: left side = editor, right side = live preview
- Preview shows the email exactly as it would appear in Gmail
- "Gmail inbox" mockup frame around the preview (gray header with from/to/subject, white body)
- Merge tags highlighted in gold in the editor
- Preview auto-fills merge tags with data from the first lead in the campaign

### 6. Cold Email Templates
**IMPORTANT:** All cold outreach emails must be **rich plain text** format — NOT branded HTML.

Why: Plain text cold emails get 2-3x higher reply rates. HTML emails with logos get flagged as marketing.

The email template editor should:
- Show a plain text editor (not HTML)
- Support basic formatting: **bold** (using markdown-style), links (plain URLs or [text](url))
- Preview renders as it would look in a Gmail inbox — plain text with clickable links
- NO logo, NO colored backgrounds, NO HTML formatting in the cold email itself
- The [BOOKING_LINK] and [UNSUBSCRIBE_LINK] merge tags get replaced with plain URLs at send time

Update all 5 campaign templates (No Website, Broken Website, Missing SEO, AEO Upgrade, AI Optimization) to be clean plain text. Remove all HTML divs, spans, styles. Keep the copy, just strip the HTML wrapper.

### 7. All Other Components
Apply the navy/gold/white color scheme consistently:
- **ClientsManager / RelationshipHub:** Navy headers, white cards, gold accents for active/important states
- **PaymentsManager:** Navy for paid badges, gold for pending, red for failed
- **SessionsManager:** Navy theme for calendar/meeting elements
- **ProjectsManager:** Status badges in brand colors
- **ContractsManager:** Navy for signed, gold for pending signature
- **SettingsManager:** Clean form layout with navy buttons
- **NotificationsPanel:** Navy background for panel, gold dot for unread
- **GlobalHyperLinkEngine:** Navy/gold modal styling
- **DealsManager:** Pipeline stages in navy gradient
- **ProposalBuilder:** Navy/gold themed
- **ExpensesManager / ReportsManager:** Consistent with the rest

### 8. Mobile Bottom Nav (in App.tsx)
Current: Black bottom bar
New: White bottom bar with navy icons, gold for active tab, subtle top border

### 9. Loading States
Current: Gold spinner
New: Navy (#0B3060) spinner with smooth animation

### 10. Error Boundary (in index.tsx)
Current: Gold "P" logo box
New: Use the actual SVG logo, navy button for "Reload App"

## IMPLEMENTATION RULES

1. **Change ONLY visual/styling code.** Do not modify any:
   - State management logic
   - API calls or data fetching
   - Business logic or calculations
   - Event handlers (except styling-related className changes)
   - Server code (scripts/server.mjs)
   - Service code (services/dataService.ts)
   - Type definitions (types.ts)

2. **Replace colors systematically:**
   - `#121212` (black) → `#0B3060` (navy) for primary UI elements
   - `#B8860B` (old gold) → `#FF9F1C` (brand gold) for accents
   - `bg-[#121212]` → `bg-[#0B3060]`
   - `text-[#B8860B]` → `text-[#FF9F1C]`
   - `shadow-[#B8860B]` → `shadow-[#FF9F1C]`
   - `border-[#B8860B]` → `border-[#FF9F1C]`
   - `bg-[#F5F5F7]` (page bg) → `bg-[#F7F8FA]`
   - `luminous-card` class → `brand-card` or direct Tailwind
   - `luminous-button-gold` → `brand-button-gold` or direct Tailwind
   - `luminous-sidebar` → `brand-sidebar` or direct Tailwind

3. **Keep the hash-based routing** that syncs activeTab to window.location.hash

4. **Keep all existing functionality working** — test by running `npx vite build` before considering done

5. **Font imports:** Add to index.html `<head>`:
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
   ```

## FILE MODIFICATION MAP
**Files to modify (visual only):**
- `index.css` — replace color scheme, update custom classes
- `index.html` — add Google Fonts link
- `index.tsx` — update Error Boundary colors/logo
- `App.tsx` — sidebar, header, bottom nav, page background
- `components/Dashboard.tsx` — KPI cards, charts, fiscal section
- `components/OutreachManager.tsx` — complete layout restructure
- `components/CampaignList.tsx` — card/table redesign
- `components/CampaignDetail.tsx` — replace tabs with scrollable sections
- `components/WebsiteResearchPanel.tsx` — brand colors
- `components/PersonalizationPanel.tsx` — brand colors
- `components/EmailTemplateEditor.tsx` — plain text editor, Gmail preview mockup
- `components/CampaignScheduler.tsx` — brand colors
- `components/OutreachAnalytics.tsx` — chart colors
- `components/CSVImporter.tsx` — brand colors
- `components/BookingPage.tsx` — brand colors
- `components/UnsubscribePage.tsx` — brand colors
- `components/LeadScoreBar.tsx` — brand colors
- `components/ClientsManager.tsx` — brand colors
- `components/RelationshipHub.tsx` — brand colors
- `components/PaymentsManager.tsx` — brand colors
- `components/SessionsManager.tsx` — brand colors
- `components/ProjectsManager.tsx` — brand colors
- `components/ContractsManager.tsx` — brand colors
- `components/SettingsManager.tsx` — brand colors
- `components/NotificationsPanel.tsx` — brand colors
- `components/GlobalHyperLinkEngine.tsx` — brand colors
- `components/DealsManager.tsx` — brand colors
- `components/ProposalBuilder.tsx` — brand colors
- `components/ExpensesManager.tsx` — brand colors
- `components/ReportsManager.tsx` — brand colors
- `components/OperationsManager.tsx` — brand colors
- `components/ClientOnboardingWizard.tsx` — brand colors
- `components/ClientPortal.tsx` — brand colors
- `components/ContractSigningInterface.tsx` — brand colors
- `components/FileAttachments.tsx` — brand colors
- `components/ProposalViewInterface.tsx` — brand colors
- `components/PaymentLinksManager.tsx` — brand colors
- `components/LeadsManager.tsx` — brand colors

**Files to NOT modify:**
- `scripts/server.mjs`
- `services/dataService.ts`
- `services/supabase.ts`
- `types.ts`
- `vite.config.ts`
- `supabase/*`

## QUALITY REQUIREMENTS
- Every component must use the new brand colors consistently
- No remnants of the old gold (#B8860B) or black (#121212) theme
- Mobile responsive — test all breakpoints
- Build must pass with `npx vite build`
- All existing functionality must still work after redesign

## AFTER COMPLETING
1. Run `npx vite build` and fix any errors
2. Verify sidebar is navy with correct logo
3. Verify all pages use navy/gold/white scheme
4. Verify outreach campaign flow is less confusing
5. Verify email preview shows plain text format
6. Verify mobile layout works
7. List any components that need manual review
