
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, CreditCard, Calendar, Briefcase, CheckSquare, Settings, Menu, Bell, Search, Database, Target, FileText, Zap, LayoutGrid, ChevronRight, Sparkles, Package, Plus, RefreshCw } from 'lucide-react';
import Dashboard from './components/Dashboard';
import LeadsManager from './components/LeadsManager';
import DealsManager from './components/DealsManager';
import PaymentsManager from './components/PaymentsManager';
import ClientsManager from './components/ClientsManager';
import SessionsManager from './components/SessionsManager';
import ProjectsManager from './components/ProjectsManager';
import OperationsManager from './components/OperationsManager';
import SettingsManager from './components/SettingsManager';
import RelationshipHub from './components/RelationshipHub';
import GlobalHyperLinkEngine from './components/GlobalHyperLinkEngine';
import { fetchSheetData, updateSheetRow } from './services/sheetsService';
import { Lead, Client, Payment, Session, DealStage, ClientStatus, Deal, Project, Task, Metric, ConfigItem } from './types';

// Tab names used in Google Sheets
const TABS = {
  LEADS: 'LEADS',
  CLIENTS: 'CLIENTS',
  DEALS: 'DEALS',
  PAYMENTS: 'PAYMENTS',
  SESSIONS: 'SESSIONS',
  PROJECTS: 'PROJECTS',
  TASKS: 'TASKS',
  METRICS: 'METRICS',
  CONFIG: 'CONFIG'
};

