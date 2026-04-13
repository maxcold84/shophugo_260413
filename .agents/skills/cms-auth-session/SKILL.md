---
name: cms-auth-session
description: Implement and review privileged CMS login, session, and CSRF boundaries for PocketBase-managed admin access.
---

Use this skill whenever a task touches `/cms/**`, login/logout, session cookies, CSRF, or privileged CMS fragments.

## Security boundary
- `/cms/login` is the public entry point to the privileged CMS boundary.
- All other `/cms/**` routes require successful CMS auth validation.
- The CMS session cookie is authoritative browser-side session handle.
- The cookie must be HttpOnly, SameSite, and scoped to the smallest practical privileged path.
- Privileged POST routes must use a synchronizer-token CSRF pattern.

## Required rules
- Authenticate against the intended PocketBase superuser/admin boundary.
- Issue a server-managed CMS session cookie.
- Validate the cookie on every privileged request.
- Keep admin credentials and tokens inaccessible to browser JavaScript.
- Never store privileged auth state in localStorage or Alpine state.
- Security failures must fail closed.

## Route behavior
- `GET /cms/login`: public login form render.
- `POST /cms/login`: validate credentials and issue cookie.
- `POST /cms/logout`: invalidate persistent session and clear cookie.
- Unauthorized page requests: redirect to `/cms/login`.
- Unauthorized fragment/action requests: return consistent HTML error or redirect behavior.

## Session schema expectations
- `cms_sessions.admin_ref` stores the authenticated superuser record id as text.
- Session data must be persistent and restart-safe.
- Expiry and revocation must be enforced on the server.

## Review checklist
1. Does any helper error risk a fail-open auth path?
2. Is CSRF checked for all privileged POST routes except login?
3. Is cookie scope/path conservative?
4. Are auth diagnostics non-leaky in user-facing HTML?
5. Are logout and session invalidation server-side, not client-only?

## Finish by reporting
- auth flow impact
- cookie/CSRF decisions
- fail-closed guarantees
