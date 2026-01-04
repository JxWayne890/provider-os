
/**
 * GOOGLE SHEETS SERVICE
 * 
 * Target Spreadsheet ID: 12su-WYevjlOFO6v-SkmtXLhhQtWNByZBcuK-p4xNrd0
 * 
 * Note: To connect to a private Google Sheet from a React frontend, 
 * we use the Google Sheets API v4. 
 */

const SPREADSHEET_ID = '12su-WYevjlOFO6v-SkmtXLhhQtWNByZBcuK-p4xNrd0';
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';

/**
 * FETCH LOGIC
 * Can be configured to hit Sheets API directly (Read-only) 
 * or n8n (Read/Write & Secure).
 */
export const fetchSheetData = async (tabName: string) => {
    let finalData: any[][] = [];

    // 1. Try n8n Proxy (Secure/Authenticated)
    if (N8N_WEBHOOK_URL) {
        try {
            const response = await fetch(`${N8N_WEBHOOK_URL}?action=fetch&tab=${tabName}`);
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data) && data.length > 0) {
                    finalData = data;
                }
            }
        } catch (e) {
            console.error("n8n Sync Error:", e);
        }
    }

    // 2. Fallback to Direct Google Sheets API (Read-only Public fallback)
    // Try environment variable OR local fallback
    const localConfig = JSON.parse(localStorage.getItem('OS_LOCAL_CONFIG') || '[]');
    const localGoogleKey = localConfig.find((r: any) => r[0] === 'google_api_key')?.[1];
    const activeKey = API_KEY || localGoogleKey;

    if (finalData.length === 0 && activeKey) {
        try {
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${tabName}!A2:Z?key=${activeKey}`;
            const response = await fetch(url);

            if (response.ok) {
                const data = await response.json();
                if (data.values && Array.isArray(data.values)) {
                    finalData = data.values;
                }
            } else {
                const errorBody = await response.json().catch(() => ({}));
                console.error(`Google Sheets API Error [${response.status}] for ${tabName}:`, errorBody.error?.message || response.statusText);

                if (response.status === 403 || response.status === 400) {
                    console.warn(`Potential invalid API Key detected: ${activeKey.substring(0, 5)}...`);
                }
            }
        } catch (error) {
            console.error(`Network error fetching sheet ${tabName}:`, error);
        }
    }

    // 3. Overlay Local Overrides (The Hybrid Persistence)
    try {
        const localData = JSON.parse(localStorage.getItem(`OS_LOCAL_${tabName}`) || '[]');
        if (Array.isArray(localData) && localData.length > 0) {
            localData.forEach((localRow: any) => {
                const id = localRow[0];
                const index = finalData.findIndex((r: any) => r[0] === id);
                if (index >= 0) {
                    finalData[index] = localRow;
                } else {
                    finalData.push(localRow);
                }
            });
        }
    } catch (e) {
        console.error("Local data merge error:", e);
    }

    // Return the best available data set
    return finalData.length > 0 ? finalData : [];
};

/**
 * WRITE LOGIC
 * Sends data to n8n which then handles the Google Sheets update.
 * This ensures credentials stay server-side.
 */
export const updateSheetRow = async (tabName: string, rowId: string, rowData: any) => {
    if (N8N_WEBHOOK_URL) {
        try {
            const response = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update',
                    tab: tabName,
                    id: rowId,
                    data: rowData
                })
            });

            if (!response.ok) throw new Error(`n8n responded with ${response.status}`);
            return true;
        } catch (e) {
            console.error("n8n Update Error:", e);
            return false;
        }
    } else {
        // Option 2: Local Persistence Fallback (Works without n8n)
        try {
            const storageKey = `OS_LOCAL_${tabName}`;
            const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');

            // Find if row exists by ID (index 0)
            const index = existing.findIndex((r: any) => r[0] === rowId);

            // Convert rowData object/array to Sheet format if needed
            // For CONFIG, we expect A, B, C, D
            let row = rowData;
            if (tabName === 'CONFIG') {
                row = [rowData['Setting Key'], rowData['Value'], rowData['Description'], rowData['Category']];
            } else if (!Array.isArray(rowData)) {
                // Generic conversion for other tabs if they provide objects
                row = Object.values(rowData);
            }

            if (index >= 0) {
                existing[index] = row;
            } else {
                existing.push(row);
            }

            localStorage.setItem(storageKey, JSON.stringify(existing));
            console.log(`Saved to local persistence: ${tabName}`);
            return true;
        } catch (e) {
            console.error("Local persistence error:", e);
            return false;
        }
    }
};

/**
 * STRIPE ACTIONS
 * Leverages n8n to perform authenticated Stripe operations.
 */
export const createStripePaymentLink = async (leadId: string, companyName: string, amount: number) => {
    if (!N8N_WEBHOOK_URL) {
        console.error("n8n Webhook URL not configured for Stripe actions.");
        return null;
    }

    try {
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create_payment_link',
                leadId,
                companyName,
                amount: amount * 100 // Stripe expects cents
            })
        });

        if (response.ok) {
            const data = await response.json();
            return data.url; // Expecting { url: 'https://buy.stripe.com/...' }
        }
        throw new Error(`n8n failed with status ${response.status}`);
    } catch (e) {
        console.error("Failed to create Stripe payment link:", e);
        return null;
    }
};

/**
 * Creates a new Stripe Product and Price.
 */
export const createStripeProduct = async (name: string, description: string, amount: number, type: 'one_time' | 'recurring') => {
    if (!N8N_WEBHOOK_URL) {
        console.error("n8n Webhook URL not configured for Stripe actions.");
        return null;
    }

    try {
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create_product',
                name,
                description,
                amount: amount * 100,
                type
            })
        });

        if (response.ok) {
            const data = await response.json();
            return data; // Expecting { productId: '...', priceId: '...', url: '...' }
        }
        throw new Error(`n8n failed with status ${response.status}`);
    } catch (e) {
        console.error("Failed to create Stripe product:", e);
        return null;
    }
};
