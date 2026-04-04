import { supabase } from './supabase';
import { Lead, Client, Deal, Payment, Session, Project, Task, Metric, ConfigItem, Contract, Campaign, CampaignLead, SuppressionEntry, SendLogEntry, TrackingEvent, Booking, CampaignStats, SendStatus, ResearchStats, PersonalizationStats, WebsiteAnalysis } from '../types';

const RELAY_URL = import.meta.env.VITE_RELAY_URL || 'https://api.theprovidersystem.com';
const RELAY_AUTH_TOKEN = import.meta.env.VITE_RELAY_AUTH_TOKEN || '';
if (!RELAY_AUTH_TOKEN) console.warn("[dataService] WARNING: VITE_RELAY_AUTH_TOKEN is not set. Relay calls will fail with 401.");

function relayHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${RELAY_AUTH_TOKEN}`,
  };
}

// ============================================================
// SUPABASE CRUD — Direct reads and writes, no relay needed
// ============================================================

// --- Column mapping helpers (camelCase <-> snake_case) ---

const leadToRow = (l: Lead) => ({
  id: l.id, first_name: l.firstName, last_name: l.lastName, company: l.company,
  role: l.role, email: l.email, phone: l.phone, website: l.website, source: l.source,
  industry: l.industry, company_size: l.companySize, pain_signals: l.painSignals,
  tech_stack: l.techStack, lead_score: l.leadScore, qualification_status: l.qualificationStatus,
  deal_stage: l.dealStage, outreach_email_draft: l.outreachEmailDraft,
  outreach_linkedin_draft: l.outreachLinkedInDraft, next_action: l.nextAction,
  owner: l.owner, created_date: l.createdDate, last_touch_date: l.lastTouchDate,
  stripe_payment_link: l.stripePaymentLink,
});

const rowToLead = (r: any): Lead => ({
  id: r.id, firstName: r.first_name, lastName: r.last_name, company: r.company,
  role: r.role, email: r.email, phone: r.phone, website: r.website, source: r.source,
  industry: r.industry, companySize: r.company_size, painSignals: r.pain_signals,
  techStack: r.tech_stack, leadScore: Number(r.lead_score) || 0,
  qualificationStatus: r.qualification_status || 'Unqualified',
  dealStage: r.deal_stage || 'New', outreachEmailDraft: r.outreach_email_draft,
  outreachLinkedInDraft: r.outreach_linkedin_draft, nextAction: r.next_action,
  owner: r.owner, createdDate: r.created_date, lastTouchDate: r.last_touch_date,
  stripePaymentLink: r.stripe_payment_link,
});

const clientToRow = (c: Client) => ({
  id: c.id, lead_id: c.leadId, company_name: c.companyName, primary_contact: c.primaryContact,
  email: c.email, phone: c.phone, status: c.status, service_package: c.servicePackage,
  billing_type: c.billingType, monthly_value: c.monthlyValue,
  total_contract_value: c.totalContractValue, start_date: c.startDate,
  stripe_customer_id: c.stripeCustomerId, notes: c.notes, health_score: c.healthScore,
});

const rowToClient = (r: any): Client => ({
  id: r.id, leadId: r.lead_id, companyName: r.company_name, primaryContact: r.primary_contact,
  email: r.email, phone: r.phone, status: r.status || 'Onboarding',
  servicePackage: r.service_package, billingType: r.billing_type,
  monthlyValue: Number(r.monthly_value) || 0, totalContractValue: Number(r.total_contract_value) || 0,
  startDate: r.start_date, stripeCustomerId: r.stripe_customer_id, notes: r.notes,
  healthScore: Number(r.health_score) || 0,
});

const dealToRow = (d: Deal) => ({
  id: d.id, lead_id: d.leadId, client_id: d.clientId, offer_name: d.offerName,
  price: d.price, payment_terms: d.paymentTerms, stage: d.stage,
  proposal_link: d.proposalLink, sent_date: d.sentDate, decision_date: d.decisionDate,
  outcome: d.outcome,
});

const rowToDeal = (r: any): Deal => ({
  id: r.id, leadId: r.lead_id, clientId: r.client_id, offerName: r.offer_name,
  price: Number(r.price) || 0, paymentTerms: r.payment_terms, stage: r.stage || 'New',
  proposalLink: r.proposal_link, sentDate: r.sent_date, decisionDate: r.decision_date,
  outcome: r.outcome || 'Pending',
});

const paymentToRow = (p: Payment) => ({
  id: p.id, client_id: p.clientId, stripe_customer_id: p.stripeCustomerId,
  stripe_id: p.stripeId, amount: p.amount, currency: p.currency, type: p.type,
  status: p.status, due_date: p.dueDate, paid_date: p.paidDate,
  stripe_link: p.stripeLink, notes: p.notes, project_id: p.projectId,
});

const rowToPayment = (r: any): Payment => ({
  id: r.id, clientId: r.client_id, stripeCustomerId: r.stripe_customer_id,
  stripeId: r.stripe_id, amount: Number(r.amount) || 0, currency: r.currency || 'usd',
  type: r.type, status: r.status, dueDate: r.due_date, paidDate: r.paid_date,
  stripeLink: r.stripe_link, notes: r.notes, projectId: r.project_id,
});

const sessionToRow = (s: Session) => ({
  id: s.id, lead_client_id: s.leadClientId, session_type: s.sessionType,
  scheduled_at: s.scheduledAt, status: s.status, meeting_link: s.meetingLink,
  recording_link: s.recordingLink, transcript_link: s.transcriptLink,
  ai_summary: s.aiSummary,
  ai_action_items: s.aiActionItems ? JSON.stringify(s.aiActionItems) : null,
  follow_up_email_draft: s.followUpEmailDraft,
});

const rowToSession = (r: any): Session => ({
  id: r.id, leadClientId: r.lead_client_id, sessionType: r.session_type,
  scheduledAt: r.scheduled_at, status: r.status || 'Scheduled',
  meetingLink: r.meeting_link, recordingLink: r.recording_link,
  transcriptLink: r.transcript_link, aiSummary: r.ai_summary,
  aiActionItems: r.ai_action_items
    ? (typeof r.ai_action_items === 'string' ? JSON.parse(r.ai_action_items) : r.ai_action_items)
    : undefined,
  followUpEmailDraft: r.follow_up_email_draft,
});

const projectToRow = (p: Project) => ({
  id: p.id, client_id: p.clientId, name: p.name, scope_summary: p.scopeSummary,
  current_milestone: p.currentMilestone, status: p.status,
  next_deliverable: p.nextDeliverable, due_date: p.dueDate, risks: p.risks,
});

const rowToProject = (r: any): Project => ({
  id: r.id, clientId: r.client_id, name: r.name, scopeSummary: r.scope_summary,
  currentMilestone: r.current_milestone, status: r.status || 'Planning',
  nextDeliverable: r.next_deliverable, dueDate: r.due_date, risks: r.risks,
});

const taskToRow = (t: Task) => ({
  id: t.id, related_id: t.relatedId, description: t.description,
  priority: t.priority, owner: t.owner, due_date: t.dueDate,
  status: t.status, notes: t.notes,
});

const rowToTask = (r: any): Task => ({
  id: r.id, relatedId: r.related_id, description: r.description,
  priority: r.priority || 'Medium', owner: r.owner, dueDate: r.due_date,
  status: r.status || 'Todo', notes: r.notes,
});

const rowToMetric = (r: any): Metric => ({
  date: r.date, revenue: Number(r.revenue) || 0, leads: Number(r.leads) || 0,
  conversionRate: Number(r.conversion_rate) || 0, activeProjects: Number(r.active_projects) || 0,
  pendingTasks: Number(r.pending_tasks) || 0, healthScore: Number(r.health_score) || 0,
});

const rowToConfig = (r: any): ConfigItem => ({
  key: r.key, settingKey: r.key, value: r.value, description: r.description, category: r.category,
});

const configToRow = (c: ConfigItem) => ({
  key: c.key, value: c.value, description: c.description, category: c.category,
});

const contractToRow = (c: Contract) => ({
  id: c.id, client_id: c.clientId, recipient_name: c.recipientName,
  recipient_email: c.recipientEmail, title: c.title, content: c.content,
  status: c.status, created_at: c.createdAt, sent_at: c.sentAt,
  signed_at: c.signedAt, signature_data: c.signatureData,
});

const rowToContract = (r: any): Contract => ({
  id: r.id, clientId: r.client_id, recipientName: r.recipient_name,
  recipientEmail: r.recipient_email, title: r.title, content: r.content,
  status: r.status || 'Draft', createdAt: r.created_at, sentAt: r.sent_at,
  signedAt: r.signed_at, signatureData: r.signature_data,
});

// --- Fetch functions ---

export async function fetchLeads(): Promise<Lead[]> {
  const { data, error } = await supabase.from('leads').select('*');
  if (error) { console.error('fetchLeads error:', error); return []; }
  return (data || []).map(rowToLead);
}

export async function fetchClients(): Promise<Client[]> {
  const { data, error } = await supabase.from('clients').select('*');
  if (error) { console.error('fetchClients error:', error); return []; }
  return (data || []).map(rowToClient);
}

export async function fetchDeals(): Promise<Deal[]> {
  const { data, error } = await supabase.from('deals').select('*');
  if (error) { console.error('fetchDeals error:', error); return []; }
  return (data || []).map(rowToDeal);
}

export async function fetchPayments(): Promise<Payment[]> {
  const { data, error } = await supabase.from('payments').select('*');
  if (error) { console.error('fetchPayments error:', error); return []; }
  return (data || []).map(rowToPayment);
}

export async function fetchSessions(): Promise<Session[]> {
  const { data, error } = await supabase.from('sessions').select('*');
  if (error) { console.error('fetchSessions error:', error); return []; }
  return (data || []).map(rowToSession);
}

export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase.from('projects').select('*');
  if (error) { console.error('fetchProjects error:', error); return []; }
  return (data || []).map(rowToProject);
}

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase.from('tasks').select('*');
  if (error) { console.error('fetchTasks error:', error); return []; }
  return (data || []).map(rowToTask);
}

export async function fetchMetrics(): Promise<Metric[]> {
  const { data, error } = await supabase.from('metrics').select('*');
  if (error) { console.error('fetchMetrics error:', error); return []; }
  return (data || []).map(rowToMetric);
}

export async function fetchConfigs(): Promise<ConfigItem[]> {
  const { data, error } = await supabase.from('config').select('*');
  if (error) { console.error('fetchConfigs error:', error); return []; }
  return (data || []).map(rowToConfig);
}

export async function fetchContracts(): Promise<Contract[]> {
  const { data, error } = await supabase.from('contracts').select('*');
  if (error) { console.error('fetchContracts error:', error); return []; }
  return (data || []).map(rowToContract);
}

// --- Upsert functions ---

export async function upsertLead(lead: Lead): Promise<boolean> {
  const { error } = await supabase.from('leads').upsert(leadToRow(lead));
  if (error) { console.error('upsertLead error:', error); return false; }
  return true;
}

export async function upsertClient(client: Client): Promise<boolean> {
  const { error } = await supabase.from('clients').upsert(clientToRow(client));
  if (error) { console.error('upsertClient error:', error); return false; }
  return true;
}

export async function upsertDeal(deal: Deal): Promise<boolean> {
  const { error } = await supabase.from('deals').upsert(dealToRow(deal));
  if (error) { console.error('upsertDeal error:', error); return false; }
  return true;
}

export async function upsertPayment(payment: Payment): Promise<boolean> {
  const { error } = await supabase.from('payments').upsert(paymentToRow(payment));
  if (error) { console.error('upsertPayment error:', error); return false; }
  return true;
}

export async function upsertSession(session: Session): Promise<boolean> {
  const { error } = await supabase.from('sessions').upsert(sessionToRow(session));
  if (error) { console.error('upsertSession error:', error); return false; }
  return true;
}

export async function upsertProject(project: Project): Promise<boolean> {
  const { error } = await supabase.from('projects').upsert(projectToRow(project));
  if (error) { console.error('upsertProject error:', error); return false; }
  return true;
}

export async function upsertTask(task: Task): Promise<boolean> {
  const { error } = await supabase.from('tasks').upsert(taskToRow(task));
  if (error) { console.error('upsertTask error:', error); return false; }
  return true;
}

export async function upsertConfig(config: ConfigItem): Promise<boolean> {
  const { error } = await supabase.from('config').upsert(configToRow(config));
  if (error) { console.error('upsertConfig error:', error); return false; }
  return true;
}

export async function upsertContract(contract: Contract): Promise<boolean> {
  const { error } = await supabase.from('contracts').upsert(contractToRow(contract));
  if (error) { console.error('upsertContract error:', error); return false; }
  return true;
}

// ============================================================
// RELAY — Stripe & Email (still needs server-side secrets)
// ============================================================

async function relayPost(payload: any): Promise<any> {
  // Debug: console.log("[RELAY]", payload.action);
  const response = await fetch(RELAY_URL, {
    method: 'POST',
    headers: relayHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server Error ${response.status}`);
  }
  return response.json();
}

