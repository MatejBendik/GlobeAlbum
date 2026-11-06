import { z } from "zod";
import { LIMITS } from "./limits";

const schema = z.object({
  key: z.string().regex(/^quarantine\/[a-zA-Z0-9-]+$/),
  bytes: z.number().int().positive().max(LIMITS.fileBytes),
  exp: z.number().int().positive(),
});
export type UploadGrant = z.infer<typeof schema>;
const mediaSchema = z.object({
  key: z.string().regex(/^photos\/[a-zA-Z0-9-]+\/(thumbnail|display)\.webp$/),
  exp: z.number().int().positive(),
});
const encode = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
function decode(value: string) {
  return Uint8Array.from(
    atob(value.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0),
  );
}
async function key(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
export async function signUploadGrant(grant: UploadGrant, secret: string) {
  return signCapability(schema.parse(grant), secret, "upload");
}

async function signCapability(grant: object, secret: string, purpose: string) {
  const body = encode(new TextEncoder().encode(JSON.stringify(grant)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await key(secret),
    new TextEncoder().encode(`${purpose}:${body}`),
  );
  return `${body}.${encode(new Uint8Array(signature))}`;
}
export async function verifyUploadGrant(
  token: string,
  secret: string,
  now = Date.now(),
): Promise<UploadGrant | null> {
  const value = await verifyCapability(token, secret, "upload");
  const parsed = schema.safeParse(value);
  if (!parsed.success) return null;
  const grant = parsed.data;
  return grant.exp * 1000 > now &&
    grant.exp * 1000 <= now + (LIMITS.uploadSeconds + 10) * 1000
    ? grant
    : null;
}

export async function signMediaGrant(
  key: string,
  secret: string,
  now = Date.now(),
) {
  const grant = mediaSchema.parse({
    key,
    exp: Math.floor(now / 1000) + LIMITS.imageUrlSeconds,
  });
  return signCapability(grant, secret, "read");
}

export async function verifyMediaGrant(
  token: string,
  secret: string,
  now = Date.now(),
) {
  const parsed = mediaSchema.safeParse(
    await verifyCapability(token, secret, "read"),
  );
  if (!parsed.success) return null;
  const grant = parsed.data;
  return grant.exp * 1000 > now &&
    grant.exp * 1000 <= now + LIMITS.imageUrlSeconds * 1000
    ? grant
    : null;
}

async function verifyCapability(
  token: string,
  secret: string,
  purpose: string,
): Promise<unknown> {
  try {
    if (token.length > 2048) return null;
    const [body, signature, extra] = token.split(".");
    if (
      !body ||
      !signature ||
      extra ||
      !(await crypto.subtle.verify(
        "HMAC",
        await key(secret),
        decode(signature),
        new TextEncoder().encode(`${purpose}:${body}`),
      ))
    )
      return null;
    return JSON.parse(new TextDecoder().decode(decode(body)));
  } catch {
    return null;
  }
}
