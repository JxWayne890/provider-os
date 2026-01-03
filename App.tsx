
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, CreditCard, Calendar, Briefcase, CheckSquare, Settings, Menu, Bell, Search, Database, Target, FileText, Zap, LayoutGrid, ChevronRight, Sparkles } from 'lucide-react';
import Dashboard from './components/Dashboard';
import LeadsManager from './components/LeadsManager';
import DealsManager from './components/DealsManager';
import PaymentsManager from './components/PaymentsManager';
import ClientsManager from './components/ClientsManager';
import SessionsManager from './components/SessionsManager';
import ProjectsManager from './components/ProjectsManager';
import OperationsManager from './components/OperationsManager';
import SettingsManager from './components/SettingsManager';
import { fetchSheetData, updateSheetRow } from './services/sheetsService';
import { Lead, Client, Payment, Session, DealStage, ClientStatus, Deal, Project, Task, Metric } from './types';

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

interface ConfigItem {
  settingKey: string;
  value: string;
  description: string;
  category: string;
}

type Tab = 'dashboard' | 'leads' | 'deals' | 'clients' | 'payments' | 'sessions' | 'projects' | 'tasks' | 'settings';

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
          owner: row[19], createdDate: row[20], lastTouchDate: row[21]
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
          id: row[0], participantId: row[1], type: row[2], scheduledAt: row[3],
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
      {/* Luminous Sidebar */}
      <aside className="w-72 luminous-sidebar flex flex-col z-20 overflow-y-auto">
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
              { id: 'leads', icon: Target, label: 'Leads Engine' },
              { id: 'deals', icon: FileText, label: 'Deals/Proposals' },
              { id: 'clients', icon: Users, label: 'Clients' },
              { id: 'payments', icon: CreditCard, label: 'Payments' },
              { id: 'sessions', icon: Calendar, label: 'Sessions' },
              { id: 'projects', icon: Briefcase, label: 'Projects' },
              { id: 'tasks', icon: CheckSquare, label: 'Operations' },
            ].map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as Tab)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all animate-reveal ${activeTab === item.id
                  ? 'bg-[#E8E8E8] text-[#B8860B] shadow-inner font-bold'
                  : 'text-[#86868B] hover:bg-white hover:text-[#1D1D1F]'
                  }`}
                style={{ animationDelay: `${0.2 + idx * 0.05}s` }}
              >
                <item.icon size={18} strokeWidth={2.5} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8">
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all animate-reveal ${activeTab === 'settings'
              ? 'bg-[#E8E8E8] text-[#B8860B]'
              : 'text-[#86868B] hover:bg-white'
              }`}
            style={{ animationDelay: '0.6s' }}
          >
            <Settings size={18} strokeWidth={2.5} />
            Config Hub
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-transparent relative h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-10 px-8 py-6 bg-white/60 backdrop-blur-md border-b border-black/5 flex items-center justify-between">
          <div className="flex items-center gap-4 bg-[#F5F5F7] px-4 py-2 rounded-2xl border border-black/5 w-96 animate-reveal">
            <Search className="text-[#86868B]" size={18} />
            <input
              type="text"
              placeholder="Search everything..."
              className="bg-transparent border-none outline-none text-sm font-medium w-full text-[#1D1D1F]"
            />
            <span className="text-[10px] font-bold text-[#86868B] bg-white px-1.5 py-0.5 rounded border border-black/5">⌘K</span>
          </div>

          <div className="flex items-center gap-4 animate-reveal">
            <button className="p-2.5 text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-xl transition-all relative">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#B8860B] to-[#D4AF37] border-2 border-white shadow-md"></div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {isLoading && leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40 animate-reveal">
              <div className="w-12 h-12 border-4 border-[#B8860B] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-[#86868B] font-serif italic text-lg">Synchronizing Master Sheet...</p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && <Dashboard leads={leads} clients={clients} payments={payments} metrics={metrics} configs={configs} />}
              {activeTab === 'leads' && <LeadsManager leads={leads} onUpdateLead={updateLead} />}
              {activeTab === 'deals' && <DealsManager deals={deals} onUpdateDeal={() => { }} />}
              {activeTab === 'payments' && <PaymentsManager payments={payments} clients={clients} />}
              {activeTab === 'sessions' && <SessionsManager sessions={sessions} />}
              {activeTab === 'projects' && <ProjectsManager projects={projects} />}
              {activeTab === 'tasks' && <OperationsManager tasks={tasks} />}
              {activeTab === 'settings' && <SettingsManager configs={configs} onRefresh={syncAllData} />}
              {activeTab === 'clients' && <ClientsManager clients={clients} payments={payments} projects={projects} sessions={sessions} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
