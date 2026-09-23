import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function displayNameFromEmail(email: string) {
  const localPart = email.split("@")[0] || "Trader";
  return localPart
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Trader";
}

function accountOpenId(email: string) {
  return `email_${createHash("sha256").update(email).digest("hex").slice(0, 56)}`;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, storedHash] = stored.split(":");
  if (!salt || !storedHash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(storedHash, "hex");
  return expected.length === candidate.length && timingSafeEqual(candidate, expected);
}

async function setAuthCookie(ctx: { req: Parameters<typeof getSessionCookieOptions>[0]; res: { cookie: (name: string, value: string, options: Record<string, unknown>) => void } }, openId: string, name: string) {
  const token = await sdk.createSessionToken(openId, { name });
  ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user ?? null),
    register: publicProcedure
      .input(z.object({ email: z.string().email().max(320), password: z.string().min(8).max(128) }))
      .mutation(async ({ input, ctx }) => {
        const email = normalizeEmail(input.email);
        const existing = await db.getUserByEmail(email);
        if (existing) throw new Error("An account already exists for this email");
        const name = displayNameFromEmail(email);
        const user = await db.createCredentialUser({
          openId: accountOpenId(email),
          email,
          name,
          passwordHash: hashPassword(input.password),
        });
        if (!user) throw new Error("Could not create account");
        await setAuthCookie(ctx, user.openId, name);
        return { success: true, name } as const;
      }),
    login: publicProcedure
      .input(z.object({ email: z.string().email().max(320), password: z.string().min(1).max(128) }))
      .mutation(async ({ input, ctx }) => {
        const email = normalizeEmail(input.email);
        const user = await db.getUserByEmail(email);
        if (!user?.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
          throw new Error("Email or password is incorrect");
        }
        await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
        await setAuthCookie(ctx, user.openId, user.name || displayNameFromEmail(email));
        return { success: true } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
