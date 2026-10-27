import { AppError } from '../lib/errors';

export type AdminAction = 'suspend' | 'reactivate' | 'demote' | 'promote' | 'delete';

interface AdminChange {
  actorId: string;
  target: { id: string; email: string; role: 'user' | 'admin'; status: 'active' | 'suspended' };
  action: AdminAction;
  activeAdminCount: number;
  seededEmails: string[];
}

/**
 * - an admin cannot suspend, demote or delete themselves
 * - seeded admins (ADMIN_EMAILS) can never be suspended, demoted or deleted
 * - the last active admin can never be removed
 */
export function assertAdminChangeAllowed(c: AdminChange): void {
  if (c.action === 'reactivate' || c.action === 'promote') return;
  if (c.actorId === c.target.id) {
    throw new AppError(403, 'SELF_PROTECTED', 'You cannot suspend, demote or delete yourself');
  }
  if (c.seededEmails.map((e) => e.toLowerCase()).includes(c.target.email.toLowerCase())) {
    throw new AppError(403, 'SEEDED_ADMIN_PROTECTED', 'This seeded admin cannot be suspended, demoted or deleted');
  }
  const removesActiveAdmin = c.target.role === 'admin' && c.target.status === 'active';
  if (removesActiveAdmin && c.activeAdminCount <= 1) {
    throw new AppError(409, 'LAST_ADMIN', 'The last admin cannot be removed');
  }
}
