# Auth Session Contract

This document defines the CMS authentication, session, and CSRF contract.

It supplements:
- `AGENTS.md`
- `docs/implementation-contract.md`
- `docs/cms-routes.md`

If there is any conflict, follow:
1. `AGENTS.md`
2. `docs/implementation-contract.md`
3. `docs/cms-routes.md`
4. `docs/auth-session.md`
5. current task instructions

---

## 1. Scope

This contract applies to privileged CMS access only.

It covers:
- `/cms/login`
- `/cms/logout`
- all `/cms/**` page routes
- all `/cms/**` fragment routes
- all privileged create, update, delete, and build actions

It does not define storefront customer authentication.
That may be added later, but it must not weaken the CMS admin boundary.

---

## 2. Security model

PocketBase is stateless by default.
The CMS session boundary must therefore be implemented explicitly in `pb_hooks`.

Required model:
- authenticate a superuser on the server
- issue a server-managed CMS session cookie
- validate that cookie on every privileged CMS request
- keep admin credentials and tokens inaccessible to browser JavaScript

The CMS auth model must be:
- cookie-based
- HttpOnly
- server-validated on every request
- compatible with CSRF defenses
- conservative and restart-safe

Do not pretend there is a built-in server-side admin session manager.

PocketBase JSVM request note:
- official JSVM docs expose the request on `e.request`
- local verification in this repository confirmed `formValue` and `cookie` should be read from `c.request`
- do not use `c.request()` in this repository's auth/session examples

---

## 3. Session cookie rules

The CMS session cookie is the authoritative browser-side session handle.

Required properties:
- `HttpOnly`
- `SameSite`
- `Secure` where appropriate
- explicit `Path`
- explicit expiry or max-age policy

Recommended scope:
- restrict the cookie path to `/cms` or the smallest practical privileged scope
- use a stable cookie name reserved for CMS admin access

Rules:
- never expose the cookie value to frontend JavaScript
- never store superuser tokens in `localStorage`
- never store privileged auth state in Alpine or htmx client state
- never rely on hidden form fields as the authorization source of truth

---

## 4. Login flow

### GET `/cms/login`
Must:
- render the login page
- clear obviously invalid transient auth UI state if needed
- not leak privileged diagnostics

### POST `/cms/login`
Must:
- validate submitted credentials on the server
- authenticate against the intended PocketBase superuser/admin boundary
- issue the CMS session cookie on success
- reject invalid credentials with server-rendered HTML
- avoid returning browser-facing JSON auth payloads

On success:
- redirect to `/cms` or `/cms/dashboard`
- set the CMS session cookie before redirect completion

On failure:
- re-render the login page with an HTML error block
- avoid revealing whether a username or password was the specific failure cause

### Reference pattern

```javascript
// pb_hooks/cms-login.pb.js — login handler (ES5 only)
routerAdd("POST", "/cms/login", function(c) {
    var email = String(c.request.formValue("email") || "").replace(/^\s+|\s+$/g, "");
    var password = String(c.request.formValue("password") || "");

    if (!email || !password) {
        return c.html(400, renderLogin({ error: "Email and password are required." }));
    }

    // Authenticate against PocketBase superuser boundary
    var admin;
    try {
        admin = $app.findAuthRecordByEmail("_superusers", email);
        if (!admin.validatePassword(password)) {
            throw new Error("invalid");
        }
    } catch (e) {
        return c.html(401, renderLogin({ error: "Invalid credentials." }));
    }

    // Create persistent session
    var sessionId = $security.randomStringWithAlphabet(40, "abcdefghijklmnopqrstuvwxyz0123456789");
    var csrfToken = $security.randomStringWithAlphabet(40, "abcdefghijklmnopqrstuvwxyz0123456789");
    var expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // 4 hours

    var sessions = $app.findCollectionByNameOrId("cms_sessions");
    var record = new Record(sessions);
    record.set("session_id", sessionId);
    record.set("admin_ref", admin.id);
    record.set("csrf_token", csrfToken);
    record.set("expires_at", expiresAt);
    record.set("last_seen_at", new Date().toISOString());

    $app.save(record);

    // Set HttpOnly cookie
    c.setCookie(new Cookie({
        name: "cms_session",
        value: sessionId,
        path: "/cms",
        httpOnly: true,
        sameSite: 2, // Strict
        secure: false, // set true in production with TLS
        maxAge: 4 * 60 * 60
    }));

    return c.redirect(302, "/cms/dashboard");
});
```

---

## 5. Logout flow

Expected route:
- `POST /cms/logout`

Logout must:
- invalidate the current persistent CMS session record before or together with clearing the cookie
- clear the CMS session cookie in the response
- redirect to `/cms/login` or render a logged-out result page
- leave no privileged browser-readable auth residue

Do not implement logout as a client-only UI reset.

---

## 6. Per-request auth validation

Every privileged CMS request must be validated on the server.

This includes:
- page GETs
- form GETs
- form POSTs
- delete actions
- build status views
- CMS fragments

