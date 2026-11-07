# Google Sheets API & Service Account Setup Guide

This guide walks you through setting up Google Cloud, enabling the Google Sheets API, creating a Service Account, and connecting your Google Sheet to the application.

---

## Architecture Overview

```
┌─────────────────────────┐       ┌────────────────────────┐
│   Google Cloud Console  │       │      Google Drive      │
│  - New Project          │       │  - Google Spreadsheet  │
│  - Enable Sheets API    │       │    (Sheet ID in URL)   │
│  - Service Account      │       └───────────┬────────────┘
│    (Email + JSON Key)   │                   │
└────────────┬────────────┘                   │
             │                                │ Shared with Editor
             │ Download JSON key              │ permissions
             ▼                                ▼
┌──────────────────────────────────────────────────────────┐
│                   Next.js Application                    │
│                                                          │
│  .env.local / Vercel Environment Variables:              │
│  - GOOGLE_SHEET_ID                                       │
│  - GOOGLE_SERVICE_ACCOUNT_EMAIL                          │
│  - GOOGLE_PRIVATE_KEY                                    │
└──────────────────────────────────────────────────────────┘
```

---

## Prerequisites

- A standard Google account (Gmail or Google Workspace).
- Access to [Google Cloud Console](https://console.cloud.google.com/).
- Access to [Google Sheets](https://sheets.google.com/).

---

## Step 1: Create a Google Cloud Project

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. At the top-left, click the project dropdown menu (next to "Google Cloud") and click **New Project**.
3. Fill in the project details:
   - **Project Name:** e.g., `google-sheets-crud-app`
   - **Organization:** Select your organization or leave as *No organization*.
4. Click **Create** and wait a few seconds for the project creation to complete.
5. Ensure your new project is selected in the top navigation bar.

---

## Step 2: Enable the Google Sheets API

1. In the Google Cloud Console search bar at the top, type `Google Sheets API`.
2. Select **Google Sheets API** from the Marketplace / API list.
3. Click the blue **Enable** button.
4. Wait for the API to be activated. Once enabled, you will be redirected to the API Overview page.

---

## Step 3: Create a Service Account

A Service Account acts as a robotic identity that your web application uses to authenticate with Google APIs without requiring human browser logins.

1. In the left navigation menu, navigate to **APIs & Services** > **Credentials**.
2. Click **+ CREATE CREDENTIALS** at the top of the page and select **Service account**.
3. In Step 1 (*Service account details*):
   - **Service account name:** e.g., `sheets-service-worker`
   - **Service account ID:** Automatically generated (e.g., `sheets-service-worker@your-project-id.iam.gserviceaccount.com`).
   - **Description:** `Service account for Next.js Google Sheets CRUD app`.
4. Click **Create and Continue**.
5. Step 2 (*Grant this service account access to project*):
   - This is optional for Google Sheets API access. You can leave it blank or click **Continue**.
6. Step 3 (*Grant users access to this service account*):
   - Click **Done**.
7. In the Credentials table under **Service Accounts**, locate your newly created account and **copy the Email address** (you will need it in Step 5 and Step 6).

---

## Step 4: Generate and Download the Private Key

1. Under the **Service Accounts** section in Credentials, click on the email address of the service account you just created.
2. Select the **Keys** tab at the top.
3. Click **Add Key** > **Create new key**.
4. In the modal, select **JSON** as the key type.
5. Click **Create**.
6. A `.json` file containing your private key and client credentials will be downloaded automatically to your machine.

> [!CAUTION]
> **Keep this JSON key file secure!**
> Never commit this JSON file or its contents to Git or any public repository. Anyone with this key can act on behalf of your service account.

Open the downloaded JSON file in a text editor. It looks similar to this:

```json
{
  "type": "service_account",
  "project_id": "google-sheets-crud-app",
  "private_key_id": "abcdef1234567890...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "sheets-service-worker@google-sheets-crud-app.iam.gserviceaccount.com",
  "client_id": "123456789012345678901",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

The two values you need from this file are:
- `client_email` -> Maps to `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` -> Maps to `GOOGLE_PRIVATE_KEY`

---

## Step 5: Create Google Sheet & Share Permissions

### 1. Create a Spreadsheet
1. Open [Google Sheets](https://sheets.new) to create a new spreadsheet.
2. Give the spreadsheet a name, such as `Company Records` or `Employee Directory`.

### 2. Copy the Sheet ID
Inspect the URL in your browser's address bar. It follows this structure:

```
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
                                       ▲────────────────────────────────────────▲
                                                   GOOGLE_SHEET_ID
```

Copy the long string between `/d/` and `/edit`. This string is your `GOOGLE_SHEET_ID`.

### 3. Share with the Service Account (Crucial!)

By default, a new Google Sheet is private to your personal Google account. The Service Account cannot read or write to it until you explicitly grant access.

1. Click the green/blue **Share** button at the top-right corner of Google Sheets.
2. In the **Add people and groups** input field, paste your **Service Account Email** (copied in Step 3 or from `client_email` in the JSON key).
3. Ensure the permission dropdown is set to **Editor** (NOT Viewer or Commenter, otherwise write operations will fail with a 403 Forbidden error).
4. Uncheck the "Notify people" box (Service Accounts do not have email inboxes).
5. Click **Share** (or **Send**). If prompted with a warning that the user is outside your organization, click **Share anyway**.

```
┌─────────────────────────────────────────────────────────────┐
│ Share "Company Records"                                     │
├─────────────────────────────────────────────────────────────┤
│ Add people and groups:                                      │
│ sheets-service-worker@project.iam.gserviceaccount.com       │
│                                                             │
│ Role: [ Editor ▼ ]                                          │
│ [ ] Notify people                                           │
│                                                             │
│                                            [ Share ]        │
└─────────────────────────────────────────────────────────────┘
```

> [!NOTE]
> **No Manual Column Setup Required!**
> You do **not** need to manually format or type column headers in the new sheet. The application automatically detects blank sheets and writes the initial header row (`ID`, `รหัสครุภัณฑ์`, `ชื่อครุภัณฑ์`, `ตำแหน่งที่ตั้ง`, `สถานะ`, `ผู้รับผิดชอบ`, `ผู้บันทึก`, `หมายเหตุ`, `วันที่บันทึก`, `วันที่แก้ไข`) on first run.

---

## Step 6: Configure Local Environment Variables

1. In the root directory of this project, create a `.env.local` file by copying the example:

```bash
cp .env.example .env.local
```

2. Open `.env.local` and configure your credentials:

```bash
# The ID extracted from your Google Sheets URL
GOOGLE_SHEET_ID="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"

# The client_email from your service account JSON key
GOOGLE_SERVICE_ACCOUNT_EMAIL="sheets-service-worker@google-sheets-crud-app.iam.gserviceaccount.com"

# The private_key from your service account JSON key (keep the quotes and \n or literal newlines)
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

> [!TIP]
> The application includes a smart newline normalizer (`src/lib/env.ts`) that converts both escaped `\n` literals and multiline newline characters into standard PEM format.

---

## Step 7: Verify the Connection

1. Start the local development server:

```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser.
3. Observe the dashboard:
   - When configured, the blue "Demo Mode" banner disappears, and the status badge indicates that Google Sheets is connected.
   - Click **+ Add Record**, submit a record, and watch it appear in the dashboard.
   - Switch to your Google Sheet in another tab: you will see the header row and the newly inserted record row immediately appear in real time!

---

## Troubleshooting & FAQ

| Problem | Root Cause | Solution |
| :--- | :--- | :--- |
| **403: The caller does not have permission** | The Google Sheet has not been shared with the service account, or permission is set to "Viewer". | Click **Share** on the sheet, enter the service account email, and set the role to **Editor**. |
| **404: Requested entity was not found** | Invalid `GOOGLE_SHEET_ID` or sheet was moved to trash. | Re-copy the sheet ID from the browser URL between `/d/` and `/edit`. |
| **Google Sheets API has not been used... or disabled** | The API is not enabled in the Google Cloud Project. | Visit Google Cloud Console, search for "Google Sheets API", and click **Enable**. |
| **Invalid PEM or DEK-info error** | `GOOGLE_PRIVATE_KEY` formatting was truncated or corrupted. | Copy the full string including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` from the downloaded JSON key file. |
| **Dashboard still shows Demo Banner** | Environment variables missing or server wasn't restarted after editing `.env.local`. | Restart the dev server (`npm run dev`) after modifying `.env.local`. |
