
export enum DealStage {
  NEW = 'New',
  CONTACTED = 'Contacted',
  RESPONDED = 'Responded',
  CALL_BOOKED = 'Call Booked',
  PROPOSAL_SENT = 'Proposal Sent',
  WON = 'Won',
  LOST = 'Lost'
}

export enum ClientStatus {
  ONBOARDING = 'Onboarding',
  ACTIVE = 'Active',
  PAUSED = 'Paused',
  INACTIVE = 'Inactive',
  COMPLETED = 'Completed',
  AT_RISK = 'At Risk'
}

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  role: string;
  email: string;
  phone: string;
  website: string;
  source: string;
  industry: string;
  companySize: string;
  painSignals: string;
  techStack: string;
  leadScore: number;
  qualificationStatus: 'Unqualified' | 'Qualified' | 'Disqualified';
  dealStage: DealStage;
  outreachEmailDraft: string;
  outreachLinkedInDraft: string;
  nextAction: string;
  owner: string;
  createdDate: string;
  lastTouchDate: string;
}

export interface Client {
  id: string;
  leadId: string;
  companyName: string;
  primaryContact: string;
  email: string;
  phone: string;
  status: ClientStatus;
  servicePackage: string;
  billingType: 'One-time' | 'Subscription' | 'Retainer';
  monthlyValue: number;
  totalContractValue: number;
  startDate: string;
  stripeCustomerId: string;
  notes: string;
  healthScore: number;
}

export interface Deal {
  id: string;
  leadId: string;
  clientId?: string;
  offerName: string;
  price: number;
  paymentTerms: string;
  stage: DealStage;
  proposalLink: string;
  sentDate: string;
  decisionDate?: string;
  outcome: 'Won' | 'Lost' | 'Pending';
}

export interface Payment {
  id: string;
  clientId: string;
  stripeCustomerId: string;
  stripeId: string;
  amount: number;
  currency: string;
  type: 'Invoice' | 'Subscription' | 'One-time';
  status: 'Paid' | 'Failed' | 'Past Due' | 'Refunded';
  dueDate: string;
  paidDate?: string;
  stripeLink: string;
  notes: string;
}

export interface Session {
  id: string;
  leadClientId: string;
  sessionType: string;
  scheduledAt: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  meetingLink?: string;
  recordingLink?: string;
  transcriptLink?: string;
  aiSummary?: string;
  aiActionItems?: string[];
  followUpEmailDraft?: string;
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  scopeSummary: string;
  currentMilestone: string;
  status: 'Planning' | 'In Progress' | 'Blocked' | 'Finished';
  nextDeliverable: string;
  dueDate: string;
  risks: string;
}

export interface Task {
  id: string;
  relatedId: string; // Lead/Client/Project ID
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  owner: string;
  dueDate: string;
  status: 'Todo' | 'In Progress' | 'Done';
  notes: string;
}

export interface Metric {
  date: string;
  revenue: number;
  leads: number;
  totalRevenue?: number;
  leadCount?: number;
  conversionRate: number;
  activeProjects: number;
  pendingTasks: number;
  healthScore: number;
}

export interface ConfigItem {
  key: string;
  settingKey?: string; // Optional for backward compatibility
  value: string;
  description: string;
  category: string;
}
