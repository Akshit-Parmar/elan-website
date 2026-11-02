# Automatic photo captions

The Gallery upload form now starts with the photo. After choosing and cropping it, the admin sends a resized JPEG preview to a protected caption endpoint. Two editable suggestions fill Caption and Describe the image. The second field is accessibility alt text. Existing words and edits made while a request is running are preserved. Clear a field and choose Generate to refill it. Changing a photo replaces automatically generated text, while retaining your own words. Saving still controls publication.

Bulk uploads request captions one at a time, for up to 20 photos. Review the suggestions before saving drafts. Category, edition and photographer credit remain yours to choose; the model must not guess identities or event details. Failed requests leave manual editing available.

## Activation status

The source is implemented and tested with mocked AI responses. The new `elan-photo-caption` Edge Function has NOT been deployed: automatic approval review blocked deployment pending the owner's explicit approval to send image previews to OpenAI. Existing backend functions and public content were not changed by this update. Uploading this ZIP alone does not activate AI.

Once the owner approves that destination:

1. Deploy `supabase/functions/elan-photo-caption/index.ts` together with `handler.mjs` to the existing Élan project. The function authenticates the user via Supabase and checks current `elan_staff.role = admin` itself, so its gateway JWT toggle is false (same pattern as the existing API). Do not remove the body authentication or role checks.
2. In Supabase Dashboard → Edge Functions → Secrets, add `OPENAI_API_KEY` from an OpenAI API project with billing/model access. Never put this value in GitHub, public-config.json, or the chat. Optional `PHOTO_CAPTION_MODEL` defaults to `gpt-4.1-mini`; choose an available model supporting image input and structured JSON responses.
3. Add any Cloudflare test branch URL to the comma-separated `ALLOWED_ORIGINS` secret if it is not already present. Keep existing origins. Production elansummit.com and www are included.
4. Deploy this updated frontend using the normal Python build, then sign into admin. Upload one photo, review both suggested fields, edit them and save as a draft. Verify that replacing the image, bulk upload and manual fallback work with the real account.

## Data and limits

Only a re-encoded JPEG preview (longest side at most 1024 pixels, under 400,000 characters as a data URL) is sent to OpenAI. Browser re-encoding does not carry the original EXIF metadata or filename. No image needs to be publicly uploaded merely to generate text. Requests use `store:false`; this does not claim zero provider retention. Normal photo upload/publication still follows the existing storage workflow.

The OpenAI key stays server-side. The endpoint accepts only inline JPEG data (no user-controlled external fetch URLs), bounds input/output, times out after 30 seconds, and restricts generation to current admins. Persistent rate limits: 120 requests per admin per hour and 500 per project per day. API usage can incur charges. No automated retries; use Generate to retry. No image content or provider error body is written to application logs.

## Verification

Node tests cover authentication, non-admin denial, missing configuration, oversized/malformed requests, rate limits, structured result validation, preserving human edits, ignoring stale replies, replacing photos and leaving the editor. Existing source/build/route/legal/metadata checks pass. Real AI responses and real admin end-to-end generation remain unverified until activation.
