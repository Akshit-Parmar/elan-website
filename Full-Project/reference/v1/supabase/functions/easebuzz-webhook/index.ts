// ============================================================================
// Élan 2026 — easebuzz-webhook (Supabase Edge Function, Deno)
// ----------------------------------------------------------------------------
// The ONLY thing that marks a registration 'paid'. Easebuzz calls this after a
// QuickPay transaction. We verify Easebuzz's reverse hash server-side, and only
// on a verified 'success' do we (1) mark the matching pending registration paid
// and (2) trigger portal issuance (UID + set-password email) via issue-participant.
//
// The browser never marks anything paid — it only redirects to the pay page and
// leaves the registration 'pending'.
//
// SETUP (in the Easebuzz dashboard):
//   * Set the account Webhook / Success callback URL to:
//       https://<project>.functions.supabase.co/easebuzz-webhook
//   * Secrets (supabase secrets set ...):
//       SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//       EASEBUZZ_KEY, EASEBUZZ_SALT,
//       ISSUE_FN_URL   (https://<project>.functions.supabase.co/issue-participant)
//       ADMIN_ISSUE_SECRET  (same secret issue-participant expects)
//
// NOTE: Easebuzz reverse-hash order is PayU-style:
//   sha512(salt|status|udf10|..|udf1|email|firstname|productinfo|amount|txnid|key)
// Confirm the exact field set against your Easebuzz integration docs; QuickPay
// payloads may omit some udf fields (treated as empty strings below).
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const KEY            = Deno.env.get("EASEBUZZ_KEY") ?? "";
const SALT           = Deno.env.get("EASEBUZZ_SALT") ?? "";
const ISSUE_FN_URL   = Deno.env.get("ISSUE_FN_URL") ?? "";
const ADMIN_SECRET   = Deno.env.get("ADMIN_ISSUE_SECRET") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function sha512Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseBody(raw: string, ct: string): Record<string, string> {
  if (ct.includes("application/json")) {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  const out: Record<string, string> = {};
  new URLSearchParams(raw).forEach((v, k) => (out[k] = v));
  return out;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  const raw = await req.text();
  const p = parseBody(raw, req.headers.get("content-type") ?? "");

  // ---- 1. verify Easebuzz reverse hash ----
  const udf = (n: number) => p[`udf${n}`] ?? "";
  const seq = [
    SALT, p.status ?? "",
    udf(10), udf(9), udf(8), udf(7), udf(6), udf(5), udf(4), udf(3), udf(2), udf(1),
    p.email ?? "", p.firstname ?? "", p.productinfo ?? "", p.amount ?? "", p.txnid ?? "", KEY,
  ].join("|");
  const expected = await sha512Hex(seq);
  if (!SALT || !p.hash || p.hash.toLowerCase() !== expected) {
    console.error("hash mismatch", { txnid: p.txnid });
    return new Response("invalid hash", { status: 401 });
  }
  if ((p.status ?? "").toLowerCase() !== "success") {
    return new Response("ignored (not success)", { status: 200 });
  }

  // ---- 2. match the most recent PENDING registration for this payer ----
  const email = (p.email ?? "").toLowerCase();
  const { data: reg } = await admin
    .from("registrations")
    .select("id,status,amount,email")
    .ilike("email", email)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!reg) {
    console.warn("no pending registration for", email, "txn", p.txnid);
    return new Response("no matching pending registration", { status: 202 });
  }

  // ---- 3. mark paid (idempotent) ----
  await admin.from("registrations").update({ status: "paid" }).eq("id", reg.id);

  // ---- 4. trigger portal issuance (UID + set-password email) ----
  if (ISSUE_FN_URL && ADMIN_SECRET) {
    try {
      await fetch(`${ISSUE_FN_URL}?path=admin`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-secret": ADMIN_SECRET },
        body: JSON.stringify({ registration_id: reg.id }),
      });
    } catch (e) {
      console.error("issue-participant call failed:", (e as Error).message);
    }
  }

  return new Response(JSON.stringify({ ok: true, registration_id: reg.id }), {
    headers: { "content-type": "application/json" },
  });
});