export const createStripePaymentLink = async (leadId: string, companyName: string, amount: number, priceId?: string) => {
  const data = await relayPost({
    action: 'create_payment_link',
    leadId, companyName, amount: amount * 100, priceId,
  });
  return data.url;
};

export const createStripeProduct = async (name: string, description: string, amount: number, type: 'one_time' | 'recurring') => {
  return relayPost({ action: 'create_product', name, description, amount: amount * 100, type });
};

export const createStripeInvoice = async (stripeCustomerId: string, amount: number, description: string, markPaid: boolean) => {
  return relayPost({ action: 'create_invoice', stripeCustomerId, amount: amount * 100, description, markPaid });
};

export const createStripeCustomer = async (name: string, email: string, metadata?: any) => {
  return relayPost({ action: 'create_customer', name, email, metadata });
};

export const listStripeProducts = async () => {
  try {
    const data = await relayPost({ action: 'list_products' });
    return data.products || [];
  } catch (e) {
    console.warn("[Stripe] Products unavailable (relay offline?)");
    return [];
  }
};

export const createPaymentLink = async (options: {
  leadId: string;
  leadEmail: string;
  priceId?: string;
  customProduct?: { name: string; amount: number; interval?: string };
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
  return relayPost({ action: 'create_payment_link', ...options });
};

export const listPaymentLinks = async () => {
  try {
    const data = await relayPost({ action: 'list_payment_links' });
    return data.links || [];
  } catch (e) {
    console.error("Error listing payment links:", e);
    return [];
  }
};

export const sendEmail = async (to: string, subject: string, html: string) => {
  return relayPost({ action: 'send_email', to, subject, html });
};

export const sendContractEmail = async (to: string, recipientName: string, contractTitle: string, signingLink: string) => {
  const subject = `Signature Required: ${contractTitle}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1D1D1F;">Review & Sign Document</h2>
      <p>Hello ${recipientName},</p>
      <p>You have been sent a document for digital signature.</p>
      <div style="background-color: #F5F5F7; padding: 20px; border-radius: 10px; margin: 20px 0;">
        <strong>${contractTitle}</strong>
      </div>
      <p>Please click the button below to review and sign:</p>
      <a href="${signingLink}" style="display: inline-block; background-color: #1D1D1F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Review & Sign</a>
      <p style="margin-top: 30px; color: #888; font-size: 12px;">
        Link not working? Copy this URL:<br/>
        ${signingLink}
      </p>
    </div>
  `;
  return sendEmail(to, subject, html);
};

// ============================================================
// STRIPE SYNC — Pull live Stripe data into Supabase
// ============================================================

export const listStripeCustomers = async () => {
  try {
    const data = await relayPost({ action: 'list_customers' });
    return data.customers || [];
  } catch (e) {
    console.warn("[Stripe] Customers unavailable (relay offline?)");
    return [];
  }
};

export const listStripeCharges = async () => {
  try {
    const data = await relayPost({ action: 'list_charges' });
    return data.charges || [];
  } catch (e) {
    console.warn("[Stripe] Charges unavailable (relay offline?)");
    return [];
  }
};

export const listStripeInvoices = async () => {
  try {
    const data = await relayPost({ action: 'list_invoices' });
    return data.invoices || [];
  } catch (e) {
    console.warn("[Stripe] Invoices unavailable (relay offline?)");
    return [];
  }
};

export const listStripeSubscriptions = async () => {
  try {
    const data = await relayPost({ action: 'list_subscriptions' });
    return data.subscriptions || [];
  } catch (e) {
    console.warn("[Stripe] Subscriptions unavailable (relay offline?)");
    return [];
  }
};

export const getStripeBalance = async () => {
  try {
    const data = await relayPost({ action: 'get_balance' });
    return data.balance || null;
  } catch (e) {
    console.warn("[Stripe] Balance unavailable (relay offline?)");
    return null;
  }
};

/**
 * Syncs Stripe customers into the clients table and
 * Stripe charges/invoices into the payments table.
 * Returns the merged data for immediate use.
 */
function safeDate(ts: any): string {
  if (ts == null || typeof ts !== "number" || !isFinite(ts)) return new Date().toISOString().split("T")[0];
  try { const d = new Date(ts * 1000); return isNaN(d.getTime()) ? new Date().toISOString().split("T")[0] : d.toISOString().split("T")[0]; }
  catch { return new Date().toISOString().split("T")[0]; }
}

export async function syncStripeData(): Promise<{ clients: Client[], payments: Payment[] }> {
  console.log("[STRIPE-SYNC] Starting Stripe sync...");
  const [customers, charges, invoices, subscriptions] = await Promise.all([
    listStripeCustomers(),
    listStripeCharges(),
    listStripeInvoices(),
    listStripeSubscriptions(),
  ]);

  // Map Stripe customers → Client records
  const stripeClients: Client[] = customers.map((c: any) => ({
    id: c.metadata?.clientId || `stripe-${c.id}`,
    leadId: '',
    companyName: c.name || c.email || 'Unknown',
    primaryContact: c.name || '',
    email: c.email || '',
    phone: c.phone || '',
    status: 'Active' as any,
    servicePackage: '',
    billingType: 'One-time' as any,
    monthlyValue: 0,
    totalContractValue: 0,
    startDate: safeDate(c.created),
    stripeCustomerId: c.id,
    notes: `Synced from Stripe`,
    healthScore: 80,
  }));

  // Map Stripe charges → Payment records
  const chargePayments: Payment[] = charges
    .filter((ch: any) => ch.status === 'succeeded')
    .map((ch: any) => ({
      id: `ch-${ch.id}`,
      clientId: customers.find((c: any) => c.id === (typeof ch.customer === 'string' ? ch.customer : ch.customer?.id))?.metadata?.clientId || `stripe-${typeof ch.customer === 'string' ? ch.customer : ch.customer?.id || 'unknown'}`,
      stripeCustomerId: typeof ch.customer === 'string' ? ch.customer : ch.customer?.id || '',
      stripeId: ch.id,
      amount: ch.amount / 100,
      currency: ch.currency,
      type: 'One-time' as any,
      status: 'Paid' as any,
      dueDate: safeDate(ch.created),
      paidDate: safeDate(ch.created),
      stripeLink: ch.receipt_url || '',
      notes: ch.description || '',
    }));

  // Map Stripe invoices → Payment records
  const invoicePayments: Payment[] = invoices.map((inv: any) => ({
    id: `inv-${inv.id}`,
    clientId: customers.find((c: any) => c.id === (typeof inv.customer === 'string' ? inv.customer : inv.customer?.id))?.metadata?.clientId || `stripe-${typeof inv.customer === 'string' ? inv.customer : inv.customer?.id || 'unknown'}`,
    stripeCustomerId: typeof inv.customer === 'string' ? inv.customer : inv.customer?.id || '',
    stripeId: inv.id,
    amount: (inv.amount_paid || inv.total || 0) / 100,
    currency: inv.currency,
    type: 'Invoice' as any,
    status: inv.status === 'paid' ? 'Paid' : inv.status === 'open' ? 'Past Due' : 'Failed' as any,
    dueDate: safeDate(inv.due_date || inv.created),
    paidDate: inv.status_transitions?.paid_at ? safeDate(inv.status_transitions.paid_at) : undefined,
    stripeLink: inv.hosted_invoice_url || '',
    notes: inv.description || `Invoice ${inv.number || ''}`,
  }));

  // Map Stripe subscriptions → Payment records
  const subPayments: Payment[] = subscriptions.map((sub: any) => ({
    id: `sub-${sub.id}`,
    clientId: customers.find((c: any) => c.id === (typeof sub.customer === 'string' ? sub.customer : sub.customer?.id))?.metadata?.clientId || `stripe-${typeof sub.customer === 'string' ? sub.customer : sub.customer?.id || 'unknown'}`,
    stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id || '',
    stripeId: sub.id,
    amount: (sub.items?.data?.[0]?.price?.unit_amount || 0) / 100,
    currency: sub.currency,
    type: 'Subscription' as any,
    status: sub.status === 'active' ? 'Paid' : 'Past Due' as any,
    dueDate: safeDate(sub.current_period_start),
    paidDate: sub.status === 'active' ? safeDate(sub.current_period_start) : undefined,
    stripeLink: '',
    notes: `${sub.items?.data?.[0]?.price?.recurring?.interval || 'recurring'} subscription`,
  }));

  const allPayments = [...chargePayments, ...invoicePayments, ...subPayments];
  console.log("[STRIPE-SYNC] Results:", { customers: customers.length, charges: charges.length, invoices: invoices.length, subscriptions: subscriptions.length, mappedClients: stripeClients.length, mappedPayments: allPayments.length });

  // Upsert into Supabase for persistence
  await Promise.all([
    ...stripeClients.map(c => upsertClient(c)),
    ...allPayments.map(p => upsertPayment(p)),
  ]);

  return { clients: stripeClients, payments: allPayments };
}

// ============================================================
// GOOGLE CALENDAR — Fetch meetings via relay
// ============================================================

export interface CalendarEvent {
  id: string;
  summary: string;
  description: string;
  start: string;
  end: string;
  location: string;
  meetingLink: string;
  attendees: { email: string; name: string; status: string; self: boolean }[];
  status: string;
  htmlLink: string;
  organizer: string;
  conferenceType: string;
}

export const fetchUpcomingMeetings = async (calendarId?: string): Promise<CalendarEvent[]> => {
  try {
    const data = await relayPost({ action: 'list_calendar_events', calendarId: calendarId || 'theprovidersystem@gmail.com' });
    return data.events || [];
  } catch (e) {
    console.error("Calendar fetch error:", e);
    return [];
  }
};

export const fetchPastMeetings = async (calendarId?: string): Promise<CalendarEvent[]> => {
  try {
    const data = await relayPost({ action: 'list_calendar_events_past', calendarId: calendarId || 'theprovidersystem@gmail.com' });
    return data.events || [];
  } catch (e) {
    console.error("Past calendar fetch error:", e);
    return [];
  }
};

// ============================================================
// NEW FEATURES — Notifications, Proposals, Expenses, Attachments
// ============================================================


// --- Notification mappers ---
const notificationToRow = (n: Notification) => ({
  id: n.id, type: n.type, title: n.title, message: n.message,
  link: n.link, read: n.read, created_at: n.createdAt,
});
const rowToNotification = (r: any): Notification => ({
  id: r.id, type: r.type, title: r.title, message: r.message || '',
  link: r.link || '', read: r.read || false, createdAt: r.created_at,
});

export async function fetchNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
  if (error) { console.error('fetchNotifications error:', error); return []; }
  return (data || []).map(rowToNotification);
}