type Tab = 'dashboard' | 'crm' | 'deals' | 'payments' | 'sessions' | 'projects' | 'tasks' | 'settings';

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

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Global Action Menu State
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'payment_link' | 'invoice' | 'subscription' | null>(null);

  // Global Data Synchronization
  const syncAllData = async () => {
    setIsLoading(true);
    try {
      const results = await Promise.all([
        fetchSheetData(TABS.LEADS),
        fetchSheetData(TABS.CLIENTS),
        fetchSheetData(TABS.DEALS),
        fetchSheetData(TABS.PAYMENTS),
        fetchSheetData(TABS.SESSIONS),
        fetchSheetData(TABS.PROJECTS),
        fetchSheetData(TABS.TASKS),
        fetchSheetData(TABS.METRICS),
        fetchSheetData(TABS.CONFIG)
      ]);

      const [leadsRaw, clientsRaw, dealsRaw, paymentsRaw, sessionsRaw, projectsRaw, tasksRaw, metricsRaw, configsRaw] = results;

      if (configsRaw) {
        setConfigs(configsRaw.map((row: any) => ({
          key: row[0],
          settingKey: row[0],
          value: row[1],
          description: row[2],
          category: row[3]
        })));
      }

      if (leadsRaw) {
        setLeads(leadsRaw.map((row: any) => ({
          id: row[0], firstName: row[1], lastName: row[2], company: row[3], role: row[4],
          email: row[5], phone: row[6], website: row[7], source: row[8], industry: row[9],
          companySize: row[10], painSignals: row[11], techStack: row[12],
          leadScore: Number(row[13]) || 0, qualificationStatus: row[14], dealStage: row[15] as DealStage,
          outreachEmailDraft: row[16], outreachLinkedInDraft: row[17], nextAction: row[18],
          owner: row[19], createdDate: row[20], lastTouchDate: row[21],
          stripePaymentLink: row[22]
        })));
      }

      if (clientsRaw) {
        setClients(clientsRaw.map((row: any) => ({
          id: row[0], leadId: row[1], companyName: row[2], primaryContact: row[3],
          email: row[4], phone: row[5], status: row[6] as ClientStatus,
          servicePackage: row[7], billingType: row[8] as any, monthlyValue: Number(row[9]) || 0,
          totalContractValue: Number(row[10]) || 0, startDate: row[11],
          stripeCustomerId: row[12], notes: row[13], healthScore: Number(row[14]) || 0
        })));
      }

      if (dealsRaw) {
        setDeals(dealsRaw.map((row: any) => ({
          id: row[0], leadId: row[1], clientId: row[2], offerName: row[3],
          price: Number(row[4]) || 0, paymentTerms: row[5], stage: row[6] as DealStage,
          proposalLink: row[7], sentDate: row[8], decisionDate: row[9], outcome: row[10] as any
        })));
      }

      if (paymentsRaw) {
        setPayments(paymentsRaw.map((row: any) => ({
          id: row[0], clientId: row[1], stripeCustomerId: row[2], stripeId: row[3],
          amount: Number(row[4]) || 0, currency: row[5], type: row[6] as any,
          status: row[7] as any, dueDate: row[8], paidDate: row[9],
          stripeLink: row[10], notes: row[11]
        })));
      }

      if (sessionsRaw) {
        setSessions(sessionsRaw.map((row: any) => ({
          id: row[0], participantId: row[1], leadClientId: row[1],
          type: row[2], sessionType: row[2], scheduledAt: row[3],
          status: row[4] as any, meetingLink: row[5], recordingLink: row[6],
          transcriptLink: row[7], aiSummary: row[8], aiActionItems: row[9],
          followUpEmailDraft: row[10]
        })));
      }

      if (projectsRaw) {
        setProjects(projectsRaw.map((row: any) => ({
          id: row[0], clientId: row[1], name: row[2], scopeSummary: row[3],
          currentMilestone: row[4], status: row[5] as any, nextDeliverable: row[6],
          dueDate: row[7], risks: row[8]
        })));
      }

      if (tasksRaw) {
        setTasks(tasksRaw.map((row: any) => ({
          id: row[0], relatedId: row[1], description: row[2], priority: row[3] as any,
          owner: row[4], dueDate: row[5], status: row[6] as any, notes: row[7]
        })));
      }

      if (metricsRaw) {
        setMetrics(metricsRaw.map((row: any) => ({
          date: row[0], revenue: Number(row[1]) || 0, leads: Number(row[2]) || 0,
          conversionRate: Number(row[3]) || 0, activeProjects: Number(row[4]) || 0,
          pendingTasks: Number(row[5]) || 0, healthScore: Number(row[6]) || 0
        })));
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

  const updateLead = async (updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
    await updateSheetRow('LEADS', updatedLead.id, updatedLead);
  };

  return (
    <div className="flex h-screen bg-[#F5F5F7] text-[#1D1D1F] overflow-hidden font-sans">
      {/* Luminous Sidebar (Desktop Only) */}
      <aside className={`w-72 luminous-sidebar hidden lg:flex flex-col z-20 overflow-y-auto`}>
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-[#B8860B] rounded-xl flex items-center justify-center shadow-lg shadow-[#B8860B]/20 animate-reveal">
              <span className="text-white font-serif text-2xl font-bold">P</span>
            </div>
            <h1 className="text-2xl font-serif font-bold tracking-tight text-[#1D1D1F] animate-reveal" style={{ animationDelay: '0.1s' }}>
              ProviderOS
            </h1>
          </div>

          <nav className="space-y-2">
            {[
              { id: 'dashboard', icon: LayoutGrid, label: 'Dashboard' },
              { id: 'crm', icon: Users, label: 'Global CRM' },
              { id: 'deals', icon: FileText, label: 'Deals/Proposals' },
              { id: 'payments', icon: CreditCard, label: 'Payments' },
              { id: 'sessions', icon: Calendar, label: 'Sessions' },
              { id: 'projects', icon: Briefcase, label: 'Projects' },
              { id: 'tasks', icon: CheckSquare, label: 'Operations' },
            ].map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as Tab)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all animate-reveal ${activeTab === item.id
                  ? 'bg-[#121212] text-white shadow-md'
                  : 'text-[#666] hover:bg-gray-50 hover:text-[#121212]'
                  }`}
                style={{ animationDelay: `${0.1 + idx * 0.03}s` }}
              >
                <item.icon size={18} strokeWidth={2} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8">
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all animate-reveal ${activeTab === 'settings'
              ? 'bg-[#121212] text-white shadow-md'
              : 'text-[#666] hover:bg-gray-50'
              }`}
            style={{ animationDelay: '0.4s' }}
          >
            <Settings size={18} strokeWidth={2} />
            Config Hub
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-transparent relative h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-10 px-4 lg:px-8 py-4 lg:py-6 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 w-full lg:w-96 animate-reveal focus-within:ring-2 focus-within:ring-black/5 transition-all">
            <Search className="text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search master data..."
              className="bg-transparent border-none outline-none text-sm font-medium w-full text-[#121212] placeholder-gray-400"
            />
          </div>

          <div className="hidden lg:flex items-center gap-4 animate-reveal">
            {/* Global Quick Actions (Stripe-like) */}
            <div className="relative">
              <button
                onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                className="w-10 h-10 bg-[#121212] text-white rounded-full flex items-center justify-center hover:bg-[#2C2C2C] transition-all shadow-lg shadow-black/10 active:scale-95"
              >
                <Plus size={20} />
              </button>

              {isActionMenuOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest p-3 border-b border-gray-50 mb-1">Create New...</div>
                  <button
                    onClick={() => { setActiveModal('payment_link'); setIsActionMenuOpen(false); }}
                    className="w-full text-left px-4 py-3 text-sm font-semibold text-[#121212] hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-all"
                  >
                    <Zap size={16} className="text-blue-600" />
                    Payment Link
                  </button>
                  <button
                    onClick={() => { setActiveModal('invoice'); setIsActionMenuOpen(false); }}
                    className="w-full text-left px-4 py-3 text-sm font-semibold text-[#121212] hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-all"
                  >
                    <FileText size={16} className="text-emerald-600" />
                    Invoice
                  </button>
                  <button
                    onClick={() => { setActiveModal('subscription'); setIsActionMenuOpen(false); }}
                    className="w-full text-left px-4 py-3 text-sm font-semibold text-[#121212] hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-all"
                  >
                    <RefreshCw size={16} className="text-amber-600" />
                    Subscription
                  </button>
                </div>
              )}
            </div>

            <button className="p-2.5 text-gray-400 hover:text-[#121212] hover:bg-gray-50 rounded-xl transition-all relative">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full ring-2 ring-white"></span>
            </button>

            {/* User Avatar Placeholder */}
            <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 font-bold text-sm">
              JD
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-32 lg:pb-8">
          {isLoading && leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40 animate-reveal">
              <div className="w-12 h-12 border-4 border-[#B8860B] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-[#86868B] font-serif italic text-lg">Synchronizing Master Sheet...</p>
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
                  onRequestLink={(lead) => {
                    // We could pre-select the lead in GlobalHyperLinkEngine if we want
                    setActiveModal('payment_link');
                  }}
                />
              )}
              {activeTab === 'deals' && <DealsManager deals={deals} onUpdateDeal={() => { }} />}
              {activeTab === 'payments' && <PaymentsManager payments={payments} clients={clients} />}
              {activeTab === 'sessions' && <SessionsManager sessions={sessions} />}
              {activeTab === TABS.PROJECTS && <ProjectsManager projects={projects} payments={payments} />}
              {activeTab === 'tasks' && <OperationsManager tasks={tasks} />}
              {activeTab === 'settings' && <SettingsManager configs={configs} onRefresh={syncAllData} />}
            </>
          )}
        </div>
      </main>

      {/* Clean Swiss Bottom Nav (Mobile Only) */}
      <nav className="fixed bottom-0 left-0 right-0 lg:hidden bottom-nav z-50 flex items-center justify-between px-6 py-4 animate-in fade-in slide-in-from-bottom duration-500">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-black' : 'text-gray-400'}`}>
          <LayoutGrid size={22} strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
        </button>

        <button onClick={() => setActiveTab('crm')} className={`flex flex-col items-center gap-1 ${activeTab === 'crm' ? 'text-black' : 'text-gray-400'}`}>
          <Users size={22} strokeWidth={activeTab === 'crm' ? 2.5 : 2} />
        </button>

        {/* Central Action Hub */}
        <button
          onClick={() => setIsActionMenuOpen(true)}
          className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform -mt-6 ring-4 ring-white"
        >
          <Plus size={24} />
        </button>

        <button onClick={() => setActiveTab('payments')} className={`flex flex-col items-center gap-1 ${activeTab === 'payments' ? 'text-black' : 'text-gray-400'}`}>
          <CreditCard size={22} strokeWidth={activeTab === 'payments' ? 2.5 : 2} />
        </button>

        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 ${activeTab === 'settings' ? 'text-black' : 'text-gray-400'}`}>
          <Settings size={22} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
        </button>
      </nav>

      {/* Mobile Action Sheet Overlay */}
      {isActionMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setIsActionMenuOpen(false)}>
          <div className="bg-white w-full rounded-t-[32px] p-6 pb-12 animate-in slide-in-from-bottom duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-[#F0F0F0] rounded-full mx-auto mb-8"></div>

            <h3 className="text-xl font-serif font-bold text-[#121212] mb-6">Create New</h3>

            <div className="space-y-3">
              <button
                onClick={() => { setActiveModal('payment_link'); setIsActionMenuOpen(false); }}
                className="w-full p-4 bg-white border border-gray-100 rounded-2xl flex items-center gap-4 active:bg-gray-50 transition-all shadow-sm"
              >
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
                  <Zap size={22} />
                </div>
                <div className="text-left">
                  <p className="text-base font-bold text-[#121212]">Payment Link</p>
                  <p className="text-xs text-gray-400">Secure checkout for any product</p>
                </div>
              </button>
              <button
                onClick={() => { setActiveModal('invoice'); setIsActionMenuOpen(false); }}
                className="w-full p-4 bg-white border border-gray-100 rounded-2xl flex items-center gap-4 active:bg-gray-50 transition-all shadow-sm"
              >
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
                  <FileText size={22} />
                </div>
                <div className="text-left">
                  <p className="text-base font-bold text-[#121212]">Invoice</p>
                  <p className="text-xs text-gray-400">Bill a client directly</p>
                </div>
              </button>
              <button
                onClick={() => { setActiveModal('subscription'); setIsActionMenuOpen(false); }}
                className="w-full p-4 bg-white border border-gray-100 rounded-2xl flex items-center gap-4 active:bg-gray-50 transition-all shadow-sm"
              >
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100">
                  <RefreshCw size={22} />
                </div>
                <div className="text-left">
                  <p className="text-base font-bold text-[#121212]">Subscription</p>
                  <p className="text-xs text-gray-400">Recurring revenue engine</p>
                </div>
              </button>
            </div>
            <button
              onClick={() => setIsActionMenuOpen(false)}
              className="w-full mt-6 py-4 rounded-xl font-bold text-gray-400 hover:text-black transition-all"
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
