import { createPublicKey, randomBytes, timingSafeEqual, type JsonWebKey } from 'node:crypto';
import express, { Router, type Request, type Response as ExpressResponse } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env';
import { asyncHandler } from '../lib/async';
import { db, getDb } from '../lib/db';
import { AppError } from '../lib/errors';
import { signToken } from '../lib/jwt';
import { log } from '../lib/logger';

export const oauthRouter = Router();

type Provider = 'google' | 'apple';
interface Profile {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
}

const COOKIE_PATH = '/api/auth/oauth';
const FETCH_TIMEOUT_MS = 10_000;

const redirectUri = (provider: Provider) => `${env().API_PUBLIC_URL}/api/auth/oauth/${provider}/callback`;
const isHttps = () => env().API_PUBLIC_URL.startsWith('https://');

/** Provider responses are never echoed to the browser; they only go to the server log. */
async function fetchJson<T>(url: string, init: RequestInit, failure: { code: string; message: string }): Promise<T> {
  let res: globalThis.Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch (err) {
    log.warn('oauth request failed', { url, message: (err as Error).message });
    throw new AppError(502, failure.code, failure.message);
  }
  if (!res.ok) {
    log.warn('oauth request rejected', { url, status: res.status });
    throw new AppError(400, failure.code, failure.message);
  }
  return (await res.json()) as T;
}

// ---------------------------------------------------------------- CSRF state
function startFlow(provider: Provider, res: ExpressResponse): string {
  const state = randomBytes(32).toString('hex');
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: isHttps(),
    // Apple posts back cross-site (form_post), which only carries SameSite=None cookies.
    sameSite: provider === 'apple' && isHttps() ? 'none' : 'lax',
    maxAge: 10 * 60_000,
    path: COOKIE_PATH,
  });
  return state;
}

function consumeState(req: Request, res: ExpressResponse, state: string | undefined): void {
  res.clearCookie('oauth_state', { path: COOKIE_PATH });
  const cookie = req.cookies?.oauth_state;
  const a = Buffer.from(typeof cookie === 'string' ? cookie : '');
  const b = Buffer.from(state ?? '');
  if (a.length === 0 || a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new AppError(400, 'OAUTH_STATE_MISMATCH', 'Invalid OAuth state parameter');
  }
}

// ---------------------------------------------------------------- id_token verification
async function verifyIdToken(idToken: string, jwksUrl: string, opts: { algorithm: 'RS256' | 'ES256'; audience: string; issuer: string[] }): Promise<jwt.JwtPayload> {
  const decoded = jwt.decode(idToken, { complete: true });
  const kid = decoded && typeof decoded === 'object' ? decoded.header.kid : undefined;
  const { keys } = await fetchJson<{ keys: (JsonWebKey & { kid?: string; alg?: string })[] }>(jwksUrl, {}, { code: 'OAUTH_KEYS_ERROR', message: 'Could not fetch the provider signing keys' });
  const jwk = keys.find((k) => k.kid === kid && k.alg === opts.algorithm);
  if (!jwk) throw new AppError(400, 'OAUTH_KEY_NOT_FOUND', 'Provider signing key not found');
  try {
    const payload = jwt.verify(idToken, createPublicKey({ key: jwk, format: 'jwk' }), { algorithms: [opts.algorithm], audience: opts.audience, issuer: opts.issuer });
    if (typeof payload === 'string') throw new Error('unexpected payload');
    return payload;
  } catch (err) {
    log.warn('oauth id_token rejected', { message: (err as Error).message });
    throw new AppError(400, 'OAUTH_TOKEN_INVALID', 'Sign-in could not be verified');
  }
}

const truthy = (v: unknown) => v === true || v === 'true';