export async function upsertNotification(n: Notification): Promise<boolean> {
  const { error } = await supabase.from('notifications').upsert(notificationToRow(n));
  if (error) { console.error('upsertNotification error:', error); return false; }
  return true;
}

export async function markNotificationRead(id: string): Promise<boolean> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) { console.error('markNotificationRead error:', error); return false; }
  return true;
}

export async function markAllNotificationsRead(): Promise<boolean> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('read', false);
  if (error) { console.error('markAllNotificationsRead error:', error); return false; }
  return true;
}

// --- Proposal mappers ---
const proposalToRow = (p: Proposal) => ({
  id: p.id, client_id: p.clientId, title: p.title,
  line_items: JSON.stringify(p.lineItems), total: p.total, terms: p.terms,
  status: p.status, expires_at: p.expiresAt, created_at: p.createdAt,
  accepted_at: p.acceptedAt, proposal_url: p.proposalUrl,
});
const rowToProposal = (r: any): Proposal => ({
  id: r.id, clientId: r.client_id, title: r.title,
  lineItems: typeof r.line_items === 'string' ? JSON.parse(r.line_items) : (r.line_items || []),
  total: Number(r.total) || 0, terms: r.terms || '', status: r.status || 'Draft',
  expiresAt: r.expires_at || '', createdAt: r.created_at || '',
  acceptedAt: r.accepted_at, proposalUrl: r.proposal_url,
});

