// ============================================================================
// Élan 2026 — issue-participant  (Supabase Edge Function, Deno)
// ----------------------------------------------------------------------------
// The ONLY place a paid participant is created. Two verified entry paths:
//
//   POST /issue-participant?path=razorpay   (Razorpay -> this webhook)
//        Verifies X-Razorpay-Signature (HMAC-SHA256 of the RAW body with
//        RAZORPAY_WEBHOOK_SECRET). Only on a *captured*/*paid* event does it
//        issue the participant. Payment is NEVER trusted from the browser.
//
//   POST /issue-participant?path=admin      (manual/admin fallback — current
//        pre-Razorpay phase). Requires the ADMIN_ISSUE_SECRET header AND a
//        registration whose status is already 'paid' server-side. This is the
//        documented admin-safe route for issuing credentials before the live
//        gateway is wired. It still cannot be triggered from public frontend.
//
// Both paths converge on issueParticipant(), which is IDEMPOTENT: if a
// participant already exists for that registration/order, the SAME UID is
// returned and no second email/UID is minted.
//
// Secrets (set via `supabase secrets set ...`, NEVER in frontend):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   RAZORPAY_WEBHOOK_SECRET, ADMIN_ISSUE_SECRET,
//   RESEND_API_KEY, PORTAL_BASE_URL   (e.g. https://elan2026.pages.dev)
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RZP_SECRET   = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? "";
const ADMIN_SECRET = Deno.env.get("ADMIN_ISSUE_SECRET") ?? "";
const RESEND_KEY   = Deno.env.get("RESEND_API_KEY") ?? "";
const PORTAL_BASE  = Deno.env.get("PORTAL_BASE_URL") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- HMAC-SHA256 hex, constant-time compare -------------------------------
async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

// --- Core issuance (idempotent) -------------------------------------------
async function issueParticipant(reg: {
  id: string; order_id?: string | null;
  full_name: string; email: string; phone?: string | null;
  school?: string | null; ticket_type?: string | null;
}) {
  // 1. Idempotency — if this registration already has a participant, reuse it.
  const { data: existing } = await admin
    .from("participants").select("*")
    .eq("registration_id", reg.id).maybeSingle();

  let participant = existing;

  // 2. Create the participant row (UID auto-minted by the DB default/sequence).
  if (!participant) {
    const { data: created, error } = await admin.from("participants").insert({
      registration_id: reg.id,
      order_id: reg.order_id ?? null,
      full_name: reg.full_name,
      email: reg.email,
      phone: reg.phone ?? null,
      school: reg.school ?? null,
      ticket_type: reg.ticket_type ?? null,
      payment_status: "paid",
    }).select("*").single();
    if (error) throw new Error("participant insert failed: " + error.message);
    participant = created;
  }

  // 3. Create/find the Supabase Auth user for this email.
  let authUserId = participant.auth_user_id as string | null;
  if (!authUserId) {
    const { data: createdUser, error: cErr } = await admin.auth.admin.createUser({
      email: reg.email,
      email_confirm: true, // they'll set a password via the link below
      user_metadata: { participant_uid: participant.participant_uid, full_name: reg.full_name },
    });
    if (createdUser?.user) {
      authUserId = createdUser.user.id;
    } else if (cErr && /already/i.test(cErr.message)) {
      // Already exists — look it up by listing (small event scale, <=1000 users).
      const { data: list } = await admin.auth.admin.listUsers();
      authUserId = list?.users.find((u) => u.email?.toLowerCase() === reg.email.toLowerCase())?.id ?? null;
    } else if (cErr) {
      throw new Error("auth user create failed: " + cErr.message);
    }
    if (authUserId) {
      await admin.from("participants").update({ auth_user_id: authUserId }).eq("id", participant.id);
    }
  }

  // 4. Generate a SECURE password-setup link (no plaintext password ever sent).
  const { data: linkData, error: lErr } = await admin.auth.admin.generateLink({
    type: "recovery", // recovery link doubles as "set your password"
    email: reg.email,
    options: { redirectTo: `${PORTAL_BASE}/set-password.html` },
  });
  if (lErr) throw new Error("generateLink failed: " + lErr.message);
  const setPasswordLink = linkData?.properties?.action_link ?? `${PORTAL_BASE}/login.html`;

  // 5. Send the branded email (best-effort; issuance still succeeds if email fails).
  await sendBrandedEmail(reg.full_name, reg.email, participant.participant_uid, setPasswordLink)
    .catch((e) => console.error("email send failed:", e.message));

  return { participant_uid: participant.participant_uid, participant_id: participant.id, set_password_link: setPasswordLink };
}

