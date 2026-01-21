/**
 * Role-Based Access Control (RBAC) definitions and utilities
 */

/**
 * Available roles in the system
 */
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  SALES_REP: 'sales_rep',
  VIEWER: 'viewer',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Permissions available in the system
 */
export const PERMISSIONS = {
  // User management
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',

  // API Keys
  API_KEYS_READ: 'api_keys:read',
  API_KEYS_WRITE: 'api_keys:write',
  API_KEYS_DELETE: 'api_keys:delete',

  // Accounts
  ACCOUNTS_READ: 'accounts:read',
  ACCOUNTS_WRITE: 'accounts:write',
  ACCOUNTS_DELETE: 'accounts:delete',

  // Contacts
  CONTACTS_READ: 'contacts:read',
  CONTACTS_WRITE: 'contacts:write',
  CONTACTS_DELETE: 'contacts:delete',

  // Opportunities
  OPPORTUNITIES_READ: 'opportunities:read',
  OPPORTUNITIES_WRITE: 'opportunities:write',
  OPPORTUNITIES_DELETE: 'opportunities:delete',

  // Emails
  EMAILS_READ: 'emails:read',
  EMAILS_SEND: 'emails:send',

  // Meetings
  MEETINGS_READ: 'meetings:read',
  MEETINGS_WRITE: 'meetings:write',

  // Sequences
  SEQUENCES_READ: 'sequences:read',
  SEQUENCES_WRITE: 'sequences:write',
  SEQUENCES_DELETE: 'sequences:delete',

  // Activities
  ACTIVITIES_READ: 'activities:read',
  ACTIVITIES_WRITE: 'activities:write',

  // Leads
  LEADS_READ: 'leads:read',
  LEADS_WRITE: 'leads:write',
  LEADS_DELETE: 'leads:delete',

  // Intent (Signals, Recommendations)
  INTENT_READ: 'intent:read',
  INTENT_WRITE: 'intent:write',

  // Settings
  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',

  // Audit logs
  AUDIT_READ: 'audit:read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Role to permissions mapping
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS), // Admin has all permissions

  [ROLES.MANAGER]: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.API_KEYS_READ,
    PERMISSIONS.ACCOUNTS_READ,
    PERMISSIONS.ACCOUNTS_WRITE,
    PERMISSIONS.CONTACTS_READ,
    PERMISSIONS.CONTACTS_WRITE,
    PERMISSIONS.OPPORTUNITIES_READ,
    PERMISSIONS.OPPORTUNITIES_WRITE,
    PERMISSIONS.EMAILS_READ,
    PERMISSIONS.EMAILS_SEND,
    PERMISSIONS.MEETINGS_READ,
    PERMISSIONS.MEETINGS_WRITE,
    PERMISSIONS.SEQUENCES_READ,
    PERMISSIONS.SEQUENCES_WRITE,
    PERMISSIONS.ACTIVITIES_READ,
    PERMISSIONS.ACTIVITIES_WRITE,
    PERMISSIONS.LEADS_READ,
    PERMISSIONS.LEADS_WRITE,
    PERMISSIONS.INTENT_READ,
    PERMISSIONS.INTENT_WRITE,
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.AUDIT_READ,
  ],

  [ROLES.SALES_REP]: [
    PERMISSIONS.ACCOUNTS_READ,
    PERMISSIONS.ACCOUNTS_WRITE,
    PERMISSIONS.CONTACTS_READ,
    PERMISSIONS.CONTACTS_WRITE,
    PERMISSIONS.OPPORTUNITIES_READ,
    PERMISSIONS.OPPORTUNITIES_WRITE,
    PERMISSIONS.EMAILS_READ,
    PERMISSIONS.EMAILS_SEND,
    PERMISSIONS.MEETINGS_READ,
    PERMISSIONS.MEETINGS_WRITE,
    PERMISSIONS.SEQUENCES_READ,
    PERMISSIONS.ACTIVITIES_READ,
    PERMISSIONS.ACTIVITIES_WRITE,
    PERMISSIONS.LEADS_READ,
    PERMISSIONS.LEADS_WRITE,
    PERMISSIONS.INTENT_READ,
  ],

  [ROLES.VIEWER]: [
    PERMISSIONS.ACCOUNTS_READ,
    PERMISSIONS.CONTACTS_READ,
    PERMISSIONS.OPPORTUNITIES_READ,
    PERMISSIONS.EMAILS_READ,
    PERMISSIONS.MEETINGS_READ,
    PERMISSIONS.SEQUENCES_READ,
    PERMISSIONS.ACTIVITIES_READ,
    PERMISSIONS.LEADS_READ,
    PERMISSIONS.INTENT_READ,
  ],
};

/**
 * Get all permissions for a set of roles
 */
export function getPermissionsForRoles(roles: string[]): Permission[] {
  const permissions = new Set<Permission>();

  for (const role of roles) {
    const rolePermissions = ROLE_PERMISSIONS[role as Role];
    if (rolePermissions) {
      for (const permission of rolePermissions) {
        permissions.add(permission);
      }
    }
  }

  return Array.from(permissions);
}

/**
 * Check if roles have a specific permission
 */
export function hasPermission(roles: string[], permission: Permission): boolean {
  return getPermissionsForRoles(roles).includes(permission);
}

/**
 * Check if roles have all specified permissions
 */
export function hasAllPermissions(roles: string[], permissions: Permission[]): boolean {
  const userPermissions = getPermissionsForRoles(roles);
  return permissions.every((p) => userPermissions.includes(p));
}

/**
 * Check if roles have any of the specified permissions
 */
export function hasAnyPermission(roles: string[], permissions: Permission[]): boolean {
  const userPermissions = getPermissionsForRoles(roles);
  return permissions.some((p) => userPermissions.includes(p));
}

/**
 * Validate that a role is valid
 */
export function isValidRole(role: string): role is Role {
  return Object.values(ROLES).includes(role as Role);
}

