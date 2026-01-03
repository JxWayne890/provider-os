
import { google } from 'googleapis';
import fs from 'fs';

const SERVICE_ACCOUNT_FILE = './service-account.json';
const SPREADSHEET_ID = '12su-WYevjlOFO6v-SkmtXLhhQtWNByZBcuK-p4xNrd0';

const STRIPE_KEY = process.env.VITE_STRIPE_RESTRICTED_KEY || 'YOUR_STRIPE_RESTRICTED_KEY';
// Example: rk_live_...

async function main() {
    const auth = google.auth.fromJSON(JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE)));
    auth.scopes = ['https://www.googleapis.com/auth/spreadsheets'];
    const sheets = google.sheets({ version: 'v4', auth });

    try {
        console.log('Saving Stripe Key to CONFIG...');

        // We'll use update to set it specifically at A2:D2
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: 'CONFIG!A2:D2',
            valueInputOption: 'RAW',
            requestBody: {
                values: [[
                    'stripe_api_key',
                    STRIPE_KEY,
                    'Restricted API Key for Stripe data fetching',
                    'Integrations'
                ]]
            }
        });

        console.log('Success! Stripe key secured in CONFIG tab.');
    } catch (err) {
        console.error('Failed to save config:', err.message);
    }
}

main();
