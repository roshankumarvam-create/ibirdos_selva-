import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "ibirdos_session";
const JWT_SECRET = process.env.API_SECRET_KEY || process.env.NEXTAUTH_SECRET;

if (!JWT_SECRET) {
  throw new Error("Missing API_SECRET_KEY or NEXTAUTH_SECRET environment variable");
}

export interface AuthPayload {
  user_id: string;
  email: string;
  role: string;
  company_id: string;
  iat: number;
  exp: number;
}

const base64urlEncode = (value: Buffer | string) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const base64urlDecode = (value: string) => {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
};

const sign = (message: string) =>
  createHmac("sha256", JWT_SECRET).update(message).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function createAuthToken(payload: Omit<AuthPayload, "iat" | "exp">, maxAgeSeconds = 60 * 60) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + maxAgeSeconds,
  };
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedBody = base64urlEncode(JSON.stringify(body));
  const signature = sign(`${encodedHeader}.${encodedBody}`);
  return `${encodedHeader}.${encodedBody}.${signature}`;
}

export function verifyToken(token: string): AuthPayload {
  const [encodedHeader, encodedBody, signature] = token.split(".");
  if (!encodedHeader || !encodedBody || !signature) {
    throw new Error("Invalid token format");
  }

  const expectedSignature = sign(`${encodedHeader}.${encodedBody}`);
  const inputSignature = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    inputSignature.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(inputSignature, expectedSignatureBuffer)
  ) {
    throw new Error("Invalid token signature");
  }

  const payload = JSON.parse(base64urlDecode(encodedBody)) as AuthPayload;
  const now = Math.floor(Date.now() / 1000);

  if (!payload.exp || payload.exp < now) {
    throw new Error("Token expired");
  }

  return payload;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  if (!stored || !stored.includes(":")) {
    return false;
  }
  const [salt, hash] = stored.split(":");
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return timingSafeEqual(expected, derived);
}

export function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password: string) {
  return typeof password === "string" && password.length >= 8;
}

export function getSessionFromRequest(request: NextRequest): AuthPayload | null {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME_EXPORT = SESSION_COOKIE_NAME;
