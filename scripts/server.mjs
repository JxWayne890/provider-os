
import http from 'http';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

// --- Config from environment only ---
const PORT = process.env.PORT || 3001;
const RELAY_AUTH_TOKEN = process.env.RELAY_AUTH_TOKEN;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const STRIPE_API_KEY = process.env.STRIPE_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'john@go.theprovidersystem.com';
const RESEND_FROM_NAME = process.env.RESEND_FROM_NAME || 'John W Johnson';
const TRACKING_BASE_URL = process.env.TRACKING_BASE_URL || 'http://localhost:3001';
const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET || '';
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_API_KEY || "";
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || "";

if (!RELAY_AUTH_TOKEN) {
    console.error('FATAL: RELAY_AUTH_TOKEN is not set. Server will reject all requests.');
}
if (!RESEND_API_KEY) {
    console.warn('WARNING: RESEND_API_KEY is not set. Email sending will fail.');
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

function getStripeClient(apiKey) {
    const key = apiKey || STRIPE_API_KEY;
    if (!key) throw new Error('Stripe API key not configured. Set STRIPE_API_KEY env var or pass it in the request.');
    return new Stripe(key);
}

function generateId() {
    return crypto.randomUUID();
}

// --- Auth middleware ---
function authenticate(req, res) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.statusCode = 401;
        res.end(JSON.stringify({ success: false, error: 'Missing authorization token' }));
        return false;
    }
    const token = authHeader.slice(7);
    if (token !== RELAY_AUTH_TOKEN) {
        res.statusCode = 401;
        res.end(JSON.stringify({ success: false, error: 'Invalid authorization token' }));
        return false;
    }
    return true;
}


// ============================================================
// WEBSITE RESEARCH & AI PERSONALIZATION
// ============================================================


// ============================================================
// AUTO-ASSIGN LEADS TO SCORE-BASED CAMPAIGNS
// ============================================================

const SCORE_CAMPAIGNS = {
  '9-10': {
    name: 'No Website — Hot Leads',
    subject: 'hey {{company}} — quick question about getting found online',
    body: `<div style="font-family: system-ui, sans-serif; max-width: 600px; color: #1D1D1F; line-height: 1.6;">
<p>hi there,</p>

<p>I was looking into med spas in {{city}}{{state}} and came across {{company}} — looks like you're doing great work.</p>

<p>I noticed you don't seem to have a website right now, and honestly that's a huge opportunity you're leaving on the table. here's why I say that:</p>

<p>right now, when someone in {{city}} searches "med spa near me" or "botox in {{city}}" on Google or even asks ChatGPT for recommendations — your business doesn't show up. your competitors with websites are getting those patients instead.</p>

<p>I build high-performance websites specifically for med spas. not generic templates — I'm talking about websites with dedicated pages for every service you offer in every city you serve. so when someone searches "laser hair removal in {{city}}" — you show up. on Google AND on ChatGPT.</p>

<p>I just did this for a similar practice and within a few weeks they were ranking on the first page for 30+ local search terms they were completely invisible for before.</p>

<p>want to see what that would look like for {{company}}?</p>

<p><strong><a href="https://theprovidersystem.com/projects" style="color: #0066CC;">see examples of my work</a></strong></p>
<p><strong><a href="[BOOKING_LINK]" style="color: #0066CC;">book a 15-min call</a></strong> — no pressure, I'll show you exactly what I'd build</p>

<p>either way — {{company}} deserves to be found online. happy to chat whenever.</p>

<p>talk soon,<br/>John W Johnson<br/><a href="https://theprovidersystem.com" style="color: #666;">The Provider System</a></p>
<p style="font-size: 12px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;"><a href="[UNSUBSCRIBE_LINK]" style="color: #999;">unsubscribe</a></p>
</div>`,
  },

  '7-8': {
    name: 'Broken Website — High Priority',
    subject: 'noticed something about {{company}}\'s website',
    body: `<div style="font-family: system-ui, sans-serif; max-width: 600px; color: #1D1D1F; line-height: 1.6;">
<p>hi there,</p>

<p>I was researching med spas in {{city}}{{state}} and tried visiting your website — and ran into some issues.</p>

<p>I don't want to be that person, but here's what I found: your site is either loading really slowly, showing security warnings, or returning errors. and here's why that matters more than you might think:</p>

<p><strong>72% of patients say they'd skip a business with a slow or broken website and go to a competitor instead.</strong> Google also penalizes sites with these issues, which means you're getting pushed further down in search results every day this goes unfixed.</p>

<p>I specialize in building high-performance websites for med spas — fast, secure, mobile-optimized, and built with dedicated pages for every service + city combination so you rank for local searches like "botox in {{city}}" or "med spa near me."</p>

<p>I recently rebuilt a site for a similar practice that was having the same problems. within weeks they went from buried on page 5 to showing up in the top 3 for over 30 local search terms — and they told me new patient bookings jumped noticeably.</p>

<p>would it be worth 15 minutes to see what a rebuilt site could look like for {{company}}?</p>

<p><strong><a href="https://theprovidersystem.com/projects" style="color: #0066CC;">see what I've built for other practices</a></strong></p>
<p><strong><a href="[BOOKING_LINK]" style="color: #0066CC;">grab a quick 15-min slot</a></strong> — I'll walk you through exactly what I'd change</p>

<p>no pressure either way. just figured it was worth mentioning since I was already looking at your site.</p>

<p>best,<br/>John W Johnson<br/><a href="https://theprovidersystem.com" style="color: #666;">The Provider System</a></p>
<p style="font-size: 12px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;"><a href="[UNSUBSCRIBE_LINK]" style="color: #999;">unsubscribe</a></p>
</div>`,
  },

  '5-6': {
    name: 'Missing SEO & City Pages — Good Prospects',
    subject: 'why "{{city}} med spa" searches aren\'t showing {{company}}',
    body: `<div style="font-family: system-ui, sans-serif; max-width: 600px; color: #1D1D1F; line-height: 1.6;">
<p>hi there,</p>

<p>I took a look at {{company}}'s website — and honestly, the bones are there. you've got a solid foundation. but there's one big thing that's keeping you invisible for the searches that actually drive new patients.</p>

<p><strong>you don't have city + service pages.</strong></p>

<p>here's what that means: when someone in {{city}} searches "botox near me" or "laser hair removal in {{city}}" — Google has no dedicated page on your site to match that search. so it shows your competitors who DO have those pages instead. same thing with ChatGPT and AI search — if there's no structured content about your services in your area, AI tools won't recommend you either.</p>

<p>the fix is straightforward. I build websites for med spas with dedicated pages for every service you offer in every city you serve. so instead of one generic "services" page, you'd have:</p>
<ul style="color: #333; font-size: 14px;">
<li>Botox in {{city}}</li>
<li>Laser Hair Removal in {{city}}</li>
<li>Facials in {{city}}</li>
<li>...and every other service you offer</li>
</ul>

<p>each page is optimized for Google AND AI search engines. I did this for a med spa recently and they went from showing up for 3 search terms to ranking for 45+ — in about a month.</p>

<p>want to see what that kind of site structure would look like for {{company}}?</p>

<p><strong><a href="https://theprovidersystem.com/projects" style="color: #0066CC;">see examples of sites I've built</a></strong></p>
<p><strong><a href="[BOOKING_LINK]" style="color: #0066CC;">book a 15-min call</a></strong> — I'll show you the exact pages I'd create for your practice</p>

<p>your website is 80% of the way there. it just needs the SEO structure to actually convert those Google searches into booked appointments.</p>

<p>cheers,<br/>John W Johnson<br/><a href="https://theprovidersystem.com" style="color: #666;">The Provider System</a></p>
<p style="font-size: 12px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;"><a href="[UNSUBSCRIBE_LINK]" style="color: #999;">unsubscribe</a></p>
</div>`,
  },

  '3-4': {
    name: 'Decent Website — AEO Upgrade Prospects',
    subject: 'is ChatGPT recommending {{company}}? (probably not yet)',
    body: `<div style="font-family: system-ui, sans-serif; max-width: 600px; color: #1D1D1F; line-height: 1.6;">
<p>hi there,</p>

<p>so I checked out {{company}}'s website — and honestly, it's solid. you're ahead of most med spas I look at. nice work.</p>

<p>but here's something you're probably not thinking about yet, and it's about to matter a LOT:</p>

<p><strong>AI search is changing everything.</strong></p>

<p>more and more patients are asking ChatGPT, Google AI, and Siri things like "best med spa in {{city}}" or "where should I get botox in {{city}}?" — and those AI tools pull their recommendations from websites with structured data, schema markup, and what's called AEO (AI Engine Optimization).</p>

<p>right now, your site doesn't have that layer. which means when AI tools recommend med spas in {{city}} — {{company}} probably isn't in the answer.</p>

<p>I specialize in exactly this. I help med spas add the structured data and AI-optimized content that makes your site show up not just on Google, but in AI-powered search and voice assistants too. think of it as future-proofing your online presence.</p>

<p>I recently did this for a practice with a similar setup to yours. same good website, just missing the AI layer. after adding AEO + schema markup + city-specific structured content, they started showing up in ChatGPT recommendations within 2 weeks — and saw a measurable increase in calls from patients who said "I found you through AI."</p>

<p>curious what that would look like for {{company}}?</p>

<p><strong><a href="https://theprovidersystem.com/industries/healthcare" style="color: #0066CC;">how I help healthcare businesses with AEO</a></strong></p>
<p><strong><a href="[BOOKING_LINK]" style="color: #0066CC;">book a 15-min call</a></strong> — I'll do a quick AEO audit of your site live on the call</p>

<p>you've already done the hard part building a good site. this is about making sure AI knows about it too.</p>

<p>best,<br/>John W Johnson<br/><a href="https://theprovidersystem.com" style="color: #666;">The Provider System</a></p>
<p style="font-size: 12px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;"><a href="[UNSUBSCRIBE_LINK]" style="color: #999;">unsubscribe</a></p>
</div>`,
  },

  '1-2': {
    name: 'Strong Website — AI Optimization Upsell',
    subject: 're: {{company}} — one thing your competitors haven\'t figured out yet',
    body: `<div style="font-family: system-ui, sans-serif; max-width: 600px; color: #1D1D1F; line-height: 1.6;">
<p>hi there,</p>

<p>I've been doing research on med spas in {{city}}{{state}} and honestly — {{company}} has one of the better websites I've come across. seriously, whoever built it did a good job.</p>

<p>so why am I emailing you?</p>

<p>because there's a new competitive edge that almost no med spas have figured out yet — and you're in the perfect position to grab it before your competitors do.</p>

<p><strong>AI-powered search is becoming the #1 way patients discover new providers.</strong></p>

<p>I'm not talking about Google anymore (though that still matters). I'm talking about when patients ask ChatGPT "best med spa for fillers in {{city}}" or use Google's AI overview to find treatments near them. these AI tools are becoming the new front door for healthcare businesses — and the practices that optimize for them NOW will dominate for years.</p>

<p>what does "optimizing for AI" actually mean?</p>
<ul style="color: #333; font-size: 14px;">
<li>structured schema markup so AI tools understand your services, pricing, and locations</li>
<li>AI-readable content architecture (not the same as SEO content)</li>
<li>entity-based optimization that positions {{company}} as THE authority for med spa services in {{city}}</li>
</ul>

<p>I've been helping businesses implement this — it's called AEO (AI Engine Optimization) — and the early movers are seeing results the SEO-only crowd can't match.</p>

<p>since you already have a strong website foundation, adding the AEO layer would be relatively quick. want to see what that would look like?</p>

<p><strong><a href="https://theprovidersystem.com/services/ai-workflow-automation" style="color: #0066CC;">learn about AEO for healthcare</a></strong></p>
<p><strong><a href="[BOOKING_LINK]" style="color: #0066CC;">book a 15-min AEO audit call</a></strong> — I'll show you exactly where AI tools currently rank you vs. competitors</p>

<p>you're already winning the SEO game. this is about winning the next one.</p>

<p>cheers,<br/>John W Johnson<br/><a href="https://theprovidersystem.com" style="color: #666;">The Provider System</a></p>
<p style="font-size: 12px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;"><a href="[UNSUBSCRIBE_LINK]" style="color: #999;">unsubscribe</a></p>
</div>`,
  },
};

