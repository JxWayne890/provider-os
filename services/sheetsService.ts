
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
    // Option 1: n8n Proxy (Preferred for Security/Automation)
    if (N8N_WEBHOOK_URL) {
        try {
            const response = await fetch(`${N8N_WEBHOOK_URL}?action=fetch&tab=${tabName}`);
            return await response.json();
        } catch (e) {
            console.error("n8n Sync Error:", e);
        }
    }

    // --- MERGE LOCAL DATA ---
    let finalData = [];

    // Fallback to Direct Google Sheets API (Fallback/Read-only)
    if (API_KEY) {
        try {
            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${tabName}!A2:Z?key=${API_KEY}`
            );
            const data = await response.json();
            finalData = data.values || [];
        } catch (error) {
            console.error(`Error fetching sheet ${tabName}:`, error);
        }
    }

    // Overlay Local Overrides
    try {
        const localData = JSON.parse(localStorage.getItem(`OS_LOCAL_${tabName}`) || '[]');
        if (localData.length > 0) {
            localData.forEach((localRow: any) => {
                const id = localRow[0];
                const index = finalData.findIndex((r: any) => r[0] === id);
                if (index >= 0) finalData[index] = localRow;
                else finalData.push(localRow);
            });
        }
    } catch (e) {
        console.error("Local data merge error:", e);
    }

    return finalData.length > 0 ? finalData : null;
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
