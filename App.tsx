
import React, { useState, useEffect } from 'react';
import { ResearchProvider } from "./components/ResearchContext";
import FloatingResearchPill from "./components/FloatingResearchPill";
import { LayoutDashboard, Users, CreditCard, Calendar, Briefcase, CheckSquare, Settings, Menu, Bell, Search, Database, Target, FileText, Zap, LayoutGrid, ChevronRight, Sparkles, Package, Plus, RefreshCw, Link as LinkIcon, Mail } from 'lucide-react';
import Dashboard from './components/Dashboard';
import LeadsManager from './components/LeadsManager';
import DealsManager from './components/DealsManager';
import PaymentsManager from './components/PaymentsManager';
import ClientsManager from './components/ClientsManager';
import SessionsManager from './components/SessionsManager';
import ProjectsManager from './components/ProjectsManager';
import OperationsManager from './components/OperationsManager';
import SettingsManager from './components/SettingsManager';
import PaymentLinksManager from './components/PaymentLinksManager';
import GlobalHyperLinkEngine from './components/GlobalHyperLinkEngine';
import RelationshipHub from './components/RelationshipHub';
import ContractsManager from './components/ContractsManager';
import ContractSigningInterface from './components/ContractSigningInterface';
import OutreachManager from './components/OutreachManager';
import LeadDatabase from "./components/LeadDatabase";
import UnsubscribePage from './components/UnsubscribePage';
import BookingPage from './components/BookingPage';
import {
  fetchLeads, fetchClients, fetchDeals, fetchPayments,
  fetchSessions, fetchProjects, fetchTasks, fetchMetrics,
  fetchConfigs, fetchContracts,
  upsertLead, upsertContract,
  syncStripeData,
} from './services/dataService';
import { Lead, Client, Payment, Session, Deal, Project, Task, Metric, ConfigItem, Contract } from './types';

type Tab = 'dashboard' | 'leads_db' | 'crm' | 'deals' | 'payments' | 'payment_links' | 'sessions' | 'projects' | 'tasks' | 'contracts' | 'outreach' | 'settings';

const BrandLogo = () => (
  <svg viewBox="0 0 500 240" xmlns="http://www.w3.org/2000/svg" className="w-40 animate-reveal">
    <g transform="translate(250, 120)" textAnchor="middle">
      <text y="-60" fontSize="70" fill="white" fontStyle="italic" fontFamily="DM Serif Display, serif">The</text>
      <text y="20" fontSize="95" fill="white" fontWeight="900" fontFamily="DM Serif Display, serif">PROVIDER</text>
      <text y="95" fontSize="75" fill="#FF9F1C" fontWeight="900" letterSpacing="8" fontFamily="Inter, sans-serif">SYSTEM</text>
    </g>
  </svg>
);

