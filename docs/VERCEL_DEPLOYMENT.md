# Vercel Deployment Guide

This guide provides end-to-end instructions for deploying the Google Sheets CRUD Web Application to [Vercel](https://vercel.com/) with zero-downtime serverless hosting, production optimization, and secure credential configuration.

---

## Deployment Architecture

```
┌────────────────────────┐         ┌────────────────────────┐
│     Local Computer     │         │   GitHub / GitLab /    │
│  - Git Repository      ├────────►│        Bitbucket       │
│  - Clean Working Tree  │  git    │  - Main / Production   │
└────────────────────────┘  push   └───────────┬────────────┘
                                               │
                                               │ Webhook trigger
                                               ▼
                                   ┌────────────────────────┐
                                   │     Vercel Platform    │
                                   │  - Build & Optimization│
                                   │  - Edge Network        │
                                   │  - Serverless Functions│
                                   │  - Encrypted Secrets   │
                                   └───────────┬────────────┘
                                               │
                                               ▼ HTTPS requests
                                   ┌────────────────────────┐
                                   │    Google Sheets API   │
                                   │  (Live Cloud Database) │
                                   └────────────────────────┘
```

---

## Prerequisites

1. A [Vercel Account](https://vercel.com/signup) (Hobby or Pro).
2. A [GitHub](https://github.com/), [GitLab](https://gitlab.com/), or [Bitbucket](https://bitbucket.org/) account.
3. Your Google Service Account credentials and Sheet ID (from the [Google Sheets Setup Guide](GOOGLE_SHEETS_SETUP.md)):
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`

---

## Step 1: Push Repository to GitHub or GitLab

Before importing into Vercel, push your project code to a remote Git repository.

### 1. Check Working Tree
Ensure all changes are committed and no sensitive files (`.env*.local`, service account JSON files) are staged:

```bash
git status
```

Verify that `.gitignore` prevents secret files from leaking into version control.

### 2. Create a Remote Repository
1. Log in to [GitHub](https://github.com/new).
2. Click **New Repository**.
3. Choose a name, e.g. `google-sheets-crud-app`.
4. Choose **Public** or **Private** (Private is recommended for proprietary company tools).
5. Do **not** initialize with a README, .gitignore, or license (we already have them).
6. Click **Create repository**.

### 3. Connect and Push Local Code
Run the following commands in your local project root:

```bash
# If remote origin is not yet set:
git remote add origin https://github.com/<your-username>/google-sheets-crud-app.git

# Ensure default branch is main
git branch -M main

# Push code to remote
git push -u origin main
```

---

## Step 2: Import Repository into Vercel

1. Log in to the [Vercel Dashboard](https://vercel.com/dashboard).
2. Click the **Add New...** button in the top right, then select **Project**.
3. Under **Import Git Repository**, locate your repository (`google-sheets-crud-app`) and click **Import**.
4. In the **Configure Project** screen:
   - **Project Name:** Keep default or customize (e.g. `google-sheets-crud`).
   - **Framework Preset:** Next.js (automatically detected).
   - **Root Directory:** `./` (default).
   - **Build and Output Settings:** Leave default (`npm run build`).

---

## Step 3: Configure Environment Variables in Vercel (Critical!)

Before clicking Deploy, you must configure the three required Google Sheets environment variables so the serverless API handlers can access your sheet.

Expand the **Environment Variables** section on the project setup page.

```
┌────────────────────────────────────────────────────────────────────────┐
│ Environment Variables                                                  │
├──────────────────────────────────────┬─────────────────────────────────┤
│ Key                                  │ Value                           │
├──────────────────────────────────────┼─────────────────────────────────┤
│ GOOGLE_SHEET_ID                      │ 1BxiMVs0XRA5nFMdKvBdBZjgmUU...  │
│ GOOGLE_SERVICE_ACCOUNT_EMAIL         │ sheets-worker@project.iam...    │
│ GOOGLE_PRIVATE_KEY                   │ "-----BEGIN PRIVATE KEY-----... │
└──────────────────────────────────────┴─────────────────────────────────┘
```

Add each variable as follows:

### 1. `GOOGLE_SHEET_ID`
- **Key:** `GOOGLE_SHEET_ID`
- **Value:** The spreadsheet ID string (e.g., `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`).
- **Environments:** Check **Production**, **Preview**, and **Development**.
- Click **Add**.

### 2. `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- **Key:** `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- **Value:** Your service account email address (e.g., `sheets-service-worker@google-sheets-crud-app.iam.gserviceaccount.com`).
- **Environments:** Check **Production**, **Preview**, and **Development**.
- Click **Add**.

### 3. `GOOGLE_PRIVATE_KEY` (Handling Multiline RSA Keys)
This is the most common point of configuration errors on serverless platforms. You can supply the key in either of the two formats below—the application's credential loader (`src/lib/env.ts`) automatically normalizes both:

#### Format A: Single-line string with escaped `\n` (Recommended for Vercel)
Paste the exact string from the downloaded JSON file's `"private_key"` field:
```
"-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7...\n-----END PRIVATE KEY-----\n"
```
*(You may include or omit surrounding quotes; Vercel handles either).*

#### Format B: Literal multiline PEM text
You can also paste the key with actual line breaks directly into the Vercel value field:
```
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7...
...
-----END PRIVATE KEY-----
```

- **Key:** `GOOGLE_PRIVATE_KEY`
- **Environments:** Check **Production**, **Preview**, and **Development**.
- Click **Add**.

> [!TIP]
> **Why this works reliably:**
> Our application uses `privateKey.replace(/\\n/g, '\n')` during initialization. If Vercel escapes newlines as `\n` characters in environment variables, they are safely transformed into genuine RSA PEM line breaks required by `google-auth-library`.

---

## Step 4: Deploy and Build

1. Click the blue **Deploy** button.
2. Vercel will begin building your project:
   - Installing dependencies (`npm install`)
   - Compiling Next.js pages and API routes (`next build`)
   - Creating serverless function bundles
3. Once the build finishes (typically 45–60 seconds), you will see the **Congratulations!** screen with preview thumbnails and your deployment URL (e.g., `https://google-sheets-crud-app.vercel.app`).
4. Click **Continue to Dashboard** or click the preview card to open your live application.

---

## Step 5: Post-Deployment Verification Checklist

Verify your production deployment with this 5-point checklist:

- [ ] **1. Live URL Accessibility:** Navigate to your Vercel deployment URL. The page loads without 500 errors.
- [ ] **2. Status Indicator:** The top header displays a green/live status badge. The blue demo mode banner is **not** visible.
- [ ] **3. Create Record Test:**
  - Click **+ Add Record**.
  - Enter: Name: `Production Test`, Email: `prod@example.com`, Role: `DevOps`, Status: `Active`.
  - Submit the form.
  - Check the live Google Sheet in another browser tab: row appears with an assigned UUID.
- [ ] **4. Update Record Test:**
  - Click the edit (pencil) icon next to `Production Test`.
  - Change Status to `Pending`.
  - Save changes.
  - Verify update in both dashboard and Google Sheet.
- [ ] **5. Delete Record Test:**
  - Click the delete (trash) icon.
  - Confirm deletion in modal.
  - Verify row is removed from Google Sheet.

---

## Step 6: Updating Environment Variables & Redeploying

If you ever need to change credentials or point to a new Google Sheet:

1. In your Vercel project dashboard, go to **Settings** > **Environment Variables**.
2. Find the variable you wish to edit (e.g., `GOOGLE_SHEET_ID`), click the **•••** (three dots) menu, and click **Edit**.
3. Update the value and click **Save**.
4. **Important:** Environment variable changes require a redeployment to take effect:
   - Go to the **Deployments** tab.
   - Click the **•••** menu on the latest deployment.
   - Click **Redeploy**.
   - Select **Use existing Build Cache** and click **Redeploy**.

---

## Troubleshooting Vercel Deployments

### 1. Build Fails on Vercel
- **Symptom:** Vercel build log displays TypeScript or lint errors.
- **Solution:** Run `npm run build` locally first to verify compilation. Fix any missing imports or type errors, push to Git, and Vercel will trigger a new build automatically.

### 2. "DEK-info" or "error:0909006C:PEM routines:get_name:no start line"
- **Symptom:** API routes return 500 with PEM parse error in Vercel Runtime Logs.
- **Root Cause:** The `GOOGLE_PRIVATE_KEY` was truncated, missing the `-----BEGIN PRIVATE KEY-----` or `-----END PRIVATE KEY-----` header/footer, or had malformed newline escaping.
- **Solution:** Re-copy the complete private key from the downloaded service account JSON file into Vercel Settings > Environment Variables, ensuring the full RSA block is included.

### 3. API Routes Work Locally but Fail on Vercel
- **Symptom:** Local server connects to Google Sheets, but production deployment falls back to Demo Mode or returns 500.
- **Root Cause:** Environment variables were added to `.env.local` locally but not entered into Vercel Project Settings.
- **Solution:** Double-check that all three environment variables (`GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`) are present under **Project Settings** > **Environment Variables** with the **Production** environment checkbox checked.

### 4. 403 Forbidden in Function Logs
- **Symptom:** Vercel Runtime Logs report `The caller does not have permission`.
- **Root Cause:** The Google Sheet was not shared with the service account email, or was shared with "Viewer" instead of "Editor" permissions.
- **Solution:** Open your spreadsheet in Google Sheets, click **Share**, and grant **Editor** access to `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
