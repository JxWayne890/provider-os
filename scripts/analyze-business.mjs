import { google } from 'googleapis';
import fs from 'fs';
import { GoogleGenerativeAI } from "@google/genai";

const SERVICE_ACCOUNT_FILE = './service-account.json';
const SPREADSHEET_ID = '12su-WYevjlOFO6v-SkmtXLhhQtWNByZBcuK-p4xNrd0';

// Note: Use an environment variable for the API Key
const GOOGLE_API_KEY = process.env.VITE_GOOGLE_API_KEY;

if (!fs.existsSync(SERVICE_ACCOUNT_FILE)) {
    console.error('Service account file missing.');
    process.exit(1);
}

const credentials = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE));

async function main() {
    if (!GOOGLE_API_KEY) {
        console.error('VITE_GOOGLE_API_KEY environment variable is missing.');
        process.exit(1);
    }

    const auth = google.auth.fromJSON(credentials);
    auth.scopes = ['https://www.googleapis.com/auth/spreadsheets'];
    const sheets = google.sheets({ version: 'v4', auth });

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    try {
        console.log('Initiating Business Audit...');

        // 1. Fetch all data
        const tabs = ['LEADS', 'CLIENTS', 'DEALS', 'PAYMENTS', 'SESSIONS', 'PROJECTS', 'CONFIG'];
        const data = {};

        for (const tab of tabs) {
            const res = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: `${tab}!A:Z`,
            });
            data[tab] = res.data.values || [];
        }

        // 2. Prepare context for AI
        const context = `
            Act as an elite business strategist and consultant (CEO Level). 
            Analyze the following business data for "The Provider's Business OS".
            
            LEADS: ${JSON.stringify(data['LEADS']?.slice(0, 15))}
            CLIENTS: ${JSON.stringify(data['CLIENTS']?.slice(0, 15))}
            PAYMENTS: ${JSON.stringify(data['PAYMENTS']?.slice(0, 15))}
            PROJECTS: ${JSON.stringify(data['PROJECTS']?.slice(0, 15))}
            METRICS: ${JSON.stringify(data['METRICS']?.slice(-5))}
            
            TASK: 
            Provide ONE high-fidelity, sophisticated "Executive Insight" (1-2 sentences).
            Format: Identify a risk or opportunity and recommend a specific action.
            Tone: Radiant, Neo-Editorial, Strategic.
            
            Note: Jacob Fidler, Bryan Bailey, and Arki Design Studio are recurring entities. Check their status.
        `;

        const result = await model.generateContent(context);
        const insight = result.response.text().trim().replace(/\*\*/g, ''); // Clean bolding for simpler display
        console.log('\n--- AI INSIGHT ---');
        console.log(insight);
        console.log('------------------\n');

        // 3. Calculate Health Score (Simple Alg: Revenue + Projects - Overdue)
        const totalRevenue = data['PAYMENTS'].reduce((sum, p) => p[7] === 'Paid' ? sum + parseFloat(p[4] || 0) : sum, 0);
        const activeProjects = data['PROJECTS'].filter(p => p[5] === 'Active').length;
        const currentScore = Math.min(100, Math.max(0, 70 + (activeProjects * 5) + (totalRevenue > 10000 ? 10 : 0)));

        // 4. Update CONFIG tab
        const configRows = data['CONFIG'] || [];
        const insightKeyIndex = configRows.findIndex(row => row[0] === 'latest_ai_insight');

        if (insightKeyIndex !== -1) {
            configRows[insightKeyIndex][1] = insight;
        } else {
            configRows.push(['latest_ai_insight', insight, 'Latest AI generated business audit', 'AI']);
        }

        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: 'CONFIG!A:D',
            valueInputOption: 'RAW',
            requestBody: { values: configRows }
        });

        // 5. Append to METRICS
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'METRICS!A:G',
            valueInputOption: 'RAW',
            requestBody: {
                values: [[
                    new Date().toISOString().split('T')[0],
                    totalRevenue,
                    data['LEADS'].length - 1,
                    ((data['CLIENTS'].length - 1) / (data['LEADS'].length - 1) * 100).toFixed(1),
                    activeProjects,
                    0, // Pending tasks placeholder
                    currentScore
                ]]
            }
        });

        // 6. Log to AI_LOGS
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'AI_LOGS!A:D',
            valueInputOption: 'RAW',
            requestBody: {
                values: [[new Date().toISOString(), 'INTELLIGENCE', 'AUDIT', insight]]
            }
        });

        console.log(`Intelligence logged. Business Health Score: ${currentScore}`);

    } catch (err) {
        console.error('Audit Failed:', err.message);
    }
}

main();
