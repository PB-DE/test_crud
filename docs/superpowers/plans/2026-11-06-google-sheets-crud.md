# Google Sheets CRUD Web Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready, full-stack CRUD web application powered by Google Sheets as a database, version-controlled with Git, and configured for seamless deployment to Vercel.

**Architecture:** Next.js (App Router) full-stack architecture with React 19 / TypeScript and Tailwind CSS on the frontend, communicating via type-safe REST API routes (`/api/records`) with a backend service layer using the official `googleapis` SDK. Includes an automatic mock/demo fallback when credentials are absent, and auto-initializes sheet headers when connecting to a fresh Google Sheet.

**Tech Stack:** Next.js 15+ (App Router), TypeScript, Tailwind CSS, Lucide React, Google APIs client (`googleapis` + `google-auth-library`), Vitest + React Testing Library.

**Spec:** User request to create a full CRUD application backed by a Google Sheets database, tracked in Git, and deployable to Vercel with complete credentials setup instructions.

## Global Constraints

- **Language & Runtime:** TypeScript (strict mode enabled), Node.js >= 18.
- **Security:** Google Service Account private keys and credentials must NEVER be committed to Git; `.gitignore` must strictly protect `.env*.local`.
- **Reliability:** App must not crash on cold start or when credentials are not yet configured; it must gracefully display a guided Setup Banner and operate in demo mode until valid Google credentials are supplied.
- **Vercel Compatibility:** Use standard Node.js serverless route handlers compatible with Vercel serverless functions (multiline private key handling formatted properly).
- **Sheet Resilience:** Header row auto-detection and initialization so any blank Google Sheet works immediately without manual column setup.

## Review Focus

1. **Multiline Private Key formatting on Vercel:** Environment variables in Vercel often contain escaped `\n` characters in `GOOGLE_PRIVATE_KEY`; the authentication loader must replace `\\n` with actual newlines.
2. **Concurrent Row Updates / ID Matching:** Google Sheets row indices change when rows are deleted; all update/delete operations must find rows by persistent unique `id` rather than fragile raw row numbers.
3. **Missing or Blank Google Sheet:** Connecting to an empty sheet without existing columns must auto-insert the header row (`id`, `name`, `email`, `role`, `status`, `notes`, `createdAt`, `updatedAt`) rather than failing.
4. **Input Validation & Sanitization:** Blank or malformed emails and invalid status values must return clear 400 Bad Request responses before calling Google Sheets API.
5. **Rate Limiting & Network Errors:** When Google Sheets API quota is reached or network fails, the backend must return friendly error responses without leaking private stack traces.

---

### Task 1: Project Scaffolding, Environment Config & Test Harness

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `tailwind.config.ts`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `vitest.config.ts`
- Create: `src/lib/env.ts`
- Test: `tests/env.test.ts`

**Interfaces:**
- Produces: `getEnvConfig(): { spreadsheetId?: string; clientEmail?: string; privateKey?: string; isConfigured: boolean }`
- Produces: Configured testing framework with `npm test` and build script `npm run build`

- [ ] **Step 1: Write failing test for environment configuration loader**

```typescript
// tests/env.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getEnvConfig } from '../src/lib/env';

describe('getEnvConfig', () => {
  beforeEach(() => {
    delete process.env.GOOGLE_SHEET_ID;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_PRIVATE_KEY;
  });

  it('reports isConfigured as false when variables are missing', () => {
    const config = getEnvConfig();
    expect(config.isConfigured).toBe(false);
  });

  it('normalizes escaped newlines in GOOGLE_PRIVATE_KEY', () => {
    process.env.GOOGLE_SHEET_ID = 'sheet_123';
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'sa@test.iam.gserviceaccount.com';
    process.env.GOOGLE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgk\\n-----END PRIVATE KEY-----';

    const config = getEnvConfig();
    expect(config.isConfigured).toBe(true);
    expect(config.privateKey).toContain('\n');
    expect(config.privateKey).not.toContain('\\n');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/env.test.ts`
Expected: FAIL (modules and vitest not yet initialized)

- [ ] **Step 3: Scaffold Next.js project dependencies and implement `src/lib/env.ts`**

Install dependencies (`next`, `react`, `react-dom`, `googleapis`, `google-auth-library`, `lucide-react`, `clsx`, `tailwind-merge`) and dev dependencies (`typescript`, `@types/node`, `@types/react`, `tailwindcss`, `vitest`). Create `src/lib/env.ts` implementing `getEnvConfig()` with private key newline formatting.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/env.test.ts`
Expected: PASS

- [ ] **Step 5: Commit scaffolding and environment loader**

```bash
git add package.json tsconfig.json vitest.config.ts .env.example .gitignore src/lib/env.ts tests/env.test.ts
git commit -m "feat: initialize project scaffolding and environment config loader"
```

---

### Task 2: Data Models & Google Sheets Service Layer

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/sheets.ts`
- Test: `tests/sheets.test.ts`

