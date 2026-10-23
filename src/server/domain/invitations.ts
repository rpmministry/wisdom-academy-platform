import { prepare, withTransaction } from '../db';
import { nowIso } from '../db/sqlite';
import { ApiError } from '../http/api';
import { hashCode } from '../security/codes';
import {
  codeHint,
  generateHumanCode,
  normalizeCode,
  randomToken,
} from '../security/random';
import type { AuthUser } from '../auth/authorization';
import { computeAccessWindow, grantGlobalAccess } from './access';

export type InvitationKind = 'founder' | 'investor';
export type InvitationMode = 'nominated' | 'open';

interface InvitationRow {
  id: string;
  kind: InvitationKind;
  mode: InvitationMode;
  email: string | null;
  token_hash: string;
  token_hint: string;
  status: 'active' | 'paused' | 'revoked' | 'exhausted';
  max_uses: number;
  use_count: number;
  starts_at: string;
  expires_at: string | null;
  access_starts_at: string | null;
  access_days: number | null;
  access_months: number | null;
  access_ends_at: string | null;
  unlimited: number;
  label: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  revoked_at: string | null;
}

export interface InvitationView {
  id: string;
  kind: InvitationKind;
  mode: InvitationMode;
  email: string | null;
  hint: string;
  status: string;
  maxUses: number;
  useCount: number;
  startsAt: string;
  expiresAt: string | null;
  accessStartsAt: string | null;
  accessDays: number | null;
  accessMonths: number | null;
  accessEndsAt: string | null;
  unlimited: boolean;
  label: string | null;
  createdAt: string;
  beneficiaries: Array<{
    userId: string;
    email: string;
    name: string;
    redeemedAt: string;
  }>;
}

function loadInvitation(id: string): InvitationRow | null {
  return (
    (prepare('SELECT * FROM invitations WHERE id = ?').get(id) as InvitationRow | undefined) ?? null
  );
}

function toView(row: InvitationRow): InvitationView {
  const beneficiaries = prepare(`
    SELECT ir.user_id, u.email, u.display_name, ir.redeemed_at
    FROM invitation_redemptions ir
    JOIN users u ON u.id = ir.user_id
    WHERE ir.invitation_id = ?
    ORDER BY ir.redeemed_at DESC
  `).all(row.id) as Array<{
    user_id: string;
    email: string;
    display_name: string | null;
    redeemed_at: string;
  }>;
  return {
    id: row.id,
    kind: row.kind,
    mode: row.mode,
    email: row.email,
    hint: row.token_hint,
    status: row.status,
    maxUses: Number(row.max_uses),
    useCount: Number(row.use_count),
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    accessStartsAt: row.access_starts_at,
    accessDays: row.access_days === null ? null : Number(row.access_days),
    accessMonths: row.access_months === null ? null : Number(row.access_months),
    accessEndsAt: row.access_ends_at,
    unlimited: Boolean(row.unlimited),
    label: row.label,
    createdAt: row.created_at,
    beneficiaries: beneficiaries.map((item) => ({
      userId: item.user_id,
      email: item.email,
      name: item.display_name || item.email,
      redeemedAt: item.redeemed_at,
    })),
  };
}

export function listInvitations(): InvitationView[] {
  const rows = prepare('SELECT * FROM invitations ORDER BY created_at DESC').all() as InvitationRow[];
  return rows.map(toView);
}

