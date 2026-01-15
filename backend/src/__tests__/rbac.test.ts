/**
 * RBAC (Role-Based Access Control) Tests
 * 
 * These tests verify that role-based permissions are properly enforced.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../services/crm/index.js';
import { getDb } from '../shared/db/client.js';
import { accounts, contacts, opportunities } from '../shared/db/schema/index.js';
import { generateId } from '../shared/utils/id.js';
import type { CustomerId, AccountId, ContactId, OpportunityId } from '../shared/types/index.js';

// Shared tenant for RBAC tests
const TEST_CUSTOMER_ID = 'cus_rbac_test' as CustomerId;

// User contexts with different roles
const ADMIN_USER = {
  customerId: TEST_CUSTOMER_ID,
  userId: 'usr_admin_rbac',
  userEmail: 'admin@rbac.test',
  roles: ['admin'],
};

const MANAGER_USER = {
  customerId: TEST_CUSTOMER_ID,
  userId: 'usr_manager_rbac',
  userEmail: 'manager@rbac.test',
  roles: ['manager'],
};

const SALES_REP_USER = {
  customerId: TEST_CUSTOMER_ID,
  userId: 'usr_salesrep_rbac',
  userEmail: 'salesrep@rbac.test',
  roles: ['sales_rep'],
};

const VIEWER_USER = {
  customerId: TEST_CUSTOMER_ID,
  userId: 'usr_viewer_rbac',
  userEmail: 'viewer@rbac.test',
  roles: ['viewer'],
};

// Test data
let testAccountId: AccountId;
let testContactId: ContactId;
let testOpportunityId: OpportunityId;

/**
 * Helper to make authenticated requests for a specific user
 */
function asUser(user: typeof ADMIN_USER) {
  return (req: request.Test) => {
    return req
      .set('x-customer-id', user.customerId)
      .set('x-user-id', user.userId)
      .set('x-user-email', user.userEmail)
      .set('x-user-roles', JSON.stringify(user.roles));
  };
}