function getScoreTier(score) {
    if (score >= 9) return '9-10';
    if (score >= 7) return '7-8';
    if (score >= 5) return '5-6';
    if (score >= 3) return '3-4';
    return '1-2';
}

async function autoAssignToScoreCampaign(lead, score, supabaseClient) {
    try {
        const tier = getScoreTier(score);
        const config = SCORE_CAMPAIGNS[tier];
        if (!config) return;

        // Find or create the campaign for this tier
        let { data: campaign } = await supabaseClient.from('campaigns')
            .select('id')
            .eq('name', config.name)
            .single();

        if (!campaign) {
            const id = tier.replace('-', '') + '-campaign-' + Date.now();
            const { error } = await supabaseClient.from('campaigns').insert({
                id,
                name: config.name,
                subject_template: config.subject,
                body_template: config.body,
                from_name: 'John W Johnson',
                from_email: 'john@go.theprovidersystem.com',
                status: 'draft',
                daily_limit: 50,
                send_time: '09:00',
                weekdays_only: true,
                warmup_enabled: true,
                warmup_day: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
            if (error) { console.warn('[AUTO-CAMPAIGN] Create failed for ' + config.name + ':', error.message); return; }
            campaign = { id };
            console.log('[AUTO-CAMPAIGN] Created "' + config.name + '" campaign: ' + id);
        }

        // Check if already in this campaign
        const { data: existing } = await supabaseClient.from('campaign_leads')
            .select('id')
            .eq('campaign_id', campaign.id)
            .eq('email', lead.email)
            .limit(1);

        if (existing && existing.length > 0) return;

        // Add lead
        const newLeadId = tier.replace('-', '') + '-' + lead.id;
        await supabaseClient.from('campaign_leads').insert({
            id: newLeadId,
            campaign_id: campaign.id,
            email: lead.email,
            company_name: lead.company_name,
            city: lead.city,
            state: lead.state,
            country: lead.country,
            website: lead.website || '',
            verification_status: lead.verification_status || 'unknown',
            send_status: 'queued',
            engagement_score: 0,
            website_status: lead.website_status || 'pending',
            website_score: score,
            website_analysis: lead.website_analysis || {},
            created_at: new Date().toISOString(),
        });
        console.log('[AUTO-CAMPAIGN] ' + lead.company_name + ' -> "' + config.name + '" (score ' + score + ')');
    } catch (err) {
        console.warn('[AUTO-CAMPAIGN] Error:', err.message);
    }
}


// --- Email MX Verification ---
async function verifyEmail(email) {
    if (!email || !email.includes('@')) {
        return { valid: false, status: 'invalid_format', mx_records: [], reason: 'No valid email format' };
    }

    const domain = email.split('@')[1].toLowerCase().trim();

    // Known disposable/temporary email domains
    const disposableDomains = ['mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
        'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la', 'dispostable.com',
        'trashmail.com', '10minutemail.com', 'tempail.com', 'fakeinbox.com'];
    if (disposableDomains.includes(domain)) {
        return { valid: false, status: 'disposable', mx_records: [], reason: 'Disposable/temporary email domain' };
    }

    // Known catch-all / free providers (valid but lower quality for B2B)
    const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
        'icloud.com', 'mail.com', 'protonmail.com', 'zoho.com', 'yandex.com', 'gmx.com'];
    const isFreeProvider = freeProviders.includes(domain);

    try {
        const mxRecords = await resolveMx(domain);

        if (!mxRecords || mxRecords.length === 0) {
            return { valid: false, status: 'no_mx', mx_records: [], reason: 'Domain has no MX records - cannot receive email' };
        }

        // Sort by priority
        mxRecords.sort((a, b) => a.priority - b.priority);
        const topMx = mxRecords.slice(0, 3).map(r => ({ exchange: r.exchange, priority: r.priority }));

        // Check for known parked/dead MX patterns
        const parkedPatterns = ['park', 'redirect', 'dummy', 'null'];
        const isParked = mxRecords.every(r => parkedPatterns.some(p => r.exchange.toLowerCase().includes(p)));
        if (isParked) {
            return { valid: false, status: 'parked_mx', mx_records: topMx, reason: 'MX records point to parked/inactive servers' };
        }

        return {
            valid: true,
            status: isFreeProvider ? 'free_provider' : 'business_email',
            mx_records: topMx,
            domain: domain,
            is_free_provider: isFreeProvider,
            reason: isFreeProvider ? 'Valid but free email provider (not business domain)' : 'Valid business email with active MX records'
        };
    } catch (err) {
        if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
            return { valid: false, status: 'domain_not_found', mx_records: [], reason: 'Domain does not exist' };
        }
        if (err.code === 'ETIMEOUT' || err.code === 'TIMEOUT') {
            return { valid: false, status: 'dns_timeout', mx_records: [], reason: 'DNS lookup timed out' };
        }
        return { valid: false, status: 'dns_error', mx_records: [], reason: 'DNS lookup failed: ' + err.message };
    }
}


// --- Perplexity AI Deep Verification ---
async function perplexitySearch(query) {
    if (!PERPLEXITY_API_KEY) throw new Error('PERPLEXITY_API_KEY not configured');
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + PERPLEXITY_API_KEY,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'sonar',
            messages: [
                { role: 'system', content: 'You are a business research assistant. Return ONLY valid JSON, no markdown, no explanation. Always include all requested fields even if null.' },
                { role: 'user', content: query }
            ],
            temperature: 0.1,
            max_tokens: 500,
        }),
    });
    
    if (!response.ok) {
        const err = await response.text();
        throw new Error('Perplexity API error: ' + response.status + ' ' + err);
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

async function deepVerifyLead(lead) {
    const company = lead.company_name || '';
    const city = lead.city || '';
    const state = lead.state || '';
    const csvEmail = lead.email || '';
    const csvWebsite = lead.website || '';
    
    const query = `Find the official website and contact email for the business "${company}" located in ${city}, ${state}. This is a med spa / aesthetics / wellness business.

Return ONLY this JSON format:
{
  "website": "the actual website URL or null if not found",
  "email": "the contact email or null if not found",
  "phone": "the phone number or null if not found",
  "confidence": "high/medium/low",
  "notes": "brief note about what you found"
}`;

    try {
        const raw = await perplexitySearch(query);
        
        // Parse JSON from response (handle markdown wrapping)
        let cleaned = raw.trim();
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/```json?/g, '').replace(/```/g, '').trim();
        }
        
        let result;
        try {
            result = JSON.parse(cleaned);
        } catch {
            // Try to extract JSON from the response
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                result = JSON.parse(jsonMatch[0]);
            } else {
                return { status: 'error', error: 'Could not parse Perplexity response', raw: cleaned };
            }
        }
        
        const foundWebsite = result.website && result.website !== 'null' ? result.website.trim() : null;
        const foundEmail = result.email && result.email !== 'null' ? result.email.trim() : null;
        
        // Determine what changed
        let status = 'no_change';
        let needsReview = false;
        let reviewReason = null;
        
        // Check if we found a website for a lead that "had none"
        if (foundWebsite && (!csvWebsite || csvWebsite === 'N/A' || csvWebsite === '-' || csvWebsite.trim() === '')) {
            status = 'website_found';
        }
        
        // Check if found website is different from CSV
        if (foundWebsite && csvWebsite && csvWebsite.trim() !== '') {
            const normalizeUrl = (u) => u.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
            if (normalizeUrl(foundWebsite) !== normalizeUrl(csvWebsite)) {
                status = 'website_found';
                needsReview = true;
                reviewReason = 'Perplexity found different website: ' + foundWebsite + ' (CSV had: ' + csvWebsite + ')';
            }
        }
        
        // Check email
        if (foundEmail && foundEmail.toLowerCase() !== csvEmail.toLowerCase()) {
            if (status === 'no_change') status = 'email_updated';
            needsReview = true;
            reviewReason = (reviewReason ? reviewReason + '; ' : '') + 'Perplexity found different email: ' + foundEmail + ' (CSV had: ' + csvEmail + ')';
        }
        
        if (!foundWebsite && !foundEmail) {
            status = 'verified'; // Perplexity also couldn't find anything — confirmed no website
        }
        
        return {
            status,
            verified_website: foundWebsite,
            verified_email: foundEmail,
            phone: result.phone || null,
            confidence: result.confidence || 'unknown',
            notes: result.notes || '',
            needs_review: needsReview,
            review_reason: reviewReason,
            raw_response: result,
        };
    } catch (err) {
        return { status: 'error', error: err.message };
    }
}


