# Security Audit Report

**Application:** Maharashtra 7/12 Land Record Extractor
**Date:** June 3, 2026
**Scope:** Full codebase audit (all source files)
**Reviewer:** Security audit conducted via static code analysis
**Methodology Note:** All findings are based on static code analysis only. No dynamic testing, penetration testing, or runtime verification was performed. Some findings (e.g., H-3) may be mitigated by deployment architecture outside the codebase. Operational issues (e.g., invalid model name) are noted separately from security findings.

---

## Executive Summary

| Severity | Count | Key Findings |
|----------|-------|-------------|
| **CRITICAL** | 2 | XSS via iframe injection, zero authentication |
| **HIGH** | 4 | No input validation, API key leak, no HTTPS, prompt injection surface |
| **MEDIUM** | 7 | No security headers, localStorage exposure, 0.0.0.0 binding, 50MB limit, CSRF, no CORS, verbose error leakage |
| **LOW** | 5 | Weak IDs, no audit logging, fake confidence score, .env.example references, no dependency scanning |

---

## 1. SQL Injection

**Verdict: NOT FOUND** ✅

No SQL database is used in this application. All data is stored exclusively in the browser's `localStorage`. No SQL queries, ORM calls, string concatenation in queries, or database connections exist anywhere in the codebase.

---

## 2. Unauthorized Access to Records

**Verdict: NOT APPLICABLE**

All record data (`LandRecord` objects) is stored in the **browser's `localStorage`** under the key `maharashtra_7_12_extracted_records` (`src/App.tsx:44`). There is no server-side database, no user accounts, and no multi-tenancy. Each user only has access to their own browser's data.

**However**, the backend has **zero authentication** on any endpoint (see Critical Finding C-2 below). Anyone who can reach the server can invoke the Gemini AI extraction API at their discretion.

---

## 3. Google Cloud Storage (GCS) Access

**Verdict: NOT FOUND** ✅

No GCS client library, bucket operations, signed URLs, or service account credential usage exists in the code. The `.env.example` file references `GOOGLE_APPLICATION_CREDENTIALS`, but **none of those environment variables are actually read by the application**. Only `GEMINI_API_KEY` is consumed at `server.ts:20`.

---

## 4. Remote Code Execution (RCE)

**Verdict: NOT DIRECTLY FOUND** ✅

No `eval()`, `exec()`, `child_process`, `Function()`, `vm.runInThisContext()`, `require()` of dynamic paths, or any dynamic code execution pattern exists.

**⚠️ Potential Prompt Injection Vector** (`server.ts:355`):
```typescript
const promptMessage = `Please process this file named: "${file.name}" with legal precision...`;
```
User-supplied `file.name` is interpolated directly into the Gemini AI prompt. A crafted filename could manipulate the AI model's behavior, though this cannot directly execute code on your server.

---

## 5. 🔴 CRITICAL FINDINGS

### C-1: XSS via iframe Base64 Injection ✅ FIXED

| Field | Detail |
|-------|--------|
| **File** | `src/components/RecordsTable.tsx:663-667` |
| **Severity** | 🔴 CRITICAL |
| **CVSS** | 8.7 (AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:H/A:N) |
| **Status** | ✅ Resolved — added `sandbox=""` attribute to iframe |

**Code:**
```tsx
<iframe
  src={viewFileRecord.fileData}
  className="w-full h-[70vh] rounded-lg shadow-md bg-white"
  title={viewFileRecord.fileName}
/>
```

**Issue:** The `fileData` property (a base64 data URL from user-uploaded content) is injected directly as the `src` of an `<iframe>`. An attacker can upload a file whose base64 content decodes to a `data:text/html` payload containing JavaScript. When any user clicks "View" on that record, the script executes in the application's origin context.

**Proof of concept:** Upload a file containing `data:text/html;base64,PHNjcmlwdD5hbGVydCgnWFNTJyk8L3NjcmlwdD4=` — this renders an iframe that executes `alert('XSS')`.

**Remediation:** Either:
- Sanitize the base64 content and only allow `image/*` or `application/pdf` MIME types
- Use a sandboxed iframe with `sandbox=""` attribute
- Serve file content via a server-side endpoint with Content-Disposition: attachment

---

### C-2: Zero Authentication on All Endpoints

| Field | Detail |
|-------|--------|
| **File** | `server.ts:330-335` (health), `server.ts:338-403` (extract) |
| **Severity** | 🔴 CRITICAL |