Validation must determine:
- whether a valid CMS session cookie exists
- whether it resolves to the intended superuser/admin authorization boundary
- whether the request may proceed

Unauthorized behavior:
- for page requests: redirect to `/cms/login`
- for fragment or action requests: return a suitable HTML error, redirect, or unauthenticated response pattern consistent with htmx behavior

### Reference pattern

```javascript
// pb_hooks/cms-login.pb.js or equivalent auth helper (ES5 only)
function requireCmsAuth(c) {
    var cookie = c.request.cookie("cms_session");
    if (!cookie) {
        return null;
    }

    var sessionId = String(cookie.value || "");
    if (!sessionId) {
        return null;
    }

    var records;
    try {
        records = $app.findRecordsByFilter(
            "cms_sessions",
            "session_id = {:sid} && expires_at > {:now} && revoked_at = ''",
            "",
            1,
            0,
            { sid: sessionId, now: new Date().toISOString() }
        );
    } catch (e) {
        return null;
    }

    if (!records || records.length === 0) {
        return null;
    }

    var session = records[0];

    // Update last_seen_at
    session.set("last_seen_at", new Date().toISOString());
    try { $app.save(session); } catch (e) { /* best effort */ }

    return session;
}
```

---

## 7. Session representation rules

Phase one must use:
- an opaque server-managed CMS session identifier
- a dedicated persistent `cms_sessions` collection
- server-side lookup on every privileged CMS request

The CMS session cookie stores only the opaque session identifier.
It must not store privileged authorization state directly.

Required `cms_sessions` fields at minimum:
- `session_id`
- `admin_ref`
- `csrf_token`
- `expires_at`
- `last_seen_at`
- `revoked_at` (recommended)

Rules:
- session lookup must survive PocketBase restarts
- logout must invalidate or revoke the current session row
- expired or revoked rows must fail closed
- privileged authorization must not depend on in-memory-only process state
- privileged authorization must not depend on browser-readable storage

## 8. Expiry and invalidation rules

CMS sessions must expire.

Required behaviors:
- expired sessions must fail closed
- invalid sessions must be rejected server-side
- logout must invalidate the current session view immediately
- stale cookies must not silently grant access

Recommended behaviors:
- rotate or refresh session validity conservatively
- keep session duration shorter than storefront user sessions would typically be
- require re-authentication after explicit expiry or invalidation

Correctness is more important than convenience.

---

## 9. CSRF contract

All privileged CMS mutations must be protected against CSRF.

Phase one must use a synchronizer-token pattern.

Required behavior:
- issue a server-generated CSRF token bound to the current CMS session
- store the CSRF token server-side in `cms_sessions`
- render the token into privileged CMS forms
- verify the submitted token server-side on every privileged POST
- reject missing, invalid, expired, or mismatched tokens conservatively

Do not rely on SameSite alone as the only CSRF defense.
Security failures must fail closed.

### Reference pattern — rendering CSRF into forms

```html
<!-- CMS form template with CSRF token -->
<form method="POST" action="/cms/products">
  <input type="hidden" name="_csrf" value="{{ .csrfToken }}">
  <!-- form fields -->
  <button type="submit">Save</button>
</form>
```

### Reference pattern — CSRF validation

```javascript
// pb_hooks/cms-login.pb.js or equivalent auth helper (ES5 only)
function validateCsrf(c, session) {
    var submitted = c.request.formValue("_csrf");
    var expected = session.getString("csrf_token");

    if (!submitted || !expected || submitted !== expected) {
        return false;
    }
    return true;
}
```

---

## 10. Failure behavior

Security failures must fail closed.

Examples:
- malformed session cookie → unauthenticated
- expired session → unauthenticated
- missing CSRF token on privileged mutation → reject
- token lookup error → reject conservatively
- uncertain privilege state → deny access

Do not silently bypass auth because of helper errors.
Do not downgrade privileged routes into public routes.

---

## 11. CMS editor interaction rules

TOAST UI Editor is allowed only on CMS product create/edit pages.

Auth/session implications:
- editor assets do not imply authorization by themselves
- editor-submitted content must still pass server auth validation
- Markdown remains canonical regardless of client editor mode
- any derived HTML must be sanitized server-side before persistence or export

The editor is a CMS authoring tool, not a session authority.

---

## 12. Verification checklist

Before considering CMS auth/session work complete, verify:

- `/cms/login` renders correctly
- successful login sets the intended cookie
- failed login returns HTML errors without leaking privileged details
- `/cms/logout` clears the cookie and invalidates the session row
- every privileged CMS route validates auth server-side
- unauthorized requests fail closed
- privileged POST routes validate CSRF expectations
- admin tokens are not available to browser JavaScript
- no privileged auth state is stored in `localStorage`
- cookie/session logic does not rely on in-memory-only state as the durable source of truth

---

## 13. Completion summary expectations

When finishing auth/session work, summarize:
1. cookie/session model used
2. login route behavior
3. logout behavior
4. per-request validation strategy
5. CSRF protection strategy
6. hard tradeoffs or known limits