async function researchWebsite(url, campaignLeadId) {
    const analysis = {
        hasWebsite: false, isReachable: false, httpStatus: 0,
        hasSSL: false, isMobileResponsive: false, hasSchemaMarkup: false,
        metaTitle: '', metaDescription: '', h1Tags: [],
        cityServicePages: false, estimatedPageCount: 0, techStack: [],
        loadTimeMs: 0, seoIssues: [], overallAssessment: '', keyFindings: [],
    };

    if (!url || url.trim() === '' || url === 'N/A' || url === 'n/a' || url === '-') {
        analysis.overallAssessment = 'No website found for this business';
        analysis.keyFindings = ['No website at all — biggest opportunity'];
        return { analysis, score: 10, status: 'no_website' };
    }

    // Normalize URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http')) normalizedUrl = 'https://' + normalizedUrl;
    analysis.hasSSL = normalizedUrl.startsWith('https');

    const startTime = Date.now();
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(normalizedUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml',
            },
            redirect: 'follow',
        });
        clearTimeout(timeout);

        analysis.loadTimeMs = Date.now() - startTime;
        analysis.httpStatus = response.status;
        analysis.hasWebsite = true;

        if (!response.ok) {
            analysis.isReachable = false;
            analysis.overallAssessment = `Website returned HTTP ${response.status}`;
            analysis.keyFindings = [`Website exists but returns error (${response.status})`];
            return { analysis, score: 8, status: 'crawled' };
        }

        analysis.isReachable = true;
        const html = await response.text();

        // Parse meta title
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        analysis.metaTitle = titleMatch ? titleMatch[1].trim() : '';
        if (!analysis.metaTitle) analysis.seoIssues.push('No page title');

        // Parse meta description
        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
            || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
        analysis.metaDescription = descMatch ? descMatch[1].trim() : '';
        if (!analysis.metaDescription) analysis.seoIssues.push('No meta description');

        // Parse H1 tags
        const h1Matches = html.matchAll(/<h1[^>]*>(.*?)<\/h1>/gis);
        for (const m of h1Matches) {
            analysis.h1Tags.push(m[1].replace(/<[^>]*>/g, '').trim());
        }
        if (analysis.h1Tags.length === 0) analysis.seoIssues.push('No H1 heading');

        // Mobile responsive check
        analysis.isMobileResponsive = /viewport/.test(html) && /width=device-width/.test(html);
        if (!analysis.isMobileResponsive) analysis.seoIssues.push('No mobile viewport meta tag');

        // Schema markup check
        analysis.hasSchemaMarkup = /application\/ld\+json/.test(html);
        if (!analysis.hasSchemaMarkup) analysis.seoIssues.push('No schema markup (JSON-LD)');

        // SSL check
        if (!analysis.hasSSL) analysis.seoIssues.push('No SSL (HTTP only)');

        // Tech stack detection
        if (/wp-content|wordpress/i.test(html)) analysis.techStack.push('WordPress');
        if (/wix\.com|wixsite/i.test(html)) analysis.techStack.push('Wix');
        if (/squarespace/i.test(html)) analysis.techStack.push('Squarespace');
        if (/shopify/i.test(html)) analysis.techStack.push('Shopify');
        if (/webflow/i.test(html)) analysis.techStack.push('Webflow');
        if (/godaddy/i.test(html)) analysis.techStack.push('GoDaddy');
        if (/weebly/i.test(html)) analysis.techStack.push('Weebly');
        if (/next/i.test(html) && /\_next/i.test(html)) analysis.techStack.push('Next.js');
        if (analysis.techStack.length === 0) analysis.techStack.push('Custom/Unknown');

        // Estimate page count from internal links
        const internalLinks = new Set();
        const linkMatches = html.matchAll(/href=["'](\/[^"'#]*|https?:\/\/[^"'#]*)/gi);
        const domain = new URL(normalizedUrl).hostname;
        for (const lm of linkMatches) {
            const href = lm[1];
            if (href.startsWith('/') || href.includes(domain)) {
                internalLinks.add(href.split('?')[0].split('#')[0]);
            }
        }
        analysis.estimatedPageCount = Math.max(1, internalLinks.size);

        // City/service page detection
        const medSpaKeywords = /botox|filler|laser|facial|medspa|med.spa|aesthetic|coolsculpting|microneedling|hydrafacial|chemical.peel|prp|semaglutide|iv.therapy/i;
        const cityPattern = /\/[a-z-]+-(?:botox|filler|laser|facial|medspa|aesthetic)/i;
        const hasServicePages = medSpaKeywords.test(html);
        const hasCityPages = cityPattern.test(html) || /locations?\//i.test(html);
        analysis.cityServicePages = hasServicePages && hasCityPages;
        if (!analysis.cityServicePages) analysis.seoIssues.push('No city + service combination pages');

        // Slow site check
        if (analysis.loadTimeMs > 5000) analysis.seoIssues.push('Very slow load time (>5s)');
        else if (analysis.loadTimeMs > 3000) analysis.seoIssues.push('Slow load time (>3s)');

        // Calculate score
        let score;
        const issueCount = analysis.seoIssues.length;
        if (issueCount >= 5) score = 8;
        else if (issueCount >= 4) score = 7;
        else if (!analysis.cityServicePages && issueCount >= 2) score = 6;
        else if (!analysis.cityServicePages) score = 5;
        else if (!analysis.hasSchemaMarkup) score = 4;
        else if (issueCount >= 1) score = 3;
        else score = 2;

        // Build assessment
        const findings = [];
        if (analysis.techStack.length > 0 && !analysis.techStack.includes('Custom/Unknown')) {
            findings.push(`Built on ${analysis.techStack.join(', ')}`);
        }
        if (analysis.estimatedPageCount < 10) findings.push(`Only ~${analysis.estimatedPageCount} pages`);
        if (!analysis.cityServicePages) findings.push('No location-specific service pages');
        if (!analysis.hasSchemaMarkup) findings.push('No schema markup for local SEO');
        if (!analysis.isMobileResponsive) findings.push('Not mobile-optimized');
        if (analysis.loadTimeMs > 3000) findings.push(`Slow: ${(analysis.loadTimeMs / 1000).toFixed(1)}s load time`);
        analysis.keyFindings = findings.slice(0, 5);

        analysis.overallAssessment = `${analysis.techStack[0] || 'Custom'} site with ${issueCount} SEO issues` +
            (analysis.cityServicePages ? '' : ', no city/service pages') +
            (analysis.hasSchemaMarkup ? '' : ', no schema markup');

        return { analysis, score, status: 'crawled' };

    } catch (err) {
        analysis.loadTimeMs = Date.now() - startTime;

        if (err.name === 'AbortError') {
            analysis.overallAssessment = 'Website timed out (>10s)';
            analysis.keyFindings = ['Website exists but extremely slow'];
            return { analysis, score: 8, status: 'crawled' };
        }

        // DNS/connection errors = no functioning website
        analysis.overallAssessment = `Website unreachable: ${err.code || err.message}`;
        analysis.keyFindings = ['Website URL provided but site is unreachable'];
        return { analysis, score: 9, status: 'error' };
    }
}

async function personalizeWithGemini(lead, campaign, apiKey) {
    if (!apiKey) return null;

    const wa = lead.website_analysis || {};
    const prompt = `You are a cold email personalization expert. You write casual, human-sounding outreach emails.

CONTEXT:
- Sender: John W Johnson, The Provider System (theprovidersystem.com)
- Service: High-performance websites with SEO + AEO (AI Engine Optimization) for med spas
- What we do: Build websites with city + service page combinations that rank on Google AND ChatGPT

LEAD INFO:
- Company: ${lead.company_name || 'Unknown'}
- City: ${lead.city || 'Unknown'}, ${lead.state || ''}
- Website: ${lead.website || 'None'}
- Website Score: ${lead.website_score || 0}/10 (10 = needs us most)
- Website Analysis: ${wa.overallAssessment || 'No analysis available'}
- Key Findings: ${(wa.keyFindings || []).join('; ') || 'None'}
- SEO Issues: ${(wa.seoIssues || []).join('; ') || 'None'}

TEMPLATE TO PERSONALIZE:
Subject: ${campaign.subject_template || 'Quick question for {{company}}'}
Body: ${campaign.body_template || 'Default outreach template'}

RULES:
1. Tone: casual bar conversation, spartan. No fancy language.
2. Reference 1-2 SPECIFIC things about their website (or lack thereof)
3. If they have no website, lead with that as the biggest opportunity
4. If their website is bad, mention ONE specific issue tactfully (not insulting)
5. If their website is decent, focus on what is MISSING (city pages, AEO, schema)
6. Keep the subject line lowercase and under 60 chars
7. Keep the body under 150 words
8. Do NOT use the word "personalized" or "customized" or anything that sounds automated
9. Include merge tags [BOOKING_LINK] and [UNSUBSCRIBE_LINK] in the body
10. Return ONLY valid JSON, no markdown

Return JSON: {"subject": "...", "body": "..."}`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.8,
                        maxOutputTokens: 1024,
                        responseMimeType: 'application/json',
                    },
                }),
            }
        );

        if (!response.ok) {
            console.warn('Gemini API error:', response.status);
            return null;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) return null;

        // Parse JSON from response (handle potential markdown wrapping)
        const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const result = JSON.parse(jsonStr);
        return { subject: result.subject, body: result.body };
    } catch (err) {
        console.warn('Gemini personalization failed:', err.message);
        return null;
    }
}

function fallbackPersonalize(lead, campaign) {
    const wa = lead.website_analysis || {};
    const company = lead.company_name || 'your practice';
    const city = lead.city || '';
    const state = lead.state || '';
    const score = lead.website_score || 0;

    let opener;
    if (score >= 9) {
        opener = `I noticed ${company} doesn't seem to have a website yet — that's actually a huge opportunity right now.`;
    } else if (score >= 7) {
        const issue = (wa.keyFindings || [])[0] || 'some areas that could use improvement';
        opener = `I took a look at your website and noticed ${issue.toLowerCase()}.`;
    } else if (score >= 5) {
        opener = `Your site looks decent, but I noticed you're missing city-specific service pages — that's where the real Google traffic is.`;
    } else {
        opener = `I came across ${company} in ${city}${state ? ', ' + state : ''} and had a quick thought about your online presence.`;
    }

    const subject = campaign.subject_template
        ? campaign.subject_template.replace(/\{\{company\}\}/gi, company).replace(/\{\{city\}\}/gi, city)
        : `quick thought for ${company.toLowerCase()}`;

    const body = `hi there,

${opener}

I help med spas get found on Google and ChatGPT — not just traditional SEO, but the new AI search layer that's starting to drive real bookings. most med spas don't have this yet.

want to see what that could look like for ${company}? happy to put together a quick breakdown, no strings.

just reply to this email or grab 15 min here: [BOOKING_LINK]

— John W Johnson
The Provider System

[UNSUBSCRIBE_LINK]`;

    return { subject, body };
}

