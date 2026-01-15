/**
 * Tenant-scoped database helpers
 * 
 * These helpers enforce tenant isolation at the query level.
 * Every query that accesses tenant data MUST use these helpers.
 */

import { and, eq, SQL } from 'drizzle-orm';
import type { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import type { CustomerId } from '../types/index.js';
import { ForbiddenError } from '../errors/index.js';

/**
 * Tenant isolation context
 */
export interface TenantScope {
  customerId: CustomerId;
}

/**
 * Create a where clause that includes tenant isolation
 * 
 * @param scope - Tenant context containing customerId
 * @param customerIdColumn - The customer_id column of the table
 * @param additionalConditions - Additional where conditions (optional)
 */
export function withTenant<T extends { customerId: PgColumn }>(
  scope: TenantScope,
  table: T,
  ...additionalConditions: (SQL | undefined)[]
): SQL {
  const tenantCondition = eq(table.customerId, scope.customerId);
  const validConditions = additionalConditions.filter((c): c is SQL => c !== undefined);
  
  if (validConditions.length === 0) {
    return tenantCondition;
  }
  
  return and(tenantCondition, ...validConditions)!;
}

/**
 * Assert that a fetched record belongs to the current tenant
 * Throws ForbiddenError if there's a mismatch (shouldn't happen with proper queries)
 */
export function assertTenantMatch<T extends { customerId: string }>(
  scope: TenantScope,
  record: T | null | undefined,
  entityType: string = 'record'
): asserts record is T {
  if (!record) {
    throw new ForbiddenError(`${entityType} not found or access denied`);
  }
  
  if (record.customerId !== scope.customerId) {
    // Log this as a security event - this should never happen with proper queries
    console.error('SECURITY: Cross-tenant access attempt detected', {
      requestedCustomerId: scope.customerId,
      recordCustomerId: record.customerId,
      entityType,
    });
    throw new ForbiddenError(`Access denied to ${entityType}`);
  }
}

/**
 * Validate that a list of records all belong to the current tenant
 */
export function assertTenantMatchAll<T extends { customerId: string }>(
  scope: TenantScope,
  records: T[],
  entityType: string = 'records'
): void {
  for (const record of records) {
    if (record.customerId !== scope.customerId) {
      console.error('SECURITY: Cross-tenant access attempt in list', {
        requestedCustomerId: scope.customerId,
        recordCustomerId: record.customerId,
        entityType,
      });
      throw new ForbiddenError(`Access denied to ${entityType}`);
    }
  }
}

/**
 * Create a tenant-scoped insert object
 * Ensures the customerId is always set correctly
 */
export function withTenantInsert<T extends Record<string, unknown>>(
  scope: TenantScope,
  data: T
): T & { customerId: CustomerId } {
  return {
    ...data,
    customerId: scope.customerId,
  };
}

