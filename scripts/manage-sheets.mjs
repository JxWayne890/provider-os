
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
        console.log('Authorizing...');
        await auth.authorize();
        console.log('Authorized! Fetching spreadsheet...');

        const res = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
        });

        const activeTabs = res.data.sheets.map(s => s.properties.title);
        console.log(`Connected! Existing tabs: ${activeTabs.join(', ')}`);

        const requiredTabs = ['LEADS', 'CLIENTS', 'DEALS', 'PAYMENTS', 'SESSIONS', 'PROJECTS', 'TASKS', 'AI_LOGS', 'METRICS', 'CONFIG'];
        const tabHeaders = {
            'LEADS': ['Lead ID', 'First Name', 'Last Name', 'Company', 'Role / Title', 'Email', 'Phone', 'Website', 'Source', 'Industry', 'Company Size', 'Pain Signals', 'Tech Stack', 'Lead Score', 'Qualification Status', 'Deal Stage', 'Outreach Email Draft', 'Outreach LinkedIn Draft', 'Next Action', 'Owner', 'Created Date', 'Last Touch Date'],
            'CLIENTS': ['Client ID', 'Linked Lead ID', 'Company Name', 'Primary Contact', 'Email', 'Phone', 'Client Status', 'Service Package', 'Billing Type', 'Monthly Value', 'Total Contract Value', 'Start Date', 'Stripe Customer ID', 'Notes', 'Client Health Score'],
            'DEALS': ['Deal ID', 'Lead ID', 'Client ID', 'Offer Name', 'Price', 'Payment Terms', 'Deal Stage', 'Proposal Link', 'Sent Date', 'Decision Date', 'Outcome'],
            'PAYMENTS': ['Payment ID', 'Client ID', 'Stripe Customer ID', 'Stripe Transaction ID', 'Amount', 'Currency', 'Payment Type', 'Status', 'Due Date', 'Paid Date', 'Stripe Link', 'Notes'],
            'SESSIONS': ['Session ID', 'Lead/Client ID', 'Session Type', 'Scheduled At', 'Status', 'Meeting Link', 'Recording Link', 'Transcript Link', 'AI Summary', 'AI Action Items', 'Follow-Up Email Draft'],
            'PROJECTS': ['Project ID', 'Client ID', 'Project Name', 'Scope Summary', 'Current Milestone', 'Status', 'Next Deliverable', 'Due Date', 'Risks / Blockers'],
            'TASKS': ['Task ID', 'Related ID', 'Task Description', 'Priority', 'Owner', 'Due Date', 'Status', 'Notes'],
            'AI_LOGS': ['Timestamp', 'Module', 'Action', 'AI Result'],
            'METRICS': ['Date', 'Total Revenue', 'Lead Count', 'Conversion Rate', 'Active Projects', 'Pending Tasks', 'Health Score'],
            'CONFIG': ['Setting Key', 'Value', 'Description', 'Category']
        };

        // Check for AI_LOGS
        if (!activeTabs.includes('AI_LOGS')) {
            console.log('Creating "AI_LOGS" tab...');
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                requestBody: {
                    requests: [{ addSheet: { properties: { title: 'AI_LOGS' } } }]
                }
            });
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: 'AI_LOGS!A1:D1',
                valueInputOption: 'RAW',
                requestBody: { values: [tabHeaders['AI_LOGS']] }
            });
            console.log('Success! "AI_LOGS" tab created.');
        }

        // Check for METRICS
        if (!activeTabs.includes('METRICS')) {
            console.log('Creating "METRICS" tab...');
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                requestBody: {
                    requests: [{ addSheet: { properties: { title: 'METRICS' } } }]
                }
            });
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: 'METRICS!A1:G1',
                valueInputOption: 'RAW',
                requestBody: {
                    values: [tabHeaders['METRICS']]
                }
            });
            console.log('Success! "METRICS" tab created.');
        }

        // Check for CONFIG
        if (!activeTabs.includes('CONFIG')) {
            console.log('Creating "CONFIG" tab...');
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                requestBody: {
                    requests: [{ addSheet: { properties: { title: 'CONFIG' } } }]
                }
            });
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: 'CONFIG!A1:D1',
                valueInputOption: 'RAW',
                requestBody: {
                    values: [tabHeaders['CONFIG']]
                }
            });
            console.log('Success! "CONFIG" tab created.');
        }

        console.log('Database check complete.');

    } catch (err) {
        console.error('Operation failed:', err.message);
    }
}

main();
