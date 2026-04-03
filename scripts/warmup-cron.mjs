/**
 * ProviderOS Warmup Cron Script
 * 
 * Run via: node scripts/warmup-cron.mjs
 * Or schedule with cron: 0 9 * * 1-5 cd /path/to/project && node scripts/warmup-cron.mjs
 * 
 * This script:
 * 1. Checks all active campaigns
 * 2. Calculates today's warmup limit
 * 3. Sends batches for each campaign
 * 4. Increments warmup_day
 */

import { createClient } from '@supabase/supabase-js';

const RELAY_URL = process.env.RELAY_URL || 'http://localhost:3001';
const RELAY_AUTH_TOKEN = process.env.RELAY_AUTH_TOKEN;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!RELAY_AUTH_TOKEN) {
    console.error('FATAL: RELAY_AUTH_TOKEN is not set');
    process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('FATAL: Supabase env vars not set');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function getWarmupDailyLimit(warmupDay) {
    if (warmupDay <= 3) return 20;
    if (warmupDay <= 7) return 50;
    if (warmupDay <= 14) return 100;
    if (warmupDay <= 21) return 200;
    return 500;
}

async function relayPost(payload) {
    const response = await fetch(RELAY_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RELAY_AUTH_TOKEN}`,
        },
        body: JSON.stringify(payload),
    });
    return response.json();
}

async function run() {
    const now = new Date();
    const dayOfWeek = now.getDay();

    console.log(`[${now.toISOString()}] Warmup cron starting...`);

    // Check if weekend
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Get all active campaigns
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'active');

    if (error) {
        console.error('Failed to fetch campaigns:', error);
        process.exit(1);
    }

    if (!campaigns || campaigns.length === 0) {
        console.log('No active campaigns found.');
        return;
    }

    console.log(`Found ${campaigns.length} active campaign(s)`);

    // Check monthly send total (safety: max 50,000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count: monthlyTotal } = await supabase
        .from('send_log')
        .select('id', { count: 'exact', head: true })
        .gte('sent_at', monthStart);

    if ((monthlyTotal || 0) >= 50000) {
        console.log(`Monthly limit reached: ${monthlyTotal}/50000. Skipping all campaigns.`);
        return;
    }

    console.log(`Monthly sends so far: ${monthlyTotal || 0}/50000`);

    for (const campaign of campaigns) {
        console.log(`\n--- Campaign: ${campaign.name} (${campaign.id}) ---`);

        // Skip if weekdays_only and it's a weekend
        if (campaign.weekdays_only && isWeekend) {
            console.log('  Skipping: weekdays only, today is weekend');
            continue;
        }

        // Calculate daily limit
        let dailyLimit = campaign.daily_limit;
        if (campaign.warmup_enabled) {
            const warmupLimit = getWarmupDailyLimit(campaign.warmup_day);
            dailyLimit = Math.min(dailyLimit, warmupLimit);
            console.log(`  Warmup day ${campaign.warmup_day}: limit ${warmupLimit}/day (campaign limit: ${campaign.daily_limit})`);
        }

        // Check bounce rate
        const { count: totalSent } = await supabase
            .from('campaign_leads')
            .select('id', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .in('send_status', ['sent', 'opened', 'clicked', 'replied', 'bounced']);

        const { count: totalBounced } = await supabase
            .from('campaign_leads')
            .select('id', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .eq('send_status', 'bounced');

        if ((totalSent || 0) > 20) {
            const bounceRate = ((totalBounced || 0) / (totalSent || 1)) * 100;
            if (bounceRate > 3) {
                console.log(`  AUTO-PAUSING: bounce rate ${bounceRate.toFixed(1)}% exceeds 3%`);
                await supabase.from('campaigns').update({ status: 'paused' }).eq('id', campaign.id);
                continue;
            }
            console.log(`  Bounce rate: ${bounceRate.toFixed(1)}%`);
        }

        // Check remaining monthly budget
        const remainingMonthly = 50000 - (monthlyTotal || 0);
        const effectiveLimit = Math.min(dailyLimit, remainingMonthly);

        if (effectiveLimit <= 0) {
            console.log('  Skipping: no remaining sends available');
            continue;
        }

        // Send batch
        console.log(`  Sending batch of up to ${effectiveLimit} emails...`);
        try {
            const result = await relayPost({
                action: 'send_batch',
                campaign_id: campaign.id,
                batch_size: effectiveLimit,
            });

            if (result.success) {
                console.log(`  Sent: ${result.sent}, Suppressed: ${result.suppressed || 0}`);
                if (result.errors?.length > 0) {
                    console.log(`  Errors: ${result.errors.length}`);
                }
            } else {
                console.error(`  Batch failed: ${result.error}`);
            }
        } catch (batchErr) {
            console.error(`  Batch error: ${batchErr.message}`);
        }

        // Increment warmup_day
        if (campaign.warmup_enabled) {
            await supabase.from('campaigns').update({
                warmup_day: campaign.warmup_day + 1,
                updated_at: new Date().toISOString(),
            }).eq('id', campaign.id);
            console.log(`  Warmup day incremented to ${campaign.warmup_day + 1}`);
        }

        // Check if all leads are done
        const { count: queuedCount } = await supabase
            .from('campaign_leads')
            .select('id', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .eq('send_status', 'queued');

        if ((queuedCount || 0) === 0) {
            console.log('  All leads processed — marking campaign as completed');
            await supabase.from('campaigns').update({
                status: 'completed',
                updated_at: new Date().toISOString(),
            }).eq('id', campaign.id);
        }
    }

    console.log(`\n[${new Date().toISOString()}] Warmup cron complete.`);
}

run().catch(err => {
    console.error('Warmup cron fatal error:', err);
    process.exit(1);
});
