import { google } from 'googleapis';
import fs from 'fs';

const SERVICE_ACCOUNT_FILE = './service-account.json';
const SPREADSHEET_ID = '12su-WYevjlOFO6v-SkmtXLhhQtWNByZBcuK-p4xNrd0';

if (!fs.existsSync(SERVICE_ACCOUNT_FILE)) {
    console.error('Service account file missing.');
    process.exit(1);
}

const credentials = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE));
const auth = google.auth.fromJSON(credentials);
auth.scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const sheets = google.sheets({ version: 'v4', auth });

async function check() {
    const tabs = ['CLIENTS', 'PAYMENTS', 'CONFIG', 'METRICS'];
    try {
        for (const tab of tabs) {
            const res = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: `${tab}!A1:Z10`,
            });
            console.log(`TAB: ${tab}`);
            console.log('DATA:', JSON.stringify(res.data.values));
            console.log('-------------------');
        }
        console.log('DB_STATUS: OK');
    } catch (err) {
        console.error('DB_STATUS: ERROR');
        console.error('ERROR:', err.message);
    }
}

check();
