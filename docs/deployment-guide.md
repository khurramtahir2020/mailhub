# MailHub Deployment Guide

Step-by-step guide to deploy MailHub end-to-end with Auth0, AWS SES, and Coolify.

---

## Phase 1: Auth0 Setup

### Step 1: Create Auth0 Account
1. Go to https://auth0.com/signup
2. Sign up with your email
3. Choose a tenant name (e.g., `mailhub`)

### Step 2: Create an API
1. Go to **Applications → APIs → Create API**
2. Name: `MailHub API`
3. Identifier: `https://api.mailhub.com` (this is your `AUTH0_AUDIENCE`)
4. Signing Algorithm: RS256
5. Click **Create**

### Step 3: Create a Single Page Application
1. Go to **Applications → Applications → Create Application**
2. Name: `MailHub Dashboard`
3. Type: **Single Page Web Applications**
4. Click **Create**
5. Go to the **Settings** tab
6. Note your **Domain** (e.g., `mailhub.us.auth0.com`) — this is `AUTH0_DOMAIN`
7. Note your **Client ID** — this is `AUTH0_CLIENT_ID` / `VITE_AUTH0_CLIENT_ID`
8. Set **Allowed Callback URLs**: `https://your-app-domain.com/callback, http://localhost:5173/callback`
9. Set **Allowed Logout URLs**: `https://your-app-domain.com, http://localhost:5173`
10. Set **Allowed Web Origins**: `https://your-app-domain.com, http://localhost:5173`
11. Scroll down → **Save Changes**

### Step 4: Enable Email Scope in Access Tokens
1. Go to **Actions → Flows → Login**
2. Click **+** → **Build Custom**
3. Name: `Add email to access token`
4. Paste this code:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://api.mailhub.com'
  if (event.user.email) {
    api.accessToken.setCustomClaim(`${namespace}/email`, event.user.email)
    api.accessToken.setCustomClaim('email', event.user.email)
  }
}
```

5. Click **Deploy**
6. Drag it into the Login flow → **Apply**

---

## Phase 2: AWS Setup

### Step 5: Create AWS Account
1. Go to https://aws.amazon.com → **Create an AWS Account**
2. Complete signup with payment info
3. Enable MFA on root account (Security → IAM)

### Step 6: Create IAM User
1. Go to **IAM → Users → Create user**
2. Username: `mailhub-ses-sender`
3. Click **Next**
4. Select **Attach policies directly**
5. Click **Create policy** → JSON tab → paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:CreateEmailIdentity",
        "ses:DeleteEmailIdentity",
        "ses:GetEmailIdentity",
        "ses:GetAccount",
        "ses:PutEmailIdentityDkimSigningAttributes"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sns:Subscribe",
        "sns:ConfirmSubscription"
      ],
      "Resource": "arn:aws:sns:eu-central-1:*:mailhub-ses-events"
    }
  ]
}
```

6. Name the policy: `MailHubSESPolicy` → **Create policy**
7. Back in user creation, refresh and attach `MailHubSESPolicy`
8. Click **Create user**
9. Click the user → **Security credentials** → **Create access key**
10. Use case: **Application running outside AWS**
11. Save the **Access Key ID** and **Secret Access Key**

### Step 7: Set Up SES (eu-central-1 region)
1. Switch to **eu-central-1** region in the AWS console
2. Go to **Amazon SES → Configuration sets → Create set**
3. Name: `mailhub-production`
4. Click **Create set**
5. In the configuration set, click **Event destinations → Add destination**
6. Event types: check **Sends, Deliveries, Bounces, Complaints, Rejects**
7. Click **Next**
8. Destination type: **Amazon SNS**
9. Create new SNS topic: `mailhub-ses-events`
10. Click **Next** → **Add destination**

### Step 8: Request SES Production Access
1. Go to **SES → Account dashboard**
2. Click **Request production access**
3. Mail type: **Transactional**
4. Website URL: your app domain
5. Use case description:

```
We are building a transactional email SaaS for developers.
Our platform sends password resets, order confirmations,
account notifications, and other transactional emails only.
We enforce strict anti-abuse controls including domain
verification, suppression lists, bounce monitoring, and
manual review of all new accounts. Expected initial volume
is under 50,000 emails per month.
```

6. Click **Submit request** — approval usually takes 1-3 business days

> While in sandbox, you can only send to verified email addresses. Verify your own email in SES → Verified identities → Create identity → Email address.

---

## Phase 3: Deploy to Coolify

### Step 9: Set Up Your Domain
1. Pick a domain for your app (e.g., `app.mailhub.com` or `mailhub.yourdomain.com`)
2. Add a DNS A record pointing to your Coolify server IP
3. Wait for DNS propagation (usually minutes)

### Step 10: Create Application in Coolify
1. Log into your Coolify dashboard
2. Go to **Projects → Add New Resource → Application**
3. Source: **GitHub** → connect your repo `khurramtahir2020/mailhub`
4. Branch: `main`
5. Build Pack: **Dockerfile**
6. Dockerfile location: `/Dockerfile`
7. Port: `3000`

### Step 11: Configure Environment Variables

In Coolify's application settings, add these environment variables:

```bash
# Database (your existing Coolify PostgreSQL)
DATABASE_URL=postgres://postgres:YOUR_PG_PASSWORD@YOUR_PG_HOST:5432/mailhub?sslmode=require

# Auth0 (from Steps 2-3)
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://api.mailhub.com

# AWS (from Step 6)
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=eu-central-1
SES_CONFIGURATION_SET=mailhub-production

# Server
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# Frontend (build-time — must be set before build)
VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=your-spa-client-id
VITE_AUTH0_AUDIENCE=https://api.mailhub.com
VITE_API_URL=/api/v1
```