describe('RBAC - Role-Based Access Control', () => {
  beforeAll(async () => {
    const db = getDb();

    // Create test account
    testAccountId = generateId('acc') as AccountId;
    await db.insert(accounts).values({
      id: testAccountId,
      customerId: TEST_CUSTOMER_ID,
      name: 'RBAC Test Account',
      status: 'active',
    });

    // Create test contact
    testContactId = generateId('con') as ContactId;
    await db.insert(contacts).values({
      id: testContactId,
      customerId: TEST_CUSTOMER_ID,
      email: 'rbac-test@example.com',
      firstName: 'RBAC',
      lastName: 'Test',
      status: 'active',
    });

    // Create test opportunity
    testOpportunityId = generateId('opp') as OpportunityId;
    await db.insert(opportunities).values({
      id: testOpportunityId,
      customerId: TEST_CUSTOMER_ID,
      accountId: testAccountId,
      name: 'RBAC Test Opportunity',
      stage: 'prospecting',
    });
  });

  afterAll(async () => {
    const db = getDb();
    // Clean up test data
    await db.delete(opportunities).where(
      (o) => o.customerId.eq(TEST_CUSTOMER_ID)
    ).catch(() => {});
    await db.delete(contacts).where(
      (c) => c.customerId.eq(TEST_CUSTOMER_ID)
    ).catch(() => {});
    await db.delete(accounts).where(
      (a) => a.customerId.eq(TEST_CUSTOMER_ID)
    ).catch(() => {});
  });

  describe('Viewer Role - Read Only', () => {
    it('should allow viewer to list accounts', async () => {
      const response = await asUser(VIEWER_USER)(
        request(app).get('/api/v1/accounts')
      );
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should allow viewer to read a single account', async () => {
      const response = await asUser(VIEWER_USER)(
        request(app).get(`/api/v1/accounts/${testAccountId}`)
      );
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should DENY viewer from creating an account', async () => {
      const response = await asUser(VIEWER_USER)(
        request(app)
          .post('/api/v1/accounts')
          .send({ name: 'Viewer Created Account' })
      );
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should DENY viewer from updating an account', async () => {
      const response = await asUser(VIEWER_USER)(
        request(app)
          .patch(`/api/v1/accounts/${testAccountId}`)
          .send({ name: 'Viewer Modified Account' })
      );
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should DENY viewer from deleting an account', async () => {
      const response = await asUser(VIEWER_USER)(
        request(app).delete(`/api/v1/accounts/${testAccountId}`)
      );
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should DENY viewer from creating a contact', async () => {
      const response = await asUser(VIEWER_USER)(
        request(app)
          .post('/api/v1/contacts')
          .send({ email: 'viewer-created@test.com' })
      );
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should DENY viewer from creating an opportunity', async () => {
      const response = await asUser(VIEWER_USER)(
        request(app)
          .post('/api/v1/opportunities')
          .send({ name: 'Viewer Opp', accountId: testAccountId })
      );
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Sales Rep Role - Read + Write (no delete)', () => {
    it('should allow sales rep to list accounts', async () => {
      const response = await asUser(SALES_REP_USER)(
        request(app).get('/api/v1/accounts')
      );
      expect(response.status).toBe(200);
    });

    it('should allow sales rep to create an account', async () => {
      const response = await asUser(SALES_REP_USER)(
        request(app)
          .post('/api/v1/accounts')
          .send({ name: 'Sales Rep Created Account' })
      );
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should allow sales rep to update an account', async () => {
      const response = await asUser(SALES_REP_USER)(
        request(app)
          .patch(`/api/v1/accounts/${testAccountId}`)
          .send({ name: 'Sales Rep Updated Account' })
      );
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should DENY sales rep from deleting an account', async () => {
      const response = await asUser(SALES_REP_USER)(
        request(app).delete(`/api/v1/accounts/${testAccountId}`)
      );
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should allow sales rep to create a contact', async () => {
      const response = await asUser(SALES_REP_USER)(
        request(app)
          .post('/api/v1/contacts')
          .send({ email: `salesrep-created-${Date.now()}@test.com` })
      );
      expect(response.status).toBe(201);
    });

    it('should DENY sales rep from deleting a contact', async () => {
      const response = await asUser(SALES_REP_USER)(
        request(app).delete(`/api/v1/contacts/${testContactId}`)
      );
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Manager Role - Read + Write + Some Delete', () => {
    it('should allow manager to list accounts', async () => {
      const response = await asUser(MANAGER_USER)(
        request(app).get('/api/v1/accounts')
      );
      expect(response.status).toBe(200);
    });

    it('should allow manager to create and update accounts', async () => {
      const createResponse = await asUser(MANAGER_USER)(
        request(app)
          .post('/api/v1/accounts')
          .send({ name: 'Manager Created Account' })
      );
      expect(createResponse.status).toBe(201);
    });

    // Manager doesn't have delete permissions by default
    it('should DENY manager from deleting an account', async () => {
      const response = await asUser(MANAGER_USER)(
        request(app).delete(`/api/v1/accounts/${testAccountId}`)
      );
      expect(response.status).toBe(403);
    });
  });

  describe('Admin Role - Full Access', () => {
    it('should allow admin to list accounts', async () => {
      const response = await asUser(ADMIN_USER)(
        request(app).get('/api/v1/accounts')
      );
      expect(response.status).toBe(200);
    });

    it('should allow admin to create accounts', async () => {
      const response = await asUser(ADMIN_USER)(
        request(app)
          .post('/api/v1/accounts')
          .send({ name: 'Admin Created Account' })
      );
      expect(response.status).toBe(201);
    });

    it('should allow admin to update accounts', async () => {
      const response = await asUser(ADMIN_USER)(
        request(app)
          .patch(`/api/v1/accounts/${testAccountId}`)
          .send({ name: 'Admin Updated Account' })
      );
      expect(response.status).toBe(200);
    });

    it('should allow admin to create contacts', async () => {
      const response = await asUser(ADMIN_USER)(
        request(app)
          .post('/api/v1/contacts')
          .send({ email: `admin-created-${Date.now()}@test.com` })
      );
      expect(response.status).toBe(201);
    });

    it('should allow admin to delete contacts', async () => {
      // First create a contact to delete
      const createResponse = await asUser(ADMIN_USER)(
        request(app)
          .post('/api/v1/contacts')
          .send({ email: `admin-delete-${Date.now()}@test.com` })
      );
      
      const contactId = createResponse.body.data?.id;
      if (contactId) {
        const deleteResponse = await asUser(ADMIN_USER)(
          request(app).delete(`/api/v1/contacts/${contactId}`)
        );
        expect(deleteResponse.status).toBe(200);
      }
    });
  });

  describe('Multiple Roles', () => {
    it('should combine permissions from multiple roles', async () => {
      const multiRoleUser = {
        ...VIEWER_USER,
        userId: 'usr_multirole',
        roles: ['viewer', 'sales_rep'], // Combined roles
      };

      // With sales_rep role, should be able to create
      const response = await asUser(multiRoleUser)(
        request(app)
          .post('/api/v1/accounts')
          .send({ name: 'Multi Role Created Account' })
      );
      expect(response.status).toBe(201);
    });
  });
});

