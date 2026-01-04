import { google } from 'googleapis';
import fs from 'fs';

const SERVICE_ACCOUNT_FILE = './service-account.json';
const SPREADSHEET_ID = '12su-WYevjlOFO6v-SkmtXLhhQtWNByZBcuK-p4xNrd0';
const GOOGLE_KEY_VALUE = '699772bbd4006adba49a0fcb20cf21f0ab3f91a9';

if (!fs.existsSync(SERVICE_ACCOUNT_FILE)) {
    console.error('Service account file missing.');
    process.exit(1);
}

const credentials = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE));
const auth = google.auth.fromJSON(credentials);
auth.scopes = ['https://www.googleapis.com/auth/spreadsheets'];
const sheets = google.sheets({ version: 'v4', auth });

async function seed() {
    try {
        console.log('Seeding Master Google Key...');

        // 1. Fetch current CONFIG
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'CONFIG!A:D',
        });

        const rows = res.data.values || [];
        const index = rows.findIndex(r => r[0] === 'google_api_key');

        if (index >= 0) {
            rows[index][1] = GOOGLE_KEY_VALUE;
        } else {
            rows.push(['google_api_key', GOOGLE_KEY_VALUE, 'Google Sheets API Key (Read-only access)', 'System']);
        }

        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: 'CONFIG!A:D',
            valueInputOption: 'RAW',
            requestBody: { values: rows }
        });

        console.log('SUCCESS: Key persisted to Google Sheet.');
    } catch (err) {
        console.error('SEED ERROR:', err.message);
    }
}

seed();
