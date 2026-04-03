import React, { useState } from 'react';
import { X, Check, ChevronRight, ChevronLeft, User, CreditCard, FileText, Receipt, Briefcase, Calendar, Loader2 } from 'lucide-react';
import { Client, Contract, Project, ClientStatus } from '../types';
import { createStripeCustomer, createStripeInvoice, sendContractEmail, createCalendarEvent, upsertClient, upsertContract, upsertProject } from '../services/dataService';

interface ClientOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const STEPS = [
  { id: 1, label: 'Client Info', icon: User },
  { id: 2, label: 'Stripe Customer', icon: CreditCard },
  { id: 3, label: 'Contract', icon: FileText },
  { id: 4, label: 'First Invoice', icon: Receipt },
  { id: 5, label: 'Project', icon: Briefcase },
  { id: 6, label: 'Kickoff Call', icon: Calendar },
];

const SERVICE_PACKAGES = ['Web Design', 'Web Development', 'SEO', 'Digital Marketing', 'Branding', 'Consulting', 'Retainer'];

const ClientOnboardingWizard: React.FC<ClientOnboardingWizardProps> = ({ isOpen, onClose, onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  // Step 1: Client Info
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [servicePackage, setServicePackage] = useState('');

  // Step 2: Stripe
  const [stripeCustomerId, setStripeCustomerId] = useState('');

  // Step 3: Contract
  const [contractTitle, setContractTitle] = useState('');
  const [contractContent, setContractContent] = useState('');

  // Step 4: Invoice
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceDesc, setInvoiceDesc] = useState('');

  // Step 5: Project
  const [projectName, setProjectName] = useState('');
  const [projectScope, setProjectScope] = useState('');
  const [projectDue, setProjectDue] = useState('');

  // Step 6: Kickoff
  const [kickoffDate, setKickoffDate] = useState('');
  const [kickoffTime, setKickoffTime] = useState('10:00');

  const clientId = `client-${Date.now()}`;

  const handleStep = async (stepNum: number) => {
    setLoading(true);
    try {
      if (stepNum === 1) {
        // Save client to Supabase
        const client: Client = {
          id: clientId, leadId: '', companyName: clientName, primaryContact: clientName,
          email: clientEmail, phone: clientPhone, status: ClientStatus.ONBOARDING,
          servicePackage, billingType: 'One-time', monthlyValue: 0,
          totalContractValue: Number(invoiceAmount) || 0, startDate: new Date().toISOString().split('T')[0],
          stripeCustomerId: '', notes: 'Created via onboarding wizard', healthScore: 80,
        };
        await upsertClient(client);
      } else if (stepNum === 2) {
        const result = await createStripeCustomer(clientName, clientEmail, { clientId });
        setStripeCustomerId(result.customerId);
        await upsertClient({ id: clientId, stripeCustomerId: result.customerId } as any);
      } else if (stepNum === 3) {
        const contract: Contract = {
          id: `contract-${Date.now()}`, clientId, recipientName: clientName,
          recipientEmail: clientEmail, title: contractTitle || `${servicePackage} Agreement`,
          content: contractContent || `Service agreement for ${servicePackage} services.`,
          status: 'Sent', createdAt: new Date().toISOString(), sentAt: new Date().toISOString(),
        };
        await upsertContract(contract);
        const signingLink = `${window.location.origin}?mode=sign&id=${contract.id}`;
        await sendContractEmail(clientEmail, clientName, contract.title, signingLink);
      } else if (stepNum === 4) {
        if (stripeCustomerId && invoiceAmount) {
          await createStripeInvoice(stripeCustomerId, Number(invoiceAmount), invoiceDesc || `${servicePackage} services`, false);
        }
      } else if (stepNum === 5) {
        const project: Project = {
          id: `proj-${Date.now()}`, clientId, name: projectName || `${clientName} - ${servicePackage}`,
          scopeSummary: projectScope || servicePackage, currentMilestone: 'Kickoff',
          status: 'Planning', nextDeliverable: 'Discovery & Planning', dueDate: projectDue || '',
          risks: '',
        };
        await upsertProject(project);
      } else if (stepNum === 6) {
        if (kickoffDate) {
          const startTime = new Date(`${kickoffDate}T${kickoffTime}`).toISOString();
          const endTime = new Date(new Date(`${kickoffDate}T${kickoffTime}`).getTime() + 60 * 60 * 1000).toISOString();
          await createCalendarEvent(
            `Kickoff: ${clientName} - ${servicePackage}`,
            `Kickoff meeting for ${servicePackage} project with ${clientName}`,
            startTime, endTime, [clientEmail]
          );
        }
      }
      setCompleted(prev => new Set([...prev, stepNum]));
      if (stepNum < 6) setStep(stepNum + 1);
      else { onComplete(); onClose(); }
    } catch (err) {
      console.error(`Step ${stepNum} error:`, err);
      alert(`Step ${stepNum} failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FF9F1C]/30 focus:border-[#FF9F1C] transition-all";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-serif font-bold text-[#1A1A2E]">Client Onboarding</h2>
            <p className="text-xs text-[#64748B] mt-1">Step {step} of 6</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4 flex gap-2">
          {STEPS.map(s => (
            <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                completed.has(s.id) ? 'bg-emerald-500 text-white' : step === s.id ? 'bg-[#1A1A2E] text-white' : 'bg-gray-100 text-[#64748B]'
              }`}>
                {completed.has(s.id) ? <Check size={14} /> : s.id}
              </div>
              <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-tight hidden sm:block">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="p-6 space-y-5">
          {step === 1 && (
            <>
              <div>
                <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2">Client / Company Name</label>
                <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Acme Corp" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2">Email</label>
                  <input value={clientEmail} onChange={e => setClientEmail(e.target.value)} type="email" placeholder="client@example.com" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2">Phone</label>
                  <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="(555) 123-4567" className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2">Service Package</label>
                <select value={servicePackage} onChange={e => setServicePackage(e.target.value)} className={inputClass}>
                  <option value="">Select a package...</option>
                  {SERVICE_PACKAGES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="text-center py-8">
              <CreditCard size={48} className="mx-auto text-[#FF9F1C] mb-4" />
              <h3 className="text-lg font-serif font-bold mb-2">Create Stripe Customer</h3>
              <p className="text-sm text-[#64748B] mb-1">A Stripe customer record will be created for:</p>
              <p className="text-lg font-bold text-[#1A1A2E]">{clientName} ({clientEmail})</p>
              {stripeCustomerId && <p className="text-xs text-emerald-600 mt-3 font-bold">Created: {stripeCustomerId}</p>}
            </div>
          )}

          {step === 3 && (
            <>
              <div>
                <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2">Contract Title</label>
                <input value={contractTitle} onChange={e => setContractTitle(e.target.value)} placeholder={`${servicePackage} Service Agreement`} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2">Contract Terms</label>
                <textarea value={contractContent} onChange={e => setContractContent(e.target.value)} rows={5}
                  placeholder="Enter contract terms or leave blank for default..." className={inputClass + ' resize-none'} />
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div>
                <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2">Invoice Amount ($)</label>
                <input value={invoiceAmount} onChange={e => setInvoiceAmount(e.target.value)} type="number" placeholder="1500" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2">Description</label>
                <input value={invoiceDesc} onChange={e => setInvoiceDesc(e.target.value)} placeholder={`${servicePackage} services`} className={inputClass} />
              </div>
              {!stripeCustomerId && <p className="text-xs text-amber-600 font-bold">Note: No Stripe customer was created in step 2. Invoice creation will be skipped.</p>}
            </>
          )}

          {step === 5 && (
            <>
              <div>
                <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2">Project Name</label>
                <input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder={`${clientName} - ${servicePackage}`} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2">Scope Summary</label>
                <textarea value={projectScope} onChange={e => setProjectScope(e.target.value)} rows={3} placeholder="Brief project scope..." className={inputClass + ' resize-none'} />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2">Due Date</label>
                <input value={projectDue} onChange={e => setProjectDue(e.target.value)} type="date" className={inputClass} />
              </div>
            </>
          )}

          {step === 6 && (
            <>
              <div className="text-center mb-4">
                <Calendar size={48} className="mx-auto text-[#FF9F1C] mb-3" />
                <h3 className="text-lg font-serif font-bold">Schedule Kickoff Call</h3>
                <p className="text-sm text-[#64748B]">A Google Meet link will be generated automatically</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2">Date</label>
                  <input value={kickoffDate} onChange={e => setKickoffDate(e.target.value)} type="date" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2">Time</label>
                  <input value={kickoffTime} onChange={e => setKickoffTime(e.target.value)} type="time" className={inputClass} />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t border-[#E2E8F0] flex items-center justify-between">
          <div className="flex gap-2">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className="flex items-center gap-1 px-4 py-2.5 text-sm font-bold text-[#64748B] hover:text-[#1A1A2E] transition-all">
                <ChevronLeft size={16} /> Back
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setCompleted(prev => new Set([...prev, step])); if (step < 6) setStep(step + 1); else { onComplete(); onClose(); } }}
              className="px-5 py-2.5 text-sm font-bold text-[#64748B] hover:text-[#1A1A2E] transition-all">
              Skip
            </button>
            <button onClick={() => handleStep(step)} disabled={loading || (step === 1 && (!clientName || !clientEmail))}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#1A1A2E] text-white text-sm font-bold rounded-xl hover:bg-[#0a2850] transition-all disabled:opacity-50 shadow-lg">
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {step === 6 ? 'Complete' : 'Continue'}
              {!loading && step < 6 && <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientOnboardingWizard;
