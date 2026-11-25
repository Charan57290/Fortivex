import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { store } from '../db/store';
import { AuthenticatedRequest, recordAudit, requireAuth, signToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { User } from '../types/domain';

const router = Router();

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  organizationName: z.string().min(2).optional(),
  role: z.enum(['ADMIN', 'SALES_MANAGER', 'SALES_AGENT']).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const email = data.email.toLowerCase().trim();
    const exists = store.db.users.find((u) => u.email.toLowerCase() === email);
    if (exists) {
      throw new AppError('An account with this email already exists.', 409);
    }

    const now = new Date().toISOString();
    let orgId = store.db.organizations[0]?.id || 'org_flowstack';
    if (data.organizationName) {
      const slug = data.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const existingOrg = store.db.organizations.find((o) => o.slug === slug);
      if (existingOrg) {
        orgId = existingOrg.id;
      } else {
        const newOrg = {
          id: store.newId('org'),
          name: data.organizationName.trim(),
          slug,
          industry: 'SaaS',
          plan: 'PRO',
          createdAt: now,
          updatedAt: now,
        };
        store.db.organizations.push(newOrg);
        orgId = newOrg.id;
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user: User = {
      id: store.newId('usr'),
      organizationId: orgId,
      email,
      passwordHash,
      fullName: data.fullName.trim(),
      role: data.role ?? 'SALES_AGENT',
      isActive: true,
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
    };
    store.db.users.push(user);
    store.save();

    recordAudit({
      organizationId: orgId,
      userId: user.id,
      action: 'USER_REGISTERED',
      resource: 'User',
      resourceId: user.id,
      ipAddress: req.ip,
    });

    const token = signToken({
      userId: user.id,
      organizationId: user.organizationId,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        organizationId: user.organizationId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const email = data.email.toLowerCase().trim();
    const user = store.db.users.find((u) => u.email.toLowerCase() === email && u.isActive);
    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      throw new AppError('Invalid email or password.', 401);
    }

    user.lastLoginAt = new Date().toISOString();
    store.save();

    recordAudit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'USER_LOGIN',
      resource: 'User',
      resourceId: user.id,
      ipAddress: req.ip,
    });

    const token = signToken({
      userId: user.id,
      organizationId: user.organizationId,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });

    res.json({
      token,
      user: {
        id: user.id,
        organizationId: user.organizationId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  res.json({
    message: email
      ? `If an account exists for ${email}, password reset instructions have been queued.`
      : 'Password reset instructions have been queued.',
  });
});

router.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = store.db.users.find((u) => u.id === req.user!.userId);
  const org = store.db.organizations.find((o) => o.id === req.user!.organizationId);
  res.json({
    user: user
      ? {
          id: user.id,
          organizationId: user.organizationId,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          lastLoginAt: user.lastLoginAt,
        }
      : null,
    organization: org ?? null,
  });
});

export default router;
