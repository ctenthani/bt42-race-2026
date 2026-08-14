# Netlify environment variables — BT42.195 km Race 2026

Configure these in the Netlify UI after the site is linked to GitHub.

## Where to set them

1. Open [https://app.netlify.com](https://app.netlify.com)
2. Select your **BT42** site
3. **Site configuration** → **Environment variables** → **Add a variable**
4. Add each variable below (scope: **All scopes** / production + deploy previews as you prefer)
5. **Trigger a new deploy** (Deploys → Trigger deploy) so functions pick up the values

> Environment variables are **not** stored in Git. Never commit real API keys.

## Required for certificate & bib emails

| Variable | Example | Purpose |
|----------|---------|---------|
| `EMAIL_API_KEY` | `re_xxxxxxxx` | API key from [Resend](https://resend.com) (or set `RESEND_API_KEY` instead) |
| `EMAIL_FROM` | `certificates@yourdomain.mw` | From address — must be verified in Resend |

### Resend setup (recommended)

1. Create account at [resend.com](https://resend.com)
2. Add and verify your domain (or use Resend’s onboarding domain for tests)
3. Create an API key → paste into `EMAIL_API_KEY`
4. Set `EMAIL_FROM` to an address on that verified domain

Without these, the site still works: certificates open in the browser, but **no email is sent**.

## Required for Mpamba auto-verification (when TNM is connected)

| Variable | Example | Purpose |
|----------|---------|---------|
| `MPAMBA_WEBHOOK_SECRET` | long random string | Shared secret TNM/aggregator sends in header `x-webhook-secret` |

Generate a secret, e.g.:

```bash
openssl rand -hex 32
```

Give the same value to TNM and put it in Netlify. Webhook URL:

```text
https://YOUR-SITE.netlify.app/.netlify/functions/mpamba-webhook
```

## Optional

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Alias accepted if `EMAIL_API_KEY` is unset |

## Checklist after saving variables

- [ ] Redeploy the site  
- [ ] Register a test athlete **with email**  
- [ ] In Control Room: Verify payment → open Entry cert (email may send if type hooks call the function)  
- [ ] Mark Finish → completion cert + `send-certificate` POST  
- [ ] Assign bib → optional bib email  
- [ ] (Later) TNM points callbacks at `mpamba-webhook` with the secret  

## Local development

Create a file `.env` **only on your machine** (already gitignored pattern — do not commit):

```env
EMAIL_API_KEY=re_xxx
EMAIL_FROM=certificates@yourdomain.mw
MPAMBA_WEBHOOK_SECRET=your-secret
```

Netlify CLI:

```bash
npm i -g netlify-cli
netlify login
netlify link
netlify env:set EMAIL_API_KEY "re_xxx"
netlify env:set EMAIL_FROM "certificates@yourdomain.mw"
netlify env:set MPAMBA_WEBHOOK_SECRET "your-secret"
netlify deploy --prod
```

## What each function uses

| Function | Env vars |
|----------|----------|
| `send-certificate` | `EMAIL_API_KEY` or `RESEND_API_KEY`, `EMAIL_FROM` |
| `mpamba-webhook` | `MPAMBA_WEBHOOK_SECRET` |

## Shared OC backend sync

| Variable | Purpose |
|----------|---------|
| `OC_SYNC_TOKEN` | Shared secret for committee/chair devices to read/write sync API |

Generate:

```bash
openssl rand -hex 24
```

Set the same value in Netlify env and enter it once per device in Control Room → **Sync** (or it can be embedded after first chair setup — prefer env-only and prompt in UI).

API:

- `GET /.netlify/functions/oc-sync` — load shared registrations, payments, bibs, finishes
- `POST /.netlify/functions/oc-sync` — merge updates (`x-oc-role: chair` required to change payments)

Payment verification remains **Chair only** on the server.
