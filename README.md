# Google Sheets CRUD Web Application

> A production-ready, full-stack CRUD web application powered by **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Google Sheets** as a real-time serverless database.

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-3.2-6E9F18?logo=vitest)](https://vitest.dev/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com/)

---

## Highlights & Features

- **Full CRUD Capabilities:** Create, Read, Update, and Delete records with immediate live synchronization to your Google Sheet.
- **Graceful Zero-Config Fallback:** Runs straight out of the box in **Demo Mode** with an in-memory mock store and an interactive setup banner if Google credentials are not yet configured.
- **Automatic Sheet Auto-Initialization:** Point the app at any blank Google Sheet; it will auto-detect the empty sheet and initialize the required column headers (`ID`, `Name`, `Email`, `Role`, `Status`, `Notes`, `Created At`, `Updated At`) on first write.
- **Resilient Row Management:** Uses persistent UUIDs to look up and modify rows. Deleting or rearranging rows directly in Google Sheets never desynchronizes records.
- **Interactive Modern UI:** Responsive table built with Tailwind CSS, real-time client-side search across multiple fields, status badge filters, sortable column headers, accessible modal dialogs, and non-blocking toast notifications.
- **Type-Safe REST API:** Built with Next.js App Router route handlers (`/api/records`, `/api/records/[id]`, `/api/status`) featuring comprehensive request validation and robust error handling.
- **Vercel Serverless Ready:** Specifically engineered for Vercel edge/serverless runtimes with built-in normalizers for multiline RSA private keys.
- **Thoroughly Tested:** Extensive unit and integration test suite powered by Vitest, with 100% passing tests and pristine production build.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Next.js 15.5](https://nextjs.org/) (App Router, Server & Client Components) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) (Strict Mode) |
| **UI & Styling** | [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) |
| **Database & SDK** | [Google Sheets API v4](https://developers.google.com/sheets/api), [`googleapis`](https://www.npmjs.com/package/googleapis), [`google-auth-library`](https://www.npmjs.com/package/google-auth-library) |
| **Testing** | [Vitest](https://vitest.dev/) (Unit & API Integration Tests) |
| **Deployment** | [Vercel](https://vercel.com/) (Serverless Next.js Hosting) |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Browser / Client                      │
│   - Next.js Client Dashboard (`src/app/page.tsx`)           │
│   - RecordTable, RecordModal, DeleteDialog, SetupBanner     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               │ Fetch HTTP / JSON
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Next.js API Route Handlers                  │
│   - `GET /api/records`        - List all records            │
│   - `POST /api/records`       - Create record (validated)   │
│   - `GET /api/records/[id]`   - Get single record           │
│   - `PUT /api/records/[id]`   - Update record               │
│   - `DELETE /api/records/[id]`- Delete record               │
│   - `GET /api/status`         - Health / credential status  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               Service Layer (`src/lib/sheets.ts`)           │
│   - Auto Header Initialization                              │
│   - Row Index Mapping via Persistent UUID                   │
│   - Input Sanitization & Validation                         │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
     [If configured]                [If unconfigured]
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      Google Sheets API       │ │    In-Memory Demo Store    │
│  (Remote Cloud Spreadsheet)  │ │      (Mock Fallback)       │
└──────────────────────────────┘ └────────────────────────────┘
```

---

## Quickstart Guide

### 1. Prerequisites
- **Node.js** >= 18.18.0
- **npm** >= 9.0.0

### 2. Clone and Install

```bash
git clone https://github.com/<your-username>/google-sheets-crud-app.git
cd google-sheets-crud-app
npm install
```

### 3. Run in Demo Mode (Out of the Box)

You can run and test the application immediately without configuring any Google credentials:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The app runs with an in-memory demo store and displays an interactive setup banner guiding you through connecting Google Sheets.

### 4. Connect to Google Sheets

To connect real Google Sheets storage:

1. Follow the step-by-step instructions in the [Google Sheets Setup Guide](docs/GOOGLE_SHEETS_SETUP.md) to generate a Google Cloud Service Account key and prepare your sheet.
2. Create your local environment configuration file:

```bash
cp .env.example .env.local
```

3. Configure your credentials in `.env.local`:

```bash
GOOGLE_SHEET_ID="your_google_sheet_id_here"
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@your-project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvg...=\n-----END PRIVATE KEY-----\n"
```

4. Restart your development server (`npm run dev`). The demo banner will disappear and all CRUD operations will persist directly to your Google Sheet!

---

## Environment Variables

| Variable | Description | Required | Example |
| :--- | :--- | :---: | :--- |
| `GOOGLE_SHEET_ID` | The unique ID from the Google Sheet URL | Yes | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service Account email generated in Google Cloud Console | Yes | `sheets-worker@app.iam.gserviceaccount.com` |
| `GOOGLE_PRIVATE_KEY` | RSA Private Key for the Service Account (PEM format with `\n` escapes or actual line breaks) | Yes | `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"` |

> [!NOTE]
> All credentials are only accessed server-side by Next.js API routes and are **never** exposed to client browser bundles.

---

## Project Structure

```
.
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── records/
│   │   │   │   ├── route.ts            # GET /api/records, POST /api/records
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts        # GET, PUT, DELETE /api/records/[id]
│   │   │   └── status/
│   │   │       └── route.ts            # GET /api/status (connection health)
│   │   ├── globals.css                 # Tailwind directives & theme styles
│   │   ├── layout.tsx                  # Root layout & HTML shell
│   │   └── page.tsx                    # Main interactive CRUD dashboard
│   ├── components/
│   │   ├── DeleteDialog.tsx            # Confirmation modal for record deletion
│   │   ├── RecordModal.tsx             # Create & Edit record form modal
│   │   ├── RecordTable.tsx             # Filterable, sortable data table
│   │   ├── SetupBanner.tsx             # Interactive helper banner for Demo Mode
│   │   └── Toast.tsx                   # Toast notification alerts
│   └── lib/
│       ├── env.ts                      # Environment loader with newline normalization
│       ├── filter-utils.ts             # Defensive search & multi-column sorting helpers
│       ├── sheets.ts                   # Google Sheets SDK integration & demo fallback
│       ├── types.ts                    # TypeScript data models and validation types
│       └── utils.ts                    # Tailwind CSS class merging utilities
├── docs/
│   ├── GOOGLE_SHEETS_SETUP.md          # Step-by-step Google Cloud & Sheets setup guide
│   └── VERCEL_DEPLOYMENT.md            # Step-by-step Vercel deployment walkthrough
├── tests/
│   ├── api.test.ts                     # API endpoint route tests (CRUD & validation)
│   ├── env.test.ts                     # Environment loader tests
│   ├── sheets.test.ts                  # Google Sheets service layer tests
│   └── ui-helpers.test.ts              # Filter and sorting utility tests
├── .env.example                        # Template for environment variables
├── .gitignore                          # Strict gitignore protecting keys and secrets
├── next.config.ts                      # Next.js configuration
├── package.json                        # Project dependencies and npm scripts
├── tailwind.config.ts                  # Tailwind CSS styling configuration
├── tsconfig.json                       # TypeScript compiler options (strict mode)
└── vitest.config.ts                    # Vitest test runner configuration
```

---

## API Reference

All endpoints return JSON responses with standard HTTP status codes.

### Endpoints Overview

| Method | Endpoint | Description | Success Code |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/status` | Check if Google Sheets credentials are configured | `200 OK` |
| `GET` | `/api/records` | Retrieve all records from Google Sheets (or demo store) | `200 OK` |
| `POST` | `/api/records` | Create a new record | `201 Created` |
| `GET` | `/api/records/[id]` | Retrieve a single record by its unique ID | `200 OK` |
| `PUT` | `/api/records/[id]` | Update an existing record | `200 OK` |
| `DELETE` | `/api/records/[id]` | Delete a record from Google Sheets | `200 OK` |

### Sample Payloads

#### `POST /api/records`
Request Body:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "role": "Lead Engineer",
  "status": "Active",
  "notes": "Joined Q1 team"
}
```

Response (`201 Created`):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "Lead Engineer",
    "status": "Active",
    "notes": "Joined Q1 team",
    "createdAt": "2026-11-06T12:00:00.000Z",
    "updatedAt": "2026-11-06T12:00:00.000Z"
  }
}
```

---

## Testing & Verification

The project includes automated test coverage for environment loading, service layer operations, REST API routes, and UI helper functions.

Run the test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npx vitest run --coverage
```

Validate production build:
```bash
npm run build
```

---

## Deployment to Vercel

For a complete walkthrough on pushing your repository to GitHub and deploying to Vercel with zero configuration, read the [Vercel Deployment Guide](docs/VERCEL_DEPLOYMENT.md).

Quick summary:
1. Push this repository to GitHub.
2. Import repository into [Vercel](https://vercel.com).
3. Add `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, and `GOOGLE_PRIVATE_KEY` under **Environment Variables**.
4. Click **Deploy**.

---

## Security & Best Practices

- **Never Commit Credentials:** `.env*.local` and `*.pem` are strictly excluded in `.gitignore`.
- **Server-Side Isolation:** Google APIs and private keys are only instantiated in Next.js Serverless Route Handlers. They never leak to the client browser.
- **Defensive Error Sanitization:** Upstream Google API errors are sanitized so database keys and raw stack traces are never exposed to API callers.
- **Granular IAM Permissions:** The Service Account requires access only to the specific Google Sheet shared with its email. It needs no broader Google Cloud IAM privileges.

---

## Guides & Documentation

- [Google Sheets Setup Guide](docs/GOOGLE_SHEETS_SETUP.md) — Step-by-step setup in Google Cloud Console, Service Account creation, and Google Sheet permissions.
- [Vercel Deployment Guide](docs/VERCEL_DEPLOYMENT.md) — Complete guide on importing to Vercel and configuring multiline environment variables.

---

## License

MIT License. Feel free to use and adapt this project for personal and commercial projects.
