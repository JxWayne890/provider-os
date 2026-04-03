# DNS Setup Guide — go.theprovidersystem.com (Cold Email Subdomain)

## Overview
This guide configures the sending subdomain `go.theprovidersystem.com` for cold email via Resend.
**NEVER modify DNS for the root domain `theprovidersystem.com`.**

All records are created in **Cloudflare DNS** for `theprovidersystem.com`.

---

## Step 1: Add Domain in Resend

1. Go to https://resend.com/domains
2. Click "Add Domain"
3. Enter: `go.theprovidersystem.com`
4. Resend will provide DKIM CNAME records — use these exact values below

---

## Step 2: SPF Record

| Type | Name | Value | TTL |
|------|------|-------|-----|
| TXT  | `go` | `v=spf1 include:amazonses.com ~all` | Auto |

> Resend sends via Amazon SES. This SPF record authorizes them.

---

## Step 3: DKIM Records (from Resend)

Resend will give you 3 CNAME records. They look like:

| Type  | Name | Value | TTL |
|-------|------|-------|-----|
| CNAME | `resend._domainkey.go` | *(value from Resend dashboard)* | Auto |
| CNAME | `s1._domainkey.go` | *(value from Resend dashboard)* | Auto |
| CNAME | `s2._domainkey.go` | *(value from Resend dashboard)* | Auto |

> Copy the **exact** CNAME values from your Resend domain verification page.

---

## Step 4: DMARC Record

| Type | Name | Value | TTL |
|------|------|-------|-----|
| TXT  | `_dmarc.go` | `v=DMARC1; p=none; rua=mailto:john@theprovidersystem.com` | Auto |

> Start with `p=none` during warmup. After 30 days with clean metrics, upgrade to `p=quarantine`.

---

## Step 5: Return-Path / MAIL FROM (optional, recommended)

| Type | Name | Value | TTL |
|------|------|-------|-----|
| MX   | `bounce.go` | `feedback-smtp.us-east-1.amazonses.com` | Auto |
| TXT  | `bounce.go` | `v=spf1 include:amazonses.com ~all` | Auto |

---

## Step 6: Tracking Subdomain (for click/open tracking in production)

If you want `go.theprovidersystem.com` to serve tracking redirects, point it to your relay server:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A    | `go` | *(Your server's public IP)* | Auto |

Or if using a reverse proxy (Cloudflare Tunnel, Vercel, etc.):

| Type  | Name | Value | TTL |
|-------|------|-------|-----|
| CNAME | `go` | *(your proxy hostname)* | Auto |

---

## Step 7: Verify in Resend

1. Go back to https://resend.com/domains
2. Click "Verify" next to `go.theprovidersystem.com`
3. Resend will check all DNS records
4. Status should change to "Verified" within a few minutes

---

## Step 8: Cloudflare Settings

- **Proxy status**: Set DNS records to **DNS Only** (gray cloud), NOT proxied (orange cloud)
  - Exception: The A/CNAME record for `go` can be proxied if using Cloudflare Tunnel
- **SSL/TLS**: Full (strict) on the main domain is fine
- **Do NOT** add any page rules or WAF rules that affect `go.theprovidersystem.com` email delivery

---

## Verification Checklist

- [ ] SPF TXT record added for `go`
- [ ] All 3 DKIM CNAME records added
- [ ] DMARC TXT record added for `_dmarc.go`
- [ ] Domain verified in Resend dashboard
- [ ] Test email sent successfully from `john@go.theprovidersystem.com`
- [ ] Root domain `theprovidersystem.com` DNS is untouched

---

## After Warmup (30+ days)

1. Upgrade DMARC to: `v=DMARC1; p=quarantine; rua=mailto:john@theprovidersystem.com`
2. After 60+ days with clean metrics: `v=DMARC1; p=reject; rua=mailto:john@theprovidersystem.com`
