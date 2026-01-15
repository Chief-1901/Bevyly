/**
 * API endpoint functions for SalesOS backend
 */

import { get, post, fetchPaginated } from './fetcher';

// ─────────────────────────────────────────────────────────────
// Types matching backend responses
// ─────────────────────────────────────────────────────────────

export interface Account {
  id: string;
  customerId: string;
  name: string;
  domain?: string;
  website?: string;
  industry?: string;
  employeeCount?: number;
  annualRevenue?: number;
  city?: string;
  state?: string;
  country?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  customerId: string;
  accountId?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Opportunity {
  id: string;
  customerId: string;
  accountId: string;
  name: string;
  description?: string;
  stage: string;
  probability: number;
  amount?: number;
  currency: string;
  closeDate?: string;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineSummary {
  stage: string;
  count: number;
  totalAmount: number;
}

export interface Meeting {
  id: string;
  customerId: string;
  title: string;
  type: string;
  status: string;
  startTime: string;
  endTime: string;
  createdAt: string;
}

export interface Email {
  id: string;
  customerId: string;
  subject: string;
  status: string;
  toEmail: string;
  sentAt?: string;
  openCount: number;
  clickCount: number;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────

/**
 * Accounts
 */
export async function listAccounts(params?: { page?: number; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  
  const query = searchParams.toString();
  return fetchPaginated<Account>(`/accounts${query ? `?${query}` : ''}`);
}

export async function getAccount(id: string): Promise<Account> {
  return get<Account>(`/accounts/${id}`);
}

/**
 * Contacts
 */
export async function listContacts(params?: { page?: number; limit?: number; accountId?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.accountId) searchParams.set('accountId', params.accountId);
  
  const query = searchParams.toString();
  return fetchPaginated<Contact>(`/contacts${query ? `?${query}` : ''}`);
}

export async function getContact(id: string): Promise<Contact> {
  return get<Contact>(`/contacts/${id}`);
}

/**
 * Opportunities
 */
export async function listOpportunities(params?: { 
  page?: number; 
  limit?: number;
  accountId?: string;
  stage?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.accountId) searchParams.set('accountId', params.accountId);
  if (params?.stage) searchParams.set('stage', params.stage);
  
  const query = searchParams.toString();
  return fetchPaginated<Opportunity>(`/opportunities${query ? `?${query}` : ''}`);
}

export async function getOpportunity(id: string): Promise<Opportunity> {
  return get<Opportunity>(`/opportunities/${id}`);
}

export async function getPipelineSummary(): Promise<PipelineSummary[]> {
  return get<PipelineSummary[]>('/opportunities/pipeline');
}

/**
 * Meetings
 */
export async function listMeetings(params?: { 
  page?: number; 
  limit?: number;
  status?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.status) searchParams.set('status', params.status);
  
  const query = searchParams.toString();
  return fetchPaginated<Meeting>(`/calendar/meetings${query ? `?${query}` : ''}`);
}

/**
 * Emails
 */
export async function listEmails(params?: { 
  page?: number; 
  limit?: number;
  status?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.status) searchParams.set('status', params.status);
  
  const query = searchParams.toString();
  return fetchPaginated<Email>(`/emails${query ? `?${query}` : ''}`);
}

