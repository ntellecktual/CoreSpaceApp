import { useCallback, useRef, useState } from 'react';
import { todayFormatted, toSortableDate } from '../formatDate';
import type {
  AiAgentConfig,
  AiConversationMessage,
  AiSession,
  AiToolCall,
  WorkspaceDefinition,
  SubSpaceDefinition,
  ShellConfig,
  SignalFlow,
  EndUserPersona,
  LifecycleStage,
  RuntimeRecord,
  ClientProfile,
} from '../types';
import {
  addAssistantMessage,
  addPendingAssistantMessage,
  addUserMessage,
  createAiSession,
  DEFAULT_AI_CONFIG,
  removePendingMessages,
  SYSTEM_PROMPTS,
} from './tools';
import { useAppState } from '../context/AppStateContext';

// ─── Local AI Simulation ────────────────────────────────────────────
// When no real API key is configured, the AI hooks use a deterministic
// local engine that analyzes user input with keyword matching and
// generates workspace/flow proposals. This keeps the UI fully
// functional without any external dependencies.

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Industry Knowledge Base ────────────────────────────────────────

interface IndustryTemplate {
  keywords: string[];
  subjectSingular: string;
  subjectPlural: string;
  workspaceLabel: string;
  subSpaceLabel: string;
  workspaces: Array<{
    name: string;
    rootEntity: string;
    subSpaces: Array<{ name: string; sourceEntity: string; displayType: 'grid' | 'timeline' | 'summary' | 'split' | 'board'; fields: Array<{ label: string; type: string }> }>;
  }>;
  personas: Array<{ name: string; description: string }>;
  lifecycleStages: string[];
  flows: Array<{ name: string; signal: string; rules: string[]; action: string; tags: string[] }>;
}

