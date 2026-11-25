import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Role } from '../types/domain';
import { store } from '../db/store';

export interface AuthPayload {
  userId: string;
  organizationId: string;
  email: string;
  role: Role;
  fullName: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const token = header.slice(7).trim();
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    const user = store.db.users.find((u) => u.id === decoded.userId && u.isActive);
    if (!user) {
      res.status(401).json({ error: 'Invalid or inactive user session.' });
      return;
    }
    req.user = {
      userId: user.id,
      organizationId: user.organizationId,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
  }
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}.`,
      });
      return;
    }
    next();
  };
}

export function recordAudit(params: {
  organizationId: string;
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string;
}): void {
  store.db.auditLogs.unshift({
    id: store.newId('aud'),
    organizationId: params.organizationId,
    userId: params.userId ?? null,
    action: params.action,
    resource: params.resource,
    resourceId: params.resourceId ?? null,
    details: params.details ?? null,
    ipAddress: params.ipAddress ?? null,
    createdAt: new Date().toISOString(),
  });
  // Keep audit log bounded in local store
  if (store.db.auditLogs.length > 500) {
    store.db.auditLogs.length = 500;
  }
  store.save();
}
