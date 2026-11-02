# Browser photo captions

Gallery photo uploads now describe the actual image on the admin's device. No OpenAI account, API key or paid caption service is required. The caption model does not receive photos over the network. Saving or publishing still uploads images to the existing Supabase media bucket as before.

Choose a photo and crop it. The model fills Caption and Describe the image with a simple visual description. Both fields start with the same description (the caption is shortened if necessary); no event names, people or detail are added by templates. Review and edit before saving: this small model can misdescribe scenes. Existing text and edits typed while it loads are protected. Clear a field and choose Generate to refill it.

Bulk uploads run one photo at a time and remain drafts until published. Stop generating cancels the current local operation. The form remains available for manual text. A slow or unsupported browser shows a message instead of calling a cloud AI fallback.

## First use

A recent Chrome or Edge desktop browser is recommended. The first caption downloads roughly 250 MB of model/runtime files from Hugging Face and jsDelivr. This inbound download uses internet data. The browser caches files when storage permits; clearing browser data, private browsing or browser eviction may trigger another download. Inference runs in a web worker with single-thread WASM so it does not require WebGPU or cross-origin isolation. Low-memory devices can fail; manual editing remains available.

The bundled Transformers.js runtime is pinned to 2.17.2, with its Apache license. Model: Xenova/vit-gpt2-image-captioning, revision 077550ae0729f9af280c9d885ea9b0380fc8e815, quantized. Model files are downloaded on demand rather than included in the GitHub ZIP. Runtime WASM is fetched from the matching pinned jsDelivr package. Changing the model requires testing its quality and memory use.

## Deployment

Upload the updated deployment folder to GitHub using the existing Cloudflare build: python3 scripts/build.py, output dist. No database migration or API secret is needed. Public pages, layout and existing content are unchanged. The previous OpenAI caption endpoint is disabled (returns HTTP 410) and is not called by this frontend.

## Checks

Automated tests cover preserving edits, stale responses, cancellation, and output length. Build, route, image, legal and search checks are retained. The small model provides suggestions, not authoritative descriptions; always review the actual photo before publishing.

Browser verification: a real local WASM run on discussion.webp filled both fields with “A large group of people sitting at a table.” The test required no API key or caption server. The HTTP preview has no browser cache; the worker correctly continues without cache in that environment.