const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    keywords: ['property', 'real estate', 'tenant', 'lease', 'maintenance', 'rental', 'apartment', 'building'],
    subjectSingular: 'Property Unit',
    subjectPlural: 'Property Units',
    workspaceLabel: 'Property Workspace',
    subSpaceLabel: 'Management Area',
    workspaces: [
      {
        name: 'Lease Management',
        rootEntity: 'Property Unit',
        subSpaces: [
          { name: 'Active Leases', sourceEntity: 'Lease Agreement', displayType: 'grid', fields: [{ label: 'Tenant Name', type: 'text' }, { label: 'Lease Start', type: 'date' }, { label: 'Lease End', type: 'date' }, { label: 'Monthly Rent', type: 'number' }] },
          { name: 'Lease Renewals', sourceEntity: 'Renewal Request', displayType: 'board', fields: [{ label: 'Current Lease ID', type: 'text' }, { label: 'Proposed Rent', type: 'number' }, { label: 'Response Date', type: 'date' }] },
          { name: 'Move In / Move Out', sourceEntity: 'Transition Event', displayType: 'timeline', fields: [{ label: 'Event Type', type: 'select' }, { label: 'Scheduled Date', type: 'date' }, { label: 'Inspection Notes', type: 'longText' }] },
        ],
      },
      {
        name: 'Maintenance Operations',
        rootEntity: 'Property Unit',
        subSpaces: [
          { name: 'Maintenance Requests', sourceEntity: 'Work Order', displayType: 'board', fields: [{ label: 'Issue Description', type: 'longText' }, { label: 'Priority', type: 'select' }, { label: 'Reported Date', type: 'date' }, { label: 'Assigned To', type: 'text' }] },
          { name: 'Inspections', sourceEntity: 'Inspection Report', displayType: 'grid', fields: [{ label: 'Inspector', type: 'text' }, { label: 'Inspection Date', type: 'date' }, { label: 'Result', type: 'select' }, { label: 'Notes', type: 'longText' }] },
          { name: 'Vendor Contracts', sourceEntity: 'Vendor Contract', displayType: 'grid', fields: [{ label: 'Vendor Name', type: 'text' }, { label: 'Service Type', type: 'select' }, { label: 'Contract End', type: 'date' }, { label: 'Amount', type: 'number' }] },
        ],
      },
    ],
    personas: [
      { name: 'Property Manager', description: 'Oversees all property operations, leases, and maintenance.' },
      { name: 'Maintenance Technician', description: 'Handles work orders and inspection reports.' },
      { name: 'Leasing Agent', description: 'Manages tenant applications and lease agreements.' },
    ],
    lifecycleStages: ['Application', 'Approved', 'Active Lease', 'Renewal Pending', 'Move Out', 'Closed'],
    flows: [
      { name: 'Overdue Maintenance Alert', signal: 'Work order open > 48 hours', rules: ['priority = High', 'status = Open'], action: 'Escalate to Property Manager and send notification', tags: ['Priority:High', 'Type:Maintenance'] },
      { name: 'Lease Expiry Reminder', signal: 'Lease ending within 60 days', rules: ['lease_end_days <= 60', 'renewal_status = None'], action: 'Create renewal task and notify Leasing Agent', tags: ['Type:Lease', 'Status:Expiring'] },
    ],
  },
  {
    keywords: ['healthcare', 'hospital', 'patient', 'clinic', 'medical', 'doctor', 'appointment', 'prescription'],
    subjectSingular: 'Patient',
    subjectPlural: 'Patients',
    workspaceLabel: 'Clinical Workspace',
    subSpaceLabel: 'Care Area',
    workspaces: [
      {
        name: 'Patient Care',
        rootEntity: 'Patient',
        subSpaces: [
          { name: 'Appointments', sourceEntity: 'Appointment', displayType: 'board', fields: [{ label: 'Doctor', type: 'text' }, { label: 'Date', type: 'datetime' }, { label: 'Type', type: 'select' }, { label: 'Notes', type: 'longText' }] },
          { name: 'Prescriptions', sourceEntity: 'Prescription', displayType: 'grid', fields: [{ label: 'Medication', type: 'text' }, { label: 'Dosage', type: 'text' }, { label: 'Start Date', type: 'date' }, { label: 'End Date', type: 'date' }] },
          { name: 'Lab Results', sourceEntity: 'Lab Result', displayType: 'timeline', fields: [{ label: 'Test Name', type: 'text' }, { label: 'Result', type: 'text' }, { label: 'Date', type: 'date' }, { label: 'Flag', type: 'select' }] },
        ],
      },
    ],
    personas: [
      { name: 'Physician', description: 'Primary care provider managing patient visits and prescriptions.' },
      { name: 'Nurse', description: 'Assists with patient intake, vitals, and care coordination.' },
      { name: 'Front Desk', description: 'Manages scheduling and patient registration.' },
    ],
    lifecycleStages: ['Registered', 'Scheduled', 'In Progress', 'Completed', 'Follow-Up', 'Discharged'],
    flows: [
      { name: 'Missed Appointment Follow-Up', signal: 'Appointment marked as no-show', rules: ['status = No-Show'], action: 'Send follow-up notification and create reschedule task', tags: ['Type:Appointment', 'Status:NoShow'] },
    ],
  },
  {
    keywords: ['sales', 'crm', 'lead', 'deal', 'pipeline', 'opportunity', 'customer', 'prospect', 'revenue'],
    subjectSingular: 'Account',
    subjectPlural: 'Accounts',
    workspaceLabel: 'Sales Workspace',
    subSpaceLabel: 'Pipeline Stage',
    workspaces: [
      {
        name: 'Sales Pipeline',
        rootEntity: 'Account',
        subSpaces: [
          { name: 'Leads', sourceEntity: 'Lead', displayType: 'board', fields: [{ label: 'Contact Name', type: 'text' }, { label: 'Company', type: 'text' }, { label: 'Source', type: 'select' }, { label: 'Score', type: 'number' }] },
          { name: 'Opportunities', sourceEntity: 'Opportunity', displayType: 'board', fields: [{ label: 'Deal Name', type: 'text' }, { label: 'Value', type: 'number' }, { label: 'Close Date', type: 'date' }, { label: 'Stage', type: 'select' }] },
          { name: 'Activities', sourceEntity: 'Activity', displayType: 'timeline', fields: [{ label: 'Type', type: 'select' }, { label: 'Subject', type: 'text' }, { label: 'Date', type: 'datetime' }, { label: 'Notes', type: 'longText' }] },
        ],
      },
    ],
    personas: [
      { name: 'Sales Rep', description: 'Manages leads and deals through the sales pipeline.' },
      { name: 'Sales Manager', description: 'Oversees team quotas, pipeline health, and forecasting.' },
      { name: 'SDR', description: 'Qualifies inbound leads and schedules initial meetings.' },
    ],
    lifecycleStages: ['New Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
    flows: [
      { name: 'Stale Lead Alert', signal: 'Lead untouched for 7 days', rules: ['last_activity_days > 7', 'stage = New Lead'], action: 'Notify assigned rep and escalate to manager', tags: ['Type:Lead', 'Status:Stale'] },
      { name: 'Deal Won Celebration', signal: 'Opportunity marked Closed Won', rules: ['stage = Closed Won'], action: 'Create onboarding task and notify CS team', tags: ['Type:Deal', 'Status:Won'] },
    ],
  },
  {
    keywords: ['logistics', 'shipping', 'warehouse', 'inventory', 'supply chain', 'freight', 'delivery', 'fulfillment', 'order'],
    subjectSingular: 'Shipment',
    subjectPlural: 'Shipments',
    workspaceLabel: 'Logistics Workspace',
    subSpaceLabel: 'Operations Lane',
    workspaces: [
      {
        name: 'Order Fulfillment',
        rootEntity: 'Shipment',
        subSpaces: [
          { name: 'Inbound Receiving', sourceEntity: 'Receiving Event', displayType: 'grid', fields: [{ label: 'PO Number', type: 'text' }, { label: 'Supplier', type: 'text' }, { label: 'Expected Date', type: 'date' }, { label: 'SKU Count', type: 'number' }] },
          { name: 'Pick and Pack', sourceEntity: 'Pick Order', displayType: 'board', fields: [{ label: 'Order ID', type: 'text' }, { label: 'Priority', type: 'select' }, { label: 'Items', type: 'number' }, { label: 'Zone', type: 'text' }] },
          { name: 'Outbound Shipping', sourceEntity: 'Shipment Record', displayType: 'timeline', fields: [{ label: 'Tracking Number', type: 'text' }, { label: 'Carrier', type: 'select' }, { label: 'Ship Date', type: 'date' }, { label: 'Destination', type: 'text' }] },
        ],
      },
    ],
    personas: [
      { name: 'Warehouse Manager', description: 'Oversees inventory, receiving, and fulfillment operations.' },
      { name: 'Picker/Packer', description: 'Handles order picking and packing tasks.' },
      { name: 'Shipping Coordinator', description: 'Manages outbound shipments and carrier relations.' },
    ],
    lifecycleStages: ['Ordered', 'Received', 'Picking', 'Packed', 'Shipped', 'Delivered', 'Returned'],
    flows: [
      { name: 'Low Stock Alert', signal: 'SKU inventory below threshold', rules: ['quantity < reorder_point'], action: 'Create purchase order and notify procurement', tags: ['Type:Inventory', 'Priority:Low-Stock'] },
    ],
  },
  {
    keywords: ['education', 'school', 'student', 'course', 'teacher', 'enrollment', 'grade', 'class', 'university'],
    subjectSingular: 'Student',
    subjectPlural: 'Students',
    workspaceLabel: 'Academic Workspace',
    subSpaceLabel: 'Department',
    workspaces: [
      {
        name: 'Student Management',
        rootEntity: 'Student',
        subSpaces: [
          { name: 'Enrollments', sourceEntity: 'Enrollment', displayType: 'grid', fields: [{ label: 'Course', type: 'text' }, { label: 'Semester', type: 'select' }, { label: 'Status', type: 'select' }, { label: 'Grade', type: 'text' }] },
          { name: 'Attendance', sourceEntity: 'Attendance Record', displayType: 'timeline', fields: [{ label: 'Date', type: 'date' }, { label: 'Status', type: 'select' }, { label: 'Course', type: 'text' }] },
          { name: 'Academic Alerts', sourceEntity: 'Alert', displayType: 'board', fields: [{ label: 'Alert Type', type: 'select' }, { label: 'Description', type: 'longText' }, { label: 'Raised Date', type: 'date' }, { label: 'Resolved', type: 'checkbox' }] },
        ],
      },
    ],
    personas: [
      { name: 'Academic Advisor', description: 'Guides students through course selection and academic progress.' },
      { name: 'Instructor', description: 'Manages course content, grades, and attendance.' },
      { name: 'Registrar', description: 'Handles enrollment, transcripts, and academic records.' },
    ],
    lifecycleStages: ['Applied', 'Enrolled', 'Active', 'Probation', 'Graduated', 'Withdrawn'],
    flows: [
      { name: 'At-Risk Student Alert', signal: 'GPA drops below 2.0', rules: ['gpa < 2.0', 'status = Active'], action: 'Flag student and notify academic advisor', tags: ['Type:Academic', 'Risk:High'] },
    ],
  },
  {
    keywords: ['insurance', 'policy', 'claim', 'underwriting', 'premium', 'coverage', 'adjuster', 'insured', 'beneficiary'],
    subjectSingular: 'Policy',
    subjectPlural: 'Policies',
    workspaceLabel: 'Insurance Workspace',
    subSpaceLabel: 'Service Line',
    workspaces: [
      {
        name: 'Policy Administration',
        rootEntity: 'Policy',
        subSpaces: [
          { name: 'Active Policies', sourceEntity: 'Policy', displayType: 'grid', fields: [{ label: 'Policy Number', type: 'text' }, { label: 'Insured Name', type: 'text' }, { label: 'Coverage Type', type: 'select' }, { label: 'Premium', type: 'number' }, { label: 'Effective Date', type: 'date' }, { label: 'Expiry Date', type: 'date' }] },
          { name: 'Renewals', sourceEntity: 'Renewal Request', displayType: 'board', fields: [{ label: 'Policy Number', type: 'text' }, { label: 'Renewal Date', type: 'date' }, { label: 'Proposed Premium', type: 'number' }, { label: 'Status', type: 'select' }] },
          { name: 'Endorsements', sourceEntity: 'Endorsement', displayType: 'timeline', fields: [{ label: 'Change Type', type: 'select' }, { label: 'Effective Date', type: 'date' }, { label: 'Description', type: 'longText' }] },
        ],
      },
      {
        name: 'Claims Processing',
        rootEntity: 'Claim',
        subSpaces: [
          { name: 'Open Claims', sourceEntity: 'Claim', displayType: 'board', fields: [{ label: 'Claim Number', type: 'text' }, { label: 'Claimant', type: 'text' }, { label: 'Date of Loss', type: 'date' }, { label: 'Estimated Amount', type: 'number' }, { label: 'Adjuster', type: 'text' }] },
          { name: 'Payments', sourceEntity: 'Claim Payment', displayType: 'grid', fields: [{ label: 'Payment Date', type: 'date' }, { label: 'Amount', type: 'number' }, { label: 'Payee', type: 'text' }, { label: 'Method', type: 'select' }] },
          { name: 'Documents', sourceEntity: 'Claim Document', displayType: 'grid', fields: [{ label: 'Document Name', type: 'text' }, { label: 'Type', type: 'select' }, { label: 'Upload Date', type: 'date' }, { label: 'File', type: 'attachment' }] },
        ],
      },
    ],
    personas: [
      { name: 'Underwriter', description: 'Evaluates risk and approves policies.' },
      { name: 'Claims Adjuster', description: 'Investigates and settles insurance claims.' },
      { name: 'Policy Administrator', description: 'Manages policy lifecycle and endorsements.' },
      { name: 'Customer Service Rep', description: 'Handles policyholder inquiries and service requests.' },
    ],
    lifecycleStages: ['Application', 'Underwriting', 'Bound', 'Active', 'Renewal Pending', 'Lapsed', 'Cancelled'],
    flows: [
      { name: 'High-Value Claim Escalation', signal: 'Claim amount exceeds threshold', rules: ['estimated_amount > 50000', 'status = Open'], action: 'Escalate to senior adjuster and notify management', tags: ['Priority:High', 'Type:Claim'] },
      { name: 'Policy Renewal Reminder', signal: 'Policy expiring within 30 days', rules: ['expiry_days <= 30', 'renewal_status = None'], action: 'Generate renewal quote and notify policyholder', tags: ['Type:Policy', 'Status:Expiring'] },
    ],
  },
  {
    keywords: ['legal', 'law', 'attorney', 'case', 'litigation', 'contract', 'court', 'client', 'paralegal', 'billing'],
    subjectSingular: 'Case',
    subjectPlural: 'Cases',
    workspaceLabel: 'Legal Workspace',
    subSpaceLabel: 'Practice Area',
    workspaces: [
      {
        name: 'Case Management',
        rootEntity: 'Case',
        subSpaces: [
          { name: 'Active Cases', sourceEntity: 'Case', displayType: 'grid', fields: [{ label: 'Case Number', type: 'text' }, { label: 'Client', type: 'text' }, { label: 'Matter Type', type: 'select' }, { label: 'Assigned Attorney', type: 'text' }, { label: 'Filed Date', type: 'date' }] },
          { name: 'Deadlines & Court Dates', sourceEntity: 'Calendar Event', displayType: 'timeline', fields: [{ label: 'Event Type', type: 'select' }, { label: 'Date', type: 'datetime' }, { label: 'Court', type: 'text' }, { label: 'Notes', type: 'longText' }] },
          { name: 'Documents', sourceEntity: 'Legal Document', displayType: 'grid', fields: [{ label: 'Document Title', type: 'text' }, { label: 'Category', type: 'select' }, { label: 'Filed Date', type: 'date' }, { label: 'File', type: 'attachment' }] },
        ],
      },
      {
        name: 'Billing & Time',
        rootEntity: 'Client',
        subSpaces: [
          { name: 'Time Entries', sourceEntity: 'Time Entry', displayType: 'grid', fields: [{ label: 'Date', type: 'date' }, { label: 'Attorney', type: 'text' }, { label: 'Hours', type: 'number' }, { label: 'Description', type: 'longText' }, { label: 'Rate', type: 'number' }] },
          { name: 'Invoices', sourceEntity: 'Invoice', displayType: 'grid', fields: [{ label: 'Invoice #', type: 'text' }, { label: 'Amount', type: 'number' }, { label: 'Due Date', type: 'date' }, { label: 'Status', type: 'select' }] },
        ],
      },
    ],
    personas: [
      { name: 'Managing Partner', description: 'Oversees firm operations and high-value cases.' },
      { name: 'Attorney', description: 'Manages case matters and client representation.' },
      { name: 'Paralegal', description: 'Assists with research, filings, and document preparation.' },
      { name: 'Legal Secretary', description: 'Handles scheduling, correspondence, and billing.' },
    ],
    lifecycleStages: ['Intake', 'Engagement', 'Discovery', 'Litigation', 'Settlement', 'Closed', 'Archived'],
    flows: [
      { name: 'Court Deadline Alert', signal: 'Court date within 7 days', rules: ['event_type = Court Hearing', 'days_until <= 7'], action: 'Send urgent reminder to assigned attorney and paralegal', tags: ['Priority:Urgent', 'Type:Deadline'] },
      { name: 'Unbilled Time Reminder', signal: 'Time entries not billed for 30+ days', rules: ['billed = false', 'entry_age_days > 30'], action: 'Notify billing department and generate draft invoice', tags: ['Type:Billing', 'Status:Overdue'] },
    ],
  },
  {
    keywords: ['finance', 'banking', 'loan', 'account', 'transaction', 'compliance', 'portfolio', 'wealth', 'investment'],
    subjectSingular: 'Account',
    subjectPlural: 'Accounts',
    workspaceLabel: 'Finance Workspace',
    subSpaceLabel: 'Service Division',
    workspaces: [
      {
        name: 'Account Management',
        rootEntity: 'Account',
        subSpaces: [
          { name: 'Client Accounts', sourceEntity: 'Account', displayType: 'grid', fields: [{ label: 'Account Number', type: 'text' }, { label: 'Client Name', type: 'text' }, { label: 'Account Type', type: 'select' }, { label: 'Balance', type: 'number' }, { label: 'Opened Date', type: 'date' }] },
          { name: 'Transactions', sourceEntity: 'Transaction', displayType: 'timeline', fields: [{ label: 'Transaction ID', type: 'text' }, { label: 'Type', type: 'select' }, { label: 'Amount', type: 'number' }, { label: 'Date', type: 'datetime' }] },
          { name: 'Compliance Reviews', sourceEntity: 'Compliance Review', displayType: 'board', fields: [{ label: 'Review Type', type: 'select' }, { label: 'Risk Level', type: 'select' }, { label: 'Due Date', type: 'date' }, { label: 'Findings', type: 'longText' }] },
        ],
      },
    ],
    personas: [
      { name: 'Relationship Manager', description: 'Manages client portfolios and financial advisory.' },
      { name: 'Compliance Officer', description: 'Ensures regulatory compliance and risk management.' },
      { name: 'Loan Officer', description: 'Processes applications and manages loan portfolios.' },
    ],
    lifecycleStages: ['Application', 'Under Review', 'Approved', 'Active', 'Delinquent', 'Closed'],
    flows: [
      { name: 'Suspicious Transaction Flag', signal: 'Transaction exceeds threshold', rules: ['amount > 10000', 'type = Wire Transfer'], action: 'Flag for compliance review and notify officer', tags: ['Priority:High', 'Type:Compliance'] },
      { name: 'Loan Payment Overdue', signal: 'Payment past due date', rules: ['days_overdue > 5', 'status = Active'], action: 'Send collection notice and update account status', tags: ['Type:Loan', 'Status:Delinquent'] },
    ],
  },
  {
    keywords: ['dscsa', 'serialization', 'pharmaceutical', 'pharma', 'drug', 'carton', 'ndc', 'epcis', 'traceability', 'track and trace', 'manufacturer', 'distributor', 'wholesaler', 'pharmacy', 'dispense', 'suspect product', 'serial number', 'lot number', 'fda'],
    subjectSingular: 'Serialized Batch',
    subjectPlural: 'Serialized Batches',
    workspaceLabel: 'Supply Chain Workspace',
    subSpaceLabel: 'Traceability SubSpace',
    workspaces: [
      {
        name: 'Manufacturer Serialization',
        rootEntity: 'Serialized Batch',
        subSpaces: [
          { name: 'Unit Serialization', sourceEntity: 'Serialized Unit', displayType: 'grid', fields: [{ label: 'Unit Serial Number', type: 'text' }, { label: 'NDC Product Code', type: 'text' }, { label: 'Lot Number', type: 'text' }, { label: 'Expiration Date', type: 'date' }] },
          { name: 'Carton and Box Aggregation', sourceEntity: 'Carton Aggregation', displayType: 'grid', fields: [{ label: 'Carton Serial Number', type: 'text' }, { label: 'Box Serial Numbers', type: 'longText' }, { label: 'Units per Box', type: 'number' }, { label: 'Aggregation Date', type: 'date' }] },
          { name: 'EPCIS and Repository Upload', sourceEntity: 'Compliance Submission', displayType: 'grid', fields: [{ label: 'Submission ID', type: 'text' }, { label: 'Submission Date', type: 'date' }, { label: 'Repository Acknowledgement', type: 'text' }, { label: 'Upload Status', type: 'select' }] },
        ],
      },
      {
        name: 'Distributor and Wholesaler Verification',
        rootEntity: 'Serialized Batch',
        subSpaces: [
          { name: 'Inbound Receiving Scan', sourceEntity: 'Inbound Scan Event', displayType: 'grid', fields: [{ label: 'Inbound Scan Event ID', type: 'text' }, { label: 'Scanned Carton Serial', type: 'text' }, { label: 'Received Time', type: 'datetime' }, { label: 'Receiver Name', type: 'text' }] },
          { name: 'Serial Verification and Match', sourceEntity: 'Verification Event', displayType: 'split', fields: [{ label: 'Verification Result', type: 'select' }, { label: 'Matched Serial Count', type: 'number' }, { label: 'Mismatch Count', type: 'number' }, { label: 'Verification Notes', type: 'longText' }] },
          { name: 'Distributor Movement Tracking', sourceEntity: 'Movement Event', displayType: 'timeline', fields: [{ label: 'From Location', type: 'text' }, { label: 'To Location', type: 'text' }, { label: 'Movement Date', type: 'date' }, { label: 'Shipment Document ID', type: 'text' }] },
        ],
      },
      {
        name: 'Pharmacy and Dispense Trace',
        rootEntity: 'Serialized Batch',
        subSpaces: [
          { name: 'Pharmacy Receiving Verification', sourceEntity: 'Pharmacy Receiving Event', displayType: 'grid', fields: [{ label: 'Receiving Event ID', type: 'text' }, { label: 'Received Carton Serial', type: 'text' }, { label: 'Verification Result', type: 'select' }, { label: 'Received Date', type: 'date' }] },
          { name: 'Serial Inventory Control', sourceEntity: 'Serial Inventory', displayType: 'summary', fields: [{ label: 'Unit Serial', type: 'text' }, { label: 'Inventory Status', type: 'select' }, { label: 'Last Seen Date', type: 'date' }, { label: 'Storage Location', type: 'text' }] },
          { name: 'Dispense Serial Logging', sourceEntity: 'Dispense Event', displayType: 'timeline', fields: [{ label: 'Dispensed Unit Serial', type: 'text' }, { label: 'Dispense Date', type: 'date' }, { label: 'Rx Reference', type: 'text' }, { label: 'Pharmacist', type: 'text' }] },
        ],
      },
      {
        name: 'Network Traceability and Exceptions',
        rootEntity: 'Serialized Batch',
        subSpaces: [
          { name: 'End-to-End Trace Ledger', sourceEntity: 'Trace Ledger Event', displayType: 'timeline', fields: [{ label: 'Ledger Event ID', type: 'text' }, { label: 'Event Type', type: 'select' }, { label: 'Event Timestamp', type: 'datetime' }, { label: 'Responsible Party', type: 'text' }] },
          { name: 'Returns and Loss Handling', sourceEntity: 'Exception Event', displayType: 'summary', fields: [{ label: 'Exception Type', type: 'select' }, { label: 'Impacted Serial', type: 'text' }, { label: 'Opened Date', type: 'date' }, { label: 'Exception Status', type: 'select' }] },
          { name: 'Suspect Product Investigation', sourceEntity: 'Suspect Investigation', displayType: 'split', fields: [{ label: 'Investigation Case ID', type: 'text' }, { label: 'Investigation Reason', type: 'longText' }, { label: 'Priority', type: 'select' }, { label: 'Outcome', type: 'text' }] },
        ],
      },
    ],
    personas: [
      { name: 'Manufacturer Serialization Lead', description: 'Assigns and validates unit/carton serialization at manufacturing.' },
      { name: 'Distributor Receiver', description: 'Scans inbound shipments and verifies serial traceability.' },
      { name: 'Pharmacy Dispense Manager', description: 'Receives verified units, tracks inventory serials, and logs dispense events.' },
      { name: 'Compliance Trace Analyst', description: 'Monitors end-to-end traceability, exceptions, and suspect product events.' },
    ],
    lifecycleStages: ['Serialized', 'Shipped to Distributor', 'Received by Distributor', 'Shipped to Pharmacy', 'Received by Pharmacy', 'Dispensed', 'Exception Review'],
    flows: [
      { name: 'Serial Mismatch Alert', signal: 'Verification result is mismatch at distributor receiving', rules: ['verification_result = Mismatch', 'mismatch_count > 0'], action: 'Flag batch for investigation and notify Compliance Trace Analyst', tags: ['Priority:High', 'Type:Verification'] },
      { name: 'Suspect Product Escalation', signal: 'Suspect product event reported anywhere in supply chain', rules: ['exception_type = Suspect', 'exception_status = Open'], action: 'Lock batch serials, create investigation case, and notify FDA liaison', tags: ['Priority:Critical', 'Type:Suspect'] },
      { name: 'Expiration Warning', signal: 'Batch expiration within 90 days with undispensed inventory', rules: ['days_to_expiration <= 90', 'inventory_status = In Stock'], action: 'Alert pharmacy team and create priority dispense task', tags: ['Type:Inventory', 'Status:Expiring'] },
    ],
  },
  {
    keywords: ['hospitality', 'hotel', 'restaurant', 'guest', 'reservation', 'booking', 'room', 'concierge', 'housekeeping'],
    subjectSingular: 'Guest',
    subjectPlural: 'Guests',
    workspaceLabel: 'Hospitality Workspace',
    subSpaceLabel: 'Service Area',
    workspaces: [
      {
        name: 'Guest Services',
        rootEntity: 'Guest',
        subSpaces: [
          { name: 'Reservations', sourceEntity: 'Reservation', displayType: 'board', fields: [{ label: 'Guest Name', type: 'text' }, { label: 'Check-In', type: 'date' }, { label: 'Check-Out', type: 'date' }, { label: 'Room Type', type: 'select' }, { label: 'Rate', type: 'number' }] },
          { name: 'Special Requests', sourceEntity: 'Guest Request', displayType: 'board', fields: [{ label: 'Request Type', type: 'select' }, { label: 'Details', type: 'longText' }, { label: 'Priority', type: 'select' }, { label: 'Assigned To', type: 'text' }] },
          { name: 'Feedback', sourceEntity: 'Guest Feedback', displayType: 'grid', fields: [{ label: 'Category', type: 'select' }, { label: 'Rating', type: 'number' }, { label: 'Comments', type: 'longText' }, { label: 'Date', type: 'date' }] },
        ],
      },
      {
        name: 'Operations',
        rootEntity: 'Room',
        subSpaces: [
          { name: 'Housekeeping', sourceEntity: 'Housekeeping Task', displayType: 'board', fields: [{ label: 'Room Number', type: 'text' }, { label: 'Task Type', type: 'select' }, { label: 'Status', type: 'select' }, { label: 'Assigned To', type: 'text' }] },
          { name: 'Maintenance', sourceEntity: 'Maintenance Request', displayType: 'board', fields: [{ label: 'Room/Area', type: 'text' }, { label: 'Issue', type: 'longText' }, { label: 'Priority', type: 'select' }, { label: 'Reported Date', type: 'date' }] },
        ],
      },
    ],
    personas: [
      { name: 'General Manager', description: 'Oversees all hotel operations and guest satisfaction.' },
      { name: 'Front Desk Agent', description: 'Manages check-in/out and guest inquiries.' },
      { name: 'Housekeeping Supervisor', description: 'Coordinates room cleaning and turnovers.' },
      { name: 'Concierge', description: 'Handles guest requests and local recommendations.' },
    ],
    lifecycleStages: ['Inquiry', 'Reserved', 'Checked In', 'In-Stay', 'Checked Out', 'Post-Stay'],
    flows: [
      { name: 'VIP Guest Alert', signal: 'VIP guest checks in', rules: ['guest_tier = VIP', 'status = Checked In'], action: 'Notify GM and concierge with guest preferences', tags: ['Priority:VIP', 'Type:Guest'] },
      { name: 'Negative Feedback Escalation', signal: 'Guest rating below threshold', rules: ['rating <= 2'], action: 'Create service recovery task and notify manager', tags: ['Type:Feedback', 'Priority:High'] },
    ],
  },
  {
    keywords: ['field service', 'field services', 'technician', 'dispatch', 'service call', 'work order', 'on-site', 'installation', 'repair', 'hvac', 'plumbing', 'electrical', 'inspection'],
    subjectSingular: 'Service Job',
    subjectPlural: 'Service Jobs',
    workspaceLabel: 'Field Service Workspace',
    subSpaceLabel: 'Service Area',
    workspaces: [
      {
        name: 'Dispatch & Scheduling',
        rootEntity: 'Service Job',
        subSpaces: [
          { name: 'Service Requests', sourceEntity: 'Service Request', displayType: 'board', fields: [{ label: 'Customer Name', type: 'text' }, { label: 'Issue Description', type: 'longText' }, { label: 'Priority', type: 'select' }, { label: 'Requested Date', type: 'date' }] },
          { name: 'Schedule Board', sourceEntity: 'Dispatch Assignment', displayType: 'board', fields: [{ label: 'Technician', type: 'text' }, { label: 'Job Date', type: 'datetime' }, { label: 'Location', type: 'text' }, { label: 'Estimated Hours', type: 'number' }] },
          { name: 'Route Planning', sourceEntity: 'Route', displayType: 'timeline', fields: [{ label: 'Region', type: 'select' }, { label: 'Stops', type: 'number' }, { label: 'Departure Time', type: 'datetime' }, { label: 'Notes', type: 'longText' }] },
        ],
      },
      {
        name: 'Job Execution',
        rootEntity: 'Service Job',
        subSpaces: [
          { name: 'Active Jobs', sourceEntity: 'Work Order', displayType: 'board', fields: [{ label: 'Customer', type: 'text' }, { label: 'Job Type', type: 'select' }, { label: 'Start Time', type: 'datetime' }, { label: 'Status', type: 'select' }] },
          { name: 'Parts & Inventory', sourceEntity: 'Part Usage', displayType: 'grid', fields: [{ label: 'Part Number', type: 'text' }, { label: 'Description', type: 'text' }, { label: 'Quantity Used', type: 'number' }, { label: 'Cost', type: 'number' }] },
          { name: 'Completion Reports', sourceEntity: 'Completion Report', displayType: 'grid', fields: [{ label: 'Job Reference', type: 'text' }, { label: 'Work Performed', type: 'longText' }, { label: 'Customer Signature', type: 'checkbox' }, { label: 'Completion Date', type: 'date' }] },
        ],
      },
    ],
    personas: [
      { name: 'Dispatch Manager', description: 'Coordinates scheduling and assigns technicians to service calls.' },
      { name: 'Field Technician', description: 'Performs on-site service, repairs, and installations.' },
      { name: 'Service Coordinator', description: 'Handles customer requests and follow-up communication.' },
      { name: 'Inventory Clerk', description: 'Manages parts inventory and supply ordering.' },
    ],
    lifecycleStages: ['Requested', 'Scheduled', 'En Route', 'On Site', 'In Progress', 'Completed', 'Invoiced'],
    flows: [
      { name: 'Priority Job Escalation', signal: 'High-priority job unassigned for 2+ hours', rules: ['priority = High', 'status = Requested', 'age_hours > 2'], action: 'Escalate to dispatch manager and auto-assign nearest technician', tags: ['Priority:High', 'Type:Dispatch'] },
      { name: 'Job Completion Follow-Up', signal: 'Job marked completed', rules: ['status = Completed', 'customer_signature = true'], action: 'Send customer satisfaction survey and generate invoice', tags: ['Type:Completion', 'Status:Closed'] },
    ],
  },
];