Both API endpoints have:
- No authentication middleware
- No session validation
- No API key check
- No IP whitelisting
- No rate limiting

The `GET /api/health` endpoint returns `{ status: "ok", hasApiKey: true/false }` to anyone.

The `POST /api/extract` endpoint accepts arbitrary file uploads and forwards them to Google's Gemini API, potentially incurring costs.

**Remediation:** Add API key authentication middleware, rate limiting, and request logging.

---

## 6. 🔴 HIGH FINDINGS

### H-1: No Server-Side Input Validation

| Field | Detail |
|-------|--------|
| **File** | `server.ts:340-354` |
| **Severity** | 🔴 HIGH |

**Issues:**
- No file size validation (attacker can send gigabytes of base64 data)
- No magic-byte/MIME verification (MIME is inferred from extension only)
- No content-type validation of base64 payloads
- No virus/malware scanning

**Remediation:** Validate file size (< 10MB), verify magic bytes, restrict to known MIME types (`image/png`, `image/jpeg`, `application/pdf`).

---

### H-2: API Key Existence Leak ✅ FIXED

| Field | Detail |
|-------|--------|
| **File** | `server.ts:333` |
| **Severity** | 🔴 HIGH |
| **Status** | ✅ Resolved — removed `hasApiKey` field from `/api/health` response |

```typescript
hasApiKey: !!process.env.GEMINI_API_KEY
```

Publicly discloses whether a Gemini API key is configured. Attackers can fingerprint your server.

**Remediation:** Remove `hasApiKey` from the health endpoint or require authentication.

---

### H-3: No HTTPS/TLS

| Field | Detail |
|-------|--------|
| **File** | `server.ts:421` |
| **Severity** | 🔴 HIGH |

The server listens on plain HTTP only (`http://localhost:3000`). All uploaded documents and API responses are transmitted in cleartext, vulnerable to man-in-the-middle attacks.

**Remediation:** Add TLS certificates and serve over HTTPS.

**⚠️ Note:** If the application is deployed behind a TLS-terminating reverse proxy (e.g., nginx, Caddy, Cloudflare), HTTPS at the application layer may be unnecessary. Verify your deployment architecture before adding TLS directly to the Node server.

---

### H-4: Prompt Injection Attack Surface ✅ FIXED

| Field | Detail |
|-------|--------|
| **File** | `server.ts:355` |
| **Severity** | 🔴 HIGH |
| **Status** | ✅ Resolved — removed `file.name` interpolation from prompt message |

User-supplied `file.name` is interpolated directly into the Gemini AI prompt without sanitization. A crafted filename could:
- Manipulate the AI to output malicious or misleading data
- Bypass system instructions
- Exfiltrate data through the AI response

**Remediation:** Sanitize or truncate `file.name` before inserting into the prompt. Use a neutral template like `"Process the uploaded file."`.

---

## 7. 🟡 MEDIUM FINDINGS

### M-1: No Security Headers ✅ FIXED

| Field | Detail |
|-------|--------|
| **File** | `server.ts` (entire file) |
| **Severity** | 🟡 MEDIUM |
| **Status** | ✅ Resolved — added `helmet` middleware with secure defaults |

