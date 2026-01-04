
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
const RELAY_URL = 'http://localhost:3001';

/**
 * FETCH LOGIC
 * Hits Sheets API directly (Read-only).
 */
export const fetchSheetData = async (tabName: string) => {
    let finalData: any[][] = [];

    // 1. Direct Google Sheets API (Read-only Public fallback)
    // Try environment variable OR local fallback
    const localConfig = JSON.parse(localStorage.getItem('OS_LOCAL_CONFIG') || '[]');
    const localGoogleKey = localConfig.find((r: any) => r[0] === 'google_api_key')?.[1];
    const activeKey = API_KEY || localGoogleKey;

    if (activeKey) {
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

    // 2. Overlay Local Overrides (The Hybrid Persistence)
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
 * Uses Local Relay (Secure) with Local Fallback.
 */
export const updateSheetRow = async (tabName: string, rowId: string, rowData: any) => {
    try {
        // 1. Try Local Relay (for Sheet Write-Back)
        const response = await fetch(RELAY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update',
                tab: tabName,
                id: rowId,
                data: rowData
            })
        });

        if (response.ok) return true;
        throw new Error("Relay unavailable");
    } catch (e) {
        // 2. Fallback to Local Persistence
        console.warn("Relay failed, falling back to local storage:", e);
        try {
            const storageKey = `OS_LOCAL_${tabName}`;
            const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const index = existing.findIndex((r: any) => r[0] === rowId);

            let row = rowData;
            if (tabName === 'CONFIG') {
                row = [rowData['Setting Key'], rowData['Value'], rowData['Description'], rowData['Category']];
            } else if (!Array.isArray(rowData)) {
                row = Object.values(rowData);
            }

            if (index >= 0) existing[index] = row;
            else existing.push(row);

            localStorage.setItem(storageKey, JSON.stringify(existing));
            return true;
        } catch (err) {
            console.error("Critical write failure:", err);
            return false;
        }
    }
};

/**
 * STRIPE ACTIONS
 */
export const createStripePaymentLink = async (leadId: string, companyName: string, amount: number, priceId?: string) => {
    try {
        const response = await fetch(RELAY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create_payment_link',
                leadId,
                companyName,
                amount: amount * 100,
                priceId
            })
        });

        if (response.ok) {
            const data = await response.json();
            return data.url;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server Error ${response.status}`);
    } catch (e: any) {
        console.error("Relay Connection Error:", e);
        throw e;
    }
};

/**
 * Creates a new Stripe Product and Price.
 */
export const createStripeProduct = async (name: string, description: string, amount: number, type: 'one_time' | 'recurring') => {
    try {
        const response = await fetch(RELAY_URL, {
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
            return data;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server Error ${response.status}`);
    } catch (e: any) {
        console.error("Relay Connection Error:", e);
        throw e;
    }
};

/**
 * Creates and optionally pays a Stripe Invoice.
 */
export const createStripeInvoice = async (stripeCustomerId: string, amount: number, description: string, markPaid: boolean) => {
    try {
        const response = await fetch(RELAY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create_invoice',
                stripeCustomerId,
                amount: amount * 100,
                description,
                markPaid
            })
        });

        if (response.ok) {
            const data = await response.json();
            return data;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server Error ${response.status}`);
    } catch (e: any) {
        console.error("Relay Connection Error:", e);
        throw e;
    }
};

/**
 * Creates a new Stripe Customer.
 */
export const createStripeCustomer = async (name: string, email: string, metadata?: any) => {
    try {
        const response = await fetch(RELAY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create_customer',
                name,
                email,
                metadata
            })
        });

        if (response.ok) {
            const data = await response.json();
            return data;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server Error ${response.status}`);
    } catch (e: any) {
        console.error("Relay Connection Error:", e);
        throw e;
    }
};

/**
 * Lists active Stripe products.
 */
export const listStripeProducts = async () => {
    try {
        const response = await fetch(RELAY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'list_products' })
        });

        if (response.ok) {
            const data = await response.json();
            return data.products || [];
        }
        throw new Error("Failed to fetch products");
    } catch (e) {
        console.error("Stripe Product List Error:", e);
        return [];
    }
};

/**
 * Creates a new Stripe Payment Link.
 */
export const createPaymentLink = async (options: {
    leadId: string;
    leadEmail: string;
    priceId?: string;
    customProduct?: {
        name: string;
        amount: number;
        interval?: string;
    };
    automatic_tax?: boolean;
    allow_promotion_codes?: boolean;
    collect_phone?: boolean;
    collect_address?: boolean;
    collect_tax_id?: boolean;
    collect_customer_name?: boolean;
    collect_business_name?: boolean;
    payment_limit?: string;
    require_tos?: boolean;
    save_payment_details?: boolean;
    submit_type?: 'pay' | 'book' | 'donate' | 'auto';
    custom_fields?: any[];
}) => {
    try {
        const response = await fetch(RELAY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create_payment_link',
                ...options
            })
        });

        if (response.ok) {
            const data = await response.json();
            return data;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server Error ${response.status}`);
    } catch (e: any) {
        console.error("Relay Connection Error:", e);
        throw e;
    }
};