// --- Branded transactional email (Resend) ---------------------------------
async function sendBrandedEmail(name: string, to: string, uid: string, setLink: string) {
  if (!RESEND_KEY) { console.warn("RESEND_API_KEY not set — email skipped"); return; }
  const loginLink = `${PORTAL_BASE}/login.html`;
  const html = `
  <div style="background:#0b0b12;padding:32px 0;font-family:Georgia,'Times New Roman',serif">
    <div style="max-width:560px;margin:0 auto;background:#12121c;border:1px solid #262636;border-radius:16px;overflow:hidden">
      <div style="padding:28px 32px;border-bottom:1px solid #262636">
        <div style="letter-spacing:.28em;font-size:12px;color:#c9a24b">ÉLAN&nbsp;2026</div>
      </div>
      <div style="padding:32px;color:#e8e6f0;line-height:1.6">
        <p style="margin:0 0 18px">Hi ${name},</p>
        <p style="margin:0 0 18px">Your registration for <strong>Élan 2026</strong> has been confirmed.</p>
        <p style="margin:0 0 8px">Your Participant UID is:</p>
        <div style="font-size:26px;letter-spacing:.12em;color:#c9a24b;font-weight:700;margin:0 0 18px">${uid}</div>
        <p style="margin:0 0 22px">This UID is your official Élan participant identity and will remain the same throughout the event.</p>
        <a href="${setLink}" style="display:inline-block;background:#c9a24b;color:#0b0b12;text-decoration:none;padding:14px 26px;border-radius:10px;font-family:Arial,sans-serif;font-weight:700;letter-spacing:.02em">Set your password &amp; activate portal</a>
        <p style="margin:22px 0 8px;font-size:14px;color:#a7a4bd">Once activated you can log in to access your ticket, schedule, participant guide, flagship challenge details, announcements, and official updates.</p>
        <p style="margin:0 0 22px;font-size:14px;color:#a7a4bd">Login here: <a href="${loginLink}" style="color:#c9a24b">${loginLink}</a></p>
        <p style="margin:0;color:#e8e6f0">Welcome to Élan 2026.</p>
        <p style="margin:6px 0 0;color:#a7a4bd">Team Élan</p>
      </div>
    </div>
  </div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Élan 2026 <elan@sgischool.in>",
      to: [to],
      subject: "Your Élan 2026 Participant Access",
      html,
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
}

// --- HTTP entrypoint -------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  const url = new URL(req.url);
  const path = url.searchParams.get("path");
  const raw = await req.text(); // RAW body needed for signature verification

  try {
    // ---- Path A: Razorpay webhook (verified) ----
    if (path === "razorpay") {
      const sig = req.headers.get("x-razorpay-signature") ?? "";
      const expected = await hmacHex(RZP_SECRET, raw);
      if (!RZP_SECRET || !safeEqual(sig, expected)) {
        return new Response("invalid signature", { status: 401 });
      }
      const evt = JSON.parse(raw);
      const okEvent = evt?.event === "payment.captured" || evt?.event === "order.paid";
      if (!okEvent) return new Response("ignored", { status: 200 });

      // Correlate the payment to a registration. Razorpay `notes` should carry
      // registration_id at order-create time; fall back to order_id lookup.
      const notes = evt?.payload?.payment?.entity?.notes
                 ?? evt?.payload?.order?.entity?.notes ?? {};
      const rzpOrderId = evt?.payload?.payment?.entity?.order_id
                      ?? evt?.payload?.order?.entity?.id ?? null;

      let reg = null;
      if (notes.registration_id) {
        const { data } = await admin.from("registrations").select("*")
          .eq("id", notes.registration_id).maybeSingle();
        reg = data;
      }
      if (!reg && rzpOrderId) {
        // Match via the existing orders table (adjust the column name if yours
        // differs — this references orders(razorpay_order_id)).
        const { data: order } = await admin.from("orders").select("*")
          .eq("razorpay_order_id", rzpOrderId).maybeSingle();
        if (order?.registration_id) {
          const { data } = await admin.from("registrations").select("*")
            .eq("id", order.registration_id).maybeSingle();
          reg = data ? { ...data, order_id: order.id } : null;
        }
      }
      if (!reg) return new Response("no matching registration", { status: 202 });

      // Mark the registration paid (server-side truth) then issue.
      await admin.from("registrations").update({ status: "paid" }).eq("id", reg.id);
      const result = await issueParticipant(reg);
      return json({ ok: true, ...result });
    }

    // ---- Path B: admin/manual fallback (pre-Razorpay) ----
    if (path === "admin") {
      if (!ADMIN_SECRET || req.headers.get("x-admin-secret") !== ADMIN_SECRET) {
        return new Response("unauthorized", { status: 401 });
      }
      const { registration_id } = JSON.parse(raw || "{}");
      if (!registration_id) return new Response("registration_id required", { status: 400 });

      const { data: reg } = await admin.from("registrations").select("*")
        .eq("id", registration_id).maybeSingle();
      if (!reg) return new Response("registration not found", { status: 404 });
      // Guard: only issue for registrations already verified paid server-side.
      if (reg.status !== "paid") {
        return new Response("registration is not marked paid", { status: 409 });
      }
      const result = await issueParticipant(reg);
      return json({ ok: true, ...result });
    }

    return new Response("unknown path", { status: 400 });
  } catch (e) {
    console.error(e);
    return new Response("error: " + (e as Error).message, { status: 500 });
  }
});

function json(obj: unknown) {
  return new Response(JSON.stringify(obj), {
    headers: { "content-type": "application/json" },
  });
}