const App: React.FC = () => {
  const getTabFromHash = (): Tab => {
    const hash = window.location.hash.replace('#', '').split('/')[0];
    const validTabs: Tab[] = ['dashboard', 'leads_db', 'crm', 'deals', 'payments', 'payment_links', 'sessions', 'projects', 'tasks', 'contracts', 'outreach', 'settings'];
    return validTabs.includes(hash as Tab) ? (hash as Tab) : 'dashboard';
  };

  const [activeTab, setActiveTabState] = useState<Tab>(getTabFromHash());

  const setActiveTab = (tab: Tab) => {
    setActiveTabState(tab);
    window.location.hash = tab;
  };

  useEffect(() => {
    const handleHashChange = () => setActiveTabState(getTabFromHash());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'payment_link' | 'invoice' | 'subscription' | null>(null);

  const syncAllData = async () => {
    setIsLoading(true);
    try {
      const [leadsData, clientsData, dealsData, paymentsData, sessionsData, projectsData, tasksData, metricsData, configsData, contractsData] = await Promise.all([
        fetchLeads(), fetchClients(), fetchDeals(), fetchPayments(),
        fetchSessions(), fetchProjects(), fetchTasks(), fetchMetrics(),
        fetchConfigs(), fetchContracts(),
      ]);
      setLeads(leadsData); setClients(clientsData); setDeals(dealsData); setPayments(paymentsData);
      setSessions(sessionsData); setProjects(projectsData); setTasks(tasksData); setMetrics(metricsData);
      setConfigs(configsData); setContracts(contractsData);
      try {
        const stripeData = await syncStripeData();
        if (stripeData.clients.length > 0) {
          setClients(prev => { const existing = new Set(prev.map(c => c.stripeCustomerId).filter(Boolean)); return [...prev, ...stripeData.clients.filter(sc => !existing.has(sc.stripeCustomerId))]; });
        }
        if (stripeData.payments.length > 0) {
          setPayments(prev => { const existing = new Set(prev.map(p => p.stripeId).filter(Boolean)); return [...prev, ...stripeData.payments.filter(sp => !existing.has(sp.stripeId))]; });
        }
      } catch (stripeErr) { console.warn('Stripe sync skipped:', stripeErr); }
    } catch (err) { console.error("Critical Sync Failure:", err); } finally { setIsLoading(false); }
  };

  useEffect(() => { syncAllData(); }, []);

  const urlParams = new URLSearchParams(window.location.search);
  const pageMode = urlParams.get('mode');
  const signingContractId = urlParams.get('id');

  if (pageMode === 'unsubscribe') {
    return <UnsubscribePage campaignLeadId={urlParams.get('id') || ''} email={urlParams.get('email') || ''} />;
  }
  if (pageMode === 'book') {
    return <BookingPage campaignLeadId={urlParams.get('ref') || undefined} />;
  }

  const updateLead = async (updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
    await upsertLead(updatedLead);
  };

  const updateContract = async (updatedContract: Contract) => {
    const exists = contracts.find(c => c.id === updatedContract.id);
    if (exists) { setContracts(prev => prev.map(c => c.id === updatedContract.id ? updatedContract : c)); }
    else { setContracts(prev => [...prev, updatedContract]); }
    await upsertContract(updatedContract);
  };

  if (pageMode === 'sign' && signingContractId) {
    const contractToSign = contracts.find(c => c.id === signingContractId);
    if (isLoading && !contractToSign) return <div className="flex h-screen items-center justify-center bg-[#F7F8FA]"><div className="w-10 h-10 border-4 border-[#0B3060] border-t-transparent rounded-full animate-spin"></div></div>;
    if (contractToSign) {
      return <ContractSigningInterface contract={contractToSign} onSign={async (signatureData) => { await updateContract({ ...contractToSign, status: 'Signed', signedAt: new Date().toISOString(), signatureData }); }} />;
    }
  }

  return (
    <div className="flex h-screen bg-[#F7F8FA] text-[#1A1A2E] overflow-hidden font-sans">
      {/* Navy Sidebar (Desktop) */}
      <aside className="w-64 bg-[#0B3060] hidden lg:flex flex-col z-20 overflow-y-auto">
        <div className="p-6 pb-4">
          <BrandLogo />
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {[
            { id: 'dashboard', icon: LayoutGrid, label: 'Dashboard' },
            { id: 'leads_db', icon: Database, label: 'Leads' },
            { id: 'crm', icon: Users, label: 'Global CRM' },
            { id: 'deals', icon: FileText, label: 'Deals' },
            { id: 'payments', icon: CreditCard, label: 'Payments' },
            { id: 'payment_links', icon: LinkIcon, label: 'Payment Links' },
            { id: 'sessions', icon: Calendar, label: 'Sessions' },
            { id: 'projects', icon: Briefcase, label: 'Projects' },
            { id: 'outreach', icon: Mail, label: 'Outreach' },
            { id: 'tasks', icon: CheckSquare, label: 'Operations' },
            { id: 'contracts', icon: FileText, label: 'Contracts' },
          ].map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.id
                  ? 'bg-white/15 text-white border-l-[3px] border-[#FF9F1C] pl-[9px]'
                  : 'text-white/60 hover:bg-white/8 hover:text-white/90'
              }`}
            >
              <item.icon size={18} strokeWidth={activeTab === item.id ? 2.5 : 1.8} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 mt-auto border-t border-white/10">
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-white/15 text-white border-l-[3px] border-[#FF9F1C] pl-[9px]'
                : 'text-white/60 hover:bg-white/8 hover:text-white/90'
            }`}
          >
            <Settings size={18} strokeWidth={1.8} />
            Settings
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-10 px-4 lg:px-8 py-3 lg:py-4 bg-white/90 backdrop-blur-md border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-3 bg-[#F7F8FA] px-4 py-2 rounded-xl border border-[#E2E8F0] w-full lg:w-96 focus-within:ring-2 focus-within:ring-[#0B3060]/10 transition-all">
            <Search className="text-[#64748B]" size={16} />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent border-none outline-none text-sm font-medium w-full text-[#1A1A2E] placeholder-[#94A3B8]"
            />
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                className="w-9 h-9 bg-[#0B3060] text-white rounded-lg flex items-center justify-center hover:bg-[#0a2850] transition-all active:scale-95"
              >
                <Plus size={18} />
              </button>
              {isActionMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-[#E2E8F0] p-1.5 z-50">
                  <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest px-3 py-2">Create New</div>
                  {[
                    { label: 'Payment Link', icon: Zap, color: 'text-blue-500', modal: 'payment_link' as const },
                    { label: 'Invoice', icon: FileText, color: 'text-emerald-500', modal: 'invoice' as const },
                    { label: 'Subscription', icon: RefreshCw, color: 'text-[#FF9F1C]', modal: 'subscription' as const },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={() => { setActiveModal(item.modal); setIsActionMenuOpen(false); }}
                      className="w-full text-left px-3 py-2.5 text-sm font-medium text-[#1A1A2E] hover:bg-[#F7F8FA] rounded-lg flex items-center gap-3 transition-all"
                    >
                      <item.icon size={15} className={item.color} />
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="p-2 text-[#64748B] hover:text-[#1A1A2E] hover:bg-[#F7F8FA] rounded-lg transition-all relative">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FF9F1C] rounded-full ring-2 ring-white"></span>
            </button>

            <div className="w-9 h-9 rounded-full bg-[#0B3060] flex items-center justify-center text-white font-bold text-xs">
              JW
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-32 lg:pb-8">
          {/* Tabs that manage their own data load immediately */}
          {activeTab === 'outreach' && <OutreachManager />}
          {activeTab === 'leads_db' && <LeadDatabase />}
          {activeTab === 'payment_links' && <PaymentLinksManager />}

          {/* Tabs that need global data wait for sync */}
          {activeTab !== 'outreach' && activeTab !== 'payment_links' && activeTab !== 'leads_db' && (
          isLoading && leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40 animate-reveal">
              <div className="w-12 h-12 border-4 border-[#0B3060] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-[#64748B] font-serif italic text-lg">Synchronizing Data...</p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && <Dashboard leads={leads} clients={clients} payments={payments} metrics={metrics} configs={configs} onConnectStripe={() => setActiveTab('settings')} />}
              {activeTab === 'crm' && <RelationshipHub leads={leads} clients={clients} payments={payments} projects={projects} sessions={sessions} onUpdateLead={updateLead} onRequestLink={() => setActiveModal('payment_link')} />}
              {activeTab === 'deals' && <DealsManager deals={deals} onUpdateDeal={() => {}} />}
              {activeTab === 'payments' && <PaymentsManager payments={payments} clients={clients} />}
              {activeTab === 'payment_links' && <PaymentLinksManager />}
              {activeTab === 'sessions' && <SessionsManager sessions={sessions} />}
              {activeTab === 'projects' && <ProjectsManager projects={projects} payments={payments} />}
              {activeTab === 'tasks' && <OperationsManager tasks={tasks} />}
              {activeTab === 'contracts' && <ContractsManager contracts={contracts} clients={clients} onUpdateContract={updateContract} />}
              {activeTab === 'settings' && <SettingsManager configs={configs} onRefresh={syncAllData} />}
            </>
          )
          )}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 lg:hidden bottom-nav z-50 flex items-center justify-between px-6 py-3">
        {[
          { id: 'dashboard' as Tab, icon: LayoutGrid },
          { id: 'crm' as Tab, icon: Users },
        ].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1 ${activeTab === item.id ? 'text-[#0B3060]' : 'text-[#94A3B8]'}`}>
            <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
          </button>
        ))}
        <button
          onClick={() => setIsActionMenuOpen(true)}
          className="w-12 h-12 bg-[#0B3060] text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform -mt-6 ring-4 ring-white"
        >
          <Plus size={24} />
        </button>
        {[
          { id: 'outreach' as Tab, icon: Mail },
          { id: 'settings' as Tab, icon: Settings },
        ].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1 ${activeTab === item.id ? 'text-[#0B3060]' : 'text-[#94A3B8]'}`}>
            <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
          </button>
        ))}
      </nav>

      {/* Mobile Action Sheet */}
      {isActionMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setIsActionMenuOpen(false)}>
          <div className="bg-white w-full rounded-t-[28px] p-6 pb-12" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-[#E2E8F0] rounded-full mx-auto mb-6"></div>
            <h3 className="text-lg font-serif font-bold text-[#1A1A2E] mb-5">Create New</h3>
            <div className="space-y-2">
              {[
                { label: 'Payment Link', desc: 'Secure checkout', icon: Zap, color: 'text-blue-500', bg: 'bg-blue-50', modal: 'payment_link' as const },
                { label: 'Invoice', desc: 'Bill a client', icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-50', modal: 'invoice' as const },
                { label: 'Subscription', desc: 'Recurring revenue', icon: RefreshCw, color: 'text-[#FF9F1C]', bg: 'bg-orange-50', modal: 'subscription' as const },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => { setActiveModal(item.modal); setIsActionMenuOpen(false); }}
                  className="w-full p-4 bg-white border border-[#E2E8F0] rounded-2xl flex items-center gap-4 active:bg-[#F7F8FA] transition-all"
                >
                  <div className={`w-11 h-11 ${item.bg} ${item.color} rounded-xl flex items-center justify-center`}>
                    <item.icon size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-[#1A1A2E]">{item.label}</p>
                    <p className="text-xs text-[#94A3B8]">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setIsActionMenuOpen(false)} className="w-full mt-4 py-3 rounded-xl font-semibold text-[#94A3B8] hover:text-[#1A1A2E] transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}

      <GlobalHyperLinkEngine isOpen={activeModal === 'payment_link'} onClose={() => setActiveModal(null)} leads={leads} clients={clients} />
    </div>
  );
};

export default App;
