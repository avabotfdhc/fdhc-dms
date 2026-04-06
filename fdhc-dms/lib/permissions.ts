// ---------------------------------------------------------------------------
// Role-based access control (RBAC) utilities
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Permission =
  | 'view_all_clients'
  | 'edit_deals'
  | 'approve_agreements'
  | 'manage_users'
  | 'view_accounting'
  | 'delete_records'

export type Role = 'admin' | 'manager' | 'user' | 'viewer'

/**
 * Minimal profile shape required by permission helpers.
 * Matches the `profiles` table columns used for access control.
 */
export interface PermissionProfile {
  id: string
  role: string
  can_view_all_clients?: boolean
  can_edit_deals?: boolean
  can_approve_agreements?: boolean
  can_manage_users?: boolean
  can_view_accounting?: boolean
  can_delete_records?: boolean
}

export interface ClientRecord {
  id: string
  assigned_to: string | null
}

export interface DealRecord {
  id: string
  created_by: string | null
  assigned_to: string | null
}

// ---------------------------------------------------------------------------
// Permission → profile column mapping
// ---------------------------------------------------------------------------

const PERMISSION_COLUMN_MAP: Record<Permission, keyof PermissionProfile> = {
  view_all_clients: 'can_view_all_clients',
  edit_deals: 'can_edit_deals',
  approve_agreements: 'can_approve_agreements',
  manage_users: 'can_manage_users',
  view_accounting: 'can_view_accounting',
  delete_records: 'can_delete_records',
}

// ---------------------------------------------------------------------------
// Core permission check
// ---------------------------------------------------------------------------

/**
 * Check whether a user profile has a specific permission.
 *
 * Admins always return `true` for every permission.  For other roles the
 * corresponding boolean column on the profile record is checked.
 */
export function hasPermission(
  profile: PermissionProfile,
  permission: Permission,
): boolean {
  if (profile.role === 'admin') return true

  const column = PERMISSION_COLUMN_MAP[permission]
  return Boolean(profile[column])
}

// ---------------------------------------------------------------------------
// Resource-level checks
// ---------------------------------------------------------------------------

/**
 * Can the user view a specific client record?
 *
 * Admins and managers can always view. Reps can view if the client is
 * assigned to them, or if they have the `view_all_clients` permission.
 */
export function canViewClient(
  profile: PermissionProfile,
  client: ClientRecord,
): boolean {
  if (profile.role === 'admin' || profile.role === 'manager') return true
  if (hasPermission(profile, 'view_all_clients')) return true
  return client.assigned_to === profile.id
}

/**
 * Can the user edit a specific deal?
 *
 * Admins and managers can always edit. Reps can edit if they created or are
 * assigned to the deal, provided they also have `edit_deals` permission.
 */
export function canEditDeal(
  profile: PermissionProfile,
  deal: DealRecord,
): boolean {
  if (profile.role === 'admin' || profile.role === 'manager') return true

  const isOwner =
    deal.created_by === profile.id || deal.assigned_to === profile.id

  return isOwner && hasPermission(profile, 'edit_deals')
}

// ---------------------------------------------------------------------------
// Role labels
// ---------------------------------------------------------------------------

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  manager: 'Sales Manager',
  user: 'Sales Representative',
  viewer: 'View Only',
}

/**
 * Return a human-readable label for a role slug.
 */
export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] || role.charAt(0).toUpperCase() + role.slice(1)
}

// ---------------------------------------------------------------------------
// Default permissions per role (for new user creation)
// ---------------------------------------------------------------------------

export const DEFAULT_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'view_all_clients',
    'edit_deals',
    'approve_agreements',
    'manage_users',
    'view_accounting',
    'delete_records',
  ],
  manager: [
    'view_all_clients',
    'edit_deals',
    'approve_agreements',
    'view_accounting',
  ],
  user: [
    'edit_deals',
  ],
  viewer: [],
}
