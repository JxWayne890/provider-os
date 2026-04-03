import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_API_KEY);
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

function safeDate(ts) {
  if (!ts || isNaN(ts)) return null;
  try { return new Date(ts * 1000).toISOString().split('T')[0]; }
  catch { return null; }
}

function custId(c) {
  if (!c) return null;
  return typeof c === 'string' ? c : c.id || null;
}

function smartInvoiceStatus(inv) {
  // paid, void, uncollectible are terminal
  if (inv.status === 'paid') return 'Paid';
  if (inv.status === 'void') return 'Voided';
  if (inv.status === 'uncollectible') return 'Failed';
  if (inv.status === 'draft') return 'Draft';

  // For 'open' invoices, check if actually overdue
  if (inv.status === 'open') {
    if (inv.due_date) {
      const now = Date.now() / 1000;
      if (inv.due_date < now) return 'Past Due';
    }
    return 'Open'; // sent but not yet due
  }

  return inv.status || 'Unknown';
}

async function sync() {
  console.log('Fetching Stripe data...');

  const [customers, charges, invoices, subscriptions] = await Promise.all([
    stripe.customers.list({ limit: 100 }),
    stripe.charges.list({ limit: 100 }),
    stripe.invoices.list({ limit: 100 }),
    stripe.subscriptions.list({ limit: 100 }),
  ]);

  console.log('Found: ' + customers.data.length + ' customers, ' + charges.data.length + ' charges, ' + invoices.data.length + ' invoices, ' + subscriptions.data.length + ' subscriptions');

  const clientIdMap = new Map();
  customers.data.forEach(c => {
    const id = c.metadata?.clientId || ('stripe-' + c.id);
    clientIdMap.set(c.id, id);
  });

  const clients = customers.data.map(c => ({
    id: clientIdMap.get(c.id),
    lead_id: null,
    company_name: c.name || c.email || 'Unknown',
    primary_contact: c.name || '',
    email: c.email || '',
    phone: c.phone || '',
    status: 'Active',
    service_package: '',
    billing_type: 'One-time',
    monthly_value: 0,
    total_contract_value: 0,
    start_date: safeDate(c.created),
    stripe_customer_id: c.id,
    notes: 'Synced from Stripe',
    health_score: 80,
  }));

  function getClientId(stripeCustId) {
    const cid = custId(stripeCustId);
    if (!cid) return null;
    return clientIdMap.get(cid) || null;
  }

  const chargePayments = charges.data
    .filter(ch => ch.status === 'succeeded' && !(ch.description || "").toLowerCase().includes('payment for invoice'))
    .map(ch => ({
      id: 'ch-' + ch.id,
      client_id: getClientId(ch.customer),
      stripe_customer_id: custId(ch.customer) || '',
      stripe_id: ch.id,
      amount: ch.amount / 100,
      currency: ch.currency,
      type: 'One-time',
      status: 'Paid',
      due_date: safeDate(ch.created),
      paid_date: safeDate(ch.created),
      stripe_link: ch.receipt_url || '',
      notes: ch.description || '',
    }));

  const invoicePayments = invoices.data
    .filter(inv => inv.status !== 'draft') // skip drafts
    .map(inv => ({
      id: 'inv-' + inv.id,
      client_id: getClientId(inv.customer),
      stripe_customer_id: custId(inv.customer) || '',
      stripe_id: inv.id,
      amount: (inv.amount_paid || inv.total || 0) / 100,
      currency: inv.currency,
      type: 'Invoice',
      status: smartInvoiceStatus(inv),
      due_date: safeDate(inv.due_date) || safeDate(inv.created),
      paid_date: safeDate(inv.status_transitions?.paid_at),
      stripe_link: inv.hosted_invoice_url || '',
      notes: (inv.number ? '#' + inv.number + '\n' : '') + (inv.description || ''),
      project_id: null,
    }));

  const subPayments = subscriptions.data.map(sub => ({
    id: 'sub-' + sub.id,
    client_id: getClientId(sub.customer),
    stripe_customer_id: custId(sub.customer) || '',
    stripe_id: sub.id,
    amount: (sub.items?.data?.[0]?.price?.unit_amount || 0) / 100,
    currency: sub.currency,
    type: 'Subscription',
    status: sub.status === 'active' ? 'Paid' : 'Past Due',
    due_date: safeDate(sub.current_period_start),
    paid_date: sub.status === 'active' ? safeDate(sub.current_period_start) : null,
    stripe_link: '',
    notes: (sub.items?.data?.[0]?.price?.recurring?.interval || 'recurring') + ' subscription',
    project_id: null,
  }));

  const allPayments = [...chargePayments, ...invoicePayments, ...subPayments];
  const validPayments = allPayments.filter(p => p.client_id !== null);
  const orphanCount = allPayments.length - validPayments.length;

  console.log('Mapped: ' + clients.length + ' clients, ' + validPayments.length + ' payments (' + orphanCount + ' orphaned)');

  // Show status breakdown
  const statusCounts = {};
  validPayments.forEach(p => { statusCounts[p.status] = (statusCounts[p.status] || 0) + 1; });
  console.log('Statuses:', JSON.stringify(statusCounts));

  const { error: clientErr } = await supabase.from('clients').upsert(clients, { onConflict: 'id' });
  if (clientErr) { console.error('Client error:', clientErr); return; }
  console.log('OK: ' + clients.length + ' clients');

  const { error: paymentErr } = await supabase.from('payments').upsert(validPayments, { onConflict: 'id' });
  if (paymentErr) console.error('Payment error:', paymentErr);
  else console.log('OK: ' + validPayments.length + ' payments');

  const { count: cc } = await supabase.from('clients').select('*', { count: 'exact', head: true });
  const { count: pc } = await supabase.from('payments').select('*', { count: 'exact', head: true });
  console.log('\nSupabase: ' + cc + ' clients, ' + pc + ' payments');

  const { data: paid } = await supabase.from('payments').select('amount').eq('status', 'Paid');
  const rev = (paid || []).reduce((s, p) => s + Number(p.amount), 0);
  console.log('Total Revenue (Paid): $' + rev.toLocaleString());
}

sync().catch(err => { console.error('Sync failed:', err); process.exit(1); });
