
import Stripe from 'stripe';
import { google } from 'googleapis';
import fs from 'fs';

const SERVICE_ACCOUNT_FILE = './service-account.json';
const SPREADSHEET_ID = '12su-WYevjlOFO6v-SkmtXLhhQtWNByZBcuK-p4xNrd0';

async function main() {
    const googleAuth = google.auth.fromJSON(JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE)));
    googleAuth.scopes = ['https://www.googleapis.com/auth/spreadsheets'];
    const sheets = google.sheets({ version: 'v4', auth: googleAuth });

    const configRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'CONFIG!A2:B',
    });

    const configs = configRes.data.values || [];
    const stripeKeyItem = configs.find(c => c[0] === 'stripe_api_key');
    if (!stripeKeyItem) throw new Error('Stripe API Key not found in CONFIG tab.');
    const stripeKey = stripeKeyItem[1];

    const stripe = new Stripe(stripeKey);

    try {
        console.log('--- Starting GUEST-INCLUSIVE Stripe Ingestion ---');

        // 1. Fetch Customers
        let allCustomersMap = new Map();
        let hasMore = true;
        let lastId = null;
        while (hasMore) {
            const params = { limit: 100 };
            if (lastId) params.starting_after = lastId;
            const res = await stripe.customers.list(params);
            res.data.forEach(c => allCustomersMap.set(c.id, c));
            hasMore = res.has_more;
            if (res.data.length > 0) lastId = res.data[res.data.length - 1].id;
            else hasMore = false;
        }

        // 2. Fetch Charges (To find Guests)
        let allCharges = [];
        hasMore = true;
        lastId = null;
        while (hasMore) {
            const params = { limit: 100 };
            if (lastId) params.starting_after = lastId;
            const res = await stripe.charges.list(params);
            allCharges.push(...res.data);
            hasMore = res.has_more;
            if (res.data.length > 0) lastId = res.data[res.data.length - 1].id;
            else hasMore = false;
        }

        let guestClientsMap = new Map();
        allCharges.forEach(ch => {
            if (!ch.customer && ch.billing_details?.email) {
                const email = ch.billing_details.email;
                if (!guestClientsMap.has(email)) {
                    guestClientsMap.set(email, {
                        id: `guest_${ch.id}`,
                        email: email,
                        name: ch.billing_details.name || email.split('@')[0],
                        phone: ch.billing_details.phone || '',
                        created: ch.created
                    });
                }
            }
        });

        console.log(`Found ${allCustomersMap.size} Accounts and ${guestClientsMap.size} Guest customers.`);

        // 3. Combine into Client Rows
        const clientRows = [];

        // Add Accounts
        allCustomersMap.forEach(c => {
            clientRows.push([
                c.id,
                '',
                c.name || c.description || (c.email ? c.email.split('@')[0].toUpperCase() : 'ACCOUNT'),
                c.name || (c.email ? c.email.split('@')[0] : 'Unnamed'),
                c.email || '',
                c.phone || '',
                'Active',
                'Stripe account',
                'Monthly',
                0, 0,
                new Date(c.created * 1000).toISOString().split('T')[0],
                c.id,
                `Metadata: ${JSON.stringify(c.metadata)}`,
                95
            ]);
        });

        // Add Guests
        guestClientsMap.forEach(g => {
            clientRows.push([
                g.id,
                '',
                g.name.toUpperCase(),
                g.name,
                g.email,
                g.phone,
                'Active',
                'Stripe guest',
                'One-time',
                0, 0,
                new Date(g.created * 1000).toISOString().split('T')[0],
                '', // No Customer ID
                'Ingested from guest checkout',
                80
            ]);
        });

        // 4. Update CLIENTS Tab
        await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: 'CLIENTS!A2:O' });
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: 'CLIENTS!A2',
            valueInputOption: 'RAW',
            requestBody: { values: clientRows }
        });

        // 5. Update PAYMENTS Tab
        const paymentRows = allCharges.map(ch => {
            const customerId = ch.customer || (ch.billing_details?.email ? `guest_${ch.id}` : '');
            return [
                ch.id,
                customerId,
                ch.customer || '',
                ch.id,
                ch.amount / 100,
                ch.currency.toUpperCase(),
                'Charge',
                ch.paid ? 'Paid' : 'Pending',
                new Date(ch.created * 1000).toISOString().split('T')[0],
                ch.paid ? new Date(ch.created * 1000).toISOString().split('T')[0] : '',
                ch.receipt_url || '#',
                ch.description || `Payment from ${ch.billing_details?.name || 'Guest'}`
            ];
        });

        await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: 'PAYMENTS!A2:L' });
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: 'PAYMENTS!A2',
            valueInputOption: 'RAW',
            requestBody: { values: paymentRows }
        });

        console.log(`Success! Total CRM size: ${clientRows.length} clients.`);
        console.log('--- GUEST Sync Complete ---');
    } catch (err) {
        console.error('Migration failed:', err.message);
    }
}

main();