**Interfaces:**
- Consumes: `getEnvConfig()` from `src/lib/env.ts`
- Produces: `RecordItem` interface: `{ id: string; name: string; email: string; role: string; status: 'Active' | 'Pending' | 'Inactive'; notes: string; createdAt: string; updatedAt: string }`
- Produces: `sheetsService`:
  - `getRecords(): Promise<RecordItem[]>`
  - `getRecordById(id: string): Promise<RecordItem | null>`
  - `createRecord(data: Omit<RecordItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<RecordItem>`
  - `updateRecord(id: string, data: Partial<Omit<RecordItem, 'id' | 'createdAt'>>): Promise<RecordItem | null>`
  - `deleteRecord(id: string): Promise<boolean>`

- [ ] **Step 1: Write failing test for sheets service operations and demo fallback**

```typescript
// tests/sheets.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { sheetsService } from '../src/lib/sheets';

describe('sheetsService', () => {
  beforeEach(async () => {
    sheetsService.resetDemoStore();
  });

  it('creates and lists records in demo mode when credentials are not configured', async () => {
    const records = await sheetsService.getRecords();
    const initialCount = records.length;

    const created = await sheetsService.createRecord({
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'Developer',
      status: 'Active',
      notes: 'Initial hire',
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe('Jane Doe');
    expect(created.createdAt).toBeDefined();

    const updatedList = await sheetsService.getRecords();
    expect(updatedList.length).toBe(initialCount + 1);
  });

  it('updates an existing record by id', async () => {
    const created = await sheetsService.createRecord({
      name: 'Bob Smith',
      email: 'bob@example.com',
      role: 'Designer',
      status: 'Pending',
      notes: '',
    });

    const updated = await sheetsService.updateRecord(created.id, {
      status: 'Active',
      role: 'Lead Designer',
    });

    expect(updated?.status).toBe('Active');
    expect(updated?.role).toBe('Lead Designer');
    expect(updated?.email).toBe('bob@example.com');
  });

  it('deletes an existing record by id', async () => {
    const created = await sheetsService.createRecord({
      name: 'Alice Cooper',
      email: 'alice@example.com',
      role: 'QA',
      status: 'Active',
      notes: '',
    });

    const success = await sheetsService.deleteRecord(created.id);
    expect(success).toBe(true);

    const found = await sheetsService.getRecordById(created.id);
    expect(found).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/sheets.test.ts`
Expected: FAIL (modules not implemented)

- [ ] **Step 3: Implement `src/lib/types.ts` and `src/lib/sheets.ts`**

Define `RecordItem` and `RecordInput`. Implement `sheetsService` with:
1. Google Sheets API integration via `google.sheets({ version: 'v4', auth })`
2. Auto-initialization of sheet header row (`ID`, `Name`, `Email`, `Role`, `Status`, `Notes`, `Created At`, `Updated At`) if sheet is blank.
3. In-memory demo data store fallback when `isConfigured` is false.
4. Robust row lookups by unique UUID.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/sheets.test.ts`
Expected: PASS

- [ ] **Step 5: Commit sheets service layer**

```bash
git add src/lib/types.ts src/lib/sheets.ts tests/sheets.test.ts
git commit -m "feat: implement Google Sheets service layer with demo fallback"
```

---

### Task 3: RESTful API Route Handlers

**Files:**
- Create: `src/app/api/records/route.ts`
- Create: `src/app/api/records/[id]/route.ts`
- Create: `src/app/api/status/route.ts`
- Test: `tests/api.test.ts`

**Interfaces:**
- Produces HTTP Endpoints:
  - `GET /api/records` -> `{ success: true, data: RecordItem[] }`
  - `POST /api/records` -> `{ success: true, data: RecordItem }` (400 if invalid)
  - `GET /api/records/[id]` -> `{ success: true, data: RecordItem }` (404 if missing)
  - `PUT /api/records/[id]` -> `{ success: true, data: RecordItem }` (400/404 if invalid)
  - `DELETE /api/records/[id]` -> `{ success: true, message: string }` (404 if missing)
  - `GET /api/status` -> `{ configured: boolean, sheetId?: string }`

- [ ] **Step 1: Write failing test for API route handlers**

```typescript
// tests/api.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { GET as getRecords, POST as postRecord } from '../src/app/api/records/route';
import { PUT as putRecord, DELETE as deleteRecord } from '../src/app/api/records/[id]/route';

