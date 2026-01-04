
import http from 'http';
import { google } from 'googleapis';
import Stripe from 'stripe';
import fs from 'fs';

const PORT = 3001;
const SERVICE_ACCOUNT_FILE = './service-account.json';
const SPREADSHEET_ID = '12su-WYevjlOFO6v-SkmtXLhhQtWNByZBcuK-p4xNrd0';

async function getStripeClient() {
    const googleAuth = new google.auth.GoogleAuth({
        keyFile: SERVICE_ACCOUNT_FILE,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth: googleAuth });

    const configRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'CONFIG!A2:B',
    });

    const configs = configRes.data.values || [];
    const stripeKeyItem = configs.find(c => c[0] === 'stripe_api_key');
    if (!stripeKeyItem) throw new Error('Stripe API Key not found in CONFIG tab.');
    return new Stripe(stripeKeyItem[1]);
}

const server = http.createServer(async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
    }

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json');
            try {
                const payload = JSON.parse(body || '{}');
                const { action } = payload;

                const googleAuth = new google.auth.GoogleAuth({
                    keyFile: SERVICE_ACCOUNT_FILE,
                    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
                });
                const sheets = google.sheets({ version: 'v4', auth: googleAuth });

                if (action === 'update') {
                    const { tab, id, data } = payload;
                    // Find row by ID
                    const readRes = await sheets.spreadsheets.values.get({
                        spreadsheetId: SPREADSHEET_ID,
                        range: `${tab}!A:A`,
                    });
                    const rows = readRes.data.values || [];
                    const rowIndex = rows.findIndex(r => r[0] === id);

                    if (rowIndex === -1) {
                        // Append if not found
                        await sheets.spreadsheets.values.append({
                            spreadsheetId: SPREADSHEET_ID,
                            range: `${tab}!A:A`,
                            valueInputOption: 'USER_ENTERED',
                            requestBody: { values: [Array.isArray(data) ? data : Object.values(data)] }
                        });
                    } else {
                        // Update existing
                        await sheets.spreadsheets.values.update({
                            spreadsheetId: SPREADSHEET_ID,
                            range: `${tab}!A${rowIndex + 1}`,
                            valueInputOption: 'USER_ENTERED',
                            requestBody: { values: [Array.isArray(data) ? data : Object.values(data)] }
                        });
                    }
                    res.end(JSON.stringify({ success: true }));
                }
                else if (action === 'create_product') {
                    const stripe = await getStripeClient();
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
                    const stripe = await getStripeClient();
                    const products = await stripe.products.list({ active: true, expand: ['data.default_price'] });
                    res.end(JSON.stringify({ success: true, products: products.data }));
                }
                else if (action === 'create_payment_link') {
                    const stripe = await getStripeClient();
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
                            console.error("[STRIKE-ERROR] Price creation failed:", stripeErr.message);
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

                        // New Exact Replications
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
                else if (action === 'create_invoice') {
                    const stripe = await getStripeClient();
                    const { stripeCustomerId, amount, description, markPaid } = payload;

                    // 1. Create Invoice Item (The line item)
                    await stripe.invoiceItems.create({
                        customer: stripeCustomerId,
                        amount: amount,
                        currency: 'usd',
                        description: description
                    });

                    // 2. Create the Invoice
                    let invoice = await stripe.invoices.create({
                        customer: stripeCustomerId,
                        auto_advance: true,
                        collection_method: 'send_invoice',
                        days_until_due: 7
                    });

                    // 3. Finalize
                    invoice = await stripe.invoices.finalizeInvoice(invoice.id);

                    // 4. Mark as Paid if requested
                    if (markPaid) {
                        invoice = await stripe.invoices.pay(invoice.id, {
                            paid_out_of_band: true
                        });
                    }

                    res.end(JSON.stringify({
                        success: true,
                        invoiceId: invoice.id,
                        invoiceUrl: invoice.hosted_invoice_url,
                        status: invoice.status
                    }));
                }
                else if (action === 'create_customer') {
                    const stripe = await getStripeClient();
                    const customer = await stripe.customers.create({
                        name: payload.name,
                        email: payload.email,
                        metadata: payload.metadata
                    });
                    res.end(JSON.stringify({ success: true, customerId: customer.id }));
                }
                else {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ success: false, error: 'Unknown action' }));
                }
            } catch (err) {
                console.error('Relay Error Detail:', err);
                res.statusCode = 500;
                // Handle Stripe-specific error objects
                const message = err.raw?.message || err.message || 'Unknown Backend Error';
                res.end(JSON.stringify({ success: false, error: `[RELAY-V3] ${message}` }));
            }
        });
    } else {
        res.statusCode = 404;
        res.end();
    }
});

server.listen(PORT, () => {
    console.log(`🚀 ProviderOS Secure Relay running at http://localhost:${PORT}`);
    console.log(`Connected to Sheet: ${SPREADSHEET_ID}`);
});
