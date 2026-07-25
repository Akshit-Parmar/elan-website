// ============================================================================
// Élan 2026 — admin-issue-batch (Supabase Edge Function, Deno)
// ----------------------------------------------------------------------------
// Drives issuance from the school's "who paid" list (names + optional amounts).
// For each name it matches a PENDING registration (we already hold their email
// from the site form), marks it paid, and calls issue-participant to mint the
// UID + create the login + email the set-password link.
//
// It NEVER guesses: a name that matches 0 rows or >1 rows is reported for manual
// handling, not auto-issued. Amounts (if given) break ties between same-name rows.
// Safe to re-run — already-issued people are reported, not re-issued.
//
// Auth: requires the x-admin-secret header (ADMIN_ISSUE_SECRET). Deploy with JWT
// verification OFF so the admin page can call it with just that header.
//
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto), ADMIN_ISSUE_SECRET,
//          ISSUE_FN_URL (https://<ref>.functions.supabase.co/issue-participant)
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_SECRET = Deno.env.get("ADMIN_ISSUE_SECRET") ?? "";
const ISSUE_FN_URL = Deno.env.get("ISSUE_FN_URL") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const norm = (s: string) => (s ?? "").toLowerCase().trim().replace(/\s+/g, " ");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-admin-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: cors });
  if (!ADMIN_SECRET || req.headers.get("x-admin-secret") !== ADMIN_SECRET) {
    return new Response("unauthorized", { status: 401, headers: cors });
  }

  // body: { entries: [{ name: string, amount?: number }] }
  const { entries } = await req.json().catch(() => ({ entries: [] }));
  if (!Array.isArray(entries) || !entries.length) {
    return json({ error: "no entries" }, 400);
  }

  // Pull all registrations once and index by normalized name.
  const { data: regs, error } = await admin
    .from("registrations")
    .select("id, full_name, email, amount, status, created_at");
  if (error) return json({ error: "db read failed: " + error.message }, 500);

  const byName = new Map<string, any[]>();
  for (const r of regs ?? []) {
    const k = norm(r.full_name);
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k)!.push(r);
  }

  const issued: any[] = [], already: any[] = [], ambiguous: any[] = [], unmatched: string[] = [];

  for (const e of entries) {
    const name = (e.name ?? "").toString();
    const amount = e.amount != null && e.amount !== "" ? Number(e.amount) : null;
    let rows = byName.get(norm(name)) ?? [];

    if (!rows.length) { unmatched.push(name); continue; }

    // If amount given, prefer rows whose amount matches (helps duplicate names).
    if (amount != null && rows.length > 1) {
      const amt = rows.filter((r) => Number(r.amount) === amount);
      if (amt.length) rows = amt;
    }

    // Already issued? (a paid row that already produced a participant)
    const paidRow = rows.find((r) => r.status === "paid" || r.status === "confirmed");
    const pending = rows.filter((r) => r.status === "pending");

    if (pending.length === 1) {
      const r = pending[0];
      // 1) mark paid  2) issue (UID + login + set-password email)
      await admin.from("registrations").update({ status: "paid" }).eq("id", r.id);
      const res = await issue(r.id);
      if (res.ok) issued.push({ name, email: r.email, uid: res.uid, link: res.link });
      else issued.push({ name, email: r.email, uid: null, note: res.note });
    } else if (pending.length > 1) {
      ambiguous.push({ name, count: pending.length, hint: amount == null ? "add the amount to disambiguate" : "same name & amount" });
    } else if (paidRow) {
      // no pending left — try to (re)issue idempotently and report
      const res = await issue(paidRow.id);
      already.push({ name, email: paidRow.email, uid: res.uid ?? null, link: res.link });
    } else {
      unmatched.push(name);
    }
  }

  return json({
    summary: { issued: issued.length, already_done: already.length, ambiguous: ambiguous.length, unmatched: unmatched.length },
    issued, already, ambiguous, unmatched,
  });
});

async function issue(registration_id: string): Promise<{ ok: boolean; uid?: string; link?: string; note?: string }> {
  if (!ISSUE_FN_URL) return { ok: false, note: "ISSUE_FN_URL not set" };
  try {
    const r = await fetch(`${ISSUE_FN_URL}?path=admin`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-secret": ADMIN_SECRET,
        "Authorization": "Bearer " + SERVICE_ROLE,
        "apikey": SERVICE_ROLE,
      },
      body: JSON.stringify({ registration_id }),
    });
    const t = await r.text();
    if (!r.ok) return { ok: false, note: `issue ${r.status}: ${t.slice(0, 120)}` };
    let uid, link; try { const j = JSON.parse(t); uid = j.participant_uid; link = j.set_password_link; } catch { /* */ }
    return { ok: true, uid, link };
  } catch (e) {
    return { ok: false, note: (e as Error).message };
  }
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "content-type": "application/json" } });
}
