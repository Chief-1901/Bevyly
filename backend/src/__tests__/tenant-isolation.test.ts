/**
 * Cross-Tenant Isolation Tests
 * 
 * These tests verify that tenant data isolation is properly enforced.
 * A user from tenant A should NEVER be able to access tenant B's data.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../services/crm/index.js';
import { getDb } from '../shared/db/client.js';
import { accounts, contacts, opportunities } from '../shared/db/schema/index.js';
import { generateId } from '../shared/utils/id.js';
import type { CustomerId, AccountId, ContactId, OpportunityId } from '../shared/types/index.js';

// Test tenant contexts
const TENANT_A = {
  customerId: 'cus_tenantA_test' as CustomerId,
  userId: 'usr_tenantA_test',
  userEmail: 'admin@tenantA.test',
  roles: ['admin'],
};

const TENANT_B = {
  customerId: 'cus_tenantB_test' as CustomerId,
  userId: 'usr_tenantB_test',
  userEmail: 'admin@tenantB.test',
  roles: ['admin'],
};

// Test data IDs
let tenantAAccountId: AccountId;
let tenantBAccountId: AccountId;
let tenantAContactId: ContactId;
let tenantBContactId: ContactId;

/**
 * Helper to make authenticated requests for a specific tenant
 */
function asUser(tenant: typeof TENANT_A) {
  return (req: request.Test) => {
    return req
      .set('x-customer-id', tenant.customerId)
      .set('x-user-id', tenant.userId)
      .set('x-user-email', tenant.userEmail)
      .set('x-user-roles', JSON.stringify(tenant.roles));
  };
}

describe('Tenant Isolation', () => {
  beforeAll(async () => {
    const db = getDb();

    // Create test accounts for both tenants
    tenantAAccountId = generateId('acc') as AccountId;
    tenantBAccountId = generateId('acc') as AccountId;

    await db.insert(accounts).values([
      {
        id: tenantAAccountId,
        customerId: TENANT_A.customerId,
        name: 'Tenant A Account',
        status: 'active',
      },
      {
        id: tenantBAccountId,
        customerId: TENANT_B.customerId,
        name: 'Tenant B Account',
        status: 'active',
      },
    ]);

    // Create test contacts for both tenants
    tenantAContactId = generateId('con') as ContactId;
    tenantBContactId = generateId('con') as ContactId;

    await db.insert(contacts).values([
      {
        id: tenantAContactId,
        customerId: TENANT_A.customerId,
        email: 'contact@tenantA.test',
        firstName: 'Alice',
        status: 'active',
      },
      {
        id: tenantBContactId,
        customerId: TENANT_B.customerId,
        email: 'contact@tenantB.test',
        firstName: 'Bob',
        status: 'active',
      },
    ]);
  });

  afterAll(async () => {
    const db = getDb();

    // Clean up test data
    await db.delete(contacts).where(
      (contacts) => contacts.customerId.in([TENANT_A.customerId, TENANT_B.customerId])
    ).catch(() => {});
    await db.delete(accounts).where(
      (accounts) => accounts.customerId.in([TENANT_A.customerId, TENANT_B.customerId])
    ).catch(() => {});
  });

  describe('Accounts', () => {
    it('should return 404 when tenant A tries to access tenant B account', async () => {
      const response = await asUser(TENANT_A)(
        request(app)
          .get(`/api/v1/accounts/${tenantBAccountId}`)
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should allow tenant A to access own account', async () => {
      const response = await asUser(TENANT_A)(
        request(app)
          .get(`/api/v1/accounts/${tenantAAccountId}`)
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(tenantAAccountId);
    });

    it('should not include tenant B accounts in tenant A list', async () => {
      const response = await asUser(TENANT_A)(
        request(app)
          .get('/api/v1/accounts')
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Ensure no tenant B data leaked
      const accountIds = response.body.data.map((a: any) => a.id);
      expect(accountIds).not.toContain(tenantBAccountId);
    });

    it('should prevent tenant A from updating tenant B account', async () => {
      const response = await asUser(TENANT_A)(
        request(app)
          .patch(`/api/v1/accounts/${tenantBAccountId}`)
          .send({ name: 'Hacked by Tenant A' })
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should prevent tenant A from deleting tenant B account', async () => {
      const response = await asUser(TENANT_A)(
        request(app)
          .delete(`/api/v1/accounts/${tenantBAccountId}`)
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Contacts', () => {
    it('should return 404 when tenant A tries to access tenant B contact', async () => {
      const response = await asUser(TENANT_A)(
        request(app)
          .get(`/api/v1/contacts/${tenantBContactId}`)
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should allow tenant A to access own contact', async () => {
      const response = await asUser(TENANT_A)(
        request(app)
          .get(`/api/v1/contacts/${tenantAContactId}`)
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(tenantAContactId);
    });

    it('should not include tenant B contacts in tenant A list', async () => {
      const response = await asUser(TENANT_A)(
        request(app)
          .get('/api/v1/contacts')
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Ensure no tenant B data leaked
      const contactIds = response.body.data.map((c: any) => c.id);
      expect(contactIds).not.toContain(tenantBContactId);
    });
  });

  describe('Request without tenant context', () => {
    it('should reject requests without tenant headers', async () => {
      const response = await request(app)
        .get('/api/v1/accounts');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject requests with incomplete tenant headers', async () => {
      const response = await request(app)
        .get('/api/v1/accounts')
        .set('x-customer-id', TENANT_A.customerId);
      // Missing x-user-id

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});