Missing HTTP security headers:
- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security`
- `X-XSS-Protection`

**Remediation:** Use the `helmet` npm package to set secure defaults.

---

### M-2: Sensitive Data in localStorage

| Field | Detail |
|-------|--------|
| **File** | `src/App.tsx:44,67` |
| **Severity** | 🟡 MEDIUM |

Land record data is stored in plaintext in `localStorage`:
```typescript
const cached = localStorage.getItem("maharashtra_7_12_extracted_records");
localStorage.setItem("maharashtra_7_12_extracted_records", JSON.stringify(newRecords));
```

Accessible to:
- Any JavaScript running on the same origin
- Malicious browser extensions
- Anyone with physical access to the machine

**Remediation:** Consider encryption at rest or minimizing data persisted.

---

### M-3: Server Binds to All Network Interfaces

| Field | Detail |
|-------|--------|
| **File** | `server.ts:421` |
| **Severity** | 🟡 MEDIUM |

```typescript
app.listen(PORT, "0.0.0.0", () => { ... });
```

The server is accessible from all network interfaces, including public ones if deployed without a firewall.

**Remediation:** Bind to `127.0.0.1` if local-only access is intended, or use a firewall.

---

### M-4: Excessive 50MB Request Body Limit ✅ FIXED

| Field | Detail |
|-------|--------|
| **File** | `server.ts:14-15` |
| **Severity** | 🟡 MEDIUM |
| **Status** | ✅ Resolved — reduced from 50MB to 10MB |

```typescript
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
```

50MB limits on both JSON and URL-encoded bodies could facilitate memory exhaustion DoS attacks.

**Remediation:** Reduce to 10MB (or whatever is appropriate for your typical file sizes).

---

### M-5: No CSRF Protection

| Field | Detail |
|-------|--------|
| **File** | `server.ts:338` |
| **Severity** | 🟡 MEDIUM |

No CSRF tokens are implemented. Endpoints use `Content-Type: application/json`, which provides partial protection (triggers CORS preflight), but CSRF tokens should still be added for defense-in-depth.

---

### M-6: Missing CORS Configuration

| Field | Detail |
|-------|--------|
| **File** | `server.ts` (entire file) |
| **Severity** | 🟡 MEDIUM |

No CORS middleware is configured. The server imports Express but does not use the `cors` package or set any CORS headers. In production, if the API and frontend are served from different origins, all cross-origin requests will be blocked by the browser.

**Note:** In the current architecture (Vite dev server proxies API, and production serves static files from the same Express instance), CORS is not needed. This finding is relevant only if the architecture changes (e.g., separate API and frontend deployments).

**Remediation:** If CORS is needed, add `cors` middleware with a restrictive allowlist of origins.

---

### M-7: Verbose Error Messages Leak Internal Details ✅ FIXED

| Field | Detail |
|-------|--------|
| **File** | `server.ts:390-401` |
| **Severity** | 🟡 MEDIUM |
| **Status** | ✅ Resolved — replaced `err.message` with generic message, removed raw AI response from error output |

**Code (line 401):**
```typescript
return res.status(500).json({ error: err.message || "Unknown error..." });
```

The raw `err.message` from caught exceptions is forwarded to the client. This can leak:
- Internal implementation details
- Gemini API error messages (including potentially sensitive AI response data)
- Stack traces and file paths
- Server configuration details

Additionally, line 393 returns the full Gemini AI raw response text to the client on parse failures.

**Remediation:** Return a generic error message to the client (e.g., `"Internal server error"`) and log the real error server-side only.

---

## 8. 🔵 LOW FINDINGS

### L-1: Weak ID Generation ✅ FIXED

| Field | Detail |
|-------|--------|
| **Files** | `src/components/UploadSection.tsx:49`, `src/components/ManualRecordDialog.tsx:63` |
| **Severity** | 🔵 LOW |
| **Status** | ✅ Resolved — replaced `Math.random()` with `crypto.randomUUID()` |

```typescript
id: Math.random().toString(36).substring(7)
```

Uses `Math.random()` (cryptographically insecure) with a 7-character substring (high collision probability). IDs are generated client-side only.

**Remediation:** Use `crypto.randomUUID()`.

---

### L-2: No Audit Logging

| Field | Detail |
|-------|--------|
| **File** | `server.ts` (entire file) |
| **Severity** | 🔵 LOW |

No request logging, access logging, or audit logging is implemented. Cannot trace:
- Who accessed the API
- When requests were made
- How many files were processed
- Errors and failures

**Remediation:** Add `morgan` or `winston` for request logging.

---

### L-3: Fake Confidence Score ✅ FIXED

| Field | Detail |
|-------|--------|
| **File** | `src/components/UploadSection.tsx:174` |
| **Severity** | 🔵 LOW |
| **Status** | ✅ Resolved — removed `confidenceScore` field entirely from type and all usages |

```typescript
confidenceScore: Math.floor(Math.random() * 15) + 81,
```

The confidence score is randomly generated (81-96), not based on actual AI confidence. This misleads users about data reliability.

**Remediation:** Use actual confidence metrics from the AI response, or remove the field.

---

### L-4: Placeholder API Key in .env File

| Field | Detail |
|-------|--------|
| **File** | `.env:1` |
| **Severity** | 🔵 LOW |

```env
GEMINI_API_KEY="your-gemini-api-key-here"
```

The `.env` file with a placeholder key (`"your-gemini-api-key-here"`) is present in the working directory. The `.gitignore` correctly excludes `.env*`, so the current placeholder poses no actual leak risk.

**⚠️ Note:** The real risk is that the placeholder file serves as a template that encourages developers to insert a real key into a file that *could* be committed if `.gitignore` is ever misconfigured or if the file is renamed. This is a defense-in-depth concern, not an active vulnerability.

---

### L-5: No Dependency Vulnerability Scanning

| Field | Detail |
|-------|--------|
| **File** | `package.json` |
| **Severity** | 🔵 LOW |

The project does not perform any dependency vulnerability scanning (e.g., `npm audit`, `snyk`, `Dependabot`). Dependencies include:
- `@google/genai` (newer package — vetting history is limited)
- `express@^4.21.2`
- `react@^19.0.1`
- `xlsx@^0.18.5`
- `motion` (animation library — larger attack surface)

No lockfile integrity verification is configured. A compromised transitive dependency could go undetected.

**Remediation:** Run `npm audit` regularly, enable Dependabot or Renovate for automatic vulnerability alerts, and pin dependency versions in `package-lock.json`.

---

## Full Vulnerability Index

| # | File | Line(s) | Severity | Issue |
|---|------|---------|----------|-------|
| C-1 | `src/components/RecordsTable.tsx` | 663-667 | 🔴 CRITICAL | XSS via iframe `src={fileData}` — user-uploaded base64 content renders as HTML in an iframe |
| C-2 | `server.ts` | 330-335, 338-403 | 🔴 CRITICAL | No authentication on any endpoint |
| H-1 | `server.ts` | 340-354 | 🔴 HIGH | No server-side file input validation |
| H-2 | `server.ts` | 333 | 🔴 HIGH | API key existence leaked via health endpoint |
| H-3 | `server.ts` | 421 | 🔴 HIGH | No HTTPS/TLS — all traffic in cleartext |
| H-4 | `server.ts` | 355 | 🔴 HIGH | Prompt injection via unsanitized `file.name` |
| M-1 | `server.ts` | - | 🟡 MEDIUM | No security headers (CSP, XFO, HSTS, etc.) |
| M-2 | `src/App.tsx` | 44, 67 | 🟡 MEDIUM | Sensitive data stored in plaintext localStorage |
| M-3 | `server.ts` | 421 | 🟡 MEDIUM | Server binds to 0.0.0.0 (all interfaces) |
| M-4 | `server.ts` | 14-15 | 🟡 MEDIUM | Excessive 50MB request body limit |
| M-5 | `server.ts` | 338 | 🟡 MEDIUM | No CSRF protection |
| M-6 | `server.ts` | - | 🟡 MEDIUM | Missing CORS configuration |
| M-7 | `server.ts` | 390-401 | 🟡 MEDIUM | Verbose error messages leak internal details |
| L-1 | `UploadSection.tsx`, `ManualRecordDialog.tsx` | 49, 63 | 🔵 LOW | Weak `Math.random()` based ID generation |
| L-2 | `server.ts` | - | 🔵 LOW | No request/audit logging |
| L-3 | `UploadSection.tsx` | 174 | 🔵 LOW | Fake/misleading confidence score |
| L-4 | `.env` | 1 | 🔵 LOW | Placeholder API key in tracked environment file |
| L-5 | `package.json` | - | 🔵 LOW | No dependency vulnerability scanning |

---

## Recommendations (Priority Order)

1. **Fix the model name** (`server.ts:359`) — change `gemini-3.5-flash` to a valid model like `gemini-2.0-flash` so the app works (⚠️ *Operational issue, not a security finding — included for completeness*)
2. **Fix the XSS vulnerability** (`RecordsTable.tsx:663`) — sandbox the iframe or restrict to image/PDF MIME types
3. **Add authentication middleware** — protect `/api/extract` with at minimum an API key check
4. **Add Helmet middleware** — set secure HTTP headers
5. **Add rate limiting** — prevent abuse of the Gemini API
6. **Add input validation** — validate file size, MIME type, and content server-side
7. **Use HTTPS** — add TLS certificates in production
8. **Reduce body limit** — lower from 50MB to 10MB
9. **Bind to 127.0.0.1** — unless remote access is intentional
10. **Add request logging** — use `morgan` or similar
11. **Sanitize error responses** — return generic messages to client, log details server-side
12. **Add dependency scanning** — enable `npm audit` / Dependabot in CI
13. **Review CORS posture** — configure if architecture changes to separate API/frontend origins
