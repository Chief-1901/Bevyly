/**
 * Idempotency Tests
 * 
 * These tests verify that the idempotency middleware correctly handles
 * duplicate requests with the same Idempotency-Key.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../services/crm/index.js';
import { getDb } from '../shared/db/client.js';
import { accounts, idempotencyKeys } from '../shared/db/schema/index.js';
import { generateId } from '../shared/utils/id.js';
import type { CustomerId } from '../shared/types/index.js';
import { eq } from 'drizzle-orm';

const TEST_CUSTOMER_ID = 'cus_idempotency_test' as CustomerId;

const TEST_USER = {
  customerId: TEST_CUSTOMER_ID,
  userId: 'usr_idem_test',
  userEmail: 'idem@test.com',
  roles: ['admin'],
};

function asUser(user: typeof TEST_USER) {
  return (req: request.Test) => {
    return req
      .set('x-customer-id', user.customerId)
      .set('x-user-id', user.userId)
      .set('x-user-email', user.userEmail)
      .set('x-user-roles', JSON.stringify(user.roles));
  };
}

describe('Idempotency Middleware', () => {
  afterAll(async () => {
    const db = getDb();
    // Clean up test data
    await db.delete(accounts).where(
      (a) => a.customerId.eq(TEST_CUSTOMER_ID)
    ).catch(() => {});
    await db.delete(idempotencyKeys).where(
      eq(idempotencyKeys.customerId, TEST_CUSTOMER_ID)
    ).catch(() => {});
  });

  describe('Request without Idempotency-Key', () => {
    it('should process request normally', async () => {
      const response = await asUser(TEST_USER)(
        request(app)
          .post('/api/v1/accounts')
          .send({ name: 'No Idem Key Account' })
      );
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Request with Idempotency-Key', () => {
    it('should process first request and cache response', async () => {
      const idempotencyKey = generateId('idem');
      
      const response = await asUser(TEST_USER)(
        request(app)
          .post('/api/v1/accounts')
          .set('Idempotency-Key', idempotencyKey)
          .send({ name: 'Idempotent Account 1' })
      );
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Idempotent Account 1');
      
      // Check that the key was stored
      const db = getDb();
      const [storedKey] = await db
        .select()
        .from(idempotencyKeys)
        .where(eq(idempotencyKeys.key, idempotencyKey))
        .limit(1);
      
      expect(storedKey).toBeDefined();
      expect(storedKey.status).toBe('completed');
    });

    it('should return cached response for duplicate request', async () => {
      const idempotencyKey = generateId('idem');
      
      // First request
      const response1 = await asUser(TEST_USER)(
        request(app)
          .post('/api/v1/accounts')
          .set('Idempotency-Key', idempotencyKey)
          .send({ name: 'Idempotent Account 2' })
      );
      
      expect(response1.status).toBe(201);
      const createdAccountId = response1.body.data.id;
      
      // Second request with same key - should return cached response
      const response2 = await asUser(TEST_USER)(
        request(app)
          .post('/api/v1/accounts')
          .set('Idempotency-Key', idempotencyKey)
          .send({ name: 'Different Name' }) // Even with different body
      );
      
      expect(response2.status).toBe(201);
      expect(response2.body.success).toBe(true);
      expect(response2.body.data.id).toBe(createdAccountId); // Same ID
      expect(response2.body.meta.idempotentReplay).toBe(true); // Marked as replay
    });

    it('should reject invalid idempotency key format', async () => {
      const response = await asUser(TEST_USER)(
        request(app)
          .post('/api/v1/accounts')
          .set('Idempotency-Key', 'short') // Too short
          .send({ name: 'Invalid Key Account' })
      );
      
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_IDEMPOTENCY_KEY');
    });

    it('should allow different keys to create different accounts', async () => {
      const key1 = generateId('idem');
      const key2 = generateId('idem');
      
      const response1 = await asUser(TEST_USER)(
        request(app)
          .post('/api/v1/accounts')
          .set('Idempotency-Key', key1)
          .send({ name: 'Account with Key 1' })
      );
      
      const response2 = await asUser(TEST_USER)(
        request(app)
          .post('/api/v1/accounts')
          .set('Idempotency-Key', key2)
          .send({ name: 'Account with Key 2' })
      );
      
      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
      expect(response1.body.data.id).not.toBe(response2.body.data.id);
    });
  });

  describe('GET requests', () => {
    it('should not cache GET requests', async () => {
      const idempotencyKey = generateId('idem');
      
      const response = await asUser(TEST_USER)(
        request(app)
          .get('/api/v1/accounts')
          .set('Idempotency-Key', idempotencyKey)
      );
      
      expect(response.status).toBe(200);
      
      // Key should not be stored for GET
      const db = getDb();
      const [storedKey] = await db
        .select()
        .from(idempotencyKeys)
        .where(eq(idempotencyKeys.key, idempotencyKey))
        .limit(1);
      
      expect(storedKey).toBeUndefined();
    });
  });
});