describe('Records API Routes', () => {
  it('rejects POST with missing required fields with status 400', async () => {
    const req = new Request('http://localhost:3000/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });

    const res = await postRecord(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it('creates and returns a new record with status 201', async () => {
    const req = new Request('http://localhost:3000/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sarah Connor',
        email: 'sarah@skynet.com',
        role: 'Security',
        status: 'Active',
        notes: 'Leader',
      }),
    });

    const res = await postRecord(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.id).toBeDefined();
    expect(json.data.name).toBe('Sarah Connor');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api.test.ts`
Expected: FAIL (route handlers not implemented)

- [ ] **Step 3: Implement API Route Handlers in `src/app/api/`**

Implement `GET`, `POST` in `/api/records`, `GET`, `PUT`, `DELETE` in `/api/records/[id]`, and status check in `/api/status`. Ensure error handling, validation for emails, and proper HTTP response statuses.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit API routes**

```bash
git add src/app/api/ tests/api.test.ts
git commit -m "feat: implement REST API routes for records CRUD"
```

---

### Task 4: Interactive Frontend UI (Data Table, Modals, Search & Filter)

**Files:**
- Create: `src/components/SetupBanner.tsx`
- Create: `src/components/RecordTable.tsx`
- Create: `src/components/RecordModal.tsx`
- Create: `src/components/DeleteDialog.tsx`
- Create: `src/components/Toast.tsx`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/page.tsx`
- Test: `tests/ui-helpers.test.ts`

**Interfaces:**
- Consumes: REST endpoints `/api/records`, `/api/records/[id]`, `/api/status`
- Produces: Polished, responsive web dashboard with live search, status badge filtering, record creation modal, inline edit modal, deletion confirm dialog, and Google Sheets setup helper guide.

- [ ] **Step 1: Write failing test for UI filter and sorting helper logic**

```typescript
// tests/ui-helpers.test.ts
import { describe, it, expect } from 'vitest';
import { filterRecords } from '../src/lib/filter-utils';
import { RecordItem } from '../src/lib/types';

describe('filterRecords', () => {
  const records: RecordItem[] = [
    { id: '1', name: 'Alice Young', email: 'alice@a.com', role: 'Dev', status: 'Active', notes: '', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    { id: '2', name: 'Bob Dylan', email: 'bob@b.com', role: 'Music', status: 'Inactive', notes: '', createdAt: '2026-01-02', updatedAt: '2026-01-02' },
  ];

  it('filters records by search query case-insensitively', () => {
    const result = filterRecords(records, 'alice', 'All');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Alice Young');
  });

  it('filters records by status tag', () => {
    const result = filterRecords(records, '', 'Inactive');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Bob Dylan');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui-helpers.test.ts`
Expected: FAIL (missing `filter-utils.ts`)

- [ ] **Step 3: Implement UI components and dashboard**

1. Create `src/lib/filter-utils.ts`.
2. Build `RecordTable` with search bar, status dropdown, sortable headers, and action icons.
3. Build `RecordModal` handling both "Add New Record" and "Edit Record" with input validation.
4. Build `DeleteDialog` confirmation.
5. Build `SetupBanner` presenting clear instructions on connecting a Google Sheet (Service Account Email, Sheet ID, Private Key).
6. Compose everything in `src/app/page.tsx` with responsive layout and toast feedback.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui-helpers.test.ts`
Expected: PASS

- [ ] **Step 5: Commit UI components and dashboard**

```bash
git add src/lib/filter-utils.ts src/components/ src/app/ tests/ui-helpers.test.ts
git commit -m "feat: add interactive CRUD dashboard UI, modals, and setup banner"
```

---

### Task 5: Git Setup, Verification & Deployment Documentation

**Files:**
- Create: `README.md`
- Create: `docs/GOOGLE_SHEETS_SETUP.md`
- Create: `docs/VERCEL_DEPLOYMENT.md`
- Modify: `.gitignore`

**Interfaces:**
- Produces: Complete end-to-end setup and deployment guides.
- Produces: Verified production build (`npm run build`) and passing test suite (`npm test`).
- Produces: Clean Git repository ready for remote upload (`git push`).

- [ ] **Step 1: Write Google Sheets & Vercel deployment documentation**

Create step-by-step documentation detailing:
1. Google Cloud Console: Enable Google Sheets API, create Service Account, generate JSON key.
2. Google Sheets: Create sheet, copy Sheet ID from URL, share sheet with the Service Account email with "Editor" permission.
3. Local development: Set `.env.local`.
4. Git push: Commands to create repository on GitHub/GitLab and push.
5. Vercel deployment: Import repo, configure environment variables (`GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`), and deploy.

- [ ] **Step 2: Run verification test suite and production build**

Run:
```bash
npm run test
npm run build
```
Expected: All tests PASS, Next.js build succeeds with 0 errors.

- [ ] **Step 3: Verify `.gitignore` security**

Verify that `.env*.local` is explicitly ignored and no sensitive files are staged.

- [ ] **Step 4: Commit documentation and complete repo setup**

```bash
git add README.md docs/ .gitignore
git commit -m "docs: add Google Sheets setup guide and Vercel deployment instructions"
```

---

## Execution Approaches

When ready, choose between:
- **Subagent-driven** - Fresh subagents implement and review each task step-by-step.
- **Native** - Implemented directly in this session with full verification before completion.

