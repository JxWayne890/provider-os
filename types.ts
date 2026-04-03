// ============================================================
// Outreach System Enums
// ============================================================

export enum CampaignStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
}

export enum SendStatus {
  QUEUED = 'queued',
  SENDING = 'sending',
  SENT = 'sent',
  OPENED = 'opened',
  CLICKED = 'clicked',
  REPLIED = 'replied',
  BOUNCED = 'bounced',
  FAILED = 'failed',
  SUPPRESSED = 'suppressed',
}

export enum SuppressionReason {
  UNSUBSCRIBED = 'unsubscribed',
  BOUNCED = 'bounced',
  REPLIED = 'replied',
  MANUAL = 'manual',
  COMPLAINED = 'complained',
}

export enum TrackingEventType {
  OPEN = 'open',
  CLICK = 'click',
  UNSUBSCRIBE = 'unsubscribe',
}

// ============================================================
// Website Research & AI Personalization Types
// ============================================================

export interface WebsiteAnalysis {
  hasWebsite: boolean;
  isReachable: boolean;
  httpStatus: number;
  hasSSL: boolean;
  isMobileResponsive: boolean;
  hasSchemaMarkup: boolean;
  metaTitle: string;
  metaDescription: string;
  h1Tags: string[];
  cityServicePages: boolean;
  estimatedPageCount: number;
  techStack: string[];
  loadTimeMs: number;
  seoIssues: string[];
  overallAssessment: string;
  keyFindings: string[];
}

export type WebsiteStatus = 'pending' | 'crawling' | 'crawled' | 'no_website' | 'error';
export type PersonalizationStatus = 'pending' | 'generating' | 'done' | 'error';

// ============================================================
// Outreach System Interfaces
// ============================================================

export interface Campaign {
  id: string;
  name: string;
  subjectTemplate: string;
  bodyTemplate: string;
  fromName: string;
  fromEmail: string;
  status: CampaignStatus;
  dailyLimit: number;
  sendTime: string;
  weekdaysOnly: boolean;
  warmupEnabled: boolean;
  warmupDay: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignLead {
  id: string;
  campaignId: string;
  email: string;
  companyName: string;
  city: string;
  state: string;
  country: string;
  website: string;
  verificationStatus: string;
  sendStatus: SendStatus;
  engagementScore: number;
  sentAt?: string;
  openedAt?: string;
  clickedAt?: string;
  repliedAt?: string;
  bouncedAt?: string;
  errorMessage?: string;
  createdAt: string;
  // Research & personalization fields
  websiteStatus: WebsiteStatus;
  websiteScore: number;
  websiteAnalysis: WebsiteAnalysis | Record<string, never>;
  personalizedSubject?: string;
  personalizedBody?: string;
  personalizationStatus: PersonalizationStatus;
  researchCompletedAt?: string;
  priorityRank: number;
  // Email verification fields
  emailStatus?: string;
  emailValid?: boolean;
  emailVerification?: {
    valid: boolean;
    status: string;
    mx_records: { exchange: string; priority: number }[];
    domain?: string;
    is_free_provider?: boolean;
    reason: string;
  };
}

export interface SuppressionEntry {
  id: string;
  email: string;
  reason: SuppressionReason;
  suppressedAt: string;
  sourceCampaignId?: string;
}

export interface SendLogEntry {
  id: string;
  campaignId: string;
  campaignLeadId: string;
  email: string;
  resendMessageId?: string;
  status: string;
  batchId?: string;
  sentAt: string;
  openedAt?: string;
  clickedAt?: string;
  errorMessage?: string;
}

export interface TrackingEvent {
  id: string;
  sendLogId?: string;
  campaignLeadId: string;
  eventType: TrackingEventType;
  linkUrl?: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  campaignLeadId?: string;
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  scheduledAt: string;
  googleEventId?: string;
  googleMeetLink?: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  source: string;
  createdAt: string;
}

export interface CampaignStats {
  totalLeads: number;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
  failed: number;
  suppressed: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  bounceRate: number;
}

export interface ResearchStats {
  total: number;
  pending: number;
  crawled: number;
  noWebsite: number;
  errors: number;
  avgScore: number;
  scoreDistribution: Record<string, number>;
}

export interface PersonalizationStats {
  total: number;
  pending: number;
  done: number;
  errors: number;
}

// ============================================================
// Existing Enums
// ============================================================

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
  stripePaymentLink?: string;
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
  projectId?: string;
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
  relatedId: string;
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
  settingKey?: string;
  value: string;
  description: string;
  category: string;
}

export interface Contract {
  id: string;
  clientId?: string;
  recipientName: string;
  recipientEmail: string;
  title: string;
  content: string;
  status: 'Draft' | 'Sent' | 'Signed' | 'Declined';
  createdAt: string;
  sentAt?: string;
  signedAt?: string;
  signatureData?: string;
}

export interface Notification {
  id: string;
  type: 'payment_received' | 'invoice_overdue' | 'meeting_soon' | 'contract_signed' | 'booking_created' | 'lead_replied';
  title: string;
  message: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export interface Proposal {
  id: string;
  clientId: string;
  title: string;
  lineItems: { description: string; price: number }[];
  total: number;
  terms: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Declined' | 'Expired';
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string;
  proposalUrl?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: 'Software' | 'Hosting' | 'Domains' | 'Tools' | 'Marketing' | 'Other';
  vendor: string;
  date: string;
  recurring: boolean;
  clientId?: string;
  projectId?: string;
  receiptUrl?: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  entityType: 'client' | 'project' | 'contract';
  entityId: string;
  uploadedAt: string;
}