async function exchangeGoogleCode(code: string): Promise<Profile> {
  const e = env();
  const tokens = await fetchJson<{ id_token?: string }>(
    'https://oauth2.googleapis.com/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: e.GOOGLE_CLIENT_ID as string,
        client_secret: e.GOOGLE_CLIENT_SECRET as string,
        redirect_uri: redirectUri('google'),
        grant_type: 'authorization_code',
      }),
    },
    { code: 'GOOGLE_TOKEN_ERROR', message: 'Google sign-in failed' },
  );
  if (!tokens.id_token) throw new AppError(400, 'GOOGLE_TOKEN_ERROR', 'Google sign-in failed');
  const p = await verifyIdToken(tokens.id_token, 'https://www.googleapis.com/oauth2/v3/certs', {
    algorithm: 'RS256',
    audience: e.GOOGLE_CLIENT_ID as string,
    issuer: ['accounts.google.com', 'https://accounts.google.com'],
  });
  if (!p.sub || typeof p.email !== 'string' || !truthy(p.email_verified)) throw new AppError(400, 'GOOGLE_EMAIL_UNVERIFIED', 'Your Google email is not verified');
  return { sub: p.sub, email: p.email.toLowerCase(), name: typeof p.name === 'string' ? p.name : '', picture: typeof p.picture === 'string' ? p.picture : null };
}

async function exchangeAppleCode(code: string, name: string): Promise<Profile> {
  const e = env();
  const clientSecret = jwt.sign({}, (e.APPLE_PRIVATE_KEY as string).replace(/\\n/g, '\n'), {
    algorithm: 'ES256',
    keyid: e.APPLE_KEY_ID,
    issuer: e.APPLE_TEAM_ID,
    audience: 'https://appleid.apple.com',
    subject: e.APPLE_CLIENT_ID,
    expiresIn: 300,
  });
  const tokens = await fetchJson<{ id_token?: string }>(
    'https://appleid.apple.com/auth/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: e.APPLE_CLIENT_ID as string, client_secret: clientSecret, code, grant_type: 'authorization_code', redirect_uri: redirectUri('apple') }),
    },
    { code: 'APPLE_TOKEN_ERROR', message: 'Apple sign-in failed' },
  );
  if (!tokens.id_token) throw new AppError(400, 'APPLE_TOKEN_ERROR', 'Apple sign-in failed');
  const p = await verifyIdToken(tokens.id_token, 'https://appleid.apple.com/auth/keys', {
    algorithm: 'ES256',
    audience: e.APPLE_CLIENT_ID as string,
    issuer: ['https://appleid.apple.com'],
  });
  if (!p.sub || typeof p.email !== 'string' || !truthy(p.email_verified)) throw new AppError(400, 'APPLE_EMAIL_UNVERIFIED', 'Your Apple email could not be verified');
  return { sub: p.sub, email: p.email.toLowerCase(), name, picture: null };
}

// ---------------------------------------------------------------- account resolution
async function findOrCreateOAuthUser(provider: Provider, profile: Profile): Promise<{ id: string }> {
  const prisma = getDb();
  const suspended = () => new AppError(403, 'ACCOUNT_SUSPENDED', 'This account is suspended');
  const now = new Date();

  const linked = await db(prisma.oAuthAccount.findUnique({ where: { provider_providerId: { provider, providerId: profile.sub } }, include: { user: true } }), 'find oauth account');
  if (linked) {
    if (linked.user.status === 'suspended') throw suspended();
    await db(prisma.user.update({ where: { id: linked.userId }, data: { lastLoginAt: now } }), 'oauth login');
    return linked.user;
  }

  const existing = await db(prisma.user.findUnique({ where: { email: profile.email } }), 'find user by email');
  if (existing) {
    if (existing.status === 'suspended') throw suspended();
    await db(prisma.oAuthAccount.create({ data: { userId: existing.id, provider, providerId: profile.sub, email: profile.email } }), 'link oauth account');
    await db(
      prisma.user.update({
        where: { id: existing.id },
        // An unverified account was created by someone who never proved they own this inbox. Dropping its password
        // stops them from signing in to the account the real owner has just claimed through the provider.
        data: { emailVerified: true, lastLoginAt: now, ...(existing.emailVerified ? {} : { passwordHash: null }) },
      }),
      'link oauth user',
    );
    return existing;
  }

  const created = await db(
    prisma.user.create({
      data: {
        email: profile.email,
        displayName: (profile.name || `${provider} user`).slice(0, 50),
        avatarUrl: profile.picture,
        emailVerified: true,
        passwordHash: null,
        lastLoginAt: now,
        oAuthAccounts: { create: { provider, providerId: profile.sub, email: profile.email } },
      },
    }),
    'create oauth user',
  );
  return created;
}