export function createInvitation(input: {
  actor: AuthUser;
  kind: InvitationKind;
  mode: InvitationMode;
  email?: string | null;
  label?: string | null;
  maxUses?: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  accessStartsAt?: string | null;
  accessDays?: number | null;
  accessMonths?: number | null;
  accessEndsAt?: string | null;
  unlimited?: boolean;
}): { id: string; token: string; hint: string } {
  const email = input.email?.trim().toLowerCase() || null;
  if (input.mode === 'nominated' && !email) {
    throw new ApiError(
      400,
      'INVITATION_EMAIL_REQUIRED',
      'La invitación nominativa requiere un correo verificado.'
    );
  }
  const maxUses = input.mode === 'nominated' ? 1 : Math.max(1, Math.min(input.maxUses ?? 1, 1000));
  const unlimitedAccess = Boolean(input.unlimited);
  if (
    !unlimitedAccess &&
    !input.accessEndsAt &&
    !input.accessDays &&
    !input.accessMonths
  ) {
    throw new ApiError(
      400,
      'INVITATION_DURATION_REQUIRED',
      'Define la duración del acceso global o autoriza acceso permanente.'
    );
  }

  const token = generateHumanCode(input.kind === 'founder' ? 'WA-FOUNDER' : 'WA-INVESTOR', 24);
  const normalized = normalizeCode(token);
  if (normalized.length < 20) {
    throw new ApiError(500, 'INVITATION_TOKEN_ERROR', 'No fue posible generar un token seguro.');
  }
  const hash = hashCode(token);
  if (prepare('SELECT id FROM invitations WHERE token_hash = ?').get(hash)) {
    throw new ApiError(409, 'INVITATION_TOKEN_COLLISION', 'Intenta generar la invitación nuevamente.');
  }

  const id = `inv_${randomToken(16)}`;
  const now = nowIso();
  prepare(`
    INSERT INTO invitations
      (id, kind, mode, email, token_hash, token_hint, status, max_uses, use_count, starts_at,
       expires_at, access_starts_at, access_days, access_months, access_ends_at, unlimited, label,
       created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.kind,
    input.mode,
    email,
    hash,
    codeHint(token),
    maxUses,
    input.startsAt ? new Date(input.startsAt).toISOString() : now,
    input.expiresAt ? new Date(input.expiresAt).toISOString() : null,
    input.accessStartsAt ? new Date(input.accessStartsAt).toISOString() : null,
    input.accessDays ?? null,
    input.accessMonths ?? null,
    input.accessEndsAt ? new Date(input.accessEndsAt).toISOString() : null,
    unlimitedAccess ? 1 : 0,
    input.label || null,
    input.actor.id,
    now,
    now
  );

  return { id, token, hint: codeHint(token) };
}

export interface AcceptInvitationResult {
  invitationId: string;
  grantId: string;
  kind: InvitationKind;
  accessStartsAt: string;
  accessEndsAt: string | null;
  alreadyAccepted: boolean;
}

export function acceptInvitation(input: {
  token: string;
  user: AuthUser;
}): AcceptInvitationResult {
  const hash = hashCode(input.token);
  const invitation = prepare('SELECT * FROM invitations WHERE token_hash = ?').get(hash) as
    | InvitationRow
    | undefined;
  if (!invitation) {
    throw new ApiError(404, 'INVITATION_NOT_FOUND', 'La invitación no existe.');
  }
  const now = nowIso();
  const existingRedemption = prepare(
    'SELECT id, grant_id FROM invitation_redemptions WHERE invitation_id = ? AND user_id = ?'
  ).get(invitation.id, input.user.id) as
    | { id: string; grant_id: string | null }
    | undefined;
  if (existingRedemption) {
    const accessWindow = computeAccessWindow({
      startsAt: invitation.access_starts_at,
      durationDays: invitation.access_days,
      durationMonths: invitation.access_months,
      endsAt: invitation.access_ends_at,
      unlimited: Boolean(invitation.unlimited),
    });
    return {
      invitationId: invitation.id,
      grantId: existingRedemption.grant_id || '',
      kind: invitation.kind,
      accessStartsAt: accessWindow.startsAt,
      accessEndsAt: accessWindow.endsAt,
      alreadyAccepted: true,
    };
  }

  if (invitation.status === 'paused') {
    throw new ApiError(409, 'INVITATION_PAUSED', 'La invitación está pausada.');
  }
  if (invitation.status === 'revoked') {
    throw new ApiError(409, 'INVITATION_REVOKED', 'La invitación fue revocada.');
  }
  if (invitation.status === 'exhausted' || invitation.use_count >= invitation.max_uses) {
    throw new ApiError(409, 'INVITATION_EXHAUSTED', 'La invitación agotó sus usos.');
  }
  if (invitation.starts_at > now) {
    throw new ApiError(409, 'INVITATION_NOT_STARTED', 'La invitación aún no está vigente.');
  }
  if (invitation.expires_at && invitation.expires_at <= now) {
    throw new ApiError(409, 'INVITATION_EXPIRED', 'La invitación ha expirado.');
  }
  if (invitation.mode === 'nominated') {
    if (!input.user.emailVerified) {
      throw new ApiError(
        403,
        'INVITATION_EMAIL_UNVERIFIED',
        'La invitación nominativa requiere un correo verificado.'
      );
    }
    if (invitation.email?.toLowerCase() !== input.user.email.toLowerCase()) {
      throw new ApiError(
        403,
        'INVITATION_EMAIL_MISMATCH',
        'Esta invitación está reservada para otro correo.'
      );
    }
  }

  const accessWindow = computeAccessWindow({
    startsAt: invitation.access_starts_at,
    durationDays: invitation.access_days,
    durationMonths: invitation.access_months,
    endsAt: invitation.access_ends_at,
    unlimited: Boolean(invitation.unlimited),
  });

  return withTransaction(() => {
    const current = loadInvitation(invitation.id);
    if (!current) {
      throw new ApiError(404, 'INVITATION_NOT_FOUND', 'La invitación no existe.');
    }
    if (current.status === 'exhausted') {
      throw new ApiError(409, 'INVITATION_EXHAUSTED', 'La invitación agotó sus usos.');
    }
    if (current.status !== 'active') {
      throw new ApiError(409, 'INVITATION_NOT_ACTIVE', 'La invitación ya no está activa.');
    }
    if (current.starts_at > now) {
      throw new ApiError(409, 'INVITATION_NOT_STARTED', 'La invitación aún no está vigente.');
    }
    if (current.expires_at && current.expires_at <= now) {
      throw new ApiError(409, 'INVITATION_EXPIRED', 'La invitación ha expirado.');
    }
    if (current.use_count >= current.max_uses) {
      throw new ApiError(409, 'INVITATION_EXHAUSTED', 'La invitación agotó sus usos.');
    }

    const update = prepare(`
      UPDATE invitations
      SET use_count = use_count + 1,
          status = CASE WHEN use_count + 1 >= max_uses THEN 'exhausted' ELSE status END,
          updated_at = ?
      WHERE id = ? AND status = 'active'
    `).run(now, current.id);
    if (update.changes === 0) {
      throw new ApiError(409, 'INVITATION_RACE', 'La invitación ya no admite canjes.');
    }

    const roleCode = current.kind === 'founder' ? 'founder' : 'investor';
    const hasRole = prepare(`
      SELECT 1 AS present FROM user_roles
      WHERE user_id = ? AND role_code = ? AND revoked_at IS NULL
    `).get(input.user.id, roleCode);
    if (!hasRole) {
      prepare(`
        INSERT INTO user_roles (id, user_id, role_code, granted_by, granted_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        `ur_${randomToken(12)}`,
        input.user.id,
        roleCode,
        current.created_by || input.user.id,
        now
      );
    }

    const grant = grantGlobalAccess({
      userId: input.user.id,
      kind: current.kind,
      origin: current.kind === 'founder' ? 'founder_invitation' : 'investor_invitation',
      originRef: current.id,
      startsAt: accessWindow.startsAt,
      endsAt: accessWindow.endsAt,
      grantedBy: current.created_by || input.user.id,
    });

    prepare(`
      INSERT INTO invitation_redemptions (id, invitation_id, user_id, redeemed_at, grant_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(`ire_${randomToken(12)}`, current.id, input.user.id, now, grant.id);

    return {
      invitationId: current.id,
      grantId: grant.id,
      kind: current.kind,
      accessStartsAt: accessWindow.startsAt,
      accessEndsAt: accessWindow.endsAt,
      alreadyAccepted: false,
    };
  });
}

export function updateInvitationStatus(
  invitationId: string,
  action: 'pause' | 'resume' | 'revoke'
): void {
  const invitation = loadInvitation(invitationId);
  if (!invitation) throw new ApiError(404, 'INVITATION_NOT_FOUND', 'La invitación no existe.');
  const now = nowIso();
  if (action === 'revoke') {
    prepare(`
      UPDATE invitations SET status = 'revoked', revoked_at = ?, updated_at = ? WHERE id = ?
    `).run(now, now, invitationId);
    return;
  }
  if (invitation.status === 'revoked') {
    throw new ApiError(409, 'INVITATION_REVOKED', 'Una invitación revocada no puede reactivarse.');
  }
  prepare('UPDATE invitations SET status = ?, updated_at = ? WHERE id = ?').run(
    action === 'pause' ? 'paused' : 'active',
    now,
    invitationId
  );
}