> Replace all placeholder values with your actual credentials.

### Step 12: Configure Domain in Coolify
1. In the application settings, go to **Domains**
2. Add your domain: `https://your-app-domain.com`
3. Enable HTTPS (Coolify/Traefik handles Let's Encrypt automatically)

### Step 13: Deploy
1. Click **Deploy** in Coolify
2. Watch the build logs
3. Verify: `https://your-domain.com/health` should return `{"status":"ok","db":"connected"}`

### Step 14: Update Auth0 URLs
Go back to Auth0 and update with your actual domain:
- Allowed Callback URLs: `https://your-domain.com/callback`
- Allowed Logout URLs: `https://your-domain.com`
- Allowed Web Origins: `https://your-domain.com`

---

## Phase 4: SNS Webhook Setup

### Step 15: Create SNS Subscription
1. Go to AWS **SNS → Topics → mailhub-ses-events**
2. Click **Create subscription**
3. Protocol: **HTTPS**
4. Endpoint: `https://your-domain.com/api/v1/webhooks/ses`
5. Click **Create subscription**
6. SNS sends a confirmation to your endpoint — your app handles this automatically
7. Refresh the page — status should change to **Confirmed**

> If it doesn't confirm, check your app logs in Coolify. The webhook endpoint handles SubscriptionConfirmation automatically.

---

## Phase 5: Test End-to-End

### Step 16: Sign Up
1. Visit `https://your-domain.com`
2. You'll be redirected to Auth0 login
3. Sign up with your email
4. After redirect, your account + default tenant are created
5. You should see the dashboard

### Step 17: Add a Sending Domain
1. Go to **Domains** in the sidebar
2. Add your domain (e.g., `notifications.yourdomain.com`)
3. You'll see DNS records to add:
   - 3x DKIM CNAME records
   - 1x SPF TXT record recommendation
   - 1x DMARC TXT record recommendation
4. Add these DNS records at your DNS provider
5. Click **Verify** — wait for DNS propagation and SES verification

### Step 18: Create a Sender Identity
1. Once domain is verified, add a sender
2. Email: `noreply@notifications.yourdomain.com`
3. Display name: `My App` (optional)

### Step 19: Create an API Key
1. Go to **API Keys**
2. Create a key (e.g., "Test Key")
3. **Copy the key immediately** — it's shown only once

### Step 20: Send Your First Email

> If still in SES sandbox: first verify the recipient email in AWS SES → Verified identities → Create identity → Email address

```bash
curl -X POST https://your-domain.com/api/v1/emails/send \
  -H "X-API-Key: mh_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "My App <noreply@notifications.yourdomain.com>",
    "to": "recipient@example.com",
    "subject": "Hello from MailHub!",
    "html": "<h1>It works!</h1><p>Your first transactional email via MailHub.</p>",
    "text": "It works! Your first transactional email via MailHub."
  }'
```

Expected response:

```json
{
  "id": "uuid",
  "status": "sent",
  "ses_message_id": "...",
  "contact_id": "uuid"
}
```

### Step 21: Send with a Template

First create a template in the dashboard:
- Name: `welcome`
- Subject: `Welcome, {{name}}!`
- HTML: `<h1>Welcome, {{name}}!</h1><p>Thanks for signing up.</p>`

Then send using the template:

```bash
curl -X POST https://your-domain.com/api/v1/emails/send \
  -H "X-API-Key: mh_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "noreply@notifications.yourdomain.com",
    "to": "recipient@example.com",
    "template": "welcome",
    "variables": { "name": "John" }
  }'
```

### Step 22: Verify Everything Works
1. Check your email inbox — you should receive the email
2. **Messages** page — see the sent message with status
3. **Contacts** page — the recipient appears automatically
4. **Usage** page — shows email count for today
5. Wait a minute, check message detail — delivery event should appear (from SNS webhook)

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Health check returns `db: disconnected` | Check `DATABASE_URL` in Coolify env vars |
| Auth0 login doesn't redirect back | Check callback URLs in Auth0 match your domain exactly |
| "Setting up your account..." loops forever | Check browser console for errors. Ensure `VITE_AUTH0_AUDIENCE` matches `AUTH0_AUDIENCE` |
| Domain verification stuck on pending | DNS records may take up to 48h. Check with `dig CNAME token._domainkey.yourdomain.com` |
| Send API returns 422 "Sender not verified" | Domain must be verified AND sender identity must exist for that email |
| Send API returns 422 "Daily limit reached" | Sandbox mode = 50/day. Need admin panel to promote tenant to production |
| Send API returns 422 "Recipient is suppressed" | Check suppressions page — the address may have bounced previously |
| Send API returns 502 | SES call failed. Check AWS credentials and SES sandbox status |
| No delivery events appearing | Check SNS subscription is confirmed. Check Coolify logs for webhook errors |
| SNS subscription pending confirmation | Your app must be deployed and reachable. Delete and recreate the subscription |
| SES returns credential error | Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in Coolify |
| Build fails on Coolify | Check that all `VITE_*` env vars are set (they're needed at build time) |
| Frontend shows blank page | Check browser console. Usually a missing env var or Auth0 misconfiguration |

---

## Post-Deployment Checklist

- [ ] Health check returns OK: `https://your-domain.com/health`
- [ ] Auth0 login/signup works
- [ ] Dashboard loads with tenant info
- [ ] Domain added and DNS records displayed
- [ ] Domain verified (DKIM green)
- [ ] Sender identity created
- [ ] API key generated
- [ ] Test email sent successfully via curl
- [ ] Email received in inbox
- [ ] Message appears in Messages page
- [ ] Contact appears in Contacts page
- [ ] Delivery event appears in message detail (SNS working)
- [ ] Usage stats update
- [ ] Template created and used for sending
