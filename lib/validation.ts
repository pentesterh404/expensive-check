import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  displayName: z.string().min(1).max(80).optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const expenseCreateSchema = z.object({
  description: z.string().min(1).max(255),
  amount: z.coerce.number().positive(),
  expenseDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  categoryId: z.string().cuid().optional().nullable(),
  tags: z.array(z.string().min(1).max(32)).optional().default([]),
  wallet: z.string().max(64).optional().nullable(),
  status: z.enum(["CONFIRMED", "PENDING_REVIEW", "UNPARSED", "DELETED"]).optional()
});

export const expensePatchSchema = expenseCreateSchema.partial().extend({
  deletedAt: z.string().datetime().nullable().optional()
});

export const expenseQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  category: z.string().optional(),
  tag: z.string().optional(),
  wallet: z.string().optional(),
  status: z.string().optional(),
  q: z.string().optional()
});

export const categorySchema = z.object({
  name: z.string().min(1).max(80),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  color: z.string().max(20).optional().nullable(),
  icon: z.string().max(20).optional().nullable()
});

export const adminCreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  displayName: z.string().min(1).max(80).optional().nullable()
});

export const adminUpdateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(1).optional(),
  displayName: z.string().min(1).max(80).nullable().optional()
});

export const accountProfilePatchSchema = z.object({
  displayName: z.string().min(1).max(80).nullable().optional(),
  password: z.string().min(1).optional()
});
