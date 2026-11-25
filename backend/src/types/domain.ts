export type Role = 'ADMIN' | 'SALES_MANAGER' | 'SALES_AGENT';
export type LeadClassification = 'HOT' | 'WARM' | 'COLD';
export type PipelineStage = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
export type ConversationStatus = 'IDLE' | 'CONNECTING' | 'LISTENING' | 'PROCESSING' | 'SPEAKING' | 'INTERRUPTED' | 'COMPLETED' | 'FAILED';
export type MessageSender = 'CUSTOMER' | 'AI_AGENT' | 'SYSTEM';
export type SentimentCategory = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'INDEXED' | 'FAILED';
export type AppointmentType = 'PRODUCT_DEMO' | 'SALES_CONSULTATION' | 'FOLLOW_UP_CALL' | 'TECHNICAL_DISCUSSION';
export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'RESCHEDULED' | 'CANCELLED' | 'COMPLETED';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type HandoffStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';
export type ToolExecutionStatus = 'SUCCESS' | 'FAILED' | 'BLOCKED';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  industry?: string | null;
  plan: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  organizationId: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: Role;
  avatarUrl?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentConfiguration {
  id: string;
  organizationId: string;
  agentName: string;
  companyName: string;
  personality: string;
  greetingMessage: string;
  salesTone: string;
  supportedLanguages: string[];
  productSummary: string;
  businessHours: string;
  appointmentDurationMin: number;
  hotThreshold: number;
  warmThreshold: number;
  escalationRules: string;
  requireConsentForAudio: boolean;
  retentionDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  organizationId: string;
  name: string;
  industry?: string | null;
  sizeRange?: string | null;
  employeeCount?: number | null;
  website?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  organizationId: string;
  companyId?: string | null;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  preferredLang: string;
  jobTitle?: string | null;
  notes?: string | null;
  consentRecorded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScoreBreakdown {
  purchaseIntent: { score: number; max: number; reason: string };
  budgetFit: { score: number; max: number; reason: string };
  urgency: { score: number; max: number; reason: string };
  requirementFit: { score: number; max: number; reason: string };
  decisionAuthority: { score: number; max: number; reason: string };
  total: number;
  classification: LeadClassification;
  summary: string;
}

export interface Lead {
  id: string;
  organizationId: string;
  customerId: string;
  companyId?: string | null;
  assignedToId?: string | null;
  title: string;
  industry?: string | null;
  companySize?: number | null;
  budgetText?: string | null;
  budgetMonthlyInr?: number | null;
  requirements?: string | null;
  productInterest?: string | null;
  recommendedPlan?: string | null;
  leadSource: string;
  purchasingTimeline?: string | null;
  decisionAuthority?: string | null;
  score: number;
  scoreBreakdown?: ScoreBreakdown | null;
  classification: LeadClassification;
  stage: PipelineStage;
  sentiment: SentimentCategory;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  organizationId: string;
  customerId?: string | null;
  leadId?: string | null;
  language: string;
  status: ConversationStatus;
  mode: 'LIVE' | 'DEMO';
  startedAt: string;
  endedAt?: string | null;
  durationSeconds: number;
  audioConsent: boolean;
  sessionMemory?: Record<string, unknown> | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: MessageSender;
  content: string;
  language?: string | null;
  sources?: Array<{ documentId: string; title: string; chunkIndex: number; score: number; snippet: string }> | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface CallSummary {
  id: string;
  conversationId: string;
  customerOverview: string;
  mainRequirements: string[];
  productsDiscussed: string[];
  budgetInfo?: string | null;
  purchaseIntent: string;
  objections: string[];
  sentiment: SentimentCategory;
  leadScore: number;
  qualificationStatus: LeadClassification;
  appointmentDetails?: string | null;
  followUpActions: string[];
  recommendedNextStep: string;
  createdAt: string;
  updatedAt: string;
}

export interface SentimentAnalysis {
  id: string;
  conversationId: string;
  category: SentimentCategory;
  score: number;
  frustrationDetected: boolean;
  hesitationDetected: boolean;
  buyingSignals: string[];
  keyPhrases: string[];
  concerns: string[];
  interestLevel: string;
  urgency: string;
  satisfaction: string;
  recommendedNextAction: string;
  explanation: string;
  isAiGenerated: boolean;
  createdAt: string;
}

export interface KnowledgeDocument {
  id: string;
  organizationId: string;
  uploadedById?: string | null;
  title: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  status: DocumentStatus;
  chunkCount: number;
  errorMessage?: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeChunk {
  id: string;
  organizationId: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  metadata?: Record<string, unknown> | null;
  embedding?: number[] | null;
  createdAt: string;
}

export interface Appointment {
  id: string;
  organizationId: string;
  customerId: string;
  leadId?: string | null;
  assignedToId?: string | null;
  title: string;
  type: AppointmentType;
  status: AppointmentStatus;
  startTime: string;
  endTime: string;
  notes?: string | null;
  meetingLink?: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpTask {
  id: string;
  organizationId: string;
  customerId?: string | null;
  leadId?: string | null;
  assignedToId?: string | null;
  title: string;
  description?: string | null;
  dueDate: string;
  status: TaskStatus;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesActivity {
  id: string;
  organizationId: string;
  customerId?: string | null;
  leadId?: string | null;
  userId?: string | null;
  activityType: string;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AgentToolExecution {
  id: string;
  conversationId: string;
  toolName: string;
  inputParams: Record<string, unknown>;
  status: ToolExecutionStatus;
  result?: Record<string, unknown> | null;
  errorDetails?: string | null;
  durationMs: number;
  executedAt: string;
}

export interface HumanHandoff {
  id: string;
  organizationId: string;
  conversationId: string;
  customerId?: string | null;
  assignedToId?: string | null;
  reason: string;
  summary?: string | null;
  status: HandoffStatus;
  priority: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: string;
}