export async function fetchProposals(): Promise<Proposal[]> {
  const { data, error } = await supabase.from('proposals').select('*');
  if (error) { console.error('fetchProposals error:', error); return []; }
  return (data || []).map(rowToProposal);
}

export async function upsertProposal(p: Proposal): Promise<boolean> {
  const { error } = await supabase.from('proposals').upsert(proposalToRow(p));
  if (error) { console.error('upsertProposal error:', error); return false; }
  return true;
}

// --- Expense mappers ---
const expenseToRow = (e: Expense) => ({
  id: e.id, description: e.description, amount: e.amount,
  category: e.category, vendor: e.vendor, date: e.date,
  recurring: e.recurring, client_id: e.clientId, project_id: e.projectId,
  receipt_url: e.receiptUrl, created_at: e.createdAt,
});
const rowToExpense = (r: any): Expense => ({
  id: r.id, description: r.description, amount: Number(r.amount) || 0,
  category: r.category || 'Other', vendor: r.vendor || '', date: r.date || '',
  recurring: r.recurring || false, clientId: r.client_id, projectId: r.project_id,
  receiptUrl: r.receipt_url, createdAt: r.created_at || '',
});

export async function fetchExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase.from('expenses').select('*');
  if (error) { console.error('fetchExpenses error:', error); return []; }
  return (data || []).map(rowToExpense);
}

