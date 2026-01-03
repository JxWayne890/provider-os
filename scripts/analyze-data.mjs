
import { google } from 'googleapis';
import fs from 'fs';

const SERVICE_ACCOUNT_FILE = './service-account.json';
const SPREADSHEET_ID = '12su-WYevjlOFO6v-SkmtXLhhQtWNByZBcuK-p4xNrd0';

const credentials = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE));

async function main() {
    const auth = google.auth.fromJSON(credentials);
    auth.scopes = ['https://www.googleapis.com/auth/spreadsheets'];

    const sheets = google.sheets({ version: 'v4', auth });

    try {
        const res = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
        });

        const activeTabs = res.data.sheets.map(s => s.properties.title);
        console.log(`Analyzing: ${activeTabs.join(', ')}`);

        for (const tab of activeTabs) {
            const data = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: `${tab}!A1:Z5`,
            });
            console.log(`\n--- ${tab} ---`);
            if (data.data.values) {
                console.log(JSON.stringify(data.data.values, null, 2));
            } else {
                console.log('No data found.');
            }
        }

    } catch (err) {
        console.error('Operation failed:', err.message);
    }
}

main();
