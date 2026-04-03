
import React, { useState, useEffect } from 'react';
import {
  LayoutGrid, Users, CreditCard, Calendar, Briefcase, CheckSquare, Settings,
  Menu, Bell, Search, Database, Target, FileText, Zap, Plus, RefreshCw,
  Link as LinkIcon, X, ChevronRight, Sparkles, Globe, BarChart3, ArrowRight
} from 'lucide-react';
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
import LeadDatabase from './components/LeadDatabase';
import {
  fetchLeads, fetchClients, fetchDeals, fetchPayments,
  fetchSessions, fetchProjects, fetchTasks, fetchMetrics,
  fetchConfigs, fetchContracts,
  upsertLead, upsertContract,
  syncStripeData,
} from './services/dataService';
import { Lead, Client, Payment, Session, Deal, Project, Task, Metric, ConfigItem, Contract } from './types';

type Tab = 'dashboard' | 'crm' | 'leads_research' | 'deals' | 'payments' | 'payment_links' | 'sessions' | 'projects' | 'tasks' | 'contracts' | 'settings';

const NAV_SECTIONS = [
  {
    label: 'Core',
    items: [
      { id: 'dashboard' as Tab, icon: LayoutGrid, label: 'Dashboard', desc: 'Overview & metrics' },
      { id: 'crm' as Tab, icon: Users, label: 'Global CRM', desc: 'Leads & clients' },
      { id: 'leads_research' as Tab, icon: Globe, label: 'Research Lab', desc: 'Website research & scoring' },
    ]
  },
  {
    label: 'Revenue',
    items: [
      { id: 'deals' as Tab, icon: Target, label: 'Deals', desc: 'Proposals & pipeline' },
      { id: 'payments' as Tab, icon: CreditCard, label: 'Payments', desc: 'Track all payments' },
      { id: 'payment_links' as Tab, icon: LinkIcon, label: 'Payment Links', desc: 'Stripe checkout links' },
      { id: 'contracts' as Tab, icon: FileText, label: 'Contracts', desc: 'Digital contracts' },
    ]
  },
  {
    label: 'Operations',
    items: [
      { id: 'sessions' as Tab, icon: Calendar, label: 'Sessions', desc: 'Meetings & calls' },
      { id: 'projects' as Tab, icon: Briefcase, label: 'Projects', desc: 'Project tracker' },
      { id: 'tasks' as Tab, icon: CheckSquare, label: 'Operations', desc: 'Task management' },
    ]
  },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  // Pure Live Data State
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

  const [isLoading, setIsLoading] = useState(false);

  // Mobile Navigation State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Global Action Menu State
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'payment_link' | 'invoice' | 'subscription' | null>(null);

  // Global Data Synchronization
  const syncAllData = async () => {
    setIsLoading(true);
    try {
      const [
        leadsData, clientsData, dealsData, paymentsData,
        sessionsData, projectsData, tasksData, metricsData,
        configsData, contractsData
      ] = await Promise.all([
        fetchLeads(), fetchClients(), fetchDeals(), fetchPayments(),
        fetchSessions(), fetchProjects(), fetchTasks(), fetchMetrics(),
        fetchConfigs(), fetchContracts(),
      ]);

      setLeads(leadsData);
      setClients(clientsData);
      setDeals(dealsData);
      setPayments(paymentsData);
      setSessions(sessionsData);
      setProjects(projectsData);
      setTasks(tasksData);
      setMetrics(metricsData);
      setConfigs(configsData);
      setContracts(contractsData);

      // Stripe sync — non-blocking
      try {
        const stripeData = await syncStripeData();
        if (stripeData.clients.length > 0) {
          setClients(prev => {
            const existing = new Set(prev.map(c => c.stripeCustomerId).filter(Boolean));
            const newClients = stripeData.clients.filter(sc => !existing.has(sc.stripeCustomerId));
            return [...prev, ...newClients];
          });
        }
        if (stripeData.payments.length > 0) {
          setPayments(prev => {
            const existing = new Set(prev.map(p => p.stripeId).filter(Boolean));
            const newPayments = stripeData.payments.filter(sp => !existing.has(sp.stripeId));
            return [...prev, ...newPayments];
          });
        }
      } catch (stripeErr) {
        console.warn('Stripe sync skipped:', stripeErr);
      }
    } catch (err) {
      console.error("Critical Sync Failure:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    syncAllData();
  }, []);

  // Check for Signing Mode
  const urlParams = new URLSearchParams(window.location.search);
  const signingMode = urlParams.get('mode') === 'sign';
  const signingContractId = urlParams.get('id');

  const updateLead = async (updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
    await upsertLead(updatedLead);
  };

  const updateContract = async (updatedContract: Contract) => {
    const exists = contracts.find(c => c.id === updatedContract.id);
    if (exists) {
      setContracts(prev => prev.map(c => c.id === updatedContract.id ? updatedContract : c));
    } else {
      setContracts(prev => [...prev, updatedContract]);
    }
    await upsertContract(updatedContract);
  };

  // Close drawer when navigating
  const navigateTo = (tab: Tab) => {
    setActiveTab(tab);
    setIsDrawerOpen(false);
    setIsSearchOpen(false);
  };

  if (signingMode && signingContractId) {
    const contractToSign = contracts.find(c => c.id === signingContractId);
    if (isLoading && !contractToSign) {
      return <div className="flex h-screen items-center justify-center">Loading Contract...</div>;
    }
    if (contractToSign) {
      return (
        <ContractSigningInterface
          contract={contractToSign}
          onSign={async (signatureData) => {
            const signedContract = {
              ...contractToSign,
              status: 'Signed' as const,
              signedAt: new Date().toISOString(),
              signatureData
            };
            await updateContract(signedContract);
          }}
        />
      );
    }
  }

  // Get current tab label for mobile header
  const currentTabLabel = NAV_SECTIONS.flatMap(s => s.items).find(i => i.id === activeTab)?.label
    || (activeTab === 'settings' ? 'Settings' : 'ProviderOS');

  return (
    <div className="flex h-screen bg-[#F7F8FA] text-[#1A1A2E] overflow-hidden font-sans">

      {/* ============================================ */}
      {/* DESKTOP SIDEBAR (hidden on mobile)          */}
      {/* ============================================ */}
      <aside className="w-72 luminous-sidebar hidden lg:flex flex-col z-20 overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-[#FF9F1C] rounded-xl flex items-center justify-center shadow-lg shadow-[#FF9F1C]/20 animate-reveal">
              <span className="text-white font-serif text-2xl font-bold">P</span>
            </div>
            <h1 className="text-2xl font-serif font-bold tracking-tight text-white animate-reveal" style={{ animationDelay: '0.1s' }}>
              ProviderOS
            </h1>
          </div>

          <nav className="space-y-6">
            {NAV_SECTIONS.map((section) => (
              <div key={section.label}>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-2 px-4">{section.label}</p>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === item.id
                        ? 'bg-white/15 text-white shadow-md'
                        : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                      }`}
                    >
                      <item.icon size={18} strokeWidth={2} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8">
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'settings'
              ? 'bg-white/15 text-white shadow-md'
              : 'text-white/50 hover:bg-white/5 hover:text-white/80'
            }`}
          >
            <Settings size={18} strokeWidth={2} />
            Config Hub
          </button>
        </div>
      </aside>

      {/* ============================================ */}
      {/* MOBILE NAVIGATION DRAWER (overlay)          */}
      {/* ============================================ */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsDrawerOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-[340px] bg-[#0B3060] flex flex-col mobile-drawer-enter overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-6 pb-4 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FF9F1C] rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-serif text-xl font-bold">P</span>
                </div>
                <h1 className="text-xl font-serif font-bold text-white">ProviderOS</h1>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 text-white active:bg-white/20"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Navigation */}
            <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
              {NAV_SECTIONS.map((section) => (
                <div key={section.label}>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3 px-3">{section.label}</p>
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => navigateTo(item.id)}
                        className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all active:scale-[0.98] ${activeTab === item.id
                          ? 'bg-[#FF9F1C] text-white shadow-lg shadow-[#FF9F1C]/20'
                          : 'text-white/70 hover:bg-white/5 active:bg-white/10'
                        }`}
                      >
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${activeTab === item.id ? 'bg-white/20' : 'bg-white/10'
                          }`}>
                          <item.icon size={20} strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-bold">{item.label}</p>
                          <p className={`text-[11px] mt-0.5 ${activeTab === item.id ? 'text-white/70' : 'text-white/40'}`}>{item.desc}</p>
                        </div>
                        <ChevronRight size={16} className={activeTab === item.id ? 'text-white/60' : 'text-white/20'} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-white/10">
              <button
                onClick={() => navigateTo('settings')}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all active:scale-[0.98] ${activeTab === 'settings'
                  ? 'bg-[#FF9F1C] text-white shadow-lg'
                  : 'text-white/70 hover:bg-white/5'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${activeTab === 'settings' ? 'bg-white/20' : 'bg-white/10'}`}>
                  <Settings size={20} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[15px] font-bold">Settings</p>
                  <p className={`text-[11px] ${activeTab === 'settings' ? 'text-white/70' : 'text-white/40'}`}>Configuration hub</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MAIN CONTENT AREA                           */}
      {/* ============================================ */}
      <main className="flex-1 overflow-y-auto bg-transparent relative h-screen">

        {/* Mobile Header */}
        <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0]">
          {/* Primary header row */}
          <div className="px-4 lg:px-8 py-3 lg:py-5 flex items-center justify-between gap-3">
            {/* Left: Hamburger (mobile) + Page title */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="lg:hidden w-11 h-11 flex items-center justify-center rounded-xl bg-[#0B3060] text-white active:scale-95 transition-transform flex-shrink-0"
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <h2 className="text-lg lg:text-xl font-serif font-bold text-[#0B3060] truncate">{currentTabLabel}</h2>
                <p className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider hidden sm:block">ProviderOS</p>
              </div>
            </div>

            {/* Center: Search (desktop) */}
            <div className="hidden lg:flex items-center gap-4 bg-[#F7F8FA] px-4 py-2.5 rounded-xl border border-[#E2E8F0] w-96 focus-within:ring-2 focus-within:ring-[#0B3060]/10 transition-all">
              <Search className="text-[#94A3B8]" size={18} />
              <input
                type="text"
                placeholder="Search master data..."
                className="bg-transparent border-none outline-none text-sm font-medium w-full text-[#1A1A2E] placeholder-[#94A3B8]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Mobile search toggle */}
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="lg:hidden w-11 h-11 flex items-center justify-center rounded-xl bg-[#F7F8FA] text-[#64748B] active:bg-[#E2E8F0] transition-all"
              >
                <Search size={20} />
              </button>

              {/* Quick create */}
              <div className="relative">
                <button
                  onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                  className="w-11 h-11 bg-[#0B3060] text-white rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-lg shadow-[#0B3060]/20"
                >
                  <Plus size={20} />
                </button>

                {/* Desktop action dropdown */}
                {isActionMenuOpen && (
                  <div className="hidden lg:block absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-xl border border-[#E2E8F0] p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest p-3 border-b border-[#F7F8FA] mb-1">Create New...</div>
                    <button onClick={() => { setActiveModal('payment_link'); setIsActionMenuOpen(false); }}
                      className="w-full text-left px-4 py-3 text-sm font-semibold text-[#1A1A2E] hover:bg-[#F7F8FA] rounded-lg flex items-center gap-3 transition-all">
                      <Zap size={16} className="text-blue-600" /> Payment Link
                    </button>
                    <button onClick={() => { setActiveModal('invoice'); setIsActionMenuOpen(false); }}
                      className="w-full text-left px-4 py-3 text-sm font-semibold text-[#1A1A2E] hover:bg-[#F7F8FA] rounded-lg flex items-center gap-3 transition-all">
                      <FileText size={16} className="text-emerald-600" /> Invoice
                    </button>
                    <button onClick={() => { setActiveModal('subscription'); setIsActionMenuOpen(false); }}
                      className="w-full text-left px-4 py-3 text-sm font-semibold text-[#1A1A2E] hover:bg-[#F7F8FA] rounded-lg flex items-center gap-3 transition-all">
                      <RefreshCw size={16} className="text-amber-600" /> Subscription
                    </button>
                  </div>
                )}
              </div>

              {/* Notifications */}
              <button className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#F7F8FA] text-[#64748B] active:bg-[#E2E8F0] transition-all relative">
                <Bell size={20} />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
              </button>

              {/* Avatar (desktop) */}
              <div className="hidden lg:flex w-10 h-10 rounded-full bg-[#0B3060] items-center justify-center text-white font-bold text-sm">
                JW
              </div>
            </div>
          </div>

          {/* Mobile search bar (expandable) */}
          {isSearchOpen && (
            <div className="lg:hidden px-4 pb-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-3 bg-[#F7F8FA] px-4 py-3 rounded-2xl border border-[#E2E8F0] focus-within:ring-2 focus-within:ring-[#0B3060]/10">
                <Search className="text-[#94A3B8] flex-shrink-0" size={18} />
                <input
                  type="text"
                  placeholder="Search leads, clients, payments..."
                  className="bg-transparent border-none outline-none text-[15px] font-medium w-full text-[#1A1A2E] placeholder-[#94A3B8]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="p-1">
                    <X size={16} className="text-[#94A3B8]" />
                  </button>
                )}
              </div>
            </div>
          )}
        </header>

        {/* Content Area */}
        <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-28 lg:pb-8">
          {isLoading && leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40 animate-reveal">
              <div className="w-14 h-14 border-4 border-[#FF9F1C] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-[#94A3B8] font-serif italic text-lg">Synchronizing Data...</p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && <Dashboard leads={leads} clients={clients} payments={payments} metrics={metrics} configs={configs} onConnectStripe={() => setActiveTab('settings')} />}
              {activeTab === 'crm' && (
                <RelationshipHub
                  leads={leads}
                  clients={clients}
                  payments={payments}
                  projects={projects}
                  sessions={sessions}
                  onUpdateLead={updateLead}
                  onRequestLink={(lead) => { setActiveModal('payment_link'); }}
                />
              )}
              {activeTab === 'leads_research' && <LeadDatabase />}
              {activeTab === 'deals' && <DealsManager deals={deals} onUpdateDeal={() => { }} />}
              {activeTab === 'payments' && <PaymentsManager payments={payments} clients={clients} />}
              {activeTab === 'payment_links' && <PaymentLinksManager />}
              {activeTab === 'sessions' && <SessionsManager sessions={sessions} />}
              {activeTab === 'projects' && <ProjectsManager projects={projects} payments={payments} />}
              {activeTab === 'tasks' && <OperationsManager tasks={tasks} />}
              {activeTab === 'contracts' && <ContractsManager contracts={contracts} clients={clients} onUpdateContract={updateContract} />}
              {activeTab === 'settings' && <SettingsManager configs={configs} onRefresh={syncAllData} />}
            </>
          )}
        </div>
      </main>

      {/* ============================================ */}
      {/* MOBILE BOTTOM NAV                           */}
      {/* ============================================ */}
      <nav className="fixed bottom-0 left-0 right-0 lg:hidden mobile-bottom-nav z-50">
        <div className="flex items-stretch justify-around px-2">
          {/* Dashboard */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`mobile-nav-btn flex flex-col items-center justify-center gap-1 py-3 px-3 flex-1 transition-all ${activeTab === 'dashboard' ? 'mobile-nav-active' : ''}`}
          >
            <LayoutGrid size={22} strokeWidth={activeTab === 'dashboard' ? 2.5 : 1.8} />
            <span className="text-[10px] font-bold">Home</span>
          </button>

          {/* Research Lab */}
          <button
            onClick={() => setActiveTab('leads_research')}
            className={`mobile-nav-btn flex flex-col items-center justify-center gap-1 py-3 px-3 flex-1 transition-all ${activeTab === 'leads_research' ? 'mobile-nav-active' : ''}`}
          >
            <Globe size={22} strokeWidth={activeTab === 'leads_research' ? 2.5 : 1.8} />
            <span className="text-[10px] font-bold">Research</span>
          </button>

          {/* Central Action Hub */}
          <button
            onClick={() => setIsActionMenuOpen(true)}
            className="flex items-center justify-center -mt-5 mx-1"
          >
            <div className="w-14 h-14 bg-[#FF9F1C] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#FF9F1C]/30 active:scale-90 transition-transform ring-4 ring-[#F7F8FA]">
              <Plus size={26} strokeWidth={2.5} />
            </div>
          </button>

          {/* CRM */}
          <button
            onClick={() => setActiveTab('crm')}
            className={`mobile-nav-btn flex flex-col items-center justify-center gap-1 py-3 px-3 flex-1 transition-all ${activeTab === 'crm' ? 'mobile-nav-active' : ''}`}
          >
            <Users size={22} strokeWidth={activeTab === 'crm' ? 2.5 : 1.8} />
            <span className="text-[10px] font-bold">CRM</span>
          </button>

          {/* More Menu */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className={`mobile-nav-btn flex flex-col items-center justify-center gap-1 py-3 px-3 flex-1 transition-all ${['deals', 'payments', 'payment_links', 'sessions', 'projects', 'tasks', 'contracts', 'settings'].includes(activeTab) ? 'mobile-nav-active' : ''}`}
          >
            <Menu size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-bold">More</span>
          </button>
        </div>
      </nav>

      {/* ============================================ */}
      {/* MOBILE ACTION SHEET (Create New)            */}
      {/* ============================================ */}
      {isActionMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setIsActionMenuOpen(false)}>
          <div className="bg-white w-full rounded-t-[28px] p-5 pb-safe mobile-sheet-enter" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1.5 bg-[#E2E8F0] rounded-full mx-auto mb-6"></div>

            <h3 className="text-xl font-serif font-bold text-[#0B3060] mb-5 px-1">Create New</h3>

            <div className="space-y-3">
              <button
                onClick={() => { setActiveModal('payment_link'); setIsActionMenuOpen(false); }}
                className="w-full p-4 bg-white border border-[#E2E8F0] rounded-2xl flex items-center gap-4 active:bg-[#F7F8FA] active:scale-[0.98] transition-all shadow-sm"
              >
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 flex-shrink-0">
                  <Zap size={24} />
                </div>
                <div className="text-left flex-1">
                  <p className="text-[15px] font-bold text-[#1A1A2E]">Payment Link</p>
                  <p className="text-xs text-[#94A3B8]">Secure checkout for any product</p>
                </div>
                <ArrowRight size={18} className="text-[#CBD5E1]" />
              </button>
              <button
                onClick={() => { setActiveModal('invoice'); setIsActionMenuOpen(false); }}
                className="w-full p-4 bg-white border border-[#E2E8F0] rounded-2xl flex items-center gap-4 active:bg-[#F7F8FA] active:scale-[0.98] transition-all shadow-sm"
              >
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 flex-shrink-0">
                  <FileText size={24} />
                </div>
                <div className="text-left flex-1">
                  <p className="text-[15px] font-bold text-[#1A1A2E]">Invoice</p>
                  <p className="text-xs text-[#94A3B8]">Bill a client directly</p>
                </div>
                <ArrowRight size={18} className="text-[#CBD5E1]" />
              </button>
              <button
                onClick={() => { setActiveModal('subscription'); setIsActionMenuOpen(false); }}
                className="w-full p-4 bg-white border border-[#E2E8F0] rounded-2xl flex items-center gap-4 active:bg-[#F7F8FA] active:scale-[0.98] transition-all shadow-sm"
              >
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-100 flex-shrink-0">
                  <RefreshCw size={24} />
                </div>
                <div className="text-left flex-1">
                  <p className="text-[15px] font-bold text-[#1A1A2E]">Subscription</p>
                  <p className="text-xs text-[#94A3B8]">Recurring revenue engine</p>
                </div>
                <ArrowRight size={18} className="text-[#CBD5E1]" />
              </button>
            </div>

            {/* Quick navigate to research */}
            <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
              <button
                onClick={() => { navigateTo('leads_research'); setIsActionMenuOpen(false); }}
                className="w-full p-4 bg-[#0B3060] rounded-2xl flex items-center gap-4 active:bg-[#0a2850] active:scale-[0.98] transition-all"
              >
                <div className="w-14 h-14 bg-white/10 text-white rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Globe size={24} />
                </div>
                <div className="text-left flex-1">
                  <p className="text-[15px] font-bold text-white">Research Leads</p>
                  <p className="text-xs text-white/60">Analyze websites & score leads</p>
                </div>
                <ArrowRight size={18} className="text-white/40" />
              </button>
            </div>

            <button
              onClick={() => setIsActionMenuOpen(false)}
              className="w-full mt-4 py-4 rounded-2xl font-bold text-[#94A3B8] active:text-[#1A1A2E] active:bg-[#F7F8FA] transition-all text-[15px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Global Quick Action Modals */}
      <GlobalHyperLinkEngine
        isOpen={activeModal === 'payment_link'}
        onClose={() => setActiveModal(null)}
        leads={leads}
        clients={clients}
      />
    </div>
  );
};

export default App;
