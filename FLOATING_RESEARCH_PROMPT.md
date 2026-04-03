# BUILD PROMPT — Floating Research Monitor for ProviderOS

## PURPOSE
Add a floating research monitor pill/widget to ProviderOS that persists across ALL tabs. When website research is running, a small pill appears in the bottom-right corner showing progress. Clicking it expands to a modal with full details. The research runs in the background regardless of which page the user is on.

## CRITICAL CONTEXT
- **Project root:** This directory (the-provider's-business-os)
- **Read FIRST:** App.tsx, components/WebsiteResearchPanel.tsx, components/CampaignDetail.tsx, services/dataService.ts
- **Brand colors:** Navy #0B3060, Gold #FF9F1C, White #FFFFFF, Light Gray #F7F8FA
- **The research system already works** — triggerResearchBatch() in dataService.ts calls the relay server which crawls websites in the background. The WebsiteResearchPanel.tsx component currently manages the research loop with startResearch/stopResearch functions.
- **DO NOT modify:** scripts/server.mjs, services/dataService.ts, types.ts

## WHAT TO BUILD

### 1. Research State Context
Create a React context that lifts research state to the App level so it persists across tab navigation.

Create `components/ResearchContext.tsx`:
```typescript
interface ResearchState {
  isRunning: boolean;
  campaignId: string | null;
  campaignName: string;
  totalLeads: number;
  researched: number;
  pending: number;
  noWebsite: number;
  broken: number;
  crawled: number;
  avgScore: number;
  recentResults: Array<{
    id: string;
    companyName: string;
    website: string;
    score: number;
    status: string;
    assessment: string;
  }>;
  // Controls
  startResearch: (campaignId: string, campaignName: string, batchSize: number) => void;
  stopResearch: () => void;
}
```

The context provider:
- Manages the research loop (moved from WebsiteResearchPanel)
- Calls triggerResearchBatch() in a loop with configurable batch size
- Polls campaign_leads for progress every 2 seconds while running
- Tracks recent results (last 10 completed leads with their scores/assessments)
- Persists running state across tab changes
- The delay between batches checks stopRef every 500ms (existing pattern)

### 2. Floating Research Pill Component
Create `components/FloatingResearchPill.tsx`:

**Collapsed state (pill):**
- Fixed position: bottom-right corner (bottom-6 right-6)
- z-index: 50 (above all content, below modals)
- Pill shape: rounded-full, approximately 280px wide × 48px tall
- Background: navy (#0B3060) with subtle shadow
- Content:
  - Left: pulsing green dot (active indicator)
  - Search icon (lucide Search or Loader2 spinning)
  - Text: "3,627 / 10,141" in white, bold
  - Mini progress bar underneath the text (thin, 3px, gold fill on white/20 track)
  - Right: small stop button (square icon, white, hover: gold)
- Click anywhere on pill (except stop) → expands to modal
- Smooth transition animation (scale + height)
- If research is complete: green background, checkmark icon, "Complete! 10,141 researched", fades after 5 seconds or on click

**Expanded state (modal):**
- Fixed position: bottom-right corner (bottom-6 right-6)
- Width: 420px, max-height: 500px
- Background: white with navy header
- Border-radius: 20px
- Subtle shadow: shadow-2xl
- Sections:

**Header (navy background):**
- Campaign name (truncated if long)
- Progress: "3,627 / 10,141 · 36%"
- Full progress bar (gold on navy-light track)
- Minimize button (chevron-down icon) → collapses to pill
- Stop button (square icon, gold)

**Stats row:**
- 4 compact stat boxes: No Website | Broken | Crawled | Avg Score
- Same data as the research panel but compact

**Live feed (scrollable, max 6 items):**
- Most recent researched leads
- Each row: checkmark/warning icon, company name (truncated), score badge, brief assessment
- Auto-scrolls as new results come in

**Footer:**
- "Go to Research" button → navigates to outreach tab, opens the campaign, scrolls to research section
- "Minimize" text button → collapses to pill

### 3. Update WebsiteResearchPanel
Modify `components/WebsiteResearchPanel.tsx`:
- Remove the internal research loop logic (startResearch, stopResearch, delay, stopRef, intervalRef, running state)
- Instead, consume the ResearchContext
- The "Research All" button calls `context.startResearch(campaignId, campaignName, batchSize)`
- The "Stop" button calls `context.stopResearch()`
- The running state, stats, and live feed come from context
- The panel still shows its own UI (score distribution chart, lead table, etc.) but delegates the actual research execution to the context
- If research is running for THIS campaign, show the controls as active
- If research is running for a DIFFERENT campaign, show a notice: "Research is running on [other campaign name]"

### 4. Update App.tsx
- Wrap the app with `<ResearchProvider>`
- Render `<FloatingResearchPill />` at the root level (outside the main content, always visible)
- The pill only renders when research isRunning OR was recently completed (within last 5 seconds)

### 5. Navigation from Pill
The "Go to Research" button in the expanded pill should:
- Set activeTab to 'outreach' (via the hash router)
- The OutreachManager should auto-open the correct campaign
- Add a URL hash parameter: `#outreach?campaign=CAMPAIGN_ID` that OutreachManager reads to auto-select the campaign

## IMPLEMENTATION DETAILS

### Research loop (in ResearchContext):
```
1. Set isRunning = true, store campaignId
2. Start polling interval (every 2 seconds, fetch stats via lightweight count queries)
3. Loop:
   a. Call triggerResearchBatch(campaignId, batchSize)
   b. If result.researched === 0, break (all done)
   c. Wait batchSize * 1500ms (checking stopRef every 500ms)
   d. Fetch recent results: query campaign_leads WHERE website_status != 'pending' ORDER BY research_completed_at DESC LIMIT 10
   e. Update recentResults state
4. On stop or completion:
   a. Clear polling interval
   b. Set isRunning = false
   c. Keep stats visible for 5 seconds, then clear
```

### Animations:
- Pill entrance: slide up from bottom + fade in (200ms)
- Pill → Modal: scale from pill size to modal size (300ms ease-out)
- Modal → Pill: reverse (200ms ease-in)
- Pill exit (on completion): fade out after 5 seconds
- Progress bar: smooth width transition (500ms)
- Live feed items: slide in from right (150ms)

### Responsive:
- Desktop: pill in bottom-right, modal 420px wide
- Mobile: pill spans full width (bottom-0 left-0 right-0, 48px tall)
- Mobile modal: full width, slides up from bottom like a sheet (max 70vh)

## FILE MAP
**New files:**
- `components/ResearchContext.tsx` — context provider with research loop
- `components/FloatingResearchPill.tsx` — the pill + expanded modal

**Modified files:**
- `App.tsx` — wrap with ResearchProvider, render FloatingResearchPill
- `components/WebsiteResearchPanel.tsx` — consume context instead of managing own loop
- `components/OutreachManager.tsx` — read campaign ID from URL hash for auto-navigation

**Do NOT modify:**
- scripts/server.mjs
- services/dataService.ts
- types.ts

## QUALITY REQUIREMENTS
- Smooth animations (no janky transitions)
- Navy/gold/white brand colors throughout
- No flickering when polling updates stats
- Stop button responds within 500ms
- Build must pass: `npx vite build`
- Test: start research, navigate to Dashboard, verify pill stays visible
- Test: click pill, verify modal expands, click "Go to Research", verify navigation works
- Test: stop button stops research and pill shows completion state
