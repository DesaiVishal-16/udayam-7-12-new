# Auth Integration Plan

## Architecture Overview

| App | Domain | Stack |
|-----|--------|-------|
| App 1 (Landing/Auth/Dashboard) | `app.example.com` | Next.js + Supabase |
| App 2 (7/12 Extractor) | `extractor.example.com` | Express + React (this app) |
| Auth Provider | Shared | Supabase Auth (same project, same user DB) |

**Goal:** User logs into App 1 → gets access to App 2 without a separate login.

---

## Flow

```
1. User logs in at app.example.com (Next.js + Supabase)
2. Supabase issues JWT (access_token + refresh_token)
3. Next.js sets cross-subdomain cookies:
     Domain=.example.com
     SameSite=Lax
     Secure
4. User clicks a link or gets redirected to extractor.example.com
5. Express middleware reads the cookie, validates the JWT against Supabase
6. Valid   → serve the app (API + frontend)
7. Invalid → redirect back to app.example.com/login
```

---

## Why JWT?

- Supabase Auth already issues JWTs — no extra infra needed
- Stateless validation — Express can verify the token using Supabase's JWKS endpoint without a DB call
- Cross-subdomain cookies work with `Domain=.example.com`
- Works with SameSite=Lax for redirect-based flows

---

## Changes Required

### App 1 (Next.js + Supabase)

After successful login, set cross-subdomain cookies:

```typescript
// After Supabase login in Next.js (API route or server action)
const { data: { session } } = await supabase.auth.getSession();

if (session) {
  res.setHeader('Set-Cookie', [
    `sb-access-token=${session.access_token}; Domain=.example.com; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`,
    `sb-refresh-token=${session.refresh_token}; Domain=.example.com; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
  ]);
}
```

**Also add:** A link/redirect button to send the user to `extractor.example.com`.

---

### App 2 (Express Server — `server.ts`)

#### 1. Install dependency

```bash
npm install @supabase/supabase-js cookie-parser
```

#### 2. Initialize Supabase client

```typescript
import { createClient } from "@supabase/supabase-js";
import cookieParser from "cookie-parser";

app.use(cookieParser());

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);
```

#### 3. Add JWT validation middleware (before any route)

```typescript
// Protect API routes
async function authMiddleware(req: any, res: any, next: any) {
  const token =
    req.cookies["sb-access-token"] ||
    req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Unauthorized — no token" });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: "Unauthorized — invalid or expired token" });
  }

  req.user = user;
  next();
}

// Apply to protected routes
app.post("/api/extract", authMiddleware, async (req, res) => { ... });

// Health endpoint can stay public or also be protected
app.get("/api/health", authMiddleware, (req, res) => { ... });
```

#### 4. Optional: Protect the frontend (block serving index.html without auth)

```typescript
// Before the static file catch-all
app.get("*", authMiddleware, (req, res) => {
  if (process.env.NODE_ENV === "production") {
    res.sendFile(path.join(process.cwd(), "dist", "index.html"));
  }
});
```

If you don't want to protect the frontend at the server level, the React app can check auth on mount and show a message if no valid token exists.

---

### App 2 (React Frontend — optional client-side check)

In `src/App.tsx` or a new `AuthGuard` wrapper, check for the token:

```typescript
useEffect(() => {
  const checkAuth = async () => {
    const res = await fetch("/api/health");
    if (res.status === 401) {
      window.location.href = "https://app.example.com/login";
    }
  };
  checkAuth();
}, []);
```

---

## Environment Variables to Add

To `server.ts`'s `.env` file:

```env
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"
```

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| JWT theft via XSS | Cookie is `HttpOnly` — not readable by JS |
| CSRF | `SameSite=Lax` prevents cross-site form submission |
| JWT expiry | Refresh token is also stored in a cookie; optionally handle refresh in middleware |
| Subdomain cookie access | Only apps on `*.example.com` can read the cookie |
| Token not yet issued | Redirect to login if no token/cookie present |

---

## Summary

| Step | What | Where |
|------|------|-------|
| 1 | Set cross-subdomain cookies after login | Next.js app (server-side) |
| 2 | Add `@supabase/supabase-js` + `cookie-parser` | This Express app |
| 3 | Add `authMiddleware` that validates JWT via `supabase.auth.getUser()` | `server.ts` |
| 4 | Apply middleware to `/api/extract` and optionally to static file serving | `server.ts` |
| 5 | Deploy both apps under `*.example.com` | DNS / reverse proxy |
| 6 | User logs in once, accesses both apps seamlessly | Done |