function detectIndustry(text: string): IndustryTemplate | null {
  const lower = text.toLowerCase();
  let bestMatch: IndustryTemplate | null = null;
  let bestScore = 0;

  for (const tmpl of INDUSTRY_TEMPLATES) {
    const score = tmpl.keywords.reduce((sum, kw) => sum + (lower.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = tmpl;
    }
  }

  return bestScore >= 1 ? bestMatch : null;
}

// ─── Generic fallback for unknown industries ────────────────────────

function buildGenericProposal(description: string): {
  shellConfig: Partial<ShellConfig>;
  workspaces: WorkspaceDefinition[];
  personas: EndUserPersona[];
  lifecycleStages: LifecycleStage[];
  flows: Partial<SignalFlow>[];
  rationale: string;
} {
  const words = description.split(/\s+/).filter((w) => w.length > 3);
  const entityGuess = words.slice(0, 2).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Record';

  const wsId = uid('ws');
  return {
    shellConfig: {
      subjectSingular: entityGuess,
      subjectPlural: entityGuess + 's',
      workspaceLabel: 'Workspace',
      subSpaceLabel: 'Section',
    },
    workspaces: [
      {
        id: wsId,
        name: 'Main Workspace',
        rootEntity: entityGuess,
        route: slugify(entityGuess),
        countBadgesEnabled: true,
        countStrategy: 'perSubSpace',
        subSpaces: [
          { id: uid('ss'), name: 'Active Items', sourceEntity: entityGuess, bindMode: 'sameEntityView', displayType: 'grid', visibilityRule: 'always', showCount: true, countMode: 'direct', builderFields: [{ id: uid('f'), label: 'Title', type: 'text', required: true, tags: [] }, { id: uid('f'), label: 'Status', type: 'select', required: true, tags: [] }, { id: uid('f'), label: 'Date', type: 'date', required: false, tags: [] }] },
          { id: uid('ss'), name: 'History', sourceEntity: 'Event', bindMode: 'relatedEntityView', displayType: 'timeline', visibilityRule: 'ifRecords', showCount: true, countMode: 'direct', builderFields: [{ id: uid('f'), label: 'Event Type', type: 'select', required: true, tags: [] }, { id: uid('f'), label: 'Notes', type: 'longText', required: false, tags: [] }] },
        ],
      },
    ],
    personas: [
      { id: uid('persona'), name: 'Manager', description: 'Full access to all workspaces.', workspaceScope: 'all', workspaceIds: [], defaultTags: ['Role:Manager'] },
      { id: uid('persona'), name: 'Operator', description: 'Day-to-day record creation and updates.', workspaceScope: 'selected', workspaceIds: [wsId], defaultTags: ['Role:Operator'] },
    ],
    lifecycleStages: [
      { id: uid('stage'), name: 'New' },
      { id: uid('stage'), name: 'In Progress' },
      { id: uid('stage'), name: 'Completed' },
      { id: uid('stage'), name: 'Archived' },
    ],
    flows: [],
    rationale: `I created a general-purpose workspace based on your description. You can customize the subspaces, fields, personas, and lifecycle stages to match your exact needs.`,
  };
}

function buildIndustryProposal(tmpl: IndustryTemplate): {
  shellConfig: Partial<ShellConfig>;
  workspaces: WorkspaceDefinition[];
  personas: EndUserPersona[];
  lifecycleStages: LifecycleStage[];
  flows: Partial<SignalFlow>[];
  rationale: string;
} {
  const workspaces: WorkspaceDefinition[] = tmpl.workspaces.map((ws) => {
    const wsId = uid('ws');
    return {
      id: wsId,
      name: ws.name,
      rootEntity: ws.rootEntity,
      route: slugify(ws.name),
      countBadgesEnabled: true,
      countStrategy: 'perSubSpace' as const,
      subSpaces: ws.subSpaces.map((ss) => ({
        id: uid('ss'),
        name: ss.name,
        sourceEntity: ss.sourceEntity,
        bindMode: 'relatedEntityView' as const,
        displayType: ss.displayType,
        visibilityRule: 'always' as const,
        showCount: true,
        countMode: 'direct' as const,
        builderFields: ss.fields.map((f) => ({
          id: uid('f'),
          label: f.label,
          type: f.type as any,
          required: true,
          tags: [],
        })),
      })),
    };
  });

  const wsIds = workspaces.map((ws) => ws.id);

  return {
    shellConfig: {
      subjectSingular: tmpl.subjectSingular,
      subjectPlural: tmpl.subjectPlural,
      workspaceLabel: tmpl.workspaceLabel,
      subSpaceLabel: tmpl.subSpaceLabel,
    },
    workspaces,
    personas: tmpl.personas.map((p, i) => ({
      id: uid('persona'),
      name: p.name,
      description: p.description,
      workspaceScope: i === 0 ? 'all' as const : 'selected' as const,
      workspaceIds: i === 0 ? [] : [wsIds[0] ?? ''],
      defaultTags: [`Role:${slugify(p.name)}`],
    })),
    lifecycleStages: tmpl.lifecycleStages.map((s) => ({ id: uid('stage'), name: s })),
    flows: tmpl.flows.map((f) => ({
      id: uid('flow'),
      name: f.name,
      signal: f.signal,
      rules: f.rules,
      action: f.action,
      targetTags: f.tags,
      runOnExisting: false,
      status: 'draft' as const,
      triggerType: 'event' as const,
      totalRuns: 0,
      failures7d: 0,
      avgTimeMs: 0,
    })),
    rationale: `Based on your description, I identified this as a **${tmpl.keywords[0]}** domain. I've generated ${workspaces.length} workspace(s) with ${workspaces.reduce((s, w) => s + w.subSpaces.length, 0)} subspaces, ${tmpl.personas.length} personas, ${tmpl.lifecycleStages.length} lifecycle stages, and ${tmpl.flows.length} automation flow(s). Review the proposal and click "Apply All" to create everything at once.`,
  };
}

// ─── Hook: useAiWorkspaceBuilder ────────────────────────────────────

export function useAiWorkspaceBuilder() {
  const { upsertWorkspace, upsertShellConfig, upsertFlow, data } = useAppState();
  const [session, setSession] = useState<AiSession | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [proposal, setProposal] = useState<ReturnType<typeof buildGenericProposal> | null>(null);

  const startSession = useCallback((tenantId: string) => {
    const s = createAiSession(tenantId, 'workspace-builder');
    const welcome = addAssistantMessage(s, `Hi! I'm **Bebo**, CoreSpace's AI workspace architect.\n\nTell me about your business or industry and I'll generate a **complete operational workspace** in seconds — workspaces, subspaces, data fields, team roles, lifecycle stages, and Signal Studio automation flows.\n\nI already know **11 industries** out of the box, including a full **DSCSA pharmaceutical serialization** template with track-and-trace from manufacturer to pharmacy. Try one of these:\n\n• *"We're a pharma distributor verifying serial numbers under DSCSA"*\n• *"I run a property management company with 200 units"*\n• *"We manage insurance claims and need compliance tracking"*`);
    setSession(welcome);
    setProposal(null);
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (!session) return;
    setIsThinking(true);

    const withUser = addUserMessage(session, content);
    const withPending = addPendingAssistantMessage(withUser);
    setSession(withPending);

    // Simulate AI thinking delay
    setTimeout(() => {
      const cleaned = removePendingMessages(withUser);
      const lower = content.toLowerCase();

      // ── Conversation refinement: modify existing proposal ──
      if (proposal && (lower.includes('add') || lower.includes('remove') || lower.includes('rename') || lower.includes('change') || lower.includes('more') || lower.includes('fewer') || lower.includes('update'))) {
        const refined = { ...proposal };

        // Add more fields
        if (lower.includes('add') && lower.includes('field')) {
          const fieldLabel = content.replace(/.*add\s+(a\s+)?field\s+(called\s+|named\s+)?/i, '').replace(/\s+to.*$/i, '').trim() || 'Custom Field';
          for (const ws of refined.workspaces) {
            if (ws.subSpaces.length > 0) {
              ws.subSpaces[0].builderFields = [
                ...(ws.subSpaces[0].builderFields ?? []),
                { id: uid('f'), label: fieldLabel, type: 'text', required: false, tags: [] },
              ];
            }
          }
          refined.rationale = `Added field "${fieldLabel}" to the first subspace. You can continue refining or click **Apply All**.`;
        }

        // Add more personas
        if (lower.includes('add') && (lower.includes('persona') || lower.includes('role'))) {
          const personaName = content.replace(/.*add\s+(a\s+)?(persona|role)\s+(called\s+|named\s+)?/i, '').trim() || 'Custom Role';
          refined.personas = [
            ...refined.personas,
            { id: uid('persona'), name: personaName, description: `Custom persona: ${personaName}`, workspaceScope: 'all' as const, workspaceIds: [], defaultTags: [`Role:${slugify(personaName)}`] },
          ];
          refined.rationale = `Added persona "${personaName}". You now have ${refined.personas.length} persona(s). Continue refining or click **Apply All**.`;
        }

        // Remove workspaces
        if (lower.includes('remove') && lower.includes('workspace') && refined.workspaces.length > 1) {
          refined.workspaces = refined.workspaces.slice(0, -1);
          refined.rationale = `Removed the last workspace. You now have ${refined.workspaces.length} workspace(s). Continue refining or click **Apply All**.`;
        }

        // Add lifecycle stage
        if (lower.includes('add') && (lower.includes('stage') || lower.includes('lifecycle'))) {
          const stageName = content.replace(/.*add\s+(a\s+)?(lifecycle\s+)?(stage)\s+(called\s+|named\s+)?/i, '').trim() || 'Custom Stage';
          refined.lifecycleStages = [...refined.lifecycleStages, { id: uid('stage'), name: stageName }];
          refined.rationale = `Added lifecycle stage "${stageName}". You now have ${refined.lifecycleStages.length} stage(s). Continue refining or click **Apply All**.`;
        }

        // Generic refinement message
        if (refined.rationale === proposal.rationale) {
          refined.rationale = `I've noted your feedback. Here's the updated proposal. Continue describing changes or click **Apply All**.`;
        }

        setProposal(refined);

        const response = addAssistantMessage(
          cleaned,
          refined.rationale + `\n\nCurrent proposal:\n• **${refined.workspaces.length}** workspace(s)\n• **${refined.workspaces.reduce((s, w) => s + w.subSpaces.length, 0)}** subspace(s)\n• **${refined.personas.length}** persona(s)\n• **${refined.lifecycleStages.length}** lifecycle stage(s)\n• **${refined.flows.length}** automation flow(s)`,
        );
        setSession(response);
        setIsThinking(false);
        return;
      }

      // ── Fresh proposal from industry detection ──
      const industry = detectIndustry(content);
      const result = industry ? buildIndustryProposal(industry) : buildGenericProposal(content);
      setProposal(result);

      const response = addAssistantMessage(
        cleaned,
        result.rationale + `\n\nI've prepared:\n• **${result.workspaces.length}** workspace(s)\n• **${result.workspaces.reduce((s, w) => s + w.subSpaces.length, 0)}** subspace(s)\n• **${result.personas.length}** persona(s)\n• **${result.lifecycleStages.length}** lifecycle stage(s)\n• **${result.flows.length}** automation flow(s)\n\nClick **Apply All** to create everything, or continue describing your needs to refine the proposal.`,
        [{
          name: 'createWorkspace',
          arguments: { count: result.workspaces.length },
          status: 'success',
        }],
      );
      setSession(response);
      setIsThinking(false);
    }, 1200 + Math.random() * 800);
  }, [session]);

  const applyProposal = useCallback(() => {
    if (!proposal) return 'No proposal to apply.';

    // Apply shell config
    if (proposal.shellConfig.subjectSingular) {
      upsertShellConfig({
        ...data.shellConfig,
        subjectSingular: proposal.shellConfig.subjectSingular ?? data.shellConfig.subjectSingular,
        subjectPlural: proposal.shellConfig.subjectPlural ?? data.shellConfig.subjectPlural,
        workspaceLabel: proposal.shellConfig.workspaceLabel ?? data.shellConfig.workspaceLabel,
        subSpaceLabel: proposal.shellConfig.subSpaceLabel ?? data.shellConfig.subSpaceLabel,
        personas: [...data.shellConfig.personas, ...proposal.personas],
        lifecycleStages: [...data.shellConfig.lifecycleStages, ...proposal.lifecycleStages],
        defaultLifecycleStageId: proposal.lifecycleStages[0]?.id ?? data.shellConfig.defaultLifecycleStageId,
      });
    }

    // Apply workspaces
    for (const ws of proposal.workspaces) {
      upsertWorkspace(ws);
    }

    // Apply flows — distribute across workspaces based on flow's own workspaceId/subSpaceId, otherwise match by keywords
    for (const flow of proposal.flows) {
      if (flow.name && flow.signal && flow.action) {
        let resolvedWsId = flow.workspaceId || '';
        let resolvedSsId = flow.subSpaceId || '';

        // If flow has no workspace assigned, try to match by name keywords
        if (!resolvedWsId && proposal.workspaces.length > 0) {
          const flowText = `${flow.name} ${flow.signal} ${flow.action}`.toLowerCase();
          for (const ws of proposal.workspaces) {
            const wsWords = ws.name.toLowerCase().split(/\s+/);
            if (wsWords.some((word) => word.length > 3 && flowText.includes(word))) {
              resolvedWsId = ws.id;
              resolvedSsId = ws.subSpaces?.[0]?.id ?? '';
              break;
            }
          }
        }
        // Fallback to first workspace
        if (!resolvedWsId) {
          resolvedWsId = proposal.workspaces[0]?.id ?? '';
          resolvedSsId = proposal.workspaces[0]?.subSpaces?.[0]?.id ?? '';
        }

        upsertFlow({
          id: flow.id ?? uid('flow'),
          name: flow.name,
          signal: flow.signal,
          workspaceId: resolvedWsId,
          subSpaceId: resolvedSsId,
          rules: flow.rules ?? [],
          action: flow.action,
          runOnExisting: flow.runOnExisting ?? false,
          targetTags: flow.targetTags ?? [],
          status: 'draft',
          triggerType: flow.triggerType ?? 'event',
          totalRuns: 0,
          failures7d: 0,
          avgTimeMs: 0,
        });
      }
    }

    // Update session
    if (session) {
      const applied = addAssistantMessage(
        session,
        `All changes applied successfully! Your workspaces, personas, lifecycle stages, and flows are now live. Switch to the **Workspace Creator** or **Signal Studio** tabs to see and customize them.`,
      );
      setSession({ ...applied, status: 'applied' });
    }

    setProposal(null);
    return 'All AI-proposed changes applied.';
  }, [proposal, session, data, upsertWorkspace, upsertShellConfig, upsertFlow]);

  const discardProposal = useCallback(() => {
    setProposal(null);
    if (session) {
      const discarded = addAssistantMessage(session, 'Proposal discarded. Describe your business again or ask me to modify specific parts.');
      setSession({ ...discarded, status: 'active' });
    }
  }, [session]);

  const resetSession = useCallback(() => {
    setSession(null);
    setProposal(null);
    setIsThinking(false);
  }, []);

  return {
    session,
    isThinking,
    proposal,
    startSession,
    sendMessage,
    applyProposal,
    discardProposal,
    resetSession,
  };
}

// ─── Hook: useAiFlowBuilder ────────────────────────────────────────

export function useAiFlowBuilder() {
  const { upsertFlow, data } = useAppState();
  const [session, setSession] = useState<AiSession | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [proposedFlow, setProposedFlow] = useState<Partial<SignalFlow> | null>(null);

  const startSession = useCallback((tenantId: string) => {
    const s = createAiSession(tenantId, 'signal-builder');
    const welcome = addAssistantMessage(s, `I'll help you create automation flows. Describe what should happen automatically in your system.\n\nFor example: *"When a maintenance request has been open for more than 48 hours, escalate it to the property manager."*`);
    setSession(welcome);
    setProposedFlow(null);
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (!session) return;
    setIsThinking(true);

    const withUser = addUserMessage(session, content);
    const withPending = addPendingAssistantMessage(withUser);
    setSession(withPending);

    setTimeout(() => {
      const cleaned = removePendingMessages(withUser);
      const lower = content.toLowerCase();

      // Parse intent from natural language
      let signal = 'Record updated';
      let rules: string[] = [];
      let action = 'Send notification';
      let name = 'Custom Automation';
      const tags: string[] = [];

      // Time-based triggers
      if (lower.includes('overdue') || lower.includes('48 hour') || lower.includes('24 hour') || lower.includes('open for')) {
        const hours = lower.match(/(\d+)\s*hour/)?.[1] ?? '48';
        signal = `Record open for more than ${hours} hours`;
        rules.push(`hours_open > ${hours}`, 'status = Open');
        name = 'Overdue Item Escalation';
      }

      // Status triggers
      if (lower.includes('when') && (lower.includes('created') || lower.includes('new'))) {
        signal = 'Record created';
        name = 'New Record Handler';
      }
      if (lower.includes('completed') || lower.includes('closed') || lower.includes('resolved')) {
        rules.push('status = Completed');
        name = 'Completion Handler';
      }

      // Actions
      if (lower.includes('escalat')) {
        action = 'Escalate to manager and send alert';
      }
      if (lower.includes('notif') || lower.includes('alert') || lower.includes('email')) {
        action = 'Send notification to assigned user';
      }
      if (lower.includes('move') || lower.includes('transition') || lower.includes('advance')) {
        action = 'Transition record to next lifecycle stage';
      }
      if (lower.includes('tag')) {
        action = 'Apply tags to record';
      }

      // Tags
      if (lower.includes('urgent') || lower.includes('priority') || lower.includes('high')) {
        tags.push('Priority:High');
      }

      const flow: Partial<SignalFlow> = {
        id: uid('flow'),
        name,
        signal,
        rules,
        action,
        targetTags: tags,
        runOnExisting: lower.includes('existing') || lower.includes('retroactive'),
        status: 'draft',
        triggerType: 'event',
        totalRuns: 0,
        failures7d: 0,
        avgTimeMs: 0,
      };

      setProposedFlow(flow);

      const response = addAssistantMessage(
        cleaned,
        `Here's the flow I've designed:\n\n**${flow.name}**\n• Trigger: *${flow.signal}*\n• Rules: ${flow.rules?.length ? flow.rules.map((r: string) => `\`${r}\``).join(', ') : 'None'}\n• Action: *${flow.action}*\n• Tags: ${flow.targetTags?.length ? flow.targetTags.join(', ') : 'None'}\n• Run on existing: ${flow.runOnExisting ? 'Yes' : 'No'}\n\nClick **Apply Flow** to publish it, or describe changes.`,
        [{ name: 'createFlow', arguments: flow, status: 'success' }],
      );
      setSession(response);
      setIsThinking(false);
    }, 900 + Math.random() * 600);
  }, [session]);

  const applyFlow = useCallback(() => {
    if (!proposedFlow) return 'No flow to apply.';

    const workspaces = data.workspaces;
    // Distribute flows to best-matching workspace based on signal/action keywords
    let targetWs = workspaces[0];
    let targetSs = targetWs?.subSpaces?.[0];
    const flowText = `${proposedFlow.name ?? ''} ${proposedFlow.signal ?? ''} ${proposedFlow.action ?? ''}`.toLowerCase();

    // Workspace matching heuristics
    for (const ws of workspaces) {
      const wsLower = ws.name.toLowerCase();
      for (const ss of ws.subSpaces) {
        const ssLower = ss.name.toLowerCase();
        const combined = `${wsLower} ${ssLower}`;
        // Check if flow keywords match workspace/subspace names
        if (flowText.includes(wsLower.split(' ')[0]) || combined.split(' ').some((word) => word.length > 3 && flowText.includes(word))) {
          targetWs = ws;
          targetSs = ss;
          break;
        }
      }
    }

    upsertFlow({
      id: proposedFlow.id ?? uid('flow'),
      name: proposedFlow.name ?? 'Untitled Flow',
      signal: proposedFlow.signal ?? 'Record updated',
      workspaceId: targetWs?.id ?? '',
      subSpaceId: targetSs?.id ?? '',
      rules: proposedFlow.rules ?? [],
      action: proposedFlow.action ?? 'Notify',
      runOnExisting: proposedFlow.runOnExisting ?? false,
      targetTags: proposedFlow.targetTags ?? [],
      status: 'draft',
      triggerType: proposedFlow.triggerType ?? 'event',
      totalRuns: 0,
      failures7d: 0,
      avgTimeMs: 0,
    });

    const wsLabel = targetWs?.name ?? 'first workspace';
    const ssLabel = targetSs?.name ?? 'first subspace';
    if (session) {
      const applied = addAssistantMessage(session, `Flow "${proposedFlow.name}" has been created as a draft in **${wsLabel} → ${ssLabel}**. Go to **Signal Studio → Active Flows** to publish it.`);
      setSession({ ...applied, status: 'applied' });
    }

    setProposedFlow(null);
    return `Flow "${proposedFlow.name}" created.`;
  }, [proposedFlow, session, data, upsertFlow]);

  const resetSession = useCallback(() => {
    setSession(null);
    setProposedFlow(null);
    setIsThinking(false);
  }, []);

  return {
    session,
    isThinking,
    proposedFlow,
    startSession,
    sendMessage,
    applyFlow,
    resetSession,
  };
}

// ─── Hook: useAiDataAssistant ──────────────────────────────────────
// End-user data entry assistant: auto-fill, validate, suggest tags,
// and summarize client history via natural language.

export function useAiDataAssistant() {
  const { data } = useAppState();
  const [session, setSession] = useState<AiSession | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, string | number> | null>(null);

  const startSession = useCallback((tenantId: string) => {
    const s = createAiSession(tenantId, 'data-assistant');
    const welcome = addAssistantMessage(
      s,
      `I'm your data assistant. I can help you:\n• **Auto-fill** form fields based on what you've entered so far\n• **Validate** a record before saving\n• **Suggest tags** for your records\n• **Summarize** a client's history\n\nJust describe what you need!`,
    );
    setSession(welcome);
    setSuggestions(null);
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (!session) return;
    setIsThinking(true);

    const withUser = addUserMessage(session, content);
    const withPending = addPendingAssistantMessage(withUser);
    setSession(withPending);

    setTimeout(() => {
      const cleaned = removePendingMessages(withUser);
      const lower = content.toLowerCase();

      // ── Auto-fill intent ──
      if (lower.includes('auto') || lower.includes('fill') || lower.includes('suggest value') || lower.includes('complete')) {
        const targetWs = data.workspaces[0];
        const fields = targetWs?.subSpaces?.[0]?.builderFields ?? [];
        const autoFilled: Record<string, string | number> = {};

        for (const field of fields) {
          if (field.type === 'date') {
            autoFilled[field.label] = todayFormatted();
          } else if (field.type === 'number') {
            autoFilled[field.label] = 0;
          } else if (field.type === 'select') {
            autoFilled[field.label] = '(first option)';
          } else if (field.type === 'email') {
            autoFilled[field.label] = 'user@example.com';
          } else if (field.type === 'phone') {
            autoFilled[field.label] = '(555) 000-0000';
          } else {
            autoFilled[field.label] = '';
          }
        }

        setSuggestions(autoFilled);

        const fieldList = Object.entries(autoFilled)
          .map(([k, v]) => `• **${k}**: ${v || '_(empty)_'}`)
          .join('\n');

        const response = addAssistantMessage(
          cleaned,
          `Here are suggested values for the available fields:\n\n${fieldList}\n\nYou can edit any of these before saving. Need me to adjust anything?`,
          [{ name: 'autoFillFields', arguments: { fields: Object.keys(autoFilled) }, status: 'success' }],
        );
        setSession(response);
        setIsThinking(false);
        return;
      }

      // ── Validate intent ──
      if (lower.includes('validate') || lower.includes('check') || lower.includes('verify')) {
        const issues: string[] = [];
        const targetWs = data.workspaces[0];
        const requiredFields = (targetWs?.subSpaces?.[0]?.builderFields ?? []).filter((f) => f.required);

        if (requiredFields.length > 0) {
          issues.push(`${requiredFields.length} required field(s) must be filled: ${requiredFields.map((f) => f.label).join(', ')}`);
        }

        // Simulate business-rule checks
        if (lower.includes('amount') || lower.includes('value')) {
          issues.push('Amounts should be positive numbers');
        }
        if (lower.includes('date')) {
          issues.push('Dates should not be in the past unless this is a historical record');
        }

        const status = issues.length === 0 ? 'All validations passed! ✓' : `Found ${issues.length} item(s) to review:`;
        const issueList = issues.map((i) => `• ⚠ ${i}`).join('\n');

        const response = addAssistantMessage(
          cleaned,
          `**Validation Results**\n\n${status}\n${issueList}\n\nFix any issues and I'll re-validate when you're ready.`,
          [{ name: 'validateRecord', arguments: { issueCount: issues.length }, status: issues.length === 0 ? 'success' : 'pending' }],
        );
        setSession(response);
        setIsThinking(false);
        return;
      }

      // ── Tag suggestion intent ──
      if (lower.includes('tag') || lower.includes('categorize') || lower.includes('label') || lower.includes('classify')) {
        const suggestedTags: string[] = [];

        // Derive tags from context keywords
        if (lower.includes('urgent') || lower.includes('critical')) suggestedTags.push('Priority:Critical');
        if (lower.includes('high')) suggestedTags.push('Priority:High');
        if (lower.includes('low')) suggestedTags.push('Priority:Low');
        if (lower.includes('review')) suggestedTags.push('Status:NeedsReview');
        if (lower.includes('complete')) suggestedTags.push('Status:Completed');
        if (lower.includes('pending')) suggestedTags.push('Status:Pending');

        // Add workspace-contextual tags
        const wsName = data.workspaces[0]?.name ?? 'General';
        suggestedTags.push(`Source:${slugify(wsName)}`);

        if (suggestedTags.length === 1) {
          suggestedTags.push('Type:Standard', 'Review:Pending');
        }

        const tagList = suggestedTags.map((t) => `• \`${t}\``).join('\n');

        const response = addAssistantMessage(
          cleaned,
          `Based on your input, I recommend these tags:\n\n${tagList}\n\nWould you like me to apply them to the current record?`,
          [{ name: 'suggestTags', arguments: { tags: suggestedTags }, status: 'success' }],
        );
        setSession(response);
        setIsThinking(false);
        return;
      }

      // ── Summarize history intent ──
      if (lower.includes('summarize') || lower.includes('summary') || lower.includes('history') || lower.includes('overview')) {
        const clients = data.clients;
        const records = data.records;
        const recentRecords = records.slice(-5);

        const clientCount = clients.length;
        const recordCount = records.length;
        const statusCounts: Record<string, number> = {};
        for (const r of records) {
          statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
        }

        const statusBreakdown = Object.entries(statusCounts)
          .map(([status, count]) => `• **${status}**: ${count}`)
          .join('\n') || '• No records yet';

        const recentList = recentRecords
          .map((r) => `• ${r.title} — *${r.status}*`)
          .join('\n') || '• No recent activity';

        const response = addAssistantMessage(
          cleaned,
          `**System Summary**\n\n**${clientCount}** client(s) | **${recordCount}** total record(s)\n\n**Status Breakdown:**\n${statusBreakdown}\n\n**Recent Records:**\n${recentList}`,
          [{ name: 'summarizeHistory', arguments: { clientCount, recordCount }, status: 'success' }],
        );
        setSession(response);
        setIsThinking(false);
        return;
      }

      // ── Fallback ──
      const response = addAssistantMessage(
        cleaned,
        `I can help you with:\n• **"Auto-fill my form"** — suggest field values\n• **"Validate this record"** — check for issues\n• **"Suggest tags"** — recommend tags based on context\n• **"Summarize history"** — overview of records and clients\n\nWhat would you like to do?`,
      );
      setSession(response);
      setIsThinking(false);
    }, 600 + Math.random() * 500);
  }, [session, data]);

  const resetSession = useCallback(() => {
    setSession(null);
    setSuggestions(null);
    setIsThinking(false);
  }, []);

  return {
    session,
    isThinking,
    suggestions,
    startSession,
    sendMessage,
    resetSession,
  };
}

// ─── Hook: useAiQueryEngine ────────────────────────────────────────
// Natural language record queries — translates user questions into
// structured filters and returns matching records.

interface QueryResult {
  records: RuntimeRecord[];
  query: { workspaceId?: string; status?: string; tags?: string[]; dateFrom?: string; dateTo?: string };
  explanation: string;
}

export function useAiQueryEngine() {
  const { data } = useAppState();
  const [session, setSession] = useState<AiSession | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);

  const startSession = useCallback((tenantId: string) => {
    const s = createAiSession(tenantId, 'query');
    const welcome = addAssistantMessage(
      s,
      `Ask me anything about your records in natural language. I'll translate your question into a query and show results.\n\nExamples:\n• *"Show me all overdue items"*\n• *"Records tagged as urgent from last week"*\n• *"How many open cases do we have?"*`,
    );
    setSession(welcome);
    setQueryResult(null);
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (!session) return;
    setIsThinking(true);

    const withUser = addUserMessage(session, content);
    const withPending = addPendingAssistantMessage(withUser);
    setSession(withPending);

    setTimeout(() => {
      const cleaned = removePendingMessages(withUser);
      const lower = content.toLowerCase();

      // Build structured query from natural language
      const filters: QueryResult['query'] = {};
      let explanation = '';

      // Workspace detection
      for (const ws of data.workspaces) {
        if (lower.includes(ws.name.toLowerCase()) || lower.includes(ws.rootEntity.toLowerCase())) {
          filters.workspaceId = ws.id;
          explanation += `Filtering to workspace "${ws.name}". `;
          break;
        }
      }

      // Status detection
      const statusKeywords: Record<string, string[]> = {
        'Open': ['open', 'active', 'pending', 'in progress', 'ongoing'],
        'Closed': ['closed', 'completed', 'done', 'resolved', 'finished'],
        'Overdue': ['overdue', 'late', 'past due', 'expired'],
        'New': ['new', 'recent', 'just created', 'fresh'],
        'Draft': ['draft', 'incomplete', 'started'],
      };

      for (const [status, keywords] of Object.entries(statusKeywords)) {
        if (keywords.some((kw) => lower.includes(kw))) {
          filters.status = status;
          explanation += `Status filter: "${status}". `;
          break;
        }
      }

      // Tag detection
      const tagMatches = lower.match(/(?:tagged?(?:\s+as)?|label(?:ed)?|tagged?\s+with)\s+["']?([\w:.-]+)["']?/i);
      if (tagMatches) {
        filters.tags = [tagMatches[1]];
        explanation += `Tag filter: "${tagMatches[1]}". `;
      }
      if (lower.includes('urgent')) {
        filters.tags = [...(filters.tags ?? []), 'Priority:High'];
        explanation += `Including urgent/high-priority items. `;
      }

      // Date range detection
      const now = new Date();
      if (lower.includes('today')) {
        filters.dateFrom = todayFormatted();
        filters.dateTo = todayFormatted();
        explanation += `Date range: today. `;
      } else if (lower.includes('this week') || lower.includes('last 7') || lower.includes('past week')) {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const mm = String(weekAgo.getMonth() + 1).padStart(2, '0');
        const dd = String(weekAgo.getDate()).padStart(2, '0');
        filters.dateFrom = `${mm}-${dd}-${weekAgo.getFullYear()}`;
        explanation += `Date range: last 7 days. `;
      } else if (lower.includes('this month') || lower.includes('last 30') || lower.includes('past month')) {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const mm = String(monthAgo.getMonth() + 1).padStart(2, '0');
        const dd = String(monthAgo.getDate()).padStart(2, '0');
        filters.dateFrom = `${mm}-${dd}-${monthAgo.getFullYear()}`;
        explanation += `Date range: last 30 days. `;
      }

      // Execute query against local data
      let results = [...data.records];

      if (filters.workspaceId) {
        results = results.filter((r) => r.workspaceId === filters.workspaceId);
      }
      if (filters.status) {
        results = results.filter((r) => r.status.toLowerCase() === filters.status!.toLowerCase());
      }
      if (filters.tags?.length) {
        results = results.filter((r) => filters.tags!.some((t) => r.tags.includes(t)));
      }
      if (filters.dateFrom) {
        results = results.filter((r) => toSortableDate(r.date ?? '') >= toSortableDate(filters.dateFrom!));
      }
      if (filters.dateTo) {
        results = results.filter((r) => toSortableDate(r.date ?? '') <= toSortableDate(filters.dateTo!));
      }

      const qr: QueryResult = {
        records: results,
        query: filters,
        explanation: explanation || 'Showing all records (no specific filters detected).',
      };
      setQueryResult(qr);

      // ── Count queries ──
      if (lower.includes('how many') || lower.includes('count') || lower.includes('total')) {
        const response = addAssistantMessage(
          cleaned,
          `**Query:** ${qr.explanation}\n\n**Result:** ${results.length} record(s) found.\n\n${results.length > 0 ? 'Use a more specific query to drill down, or ask me to break this down by status or tags.' : 'No matching records. Try broadening your search criteria.'}`,
          [{ name: 'queryRecords', arguments: filters, status: 'success' }],
        );
        setSession(response);
        setIsThinking(false);
        return;
      }

      // ── List queries ──
      const displayRecords = results.slice(0, 10);
      const recordList = displayRecords.length > 0
        ? displayRecords.map((r) => `• **${r.title}** — *${r.status}*${r.tags.length ? ` [${r.tags.join(', ')}]` : ''}`).join('\n')
        : '_(No matching records)_';

      const overflow = results.length > 10 ? `\n\n…and ${results.length - 10} more record(s).` : '';

      const response = addAssistantMessage(
        cleaned,
        `**Query:** ${qr.explanation}\n\n**${results.length} record(s) found:**\n${recordList}${overflow}`,
        [{ name: 'queryRecords', arguments: filters, status: 'success' }],
      );
      setSession(response);
      setIsThinking(false);
    }, 700 + Math.random() * 500);
  }, [session, data]);

  const resetSession = useCallback(() => {
    setSession(null);
    setQueryResult(null);
    setIsThinking(false);
  }, []);

  return {
    session,
    isThinking,
    queryResult,
    startSession,
    sendMessage,
    resetSession,
  };
}