export async function upsertExpense(e: Expense): Promise<boolean> {
  const { error } = await supabase.from('expenses').upsert(expenseToRow(e));
  if (error) { console.error('upsertExpense error:', error); return false; }
  return true;
}

export async function deleteExpense(id: string): Promise<boolean> {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) { console.error('deleteExpense error:', error); return false; }
  return true;
}

// --- Attachment functions ---
const attachmentToRow = (a: Attachment) => ({
  id: a.id, file_name: a.fileName, file_url: a.fileUrl,
  file_size: a.fileSize, mime_type: a.mimeType,
  entity_type: a.entityType, entity_id: a.entityId, uploaded_at: a.uploadedAt,
});
const rowToAttachment = (r: any): Attachment => ({
  id: r.id, fileName: r.file_name, fileUrl: r.file_url,
  fileSize: Number(r.file_size) || 0, mimeType: r.mime_type || '',
  entityType: r.entity_type, entityId: r.entity_id, uploadedAt: r.uploaded_at || '',
});

export async function fetchAttachments(entityType?: string, entityId?: string): Promise<Attachment[]> {
  let query = supabase.from('attachments').select('*');
  if (entityType) query = query.eq('entity_type', entityType);
  if (entityId) query = query.eq('entity_id', entityId);
  const { data, error } = await query;
  if (error) { console.error('fetchAttachments error:', error); return []; }
  return (data || []).map(rowToAttachment);
}

export async function uploadFile(file: File, entityType: string, entityId: string): Promise<Attachment | null> {
  const fileExt = file.name.split('.').pop();
  const filePath = `${entityType}/${entityId}/${Date.now()}.${fileExt}`;
  
  const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, file);
  if (uploadError) { console.error('uploadFile error:', uploadError); return null; }

  const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(filePath);

  const attachment: Attachment = {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fileName: file.name,
    fileUrl: urlData.publicUrl,
    fileSize: file.size,
    mimeType: file.type,
    entityType: entityType as any,
    entityId,
    uploadedAt: new Date().toISOString(),
  };

  const { error } = await supabase.from('attachments').upsert(attachmentToRow(attachment));
  if (error) { console.error('save attachment error:', error); return null; }
  return attachment;
}

export async function deleteAttachment(id: string): Promise<boolean> {
  const { error } = await supabase.from('attachments').delete().eq('id', id);
  if (error) { console.error('deleteAttachment error:', error); return false; }
  return true;
}

// --- Calendar event creation (relay) ---
export const createCalendarEvent = async (summary: string, description: string, startTime: string, endTime: string, attendeeEmails: string[], calendarId?: string) => {
  return relayPost({
    action: 'create_calendar_event',
    calendarId: calendarId || 'theprovidersystem@gmail.com',
    summary, description, startTime, endTime, attendeeEmails,
  });
};


// ============================================================
// OUTREACH SYSTEM — CRUD for campaigns, leads, suppression, etc.
// ============================================================

// --- Row mappers ---

const campaignToRow = (c: Campaign) => ({
  id: c.id, name: c.name, subject_template: c.subjectTemplate,
  body_template: c.bodyTemplate, from_name: c.fromName, from_email: c.fromEmail,
  status: c.status, daily_limit: c.dailyLimit, send_time: c.sendTime,
  weekdays_only: c.weekdaysOnly, warmup_enabled: c.warmupEnabled,
  warmup_day: c.warmupDay, created_at: c.createdAt, updated_at: c.updatedAt,
});

const rowToCampaign = (r: any): Campaign => ({
  id: r.id, name: r.name, subjectTemplate: r.subject_template || '',
  bodyTemplate: r.body_template || '', fromName: r.from_name || 'John W Johnson',
  fromEmail: r.from_email || 'john@go.theprovidersystem.com',
  status: r.status || 'draft', dailyLimit: Number(r.daily_limit) || 50,
  sendTime: r.send_time || '09:00', weekdaysOnly: r.weekdays_only ?? true,
  warmupEnabled: r.warmup_enabled ?? true, warmupDay: Number(r.warmup_day) || 0,
  createdAt: r.created_at, updatedAt: r.updated_at,
});

