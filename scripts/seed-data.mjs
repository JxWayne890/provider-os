
import { google } from 'googleapis';
import fs from 'fs';

const SERVICE_ACCOUNT_FILE = './service-account.json';
const SPREADSHEET_ID = '12su-WYevjlOFO6v-SkmtXLhhQtWNByZBcuK-p4xNrd0';

const INITIAL_LEADS = [
    { id: 'l1', firstName: 'Sarah', lastName: 'Chen', company: 'NextGen AI', role: 'CTO', email: 'sarah@nextgen.ai', phone: '+1-555-0123', website: 'nextgen.ai', source: 'LinkedIn', industry: 'Software', companySize: '50-100', painSignals: 'Scaling infrastructure, technical debt', techStack: 'React, Node, AWS', leadScore: 85, qualificationStatus: 'Qualified', dealStage: 'Call Booked', outreachEmailDraft: '', outreachLinkedInDraft: '', nextAction: 'Prepare discovery deck', owner: 'John', createdDate: '2023-11-20', lastTouchDate: '2023-11-25' },
    { id: 'l2', firstName: 'Marcus', lastName: 'Thorne', company: 'Thorne Logistics', role: 'Founder', email: 'marcus@thorne.logistics', phone: '+1-555-0124', website: 'thorne.logistics', source: 'Apollo', industry: 'Logistics', companySize: '10-20', painSignals: 'Inefficient manual routing', techStack: 'Excel, Gmail', leadScore: 42, qualificationStatus: 'Unqualified', dealStage: 'New', outreachEmailDraft: '', outreachLinkedInDraft: '', nextAction: 'Send case study', owner: 'John', createdDate: '2023-11-22', lastTouchDate: '2023-11-22' }
];

const INITIAL_CLIENTS = [
    { id: 'c1', leadId: 'l1', companyName: 'CyberDyne Systems', primaryContact: 'Miles Dyson', email: 'miles@cyberdyne.co', phone: '555-2029', status: 'Active', servicePackage: 'Enterprise Strategy', billingType: 'Retainer', monthlyValue: 5000, totalContractValue: 60000, startDate: '2023-08-01', stripeCustomerId: 'cus_P92x83', notes: 'Focus on scaling neural net ops.', healthScore: 92 },
    { id: 'c2', leadId: 'l3', companyName: 'Initech', primaryContact: 'Peter Gibbons', email: 'peter@initech.com', phone: '555-0199', status: 'At Risk', servicePackage: 'Modernization Audit', billingType: 'One-time', monthlyValue: 0, totalContractValue: 12000, startDate: '2023-10-15', stripeCustomerId: 'cus_M12p55', notes: 'Struggling with office motivation.', healthScore: 35 }
];

const INITIAL_DEALS = [
    { id: 'd1', leadId: 'l1', offerName: 'Enterprise AI Strategy', price: 15000, paymentTerms: '50% Upfront, 50% on Completion', stage: 'Proposal Sent', proposalLink: '#', sentDate: '2023-11-24', outcome: 'Pending' },
    { id: 'd2', leadId: 'l4', offerName: 'Backend Optimization', price: 8000, paymentTerms: 'Full Upfront', stage: 'Won', proposalLink: '#', sentDate: '2023-11-20', decisionDate: '2023-11-22', outcome: 'Won' }
];

const INITIAL_PAYMENTS = [
    { id: 'p1', clientId: 'c1', stripeCustomerId: 'cus_P92x83', stripeId: 'pi_3N9x123', amount: 5000, currency: 'USD', type: 'Subscription', status: 'Paid', dueDate: '2023-11-01', paidDate: '2023-11-02', stripeLink: '#', notes: '' },
    { id: 'p2', clientId: 'c2', stripeCustomerId: 'cus_M12p55', stripeId: 'pi_4K8z456', amount: 12000, currency: 'USD', type: 'One-time', status: 'Past Due', dueDate: '2023-11-15', stripeLink: '#', notes: 'Waiting for finance approval' }
];

const INITIAL_SESSIONS = [
    { id: 's1', participantId: 'l1', type: 'Discovery Call', scheduledAt: '2023-11-25T14:00:00Z', status: 'Completed', meetingLink: '#', recordingLink: '#', transcriptLink: '#', aiSummary: 'Client needs significant infrastructure scaling to handle new LLM loads. Expressed concern over current AWS bill.', aiActionItems: '1. Prepare case study on cost optimization\n2. Draft enterprise proposal by Friday', followUpEmailDraft: 'Hi Sarah, great meeting today...' }
];

const INITIAL_PROJECTS = [
    { id: 'pr1', clientId: 'c1', name: 'Neural Net Scale-up', scopeSummary: 'Re-architecting the core inference engine for 10x throughput.', currentMilestone: 'Phase 2: Load Balancing', status: 'In Progress', nextDeliverable: 'Inference Benchmarks', dueDate: '2023-12-15', risks: 'AWS quota limits might delay testing' }
];