// ---------------------------------------------------------------- redirects back to the SPA
// The token travels in the URL fragment: fragments are never sent to servers, logged by proxies or put in Referer headers.
const toClient = (fragment: URLSearchParams) => `${env().FRONTEND_URL}/oauth/callback#${fragment.toString()}`;

function finish(res: ExpressResponse, work: Promise<{ id: string }>): Promise<void> {
  return work.then(
    (user) => res.redirect(toClient(new URLSearchParams({ access_token: signToken(user.id) }))),
    (err: unknown) => {
      const code = err instanceof AppError ? err.code : 'OAUTH_FAILED';
      if (!(err instanceof AppError)) log.error('oauth callback failed', { message: (err as Error)?.message });
      res.redirect(toClient(new URLSearchParams({ error: code })));
    },
  );
}

// ---------------------------------------------------------------- Google
oauthRouter.get(
  '/google',
  asyncHandler(async (_req, res) => {
    const e = env();
    if (!e.GOOGLE_CLIENT_ID || !e.GOOGLE_CLIENT_SECRET) throw new AppError(503, 'GOOGLE_NOT_CONFIGURED', 'Google OAuth is not configured');
    const params = new URLSearchParams({
      client_id: e.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri('google'),
      response_type: 'code',
      scope: 'openid email profile',
      state: startFlow('google', res),
      prompt: 'select_account',
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }),
);

oauthRouter.get(
  '/google/callback',
  asyncHandler(async (req, res) => {
    const q = z.object({ code: z.string().max(2000).optional(), state: z.string().max(200).optional(), error: z.string().max(200).optional() }).safeParse(req.query);
    await finish(
      res,
      (async () => {
        if (!q.success) throw new AppError(400, 'OAUTH_BAD_REQUEST', 'Invalid OAuth response');
        consumeState(req, res, q.data.state);
        if (q.data.error || !q.data.code) throw new AppError(400, 'OAUTH_DENIED', 'Google sign-in was cancelled');
        return findOrCreateOAuthUser('google', await exchangeGoogleCode(q.data.code));
      })(),
    );
  }),
);

// ---------------------------------------------------------------- Apple (response_mode=form_post -> POST callback)
oauthRouter.get(
  '/apple',
  asyncHandler(async (_req, res) => {
    const e = env();
    if (!e.APPLE_CLIENT_ID || !e.APPLE_TEAM_ID || !e.APPLE_KEY_ID || !e.APPLE_PRIVATE_KEY) throw new AppError(503, 'APPLE_NOT_CONFIGURED', 'Apple OAuth is not configured');
    const params = new URLSearchParams({
      client_id: e.APPLE_CLIENT_ID,
      redirect_uri: redirectUri('apple'),
      response_type: 'code',
      scope: 'name email',
      response_mode: 'form_post',
      state: startFlow('apple', res),
    });
    res.redirect(`https://appleid.apple.com/auth/authorize?${params.toString()}`);
  }),
);

const appleUser = z.object({ name: z.object({ firstName: z.string().optional(), lastName: z.string().optional() }).optional() });

oauthRouter.post(
  '/apple/callback',
  express.urlencoded({ extended: false, limit: '20kb' }),
  asyncHandler(async (req, res) => {
    const b = z.object({ code: z.string().max(2000).optional(), state: z.string().max(200).optional(), error: z.string().max(200).optional(), user: z.string().max(2000).optional() }).safeParse(req.body);
    await finish(
      res,
      (async () => {
        if (!b.success) throw new AppError(400, 'OAUTH_BAD_REQUEST', 'Invalid OAuth response');
        consumeState(req, res, b.data.state);
        if (b.data.error || !b.data.code) throw new AppError(400, 'OAUTH_DENIED', 'Apple sign-in was cancelled');
        // Apple sends the user's name only on the very first authorization, as a JSON string beside the code.
        let name = '';
        try {
          const parsed = appleUser.safeParse(JSON.parse(b.data.user ?? '{}'));
          if (parsed.success) name = [parsed.data.name?.firstName, parsed.data.name?.lastName].filter(Boolean).join(' ');
        } catch {
          /* the name is optional */
        }
        return findOrCreateOAuthUser('apple', await exchangeAppleCode(b.data.code, name));
      })(),
    );
  }),
);