const campaignLeadToRow = (cl: CampaignLead) => ({
  id: cl.id, campaign_id: cl.campaignId, email: cl.email,
  company_name: cl.companyName, city: cl.city, state: cl.state,
  country: cl.country, website: cl.website,
  verification_status: cl.verificationStatus, send_status: cl.sendStatus,
  engagement_score: cl.engagementScore, sent_at: cl.sentAt,
  opened_at: cl.openedAt, clicked_at: cl.clickedAt, replied_at: cl.repliedAt,
  bounced_at: cl.bouncedAt, error_message: cl.errorMessage, created_at: cl.createdAt,
  website_status: cl.websiteStatus, website_score: cl.websiteScore,
  website_analysis: cl.websiteAnalysis,
  personalized_subject: cl.personalizedSubject, personalized_body: cl.personalizedBody,
  personalization_status: cl.personalizationStatus,
  research_completed_at: cl.researchCompletedAt, priority_rank: cl.priorityRank,
  email_status: cl.emailStatus, email_valid: cl.emailValid, email_verification: cl.emailVerification,
});










const rowToCampaignLead = (r: any): CampaignLead => ({
  id: r.id, campaignId: r.campaign_id, email: r.email,
  companyName: r.company_name || '', city: r.city || '', state: r.state || '',
  country: r.country || '', website: r.website || '',
  verificationStatus: r.verification_status || 'unknown',
  sendStatus: r.send_status || 'queued',
  engagementScore: Number(r.engagement_score) || 0,
  sentAt: r.sent_at, openedAt: r.opened_at, clickedAt: r.clicked_at,
  repliedAt: r.replied_at, bouncedAt: r.bounced_at, errorMessage: r.error_message,
  createdAt: r.created_at,
  websiteStatus: r.website_status || 'pending',
  websiteScore: Number(r.website_score) || 0,
  websiteAnalysis: r.website_analysis || {},
  personalizedSubject: r.personalized_subject,
  personalizedBody: r.personalized_body,
  personalizationStatus: r.personalization_status || 'pending',
  researchCompletedAt: r.research_completed_at,
  priorityRank: Number(r.priority_rank) || 0,
  emailStatus: r.email_status,
  emailValid: r.email_valid,
  emailVerification: r.email_verification || undefined,
});












const suppressionToRow = (s: SuppressionEntry) => ({
  id: s.id, email: s.email, reason: s.reason,
  suppressed_at: s.suppressedAt, source_campaign_id: s.sourceCampaignId,
});

const rowToSuppression = (r: any): SuppressionEntry => ({
  id: r.id, email: r.email, reason: r.reason,
  suppressedAt: r.suppressed_at, sourceCampaignId: r.source_campaign_id,
});

const rowToSendLog = (r: any): SendLogEntry => ({
  id: r.id, campaignId: r.campaign_id, campaignLeadId: r.campaign_lead_id,
  email: r.email, resendMessageId: r.resend_message_id, status: r.status,
  batchId: r.batch_id, sentAt: r.sent_at, openedAt: r.opened_at,
  clickedAt: r.clicked_at, errorMessage: r.error_message,
});

const rowToTrackingEvent = (r: any): TrackingEvent => ({
  id: r.id, sendLogId: r.send_log_id, campaignLeadId: r.campaign_lead_id,
  eventType: r.event_type, linkUrl: r.link_url, userAgent: r.user_agent,
  ipAddress: r.ip_address, createdAt: r.created_at,
});

const rowToBooking = (r: any): Booking => ({
  id: r.id, campaignLeadId: r.campaign_lead_id, leadName: r.lead_name,
  leadEmail: r.lead_email, leadPhone: r.lead_phone || '',
  scheduledAt: r.scheduled_at, googleEventId: r.google_event_id,
  googleMeetLink: r.google_meet_link, status: r.status || 'confirmed',
  source: r.source || 'cold_email', createdAt: r.created_at,
});

// --- Campaigns ---

export async function fetchCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
  if (error) { console.error('fetchCampaigns error:', error); return []; }
  return (data || []).map(rowToCampaign);
}

export async function fetchCampaign(id: string): Promise<Campaign | null> {
  const { data, error } = await supabase.from('campaigns').select('*').eq('id', id).single();
  if (error) { console.error('fetchCampaign error:', error); return null; }
  return data ? rowToCampaign(data) : null;
}

export async function upsertCampaign(campaign: Campaign): Promise<boolean> {
  const { error } = await supabase.from('campaigns').upsert(campaignToRow(campaign));
  if (error) { console.error('upsertCampaign error:', error); return false; }
  return true;
}

export async function deleteCampaign(id: string): Promise<boolean> {
  const { error } = await supabase.from('campaigns').delete().eq('id', id);
  if (error) { console.error('deleteCampaign error:', error); return false; }
  return true;
}

// --- Campaign Leads ---

export async function fetchCampaignLeads(campaignId: string): Promise<CampaignLead[]> {
  const PAGE_SIZE = 1000;
  let allRows: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from('campaign_leads').select('*').eq('campaign_id', campaignId).range(from, from + PAGE_SIZE - 1);
    if (error) { console.error('fetchCampaignLeads error:', error); break; }
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return allRows.map(rowToCampaignLead);
}

export async function fetchAllCampaignLeads(): Promise<CampaignLead[]> {
  const PAGE_SIZE = 1000;
  let allRows: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from('campaign_leads').select('*').order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
    if (error) { console.error('fetchAllCampaignLeads error:', error); break; }
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return allRows.map(rowToCampaignLead);
}

export async function upsertCampaignLead(lead: CampaignLead): Promise<boolean> {
  const { error } = await supabase.from('campaign_leads').upsert(campaignLeadToRow(lead));
  if (error) { console.error('upsertCampaignLead error:', error); return false; }
  return true;
}