// ============================================================
// OUTREACH HELPERS
// ============================================================

function getWarmupDailyLimit(warmupDay) {
    if (warmupDay <= 3) return 20;
    if (warmupDay <= 7) return 50;
    if (warmupDay <= 14) return 100;
    if (warmupDay <= 21) return 200;
    return 500;
}

function injectTrackingPixel(html, sendLogId) {
    const pixel = `<img src="${TRACKING_BASE_URL}/track/open/${sendLogId}" width="1" height="1" style="display:none" alt="" />`;
    if (html.includes('</body>')) {
        return html.replace('</body>', `${pixel}</body>`);
    }
    return html + pixel;
}

function wrapLinksForTracking(html, sendLogId, campaignLeadId) {
    // Replace all href links (except unsubscribe/tracking links) with tracked redirects
    return html.replace(/href="(https?:\/\/[^"]+)"/g, (match, url) => {
        // Don't double-wrap tracking URLs or unsubscribe links
        if (url.includes(TRACKING_BASE_URL)) return match;
        const trackId = generateId();
        const trackedUrl = `${TRACKING_BASE_URL}/track/click/${trackId}?url=${encodeURIComponent(url)}&lid=${campaignLeadId}&slid=${sendLogId}`;
        return `href="${trackedUrl}"`;
    });
}

function appendUnsubscribeLink(html, campaignLeadId, email) {
    const unsubUrl = `${TRACKING_BASE_URL}/unsubscribe?id=${campaignLeadId}&email=${encodeURIComponent(email)}`;
    const footer = `
<div style="margin-top:40px;padding-top:20px;border-top:1px solid #eee;text-align:center;font-size:11px;color:#999;">
  <a href="${unsubUrl}" style="color:#999;text-decoration:underline;">Unsubscribe</a>
</div>`;
    if (html.includes('</body>')) {
        return html.replace('</body>', `${footer}</body>`);
    }
    return html + footer;
}