const INITIAL_TASKS = [
    { id: 't1', relatedId: 'pr1', description: 'Review AWS Auto-scaling configuration', priority: 'High', owner: 'John', dueDate: '2023-11-28', status: 'In Progress', notes: '' },
    { id: 't2', relatedId: 'l1', description: 'Send enterprise proposal to Sarah', priority: 'Medium', owner: 'John', dueDate: '2023-11-26', status: 'Todo', notes: '' }
];

const INITIAL_METRICS = [
    { date: '2023-11-01', totalRevenue: 12000, leadCount: 45, conversionRate: 12, activeProjects: 5, pendingTasks: 12, healthScore: 85 },
    { date: '2023-11-08', totalRevenue: 14500, leadCount: 52, conversionRate: 14, activeProjects: 6, pendingTasks: 15, healthScore: 88 },
    { date: '2023-11-15', totalRevenue: 13800, leadCount: 48, conversionRate: 11, activeProjects: 6, pendingTasks: 10, healthScore: 82 },
    { date: '2023-11-22', totalRevenue: 16200, leadCount: 61, conversionRate: 15, activeProjects: 7, pendingTasks: 18, healthScore: 91 },
    { date: '2023-11-29', totalRevenue: 18500, leadCount: 72, conversionRate: 18, activeProjects: 8, pendingTasks: 22, healthScore: 94 },
];

async function main() {
    const auth = google.auth.fromJSON(JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE)));
    auth.scopes = ['https://www.googleapis.com/auth/spreadsheets'];
    const sheets = google.sheets({ version: 'v4', auth });

    try {
        console.log('Seeding LEADS...');
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID, range: 'LEADS!A2', valueInputOption: 'RAW',
            requestBody: { values: INITIAL_LEADS.map(l => [l.id, l.firstName, l.lastName, l.company, l.role, l.email, l.phone, l.website, l.source, l.industry, l.companySize, l.painSignals, l.techStack, l.leadScore, l.qualificationStatus, l.dealStage, l.outreachEmailDraft, l.outreachLinkedInDraft, l.nextAction, l.owner, l.createdDate, l.lastTouchDate]) }
        });

        console.log('Seeding CLIENTS...');
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID, range: 'CLIENTS!A2', valueInputOption: 'RAW',
            requestBody: { values: INITIAL_CLIENTS.map(c => [c.id, c.leadId, c.companyName, c.primaryContact, c.email, c.phone, c.status, c.servicePackage, c.billingType, c.monthlyValue, c.totalContractValue, c.startDate, c.stripeCustomerId, c.notes, c.healthScore]) }
        });

        console.log('Seeding DEALS...');
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID, range: 'DEALS!A2', valueInputOption: 'RAW',
            requestBody: { values: INITIAL_DEALS.map(d => [d.id, d.leadId, '', d.offerName, d.price, d.paymentTerms, d.stage, d.proposalLink, d.sentDate, d.decisionDate || '', d.outcome]) }
        });

        console.log('Seeding PAYMENTS...');
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID, range: 'PAYMENTS!A2', valueInputOption: 'RAW',
            requestBody: { values: INITIAL_PAYMENTS.map(p => [p.id, p.clientId, p.stripeCustomerId, p.stripeId, p.amount, p.currency, p.type, p.status, p.dueDate, p.paidDate || '', p.stripeLink, p.notes]) }
        });

        console.log('Seeding SESSIONS...');
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID, range: 'SESSIONS!A2', valueInputOption: 'RAW',
            requestBody: { values: INITIAL_SESSIONS.map(s => [s.id, s.participantId, s.type, s.scheduledAt, s.status, s.meetingLink, s.recordingLink, s.transcriptLink, s.aiSummary, s.aiActionItems, s.followUpEmailDraft]) }
        });

        console.log('Seeding PROJECTS...');
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID, range: 'PROJECTS!A2', valueInputOption: 'RAW',
            requestBody: { values: INITIAL_PROJECTS.map(pr => [pr.id, pr.clientId, pr.name, pr.scopeSummary, pr.currentMilestone, pr.status, pr.nextDeliverable, pr.dueDate, pr.risks]) }
        });

        console.log('Seeding TASKS...');
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID, range: 'TASKS!A2', valueInputOption: 'RAW',
            requestBody: { values: INITIAL_TASKS.map(t => [t.id, t.relatedId, t.description, t.priority, t.owner, t.dueDate, t.status, t.notes]) }
        });

        console.log('Seeding METRICS...');
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID, range: 'METRICS!A2', valueInputOption: 'RAW',
            requestBody: { values: INITIAL_METRICS.map(m => [m.date, m.totalRevenue, m.leadCount, m.conversionRate, m.activeProjects, m.pendingTasks, m.healthScore]) }
        });

        console.log('Migration Complete!');
    } catch (err) {
        console.error('Migration failed:', err.message);
    }
}

main();
