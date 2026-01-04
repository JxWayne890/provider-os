
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
 * Uses Local Persistence (Works without external backend).
 */
export const updateSheetRow = async (tabName: string, rowId: string, rowData: any) => {
    try {
        const storageKey = `OS_LOCAL_${tabName}`;
        const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');

        // Find if row exists by ID (index 0)
        const index = existing.findIndex((r: any) => r[0] === rowId);

        // Convert rowData object/array to Sheet format if needed
        let row = rowData;
        if (tabName === 'CONFIG') {
            row = [rowData['Setting Key'], rowData['Value'], rowData['Description'], rowData['Category']];
        } else if (!Array.isArray(rowData)) {
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
};

/**
 * STRIPE ACTIONS
 */
export const createStripePaymentLink = async (leadId: string, companyName: string, amount: number) => {
    console.error("Cloud actions require a secure backend integration. Please configure your integration relay.");
    return null;
};

/**
 * Creates a new Stripe Product and Price.
 */
export const createStripeProduct = async (name: string, description: string, amount: number, type: 'one_time' | 'recurring') => {
    console.error("Cloud actions require a secure backend integration. Please configure your integration relay.");
    return null;
};