function personalizeMergeTags(template, lead) {
    return template
        .replace(/\{\{company\}\}/gi, lead.company_name || '')
        .replace(/\{\{city\}\}/gi, lead.city || '')
        .replace(/\{\{state\}\}/gi, lead.state || '')
        .replace(/\{\{website\}\}/gi, lead.website || '')
        .replace(/\{\{email\}\}/gi, lead.email || '')
        .replace(/\[BOOKING_LINK\]/gi, `${TRACKING_BASE_URL}/book?ref=${lead.id}`)
        .replace(/\[UNSUBSCRIBE_LINK\]/gi, `${TRACKING_BASE_URL}/unsubscribe?id=${lead.id}&email=${encodeURIComponent(lead.email)}`);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// URL ROUTING HELPERS
// ============================================================

function parseUrl(rawUrl) {
    try {
        return new URL(rawUrl, `http://localhost:${PORT}`);
    } catch {
        return null;
    }
}

// ============================================================
// SERVER
// ============================================================

const server = http.createServer(async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
    }

    const parsedUrl = parseUrl(req.url);
    if (!parsedUrl) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Bad URL' }));
        return;
    }
    const pathname = parsedUrl.pathname;

    // ========== PUBLIC ROUTES (no auth) ==========

    // GET /track/open/:sendLogId — open tracking pixel
    if (req.method === 'GET' && pathname.startsWith('/track/open/')) {
        const sendLogId = pathname.split('/track/open/')[1];
        try {
            if (supabase && sendLogId) {
                // Update send_log
                await supabase.from('send_log').update({ opened_at: new Date().toISOString() }).eq('id', sendLogId).is('opened_at', null);
                // Get the campaign_lead_id from send_log
                const { data: logData } = await supabase.from('send_log').select('campaign_lead_id').eq('id', sendLogId).single();
                if (logData?.campaign_lead_id) {
                    await supabase.from('campaign_leads').update({
                        send_status: 'opened',
                        opened_at: new Date().toISOString(),
                    }).eq('id', logData.campaign_lead_id).in('send_status', ['sent', 'sending']);
                    // Log tracking event
                    await supabase.from('tracking_events').insert({
                        id: generateId(), send_log_id: sendLogId,
                        campaign_lead_id: logData.campaign_lead_id,
                        event_type: 'open',
                        user_agent: req.headers['user-agent'] || '',
                        ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
                    });
                }
            }
        } catch (err) {
            console.warn('Open tracking error:', err.message);
        }
        // Return 1x1 transparent GIF
        const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
        res.setHeader('Content-Type', 'image/gif');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.end(pixel);
        return;
    }

    // GET /track/click/:trackId — click tracking redirect
    if (req.method === 'GET' && pathname.startsWith('/track/click/')) {
        const trackId = pathname.split('/track/click/')[1];
        const destinationUrl = parsedUrl.searchParams.get('url');
        const campaignLeadId = parsedUrl.searchParams.get('lid');
        const sendLogId = parsedUrl.searchParams.get('slid');

        try {
            if (supabase && campaignLeadId) {
                await supabase.from('campaign_leads').update({
                    send_status: 'clicked',
                    clicked_at: new Date().toISOString(),
                    engagement_score: supabase.rpc ? undefined : 3, // will increment below
                }).eq('id', campaignLeadId).in('send_status', ['sent', 'opened', 'sending']);

                // Increment engagement score
                const { data: leadData } = await supabase.from('campaign_leads').select('engagement_score').eq('id', campaignLeadId).single();
                if (leadData) {
                    await supabase.from('campaign_leads').update({
                        engagement_score: (leadData.engagement_score || 0) + 3,
                    }).eq('id', campaignLeadId);
                }

                if (sendLogId) {
                    await supabase.from('send_log').update({ clicked_at: new Date().toISOString() }).eq('id', sendLogId);
                }

                await supabase.from('tracking_events').insert({
                    id: trackId || generateId(), send_log_id: sendLogId || null,
                    campaign_lead_id: campaignLeadId,
                    event_type: 'click', link_url: destinationUrl || '',
                    user_agent: req.headers['user-agent'] || '',
                    ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
                });
            }
        } catch (err) {
            console.warn('Click tracking error:', err.message);
        }

        // 302 redirect to destination
        res.statusCode = 302;
        res.setHeader('Location', destinationUrl || 'https://theprovidersystem.com');
        res.end();
        return;
    }

    // GET /unsubscribe — public unsubscribe endpoint
    if (req.method === 'GET' && pathname === '/unsubscribe') {
        const campaignLeadId = parsedUrl.searchParams.get('id');
        const email = parsedUrl.searchParams.get('email');
        // Return a simple HTML page — the React app handles the actual UI
        // For API-only unsubscribe (called from React), the POST below handles it
        res.setHeader('Content-Type', 'text/html');
        res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title></head><body><script>window.location.href="/?mode=unsubscribe&id=${encodeURIComponent(campaignLeadId || '')}&email=${encodeURIComponent(email || '')}";</script></body></html>`);
        return;
    }

    // GET /book — public booking redirect
    if (req.method === 'GET' && pathname === '/book') {
        const ref = parsedUrl.searchParams.get('ref');
        res.setHeader('Content-Type', 'text/html');
        res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Book a Call</title></head><body><script>window.location.href="/?mode=book&ref=${encodeURIComponent(ref || '')}";</script></body></html>`);
        return;
    }

    // POST /webhook/resend — Resend webhook handler (no auth token, uses webhook secret)
    if (req.method === 'POST' && pathname === '/webhook/resend') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json');
            try {
                // Verify webhook signature if secret is set
                if (RESEND_WEBHOOK_SECRET) {
                    const signature = req.headers['svix-signature'];
                    const timestamp = req.headers['svix-timestamp'];
                    const svixId = req.headers['svix-id'];
                    if (!signature || !timestamp || !svixId) {
                        res.statusCode = 401;
                        res.end(JSON.stringify({ error: 'Missing webhook signature headers' }));
                        return;
                    }
                    // Basic HMAC verification
                    const toSign = `${svixId}.${timestamp}.${body}`;
                    const secretBytes = Buffer.from(RESEND_WEBHOOK_SECRET.replace('whsec_', ''), 'base64');
                    const expectedSignature = crypto.createHmac('sha256', secretBytes).update(toSign).digest('base64');
                    const signatures = signature.split(' ').map(s => s.replace('v1,', ''));
                    if (!signatures.some(s => s === expectedSignature)) {
                        res.statusCode = 401;
                        res.end(JSON.stringify({ error: 'Invalid webhook signature' }));
                        return;
                    }
                }

                const event = JSON.parse(body);
                const eventType = event.type;
                const eventData = event.data;

                if (!supabase) {
                    res.end(JSON.stringify({ success: true, message: 'No DB configured' }));
                    return;
                }

                const resendMessageId = eventData?.email_id;
                if (!resendMessageId) {
                    res.end(JSON.stringify({ success: true, message: 'No email_id in event' }));
                    return;
                }

                // Find send_log entry by resend_message_id
                const { data: logEntry } = await supabase.from('send_log')
                    .select('*').eq('resend_message_id', resendMessageId).single();

                if (!logEntry) {
                    res.end(JSON.stringify({ success: true, message: 'No matching send_log' }));
                    return;
                }

                const now = new Date().toISOString();

                if (eventType === 'email.delivered') {
                    await supabase.from('send_log').update({ status: 'delivered' }).eq('id', logEntry.id);
                }
                else if (eventType === 'email.opened') {
                    await supabase.from('send_log').update({ opened_at: now }).eq('id', logEntry.id).is('opened_at', null);
                    await supabase.from('campaign_leads').update({ send_status: 'opened', opened_at: now })
                        .eq('id', logEntry.campaign_lead_id).in('send_status', ['sent', 'sending']);
                }
                else if (eventType === 'email.clicked') {
                    await supabase.from('send_log').update({ clicked_at: now }).eq('id', logEntry.id);
                    await supabase.from('campaign_leads').update({ send_status: 'clicked', clicked_at: now })
                        .eq('id', logEntry.campaign_lead_id).in('send_status', ['sent', 'opened', 'sending']);
                }
                else if (eventType === 'email.bounced') {
                    await supabase.from('send_log').update({ status: 'bounced', error_message: eventData?.bounce?.message || 'Bounced' }).eq('id', logEntry.id);
                    await supabase.from('campaign_leads').update({ send_status: 'bounced', bounced_at: now })
                        .eq('id', logEntry.campaign_lead_id);
                    // Auto-suppress bounced email
                    await supabase.from('suppression_list').upsert({
                        id: generateId(), email: logEntry.email.toLowerCase(),
                        reason: 'bounced', suppressed_at: now,
                        source_campaign_id: logEntry.campaign_id,
                    }, { onConflict: 'email' });
                }
                else if (eventType === 'email.complained') {
                    await supabase.from('campaign_leads').update({ send_status: 'bounced', bounced_at: now })
                        .eq('id', logEntry.campaign_lead_id);
                    await supabase.from('suppression_list').upsert({
                        id: generateId(), email: logEntry.email.toLowerCase(),
                        reason: 'complained', suppressed_at: now,
                        source_campaign_id: logEntry.campaign_id,
                    }, { onConflict: 'email' });
                }

                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                console.error('Webhook processing error:', err);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // ========== AUTHENTICATED ROUTES ==========

    if (req.method === 'POST') {
        // Authenticate before processing
        if (!authenticate(req, res)) return;

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json');
            try {
                const payload = JSON.parse(body || '{}');
                const { action } = payload;

                // ============ EXISTING STRIPE ACTIONS ============

                if (action === 'create_product') {
                    const stripe = getStripeClient(payload.stripeApiKey);
                    const product = await stripe.products.create({
                        name: payload.name,
                        description: payload.description,
                    });
                    const price = await stripe.prices.create({
                        unit_amount: payload.amount,
                        currency: 'usd',
                        recurring: payload.type === 'recurring' ? { interval: 'month' } : undefined,
                        product: product.id,
                    });
                    res.end(JSON.stringify({ success: true, productId: product.id, priceId: price.id }));
                }
                else if (action === 'list_products') {
                    const stripe = getStripeClient(payload.stripeApiKey);
                    const products = await stripe.products.list({ active: true, expand: ['data.default_price'] });
                    res.end(JSON.stringify({ success: true, products: products.data }));
                }
                else if (action === 'create_payment_link') {
                    const stripe = getStripeClient(payload.stripeApiKey);
                    let priceId = payload.priceId;

                    if (!priceId) {
                        const rawAmount = payload.customProduct?.amount ?? payload.amount;
                        const amount = parseInt(Number(rawAmount));
                        const name = payload.customProduct?.name || payload.productName || `Payment for ${payload.companyName || payload.company}`;
                        const interval = payload.customProduct?.interval;

                        if (isNaN(amount) || amount <= 0) {
                            throw new Error(`Stripe rejected price creation: Invalid amount received (${rawAmount}). Amount must be a positive integer in cents.`);
                        }

                        try {
                            const price = await stripe.prices.create({
                                unit_amount: amount,
                                currency: 'usd',
                                recurring: interval ? { interval } : undefined,
                                product_data: { name }
                            });
                            priceId = price.id;
                        } catch (stripeErr) {
                            console.error("[STRIPE-ERROR] Price creation failed:", stripeErr.message);
                            throw new Error(`Stripe Price Creation Error: ${stripeErr.message}`);
                        }
                    }

                    const link = await stripe.paymentLinks.create({
                        line_items: [{ price: priceId, quantity: 1 }],
                        automatic_tax: { enabled: payload.automatic_tax || false },
                        allow_promotion_codes: payload.allow_promotion_codes || false,
                        phone_number_collection: { enabled: payload.collect_phone || false },
                        tax_id_collection: { enabled: payload.collect_tax_id || false },
                        billing_address_collection: payload.collect_address ? 'required' : 'auto',
                        submit_type: payload.submit_type || 'auto',
                        consent_collection: {
                            terms_of_service: payload.require_tos ? 'required' : undefined
                        },
                        after_payment: payload.after_payment_type === 'redirect' ? {
                            type: 'redirect',
                            redirect: { url: payload.redirect_url }
                        } : undefined,
                        restrictions: payload.payment_limit ? {
                            completed_sessions: { limit: parseInt(payload.payment_limit) }
                        } : undefined,
                        payment_intent_data: payload.save_payment_details ? {
                            setup_future_usage: 'off_session'
                        } : undefined,
                        custom_fields: payload.custom_fields && payload.custom_fields.length > 0 ? payload.custom_fields : undefined,
                        metadata: {
                            leadId: payload.leadId,
                            companyName: payload.companyName || payload.company,
                            collect_customer_name: payload.collect_customer_name ? 'true' : 'false',
                            collect_business_name: payload.collect_business_name ? 'true' : 'false'
                        }
                    });
                    res.end(JSON.stringify({ success: true, url: link.url }));
                }
                else if (action === 'list_payment_links') {
                    const stripe = getStripeClient(payload.stripeApiKey);
                    const links = await stripe.paymentLinks.list({ active: true, limit: 100, expand: ['data.line_items'] });
                    res.end(JSON.stringify({ success: true, links: links.data }));
                }
                else if (action === 'create_invoice') {
                    const stripe = getStripeClient(payload.stripeApiKey);
                    const { stripeCustomerId, amount, description, markPaid } = payload;

                    await stripe.invoiceItems.create({
                        customer: stripeCustomerId,
                        amount: amount,
                        currency: 'usd',
                        description: description
                    });

                    let invoice = await stripe.invoices.create({
                        customer: stripeCustomerId,
                        auto_advance: false,
                        collection_method: 'send_invoice',
                        days_until_due: 7
                    });

                    invoice = await stripe.invoices.finalizeInvoice(invoice.id);

                    if (markPaid) {
                        invoice = await stripe.invoices.pay(invoice.id, {
                            paid_out_of_band: true
                        });
                    } else {
                        invoice = await stripe.invoices.sendInvoice(invoice.id);
                    }

                    res.end(JSON.stringify({
                        success: true,
                        invoiceId: invoice.id,
                        invoiceUrl: invoice.hosted_invoice_url,
                        status: invoice.status
                    }));
                }
                else if (action === 'create_customer') {
                    const stripe = getStripeClient(payload.stripeApiKey);
                    const customer = await stripe.customers.create({
                        name: payload.name,
                        email: payload.email,
                        metadata: payload.metadata
                    });
                    res.end(JSON.stringify({ success: true, customerId: customer.id }));
                }
                else if (action === 'list_customers') {
                    const stripe = getStripeClient(payload.stripeApiKey);
                    const customers = await stripe.customers.list({ limit: 100 });
                    res.end(JSON.stringify({ success: true, customers: customers.data }));
                }
                else if (action === 'list_charges') {
                    const stripe = getStripeClient(payload.stripeApiKey);
                    const charges = await stripe.charges.list({ limit: 100 });
                    res.end(JSON.stringify({ success: true, charges: charges.data }));
                }
                else if (action === 'list_invoices') {
                    const stripe = getStripeClient(payload.stripeApiKey);
                    const invoices = await stripe.invoices.list({ limit: 100 });
                    res.end(JSON.stringify({ success: true, invoices: invoices.data }));
                }
                else if (action === 'list_subscriptions') {
                    const stripe = getStripeClient(payload.stripeApiKey);
                    const subs = await stripe.subscriptions.list({ limit: 100 });
                    res.end(JSON.stringify({ success: true, subscriptions: subs.data }));
                }
                else if (action === 'list_checkout_sessions') {
                    const stripe = getStripeClient(payload.stripeApiKey);
                    const sessions = await stripe.checkout.sessions.list({ limit: 100 });
                    res.end(JSON.stringify({ success: true, sessions: sessions.data }));
                }
                else if (action === 'send_email') {
                    if (!resend) {
                        res.statusCode = 500;
                        res.end(JSON.stringify({ success: false, error: 'RESEND_API_KEY not configured' }));
                        return;
                    }
                    const { to, subject, html } = payload;
                    try {
                        const data = await resend.emails.send({
                            from: `${RESEND_FROM_NAME} <${RESEND_FROM_EMAIL}>`,
                            to: [to],
                            subject: subject,
                            html: html
                        });
                        res.end(JSON.stringify({ success: true, data }));
                    } catch (error) {
                        res.statusCode = 500;
                        res.end(JSON.stringify({ success: false, error: error.message }));
                    }
                }

                // ============ OUTREACH ACTIONS ============

                else if (action === 'send_campaign_email') {
                    if (!resend) throw new Error('RESEND_API_KEY not configured');
                    if (!supabase) throw new Error('Supabase not configured on relay');

                    const { to, from_name, from_email, subject, html_body, reply_to, campaign_lead_id, campaign_id } = payload;

                    // Check suppression
                    const { data: suppressed } = await supabase.from('suppression_list').select('id').eq('email', to.toLowerCase()).limit(1);
                    if (suppressed && suppressed.length > 0) {
                        res.end(JSON.stringify({ success: false, error: 'Email is suppressed', suppressed: true }));
                        return;
                    }

                    // Create send_log entry
                    const sendLogId = generateId();

                    // Process body: convert plain text to minimal HTML for tracking, keep it looking like plain text
                    let processedHtml = html_body;
                    // If body doesn't contain HTML tags, convert plain text to minimal HTML
                    if (!/<[a-z][\s\S]*>/i.test(processedHtml.replace(/<br\s*\/?>/gi, ''))) {
                        processedHtml = processedHtml
                            .split('\n').join('<br>')
                            .replace(/\[BOOKING_LINK\]/gi, `<a href="[BOOKING_LINK]" style="color:#333;text-decoration:underline;">[BOOKING_LINK]</a>`);
                    }
                    processedHtml = wrapLinksForTracking(processedHtml, sendLogId, campaign_lead_id);
                    processedHtml = appendUnsubscribeLink(processedHtml, campaign_lead_id, to);
                    processedHtml = injectTrackingPixel(processedHtml, sendLogId);
                    // Wrap in minimal container that looks like plain text
                    processedHtml = `<div style="font-family:sans-serif;font-size:14px;color:#333;line-height:1.6;">${processedHtml}</div>`;

                    // Send via Resend
                    const emailResult = await resend.emails.send({
                        from: `${from_name || RESEND_FROM_NAME} <${from_email || RESEND_FROM_EMAIL}>`,
                        to: [to],
                        subject: subject,
                        html: processedHtml,
                        reply_to: reply_to || from_email || RESEND_FROM_EMAIL,
                        headers: {
                            'List-Unsubscribe': `<${TRACKING_BASE_URL}/unsubscribe?id=${campaign_lead_id}&email=${encodeURIComponent(to)}>`,
                        },
                    });

                    // Log the send
                    await supabase.from('send_log').insert({
                        id: sendLogId,
                        campaign_id: campaign_id,
                        campaign_lead_id: campaign_lead_id,
                        email: to,
                        resend_message_id: emailResult.data?.id || '',
                        status: 'sent',
                        batch_id: payload.batch_id || null,
                        sent_at: new Date().toISOString(),
                    });

                    // Update campaign_lead status
                    await supabase.from('campaign_leads').update({
                        send_status: 'sent',
                        sent_at: new Date().toISOString(),
                    }).eq('id', campaign_lead_id);

                    res.end(JSON.stringify({
                        success: true,
                        sendLogId,
                        resendMessageId: emailResult.data?.id,
                    }));
                }

                else if (action === 'send_batch') {
                    if (!resend) throw new Error('RESEND_API_KEY not configured');
                    if (!supabase) throw new Error('Supabase not configured on relay');

                    const { campaign_id, batch_size, lead_ids } = payload;
                    const batchId = generateId();

                    // Get campaign
                    const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', campaign_id).single();
                    if (!campaign) throw new Error('Campaign not found');
                    if (campaign.status !== 'active') throw new Error('Campaign is not active');

                    // Calculate warmup limit
                    let dailyLimit = campaign.daily_limit;
                    if (campaign.warmup_enabled) {
                        dailyLimit = Math.min(dailyLimit, getWarmupDailyLimit(campaign.warmup_day));
                    }

                    // Check how many already sent today
                    const todayStart = new Date();
                    todayStart.setHours(0, 0, 0, 0);
                    const { count: sentToday } = await supabase.from('send_log')
                        .select('id', { count: 'exact', head: true })
                        .eq('campaign_id', campaign_id)
                        .gte('sent_at', todayStart.toISOString());

                    const remaining = Math.max(0, dailyLimit - (sentToday || 0));
                    const actualBatchSize = Math.min(batch_size || remaining, remaining);

                    if (actualBatchSize <= 0) {
                        res.end(JSON.stringify({ success: true, sent: 0, message: 'Daily limit reached' }));
                        return;
                    }

                    // Check bounce rate — auto-pause if > 3%
                    const { count: totalSent } = await supabase.from('campaign_leads')
                        .select('id', { count: 'exact', head: true })
                        .eq('campaign_id', campaign_id)
                        .in('send_status', ['sent', 'opened', 'clicked', 'replied', 'bounced']);
                    const { count: totalBounced } = await supabase.from('campaign_leads')
                        .select('id', { count: 'exact', head: true })
                        .eq('campaign_id', campaign_id)
                        .eq('send_status', 'bounced');

                    if ((totalSent || 0) > 20) {
                        const bounceRate = ((totalBounced || 0) / (totalSent || 1)) * 100;
                        if (bounceRate > 3) {
                            await supabase.from('campaigns').update({ status: 'paused' }).eq('id', campaign_id);
                            res.end(JSON.stringify({ success: false, error: 'Campaign auto-paused: bounce rate exceeds 3%', bounceRate }));
                            return;
                        }
                    }

                    // Get suppression list emails
                    const { data: suppressedEmails } = await supabase.from('suppression_list').select('email');
                    const suppressedSet = new Set((suppressedEmails || []).map(s => s.email.toLowerCase()));

                    // Get next unsent leads
                    const { data: leadsToSend } = await supabase.from('campaign_leads')
                        .select('*')
                        .eq('campaign_id', campaign_id)
                        .eq('send_status', 'queued')
                        .order('website_score', { ascending: false })
                        .limit(actualBatchSize * 2); // fetch extra in case some are suppressed

                    if (!leadsToSend || leadsToSend.length === 0) {
                        res.end(JSON.stringify({ success: true, sent: 0, message: 'No queued leads' }));
                        return;
                    }

                    // Filter out suppressed
                    const eligibleLeads = leadsToSend.filter(l => !suppressedSet.has(l.email.toLowerCase()));

                    // Mark suppressed leads
                    const suppressedLeads = leadsToSend.filter(l => suppressedSet.has(l.email.toLowerCase()));
                    for (const sl of suppressedLeads) {
                        await supabase.from('campaign_leads').update({ send_status: 'suppressed' }).eq('id', sl.id);
                    }

                    let sentCount = 0;
                    const errors = [];

                    for (const lead of eligibleLeads.slice(0, actualBatchSize)) {
                        try {
                            // Mark as sending
                            await supabase.from('campaign_leads').update({ send_status: 'sending' }).eq('id', lead.id);

                            // Personalize template
                            // Prefer personalized copy if available
                            const subject = (lead.personalized_subject && lead.personalization_status === "done")
                                ? lead.personalized_subject
                                : personalizeMergeTags(campaign.subject_template, lead);
                            const htmlBody = (lead.personalized_body && lead.personalization_status === "done")
                                ? lead.personalized_body
                                : personalizeMergeTags(campaign.body_template, lead);



                            const sendLogId = generateId();

                            // Process HTML
                            let processedHtml = htmlBody;
                            processedHtml = wrapLinksForTracking(processedHtml, sendLogId, lead.id);
                            processedHtml = appendUnsubscribeLink(processedHtml, lead.id, lead.email);
                            processedHtml = injectTrackingPixel(processedHtml, sendLogId);

                            // Send
                            const emailResult = await resend.emails.send({
                                from: `${campaign.from_name || RESEND_FROM_NAME} <${campaign.from_email || RESEND_FROM_EMAIL}>`,
                                to: [lead.email],
                                subject: subject,
                                html: processedHtml,
                                reply_to: campaign.from_email || RESEND_FROM_EMAIL,
                                headers: {
                                    'List-Unsubscribe': `<${TRACKING_BASE_URL}/unsubscribe?id=${lead.id}&email=${encodeURIComponent(lead.email)}>`,
                                },
                            });

                            // Log
                            await supabase.from('send_log').insert({
                                id: sendLogId,
                                campaign_id: campaign_id,
                                campaign_lead_id: lead.id,
                                email: lead.email,
                                resend_message_id: emailResult.data?.id || '',
                                status: 'sent',
                                batch_id: batchId,
                                sent_at: new Date().toISOString(),
                            });

                            await supabase.from('campaign_leads').update({
                                send_status: 'sent',
                                sent_at: new Date().toISOString(),
                            }).eq('id', lead.id);

                            sentCount++;

                            // Stagger: 2 second gap between sends
                            if (sentCount < actualBatchSize) {
                                await sleep(2000);
                            }
                        } catch (sendErr) {
                            console.warn(`Failed to send to ${lead.email}:`, sendErr.message);
                            await supabase.from('campaign_leads').update({
                                send_status: 'failed',
                                error_message: sendErr.message,
                            }).eq('id', lead.id);
                            errors.push({ email: lead.email, error: sendErr.message });
                        }
                    }

                    res.end(JSON.stringify({
                        success: true,
                        batchId,
                        sent: sentCount,
                        suppressed: suppressedLeads.length,
                        errors: errors.length > 0 ? errors : undefined,
                    }));
                }

                else if (action === 'unsubscribe') {
                    if (!supabase) throw new Error('Supabase not configured on relay');

                    const { email, campaign_lead_id } = payload;
                    const now = new Date().toISOString();

                    // Add to suppression list
                    await supabase.from('suppression_list').upsert({
                        id: generateId(),
                        email: email.toLowerCase(),
                        reason: 'unsubscribed',
                        suppressed_at: now,
                        source_campaign_id: null,
                    }, { onConflict: 'email' });

                    // Update campaign_lead if provided
                    if (campaign_lead_id) {
                        await supabase.from('campaign_leads').update({
                            send_status: 'suppressed',
                        }).eq('id', campaign_lead_id);

                        // Log tracking event
                        await supabase.from('tracking_events').insert({
                            id: generateId(),
                            campaign_lead_id: campaign_lead_id,
                            event_type: 'unsubscribe',
                        });
                    }

                    res.end(JSON.stringify({ success: true }));
                }


                // ============ RESEARCH & PERSONALIZATION ACTIONS ============

                else if (action === 'research_website') {
                    if (!supabase) throw new Error('Supabase not configured on relay');
                    const { url, campaign_lead_id } = payload;

                    // Mark as crawling
                    await supabase.from('campaign_leads').update({ website_status: 'crawling' }).eq('id', campaign_lead_id);

                    const result = await researchWebsite(url, campaign_lead_id);

                    // Update the lead
                    await supabase.from('campaign_leads').update({
                        website_status: result.status,
                        website_score: result.score,
                        website_analysis: result.analysis,
                        research_completed_at: new Date().toISOString(),
                    }).eq('id', campaign_lead_id);

                    res.end(JSON.stringify({ success: true, score: result.score, status: result.status, analysis: result.analysis }));
                }

                else if (action === 'research_batch') {
                    if (!supabase) throw new Error('Supabase not configured on relay');
                    const { campaign_id, batch_size, lead_ids } = payload;
                    const size = batch_size || 50;

                    let leadsQuery = supabase.from('campaign_leads')
                        .select('*')
                        .eq('campaign_id', campaign_id);
                    if (lead_ids && lead_ids.length > 0) {
                        leadsQuery = leadsQuery.in('id', lead_ids);
                    } else {
                        leadsQuery = leadsQuery.eq('website_status', 'pending');
                    }
                    const { data: leads } = await leadsQuery.limit(size);

                    if (!leads || leads.length === 0) {
                        res.end(JSON.stringify({ success: true, researched: 0, message: 'No pending leads to research' }));
                        return;
                    }

                    // Respond immediately, process in background
                    res.end(JSON.stringify({ success: true, researched: leads.length, message: 'Processing ' + leads.length + ' leads in background' }));

                    // Background processing
                    (async () => {
                        let researched = 0;
                        for (const lead of leads) {
                            try {
                                await supabase.from('campaign_leads').update({ website_status: 'crawling' }).eq('id', lead.id);
                                // Run website research and email verification in parallel
                                const [result, emailResult] = await Promise.all([
                                    researchWebsite(lead.website, lead.id),
                                    verifyEmail(lead.email),
                                ]);
                                await supabase.from('campaign_leads').update({
                                    website_status: result.status,
                                    website_score: result.score,
                                    website_analysis: result.analysis,
                                    email_status: emailResult.status,
                                    email_valid: emailResult.valid,
                                    email_verification: emailResult,
                                    research_completed_at: new Date().toISOString(),
                                }).eq('id', lead.id);

                                // Auto-assign to score-based campaign
                                const updatedLead = { ...lead, website_status: result.status, website_score: result.score, website_analysis: result.analysis };
                                await autoAssignToScoreCampaign(updatedLead, result.score, supabase);

                                researched++;
                                if (researched < leads.length) await sleep(1000);
                            } catch (err) {
                                console.warn('Research failed for ' + lead.email + ':', err.message);
                                await supabase.from('campaign_leads').update({
                                    website_status: 'error', website_score: 6,
                                }).eq('id', lead.id);
                            }
                        }
                        console.log('[RESEARCH] Batch complete: ' + researched + '/' + leads.length + ' leads researched');
                    })();
                }

                else if (action === 'verify_emails_batch') {
                    if (!supabase) throw new Error('Supabase not configured on relay');
                    const { campaign_id, batch_size, reverify } = payload;
                    const size = batch_size || 200;

                    // Get leads that haven't been email-verified yet (or all if reverify)
                    let query = supabase.from('campaign_leads')
                        .select('id, email')
                        .eq('campaign_id', campaign_id);
                    if (!reverify) {
                        query = query.is('email_status', null);
                    }
                    const { data: leads } = await query.limit(size);

                    if (!leads || leads.length === 0) {
                        res.end(JSON.stringify({ success: true, verified: 0, message: 'No leads pending email verification' }));
                        return;
                    }

                    // Respond immediately, process in background
                    res.end(JSON.stringify({ success: true, verifying: leads.length, message: 'Verifying ' + leads.length + ' emails in background' }));

                    (async () => {
                        let verified = 0;
                        let valid = 0;
                        let invalid = 0;
                        for (const lead of leads) {
                            try {
                                const result = await verifyEmail(lead.email);
                                await supabase.from('campaign_leads').update({
                                    email_status: result.status,
                                    email_valid: result.valid,
                                    email_verification: result,
                                }).eq('id', lead.id);
                                if (result.valid) valid++;
                                else invalid++;
                                verified++;
                            } catch (err) {
                                console.warn('Email verify failed for ' + lead.email + ':', err.message);
                            }
                        }
                        console.log('[EMAIL-VERIFY] Batch complete: ' + verified + ' verified (' + valid + ' valid, ' + invalid + ' invalid)');
                    })();
                }

                else if (action === 'research_leads_batch') {
                    if (!supabase) throw new Error('Supabase not configured on relay');
                    const { batch_size } = payload;
                    const size = batch_size || 50;

                    // Get pending leads from the leads table directly
                    const { data: leads } = await supabase.from('leads')
                        .select('*')
                        .eq('website_status', 'pending')
                        .limit(size);

                    if (!leads || leads.length === 0) {
                        res.end(JSON.stringify({ success: true, researched: 0, message: 'No pending leads to research' }));
                        return;
                    }

                    // Respond immediately, process in background
                    res.end(JSON.stringify({ success: true, researched: leads.length, message: 'Processing ' + leads.length + ' leads in background' }));

                    // Background processing
                    (async () => {
                        let researched = 0;
                        for (const lead of leads) {
                            try {
                                await supabase.from('leads').update({ website_status: 'crawling' }).eq('id', lead.id);

                                // Run website research and email verification in parallel
                                const [result, emailResult] = await Promise.all([
                                    researchWebsite(lead.website, lead.id),
                                    verifyEmail(lead.email),
                                ]);

                                await supabase.from('leads').update({
                                    website_status: result.status,
                                    website_score: result.score,
                                    website_analysis: result.analysis,
                                    email_status: emailResult.status,
                                    email_valid: emailResult.valid,
                                    email_verification: emailResult,
                                    research_completed_at: new Date().toISOString(),
                                }).eq('id', lead.id);

                                // Also update campaign_leads if linked
                                await supabase.from('campaign_leads').update({
                                    website_status: result.status,
                                    website_score: result.score,
                                    website_analysis: result.analysis,
                                    email_status: emailResult.status,
                                    email_valid: emailResult.valid,
                                    email_verification: emailResult,
                                    research_completed_at: new Date().toISOString(),
                                }).eq('lead_id', lead.id);

                                researched++;
                                if (researched < leads.length) await sleep(1000);
                            } catch (err) {
                                console.warn('Research failed for ' + lead.email + ':', err.message);
                                await supabase.from('leads').update({
                                    website_status: 'error', website_score: 6,
                                }).eq('id', lead.id);
                            }
                        }
                        console.log('[RESEARCH-LEADS] Batch complete: ' + researched + '/' + leads.length + ' leads researched');
                    })();
                }

                else if (action === 'verify_leads_batch') {
                    if (!supabase) throw new Error('Supabase not configured on relay');
                    const { batch_size } = payload;
                    const size = batch_size || 200;

                    const { data: leads } = await supabase.from('leads')
                        .select('id, email')
                        .is('email_status', null)
                        .limit(size);

                    if (!leads || leads.length === 0) {
                        res.end(JSON.stringify({ success: true, verified: 0, message: 'No leads pending email verification' }));
                        return;
                    }

                    res.end(JSON.stringify({ success: true, verifying: leads.length, message: 'Verifying ' + leads.length + ' emails in background' }));

                    (async () => {
                        let verified = 0, valid = 0, invalid = 0;
                        for (const lead of leads) {
                            try {
                                const result = await verifyEmail(lead.email);
                                await supabase.from('leads').update({
                                    email_status: result.status,
                                    email_valid: result.valid,
                                    email_verification: result,
                                }).eq('id', lead.id);
                                if (result.valid) valid++; else invalid++;
                                verified++;
                            } catch (err) {
                                console.warn('Email verify failed for ' + lead.email + ':', err.message);
                            }
                        }
                        console.log('[VERIFY-LEADS] Batch complete: ' + verified + ' verified (' + valid + ' valid, ' + invalid + ' invalid)');
                    })();
                }

                else if (action === 'deep_verify_batch') {
                    if (!supabase) throw new Error('Supabase not configured');
                    if (!PERPLEXITY_API_KEY) throw new Error('PERPLEXITY_API_KEY not configured');
                    
                    const { batch_size, mode } = payload;
                    const size = batch_size || 20;
                    
                    // mode: 'websites' = find missing websites, 'emails' = verify suspicious emails
                    let query;
                    if (mode === 'emails') {
                        // Get leads with free provider emails or MX failures
                        query = supabase.from('leads')
                            .select('*')
                            .is('deep_verify_status', null)
                            .not('email_status', 'eq', 'business_email')
                            .not('website_status', 'eq', 'pending')
                            .limit(size);
                    } else {
                        // Default: find websites for leads marked as no_website or error
                        query = supabase.from('leads')
                            .select('*')
                            .is('deep_verify_status', null)
                            .in('website_status', ['no_website', 'error'])
                            .limit(size);
                    }
                    
                    const { data: leads } = await query;
                    
                    if (!leads || leads.length === 0) {
                        res.end(JSON.stringify({ success: true, verified: 0, message: 'No leads pending deep verification' }));
                        return;
                    }
                    
                    res.end(JSON.stringify({ success: true, verifying: leads.length, message: 'Deep verifying ' + leads.length + ' leads in background' }));
                    
                    (async () => {
                        let processed = 0;
                        let websitesFound = 0;
                        let emailsUpdated = 0;
                        
                        for (const lead of leads) {
                            try {
                                // Mark as processing
                                await supabase.from('leads').update({ deep_verify_status: 'pending' }).eq('id', lead.id);
                                
                                const result = await deepVerifyLead(lead);
                                
                                const update = {
                                    deep_verify_status: result.status,
                                    perplexity_verification: result,
                                    deep_verified_at: new Date().toISOString(),
                                    needs_review: result.needs_review || false,
                                    review_reason: result.review_reason || null,
                                };
                                
                                if (result.verified_website) {
                                    update.verified_website = result.verified_website;
                                    websitesFound++;
                                    
                                    // If lead had no website, update the main website field and re-crawl
                                    if (!lead.website || lead.website.trim() === '' || lead.website === 'N/A') {
                                        update.website = result.verified_website;
                                        update.website_status = 'pending'; // Will be re-crawled on next research run
                                    }
                                }
                                
                                if (result.verified_email) {
                                    update.verified_email = result.verified_email;
                                    if (result.verified_email.toLowerCase() !== lead.email.toLowerCase()) {
                                        emailsUpdated++;
                                    }
                                }
                                
                                await supabase.from('leads').update(update).eq('id', lead.id);
                                processed++;
                                
                                // Rate limit: ~1 request per second
                                if (processed < leads.length) await sleep(1200);
                                
                            } catch (err) {
                                console.warn('Deep verify failed for ' + lead.email + ':', err.message);
                                await supabase.from('leads').update({
                                    deep_verify_status: 'error',
                                    perplexity_verification: { error: err.message },
                                    deep_verified_at: new Date().toISOString(),
                                }).eq('id', lead.id);
                                processed++;
                            }
                        }
                        
                        console.log('[DEEP-VERIFY] Batch complete: ' + processed + ' processed, ' + websitesFound + ' websites found, ' + emailsUpdated + ' emails updated');
                    })();
                }

                else if (action === 'deep_verify_single') {
                    if (!supabase) throw new Error('Supabase not configured');
                    if (!PERPLEXITY_API_KEY) throw new Error('PERPLEXITY_API_KEY not configured');
                    
                    const { lead_id } = payload;
                    if (!lead_id) throw new Error('lead_id required');
                    
                    const { data: lead } = await supabase.from('leads').select('*').eq('id', lead_id).single();
                    if (!lead) throw new Error('Lead not found');
                    
                    await supabase.from('leads').update({ deep_verify_status: 'pending' }).eq('id', lead_id);
                    
                    const result = await deepVerifyLead(lead);
                    
                    const update = {
                        deep_verify_status: result.status,
                        perplexity_verification: result,
                        deep_verified_at: new Date().toISOString(),
                        needs_review: result.needs_review || false,
                        review_reason: result.review_reason || null,
                    };
                    
                    if (result.verified_website) {
                        update.verified_website = result.verified_website;
                        if (!lead.website || lead.website.trim() === '' || lead.website === 'N/A') {
                            update.website = result.verified_website;
                            update.website_status = 'pending';
                        }
                    }
                    if (result.verified_email) {
                        update.verified_email = result.verified_email;
                    }
                    
                    await supabase.from('leads').update(update).eq('id', lead_id);
                    
                    res.end(JSON.stringify({ success: true, result }));
                }


                else if (action === 'personalize_email') {
                    if (!supabase) throw new Error('Supabase not configured on relay');
                    const { campaign_lead_id, campaign_id } = payload;

                    // Fetch lead and campaign
                    const { data: lead } = await supabase.from('campaign_leads').select('*').eq('id', campaign_lead_id).single();
                    const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', campaign_id).single();

                    if (!lead || !campaign) throw new Error('Lead or campaign not found');

                    await supabase.from('campaign_leads').update({ personalization_status: 'generating' }).eq('id', campaign_lead_id);

                    // Try AI first, fall back to template
                    let result = null;
                    if (GEMINI_API_KEY) {
                        result = await personalizeWithGemini(lead, campaign, GEMINI_API_KEY);
                    }
                    if (!result) {
                        result = fallbackPersonalize(lead, campaign);
                    }

                    await supabase.from('campaign_leads').update({
                        personalized_subject: result.subject,
                        personalized_body: result.body,
                        personalization_status: 'done',
                    }).eq('id', campaign_lead_id);

                    res.end(JSON.stringify({ success: true, subject: result.subject, body: result.body }));
                }

                else if (action === 'personalize_batch') {
                    if (!supabase) throw new Error('Supabase not configured on relay');
                    const { campaign_id, batch_size, lead_ids } = payload;
                    const size = batch_size || 25;

                    // Get leads that are researched but not yet personalized
                    const { data: leads } = await supabase.from('campaign_leads')
                        .select('*')
                        .eq('campaign_id', campaign_id)
                        .in('website_status', ['crawled', 'no_website', 'error'])
                        .eq('personalization_status', 'pending')
                        .order('website_score', { ascending: false })
                        .limit(size);

                    if (!leads || leads.length === 0) {
                        res.end(JSON.stringify({ success: true, personalized: 0, message: 'No leads to personalize' }));
                        return;
                    }

                    const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', campaign_id).single();
                    if (!campaign) throw new Error('Campaign not found');

                    let personalized = 0, errors = 0;

                    for (const lead of leads) {
                        try {
                            await supabase.from('campaign_leads').update({ personalization_status: 'generating' }).eq('id', lead.id);

                            let result = null;
                            if (GEMINI_API_KEY) {
                                result = await personalizeWithGemini(lead, campaign, GEMINI_API_KEY);
                            }
                            if (!result) {
                                result = fallbackPersonalize(lead, campaign);
                            }

                            await supabase.from('campaign_leads').update({
                                personalized_subject: result.subject,
                                personalized_body: result.body,
                                personalization_status: 'done',
                            }).eq('id', lead.id);

                            personalized++;

                            // Stagger: 3 seconds for AI rate limits
                            if (personalized < leads.length) await sleep(3000);
                        } catch (err) {
                            console.warn(`Personalization failed for ${lead.email}:`, err.message);
                            await supabase.from('campaign_leads').update({ personalization_status: 'error' }).eq('id', lead.id);
                            errors++;
                        }
                    }

                    res.end(JSON.stringify({ success: true, personalized, errors }));
                }

                else if (action === 'get_warmup_limit') {
                    const { warmup_day, bounce_rate } = payload;
                    if ((bounce_rate || 0) > 3) {
                        res.end(JSON.stringify({ success: true, limit: 0, reason: 'Bounce rate exceeds 3%' }));
                        return;
                    }
                    const limit = getWarmupDailyLimit(warmup_day || 0);
                    res.end(JSON.stringify({ success: true, limit }));
                }

                else if (action === 'get_available_slots') {
                    // Returns available 30-min slots for next 14 days
                    // Uses Google Calendar free/busy API if configured, otherwise returns default slots
                    const GOOGLE_API_KEY = process.env.VITE_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;

                    const slots = [];
                    const now = new Date();

                    for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
                        const date = new Date(now);
                        date.setDate(date.getDate() + dayOffset);

                        // Skip weekends
                        const dow = date.getDay();
                        if (dow === 0 || dow === 6) continue;

                        // Generate 30-min slots from 9AM to 5PM EST
                        for (let hour = 9; hour < 17; hour++) {
                            for (let min = 0; min < 60; min += 30) {
                                const slotDate = new Date(date);
                                slotDate.setHours(hour, min, 0, 0);
                                slots.push({
                                    start: slotDate.toISOString(),
                                    end: new Date(slotDate.getTime() + 30 * 60000).toISOString(),
                                    available: true,
                                });
                            }
                        }
                    }

                    // If Google Calendar is available, check free/busy
                    if (GOOGLE_API_KEY && slots.length > 0) {
                        try {
                            const timeMin = slots[0].start;
                            const timeMax = slots[slots.length - 1].end;

                            const gcalRes = await fetch(`https://www.googleapis.com/calendar/v3/freeBusy?key=${GOOGLE_API_KEY}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    timeMin, timeMax,
                                    items: [{ id: GOOGLE_CALENDAR_ID }],
                                }),
                            });

                            if (gcalRes.ok) {
                                const gcalData = await gcalRes.json();
                                const busyPeriods = gcalData.calendars?.[GOOGLE_CALENDAR_ID]?.busy || [];

                                for (const slot of slots) {
                                    const slotStart = new Date(slot.start).getTime();
                                    const slotEnd = new Date(slot.end).getTime();
                                    for (const busy of busyPeriods) {
                                        const busyStart = new Date(busy.start).getTime();
                                        const busyEnd = new Date(busy.end).getTime();
                                        if (slotStart < busyEnd && slotEnd > busyStart) {
                                            slot.available = false;
                                            break;
                                        }
                                    }
                                }
                            }
                        } catch (gcalErr) {
                            console.warn('Google Calendar free/busy check failed:', gcalErr.message);
                        }
                    }

                    res.end(JSON.stringify({
                        success: true,
                        slots: slots.filter(s => s.available),
                    }));
                }

                else if (action === 'create_booking') {
                    if (!supabase) throw new Error('Supabase not configured on relay');

                    const { name, email, phone, companyName, campaignLeadId, scheduledAt } = payload;
                    const bookingId = generateId();
                    const now = new Date().toISOString();

                    let googleEventId = null;
                    let googleMeetLink = null;

                    // Try to create Google Calendar event (requires OAuth — simplified for now)
                    // In production, this would use googleapis with service account credentials
                    // For now, we create the booking without the calendar integration

                    // Create booking in DB
                    await supabase.from('bookings').insert({
                        id: bookingId,
                        campaign_lead_id: campaignLeadId || null,
                        lead_name: name,
                        lead_email: email,
                        lead_phone: phone || '',
                        scheduled_at: scheduledAt,
                        google_event_id: googleEventId,
                        google_meet_link: googleMeetLink,
                        status: 'confirmed',
                        source: 'cold_email',
                        created_at: now,
                    });

                    // Update campaign_lead engagement score if linked
                    if (campaignLeadId) {
                        const { data: leadData } = await supabase.from('campaign_leads')
                            .select('engagement_score').eq('id', campaignLeadId).single();
                        if (leadData) {
                            await supabase.from('campaign_leads').update({
                                engagement_score: (leadData.engagement_score || 0) + 20,
                            }).eq('id', campaignLeadId);
                        }
                    }

                    // Create session in ProviderOS
                    const sessionId = generateId();
                    await supabase.from('sessions').insert({
                        id: sessionId,
                        lead_client_id: campaignLeadId || bookingId,
                        session_type: 'Consultation',
                        scheduled_at: scheduledAt,
                        status: 'Scheduled',
                        meeting_link: googleMeetLink || '',
                    });

                    // Send confirmation email
                    if (resend) {
                        try {
                            const scheduledDate = new Date(scheduledAt);
                            const dateStr = scheduledDate.toLocaleDateString('en-US', {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                            });
                            const timeStr = scheduledDate.toLocaleTimeString('en-US', {
                                hour: 'numeric', minute: '2-digit', hour12: true,
                            });

                            await resend.emails.send({
                                from: `${RESEND_FROM_NAME} <${RESEND_FROM_EMAIL}>`,
                                to: [email],
                                subject: `Confirmed: Your consultation on ${dateStr}`,
                                html: `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:#121212;color:white;padding:30px;border-radius:16px;margin-bottom:20px;">
    <h1 style="margin:0;font-size:24px;">You're Booked!</h1>
  </div>
  <p>Hi ${name},</p>
  <p>Your 15-minute consultation has been confirmed:</p>
  <div style="background:#f5f5f7;padding:20px;border-radius:12px;margin:20px 0;">
    <p style="margin:0;font-weight:bold;font-size:18px;">${dateStr}</p>
    <p style="margin:4px 0 0;color:#666;font-size:16px;">${timeStr} EST</p>
    ${googleMeetLink ? `<p style="margin:12px 0 0;"><a href="${googleMeetLink}" style="color:#B8860B;font-weight:bold;">Join Google Meet</a></p>` : ''}
  </div>
  <p>Looking forward to chatting!</p>
  <p style="color:#666;">— John W Johnson, The Provider System</p>
</div>`,
                            });
                        } catch (emailErr) {
                            console.warn('Booking confirmation email failed:', emailErr.message);
                        }
                    }

                    res.end(JSON.stringify({
                        success: true,
                        bookingId,
                        sessionId,
                        googleMeetLink,
                    }));
                }

                else {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ success: false, error: 'Unknown action' }));
                }
            } catch (err) {
                console.error('Relay Error Detail:', err);
                res.statusCode = 500;
                const message = err.raw?.message || err.message || 'Unknown Backend Error';
                res.end(JSON.stringify({ success: false, error: `[RELAY] ${message}` }));
            }
        });
    } else if (req.method !== 'GET') {
        res.statusCode = 404;
        res.end();
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`ProviderOS Relay running at http://localhost:${PORT}`);
    console.log(`Auth: ${RELAY_AUTH_TOKEN ? 'ENABLED' : 'DISABLED (set RELAY_AUTH_TOKEN)'}`);
    console.log(`Stripe: ${STRIPE_API_KEY ? 'configured' : 'will use per-request key'}`);
    console.log(`Email: ${RESEND_API_KEY ? 'configured' : 'NOT configured'}`);
    console.log(`Perplexity: ${PERPLEXITY_API_KEY ? 'configured' : 'NOT configured'}`);
    console.log(`Supabase: ${supabase ? 'configured' : 'NOT configured (outreach features disabled)'}`);
    console.log(`Tracking URL: ${TRACKING_BASE_URL}`);
});