export async function bulkInsertCampaignLeads(leads: CampaignLead[]): Promise<{ inserted: number; skipped: number }> {
  const rows = leads.map(campaignLeadToRow);
  const BATCH_SIZE = 500;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('campaign_leads').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.warn(`bulkInsert batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
      skipped += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, skipped };
}

export async function deleteCampaignLead(id: string): Promise<boolean> {
  const { error } = await supabase.from('campaign_leads').delete().eq('id', id);
  if (error) { console.error('deleteCampaignLead error:', error); return false; }
  return true;
}

// --- Suppression List ---

export async function fetchSuppressionList(): Promise<SuppressionEntry[]> {
  const { data, error } = await supabase.from('suppression_list').select('*').order('suppressed_at', { ascending: false });
  if (error) { console.error('fetchSuppressionList error:', error); return []; }
  return (data || []).map(rowToSuppression);
}

export async function isEmailSuppressed(email: string): Promise<boolean> {
  const { data, error } = await supabase.from('suppression_list').select('id').eq('email', email.toLowerCase()).limit(1);
  if (error) { console.error('isEmailSuppressed error:', error); return true; } // fail safe: treat as suppressed
  return (data || []).length > 0;
}

export async function addToSuppressionList(entry: SuppressionEntry): Promise<boolean> {
  const { error } = await supabase.from('suppression_list').upsert(suppressionToRow(entry), { onConflict: 'email' });
  if (error) { console.error('addToSuppressionList error:', error); return false; }
  return true;
}

export async function removeFromSuppressionList(email: string): Promise<boolean> {
  const { error } = await supabase.from('suppression_list').delete().eq('email', email.toLowerCase());
  if (error) { console.error('removeFromSuppressionList error:', error); return false; }
  return true;
}

// --- Send Log ---

export async function fetchSendLogs(campaignId: string): Promise<SendLogEntry[]> {
  const { data, error } = await supabase.from('send_log').select('*').eq('campaign_id', campaignId).order('sent_at', { ascending: false });
  if (error) { console.error('fetchSendLogs error:', error); return []; }
  return (data || []).map(rowToSendLog);
}

// --- Tracking Events ---

export async function fetchTrackingEvents(campaignLeadId?: string, limit = 50): Promise<TrackingEvent[]> {
  let query = supabase.from('tracking_events').select('*').order('created_at', { ascending: false }).limit(limit);
  if (campaignLeadId) query = query.eq('campaign_lead_id', campaignLeadId);
  const { data, error } = await query;
  if (error) { console.error('fetchTrackingEvents error:', error); return []; }
  return (data || []).map(rowToTrackingEvent);
}

export async function fetchRecentTrackingEvents(limit = 50): Promise<TrackingEvent[]> {
  const { data, error } = await supabase.from('tracking_events').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) { console.error('fetchRecentTrackingEvents error:', error); return []; }
  return (data || []).map(rowToTrackingEvent);
}

// --- Bookings ---

export async function fetchBookings(): Promise<Booking[]> {
  const { data, error } = await supabase.from('bookings').select('*').order('scheduled_at', { ascending: true });
  if (error) { console.error('fetchBookings error:', error); return []; }
  return (data || []).map(rowToBooking);
}

export async function upsertBooking(booking: Booking): Promise<boolean> {
  const { error } = await supabase.from('bookings').upsert({
    id: booking.id, campaign_lead_id: booking.campaignLeadId,
    lead_name: booking.leadName, lead_email: booking.leadEmail,
    lead_phone: booking.leadPhone, scheduled_at: booking.scheduledAt,
    google_event_id: booking.googleEventId, google_meet_link: booking.googleMeetLink,
    status: booking.status, source: booking.source, created_at: booking.createdAt,
  });
  if (error) { console.error('upsertBooking error:', error); return false; }
  return true;
}

// --- Campaign Stats Aggregator ---

export function calculateCampaignStats(leads: CampaignLead[]): CampaignStats {
  const totalLeads = leads.length;
  const sent = leads.filter(l => l.sendStatus !== SendStatus.QUEUED && l.sendStatus !== SendStatus.SUPPRESSED).length;
  const opened = leads.filter(l => [SendStatus.OPENED, SendStatus.CLICKED, SendStatus.REPLIED].includes(l.sendStatus)).length;
  const clicked = leads.filter(l => [SendStatus.CLICKED, SendStatus.REPLIED].includes(l.sendStatus)).length;
  const replied = leads.filter(l => l.sendStatus === SendStatus.REPLIED).length;
  const bounced = leads.filter(l => l.sendStatus === SendStatus.BOUNCED).length;
  const failed = leads.filter(l => l.sendStatus === SendStatus.FAILED).length;
  const suppressed = leads.filter(l => l.sendStatus === SendStatus.SUPPRESSED).length;

  return {
    totalLeads, sent, opened, clicked, replied, bounced, failed, suppressed,
    openRate: sent > 0 ? (opened / sent) * 100 : 0,
    clickRate: sent > 0 ? (clicked / sent) * 100 : 0,
    replyRate: sent > 0 ? (replied / sent) * 100 : 0,
    bounceRate: sent > 0 ? (bounced / sent) * 100 : 0,
  };
}



// Fast campaign stats via count queries (no full lead download)
export async function fetchCampaignStatsLight(campaignId: string): Promise<CampaignStats> {
  const countQuery = async (status?: string) => {
    let q = supabase.from('campaign_leads').select('*', { count: 'exact', head: true }).eq('campaign_id', campaignId);
    if (status) q = q.eq('send_status', status);
    const { count } = await q;
    return count || 0;
  };

  const [totalLeads, sent, opened, clicked, replied, bounced, failed, suppressed] = await Promise.all([
    countQuery(),
    countQuery('sent'),
    countQuery('opened'),
    countQuery('clicked'),
    countQuery('replied'),
    countQuery('bounced'),
    countQuery('failed'),
    countQuery('suppressed'),
  ]);

  const totalSent = sent + opened + clicked + replied;

  return {
    totalLeads,
    sent: totalSent,
    opened: opened + clicked + replied,
    clicked: clicked + replied,
    replied,
    bounced,
    failed,
    suppressed,
    openRate: totalSent > 0 ? ((opened + clicked + replied) / totalSent) * 100 : 0,
    clickRate: totalSent > 0 ? ((clicked + replied) / totalSent) * 100 : 0,
    replyRate: totalSent > 0 ? (replied / totalSent) * 100 : 0,
    bounceRate: totalSent > 0 ? (bounced / totalSent) * 100 : 0,
  };
}



// Stream campaign leads page by page, calling onPage after each chunk
export async function streamAllCampaignLeads(onPage: (leads: CampaignLead[], total: number) => void): Promise<void> {
  const PAGE_SIZE = 1000;
  let allRows: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from('campaign_leads').select('*').order('website_score', { ascending: false }).range(from, from + PAGE_SIZE - 1);
    if (error) { console.error('streamAllCampaignLeads error:', error); break; }
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    onPage(allRows.map(rowToCampaignLead), allRows.length);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
}
// --- Stream from standalone leads table ---
const rowToLeadAsCampaignLead = (r: any): CampaignLead => ({
  id: r.id, campaignId: r.campaign_id || '', email: r.email,
  companyName: r.company_name || '', city: r.city || '', state: r.state || '',
  country: r.country || '', website: r.website || '',
  verificationStatus: 'unknown',
  sendStatus: 'queued' as any,
  engagementScore: 0,
  sentAt: undefined, openedAt: undefined, clickedAt: undefined,
  repliedAt: undefined, bouncedAt: undefined, errorMessage: undefined,
  createdAt: r.created_at,
  websiteStatus: r.website_status || 'pending',
  websiteScore: Number(r.website_score) || 0,
  websiteAnalysis: r.website_analysis || {},
  personalizedSubject: undefined,
  personalizedBody: undefined,
  personalizationStatus: 'pending' as any,
  researchCompletedAt: r.research_completed_at,
  priorityRank: 0,
  emailStatus: r.email_status,
  emailValid: r.email_valid,
  emailVerification: r.email_verification || undefined,
});

export async function streamLeads(onPage: (leads: CampaignLead[], total: number) => void): Promise<void> {
  const PAGE_SIZE = 1000;
  let allRows: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from('leads').select('*').order('website_score', { ascending: false }).range(from, from + PAGE_SIZE - 1);
    if (error) { console.error('streamLeads error:', error); break; }
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    onPage(allRows.map(rowToLeadAsCampaignLead), allRows.length);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
}

// --- Fetch all leads at once (for refreshes, no flickering) ---
export async function fetchAllLeads(): Promise<CampaignLead[]> {
  const PAGE_SIZE = 1000;
  let allRows: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from('leads').select('*').order('website_score', { ascending: false }).range(from, from + PAGE_SIZE - 1);
    if (error) { console.error('fetchAllLeads error:', error); break; }
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return allRows.map(rowToLeadAsCampaignLead);
}

// --- Engagement Score Calculator ---

export function calculateEngagementScore(lead: CampaignLead): number {
  let score = 0;
  if (lead.openedAt) score += 1;
  if (lead.clickedAt) score += 3;
  if (lead.repliedAt) score += 10;
  // Multiple interactions boost
  if (lead.sendStatus === SendStatus.CLICKED) score += 2;
  return score;
}

// --- Relay wrappers for outreach ---

export const sendCampaignBatch = async (campaignId: string, batchSize: number) => {
  return relayPost({ action: 'send_batch', campaign_id: campaignId, batch_size: batchSize });
};

export const getWarmupLimit = async (warmupDay: number, bounceRate: number) => {
  return relayPost({ action: 'get_warmup_limit', warmup_day: warmupDay, bounce_rate: bounceRate });
};

export const getAvailableSlots = async () => {
  return relayPost({ action: 'get_available_slots' });
};

export const createBookingViaRelay = async (leadInfo: {
  name: string; email: string; phone: string; companyName: string;
  campaignLeadId?: string; scheduledAt: string;
}) => {
  return relayPost({ action: 'create_booking', ...leadInfo });
};

// --- Research & Personalization Relay Wrappers ---

export const triggerResearchBatch = async (campaignId: string, batchSize = 50, leadIds?: string[]) => {
  return relayPost({ action: 'research_batch', campaign_id: campaignId, batch_size: batchSize, lead_ids: leadIds });
};

export const triggerResearchLeadsBatch = async (batchSize = 50) => {
  return relayPost({ action: 'research_leads_batch', batch_size: batchSize });
};

export const triggerVerifyLeadsBatch = async (batchSize = 200) => {
  return relayPost({ action: 'verify_leads_batch', batch_size: batchSize });
};




export const triggerPersonalizeBatch = async (campaignId: string, batchSize = 25) => {
  return relayPost({ action: 'personalize_batch', campaign_id: campaignId, batch_size: batchSize });
};

export const triggerPersonalizeEmail = async (campaignLeadId: string, campaignId: string) => {
  return relayPost({ action: 'personalize_email', campaign_lead_id: campaignLeadId, campaign_id: campaignId });
};

// --- Research & Personalization Stats ---

export function calculateResearchStats(leads: CampaignLead[]): ResearchStats {
  const total = leads.length;
  const pending = leads.filter(l => l.websiteStatus === 'pending').length;
  const crawled = leads.filter(l => l.websiteStatus === 'crawled').length;
  const noWebsite = leads.filter(l => l.websiteStatus === 'no_website').length;
  const errors = leads.filter(l => l.websiteStatus === 'error').length;

  const scoredLeads = leads.filter(l => l.websiteScore > 0);
  const avgScore = scoredLeads.length > 0
    ? scoredLeads.reduce((sum, l) => sum + l.websiteScore, 0) / scoredLeads.length
    : 0;

  const scoreDistribution: Record<string, number> = { '1-2': 0, '3-4': 0, '5-6': 0, '7-8': 0, '9-10': 0 };
  for (const l of scoredLeads) {
    if (l.websiteScore >= 9) scoreDistribution['9-10']++;
    else if (l.websiteScore >= 7) scoreDistribution['7-8']++;
    else if (l.websiteScore >= 5) scoreDistribution['5-6']++;
    else if (l.websiteScore >= 3) scoreDistribution['3-4']++;
    else scoreDistribution['1-2']++;
  }

  return { total, pending, crawled, noWebsite, errors, avgScore, scoreDistribution };
}

export function calculatePersonalizationStats(leads: CampaignLead[]): PersonalizationStats {
  const total = leads.length;
  const pending = leads.filter(l => l.personalizationStatus === 'pending').length;
  const done = leads.filter(l => l.personalizationStatus === 'done').length;
  const errors = leads.filter(l => l.personalizationStatus === 'error').length;
  return { total, pending, done, errors };
}
