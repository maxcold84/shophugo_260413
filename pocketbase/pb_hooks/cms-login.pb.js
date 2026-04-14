routerAdd("GET", "/cms/login", function(c) {
    return c.html(200, [
        "<!doctype html>",
        "<html lang=\"en\">",
        "<head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>CMS Login</title>",
        "<style>body{font-family:Arial,sans-serif;background:#0f172a;color:#e2e8f0;display:grid;place-items:center;min-height:100vh;margin:0;}.card{width:min(420px,92vw);background:#fff;color:#0f172a;border-radius:24px;padding:32px;box-shadow:0 20px 60px rgba(15,23,42,.35);}h1{margin-top:0;margin-bottom:8px;font-size:28px;}p{color:#475569;}label{display:block;font-size:14px;font-weight:600;margin-bottom:8px;}input{width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:12px;box-sizing:border-box;margin-bottom:16px;}button{width:100%;padding:12px;border:none;border-radius:12px;background:#0f172a;color:#fff;font-weight:700;cursor:pointer;}.flash{padding:12px 16px;border-radius:12px;margin-bottom:16px;background:#fef2f2;color:#991b1b;border:1px solid #fecaca;}</style>",
        "</head><body><section class=\"card\"><h1>CMS Login</h1><p>Use a PocketBase superuser account to access the privileged CMS routes.</p>",
        "<form method=\"POST\" action=\"/cms/login\">",
        "<label for=\"email\">Email</label><input id=\"email\" type=\"email\" name=\"email\" value=\"\" autocomplete=\"email\">",
        "<label for=\"password\">Password</label><input id=\"password\" type=\"password\" name=\"password\" autocomplete=\"current-password\">",
        "<button type=\"submit\">Sign in</button>",
        "</form></section></body></html>"
    ].join(""));
});

routerAdd("POST", "/cms/login", function(c) {
    var email = String(c.request.formValue("email") || "").replace(/^\s+|\s+$/g, "");
    var password = String(c.request.formValue("password") || "");
    var admin;
    var sessions;
    var record;
    var sessionId;
    var csrfToken;
    var expiresAt;

    function render(errorMessage) {
        function esc(value) {
            var input = value === null || value === undefined ? "" : String(value);
            return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
        }

        return [
            "<!doctype html>",
            "<html lang=\"en\">",
            "<head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>CMS Login</title>",
            "<style>body{font-family:Arial,sans-serif;background:#0f172a;color:#e2e8f0;display:grid;place-items:center;min-height:100vh;margin:0;}.card{width:min(420px,92vw);background:#fff;color:#0f172a;border-radius:24px;padding:32px;box-shadow:0 20px 60px rgba(15,23,42,.35);}h1{margin-top:0;margin-bottom:8px;font-size:28px;}p{color:#475569;}label{display:block;font-size:14px;font-weight:600;margin-bottom:8px;}input{width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:12px;box-sizing:border-box;margin-bottom:16px;}button{width:100%;padding:12px;border:none;border-radius:12px;background:#0f172a;color:#fff;font-weight:700;cursor:pointer;}.flash{padding:12px 16px;border-radius:12px;margin-bottom:16px;background:#fef2f2;color:#991b1b;border:1px solid #fecaca;}</style>",
            "</head><body><section class=\"card\"><h1>CMS Login</h1><p>Use a PocketBase superuser account to access the privileged CMS routes.</p>",
            "<div class=\"flash\">" + esc(errorMessage) + "</div>",
            "<form method=\"POST\" action=\"/cms/login\">",
            "<label for=\"email\">Email</label><input id=\"email\" type=\"email\" name=\"email\" value=\"" + esc(email) + "\" autocomplete=\"email\">",
            "<label for=\"password\">Password</label><input id=\"password\" type=\"password\" name=\"password\" autocomplete=\"current-password\">",
            "<button type=\"submit\">Sign in</button>",
            "</form></section></body></html>"
        ].join("");
    }

    if (!email || !password) {
        return c.html(422, render("Email and password are required."));
    }

    try {
        admin = $app.findAuthRecordByEmail("_superusers", email);
        if (!admin || !admin.validatePassword(password)) {
            throw new Error("invalid_credentials");
        }
    } catch (e) {
        $app.logger().warn("CMS login failed", "email", email, "ip", c.realIP());
        return c.html(401, render("Invalid credentials."));
    }

    sessions = $app.findCollectionByNameOrId("cms_sessions");
    record = new Record(sessions);
    sessionId = $security.randomStringWithAlphabet(40, "abcdefghijklmnopqrstuvwxyz0123456789");
    csrfToken = $security.randomStringWithAlphabet(40, "abcdefghijklmnopqrstuvwxyz0123456789");
    expiresAt = new Date(Date.now() + (4 * 60 * 60 * 1000)).toISOString();
    record.set("session_id", sessionId);
    record.set("admin_ref", admin.id);
    record.set("csrf_token", csrfToken);
    record.set("expires_at", expiresAt);
    record.set("last_seen_at", new Date().toISOString());
    $app.save(record);

    c.setCookie(new Cookie({
        name: "cms_session",
        value: sessionId,
        path: "/cms",
        httpOnly: true,
        sameSite: 2,
        secure: false,
        maxAge: 4 * 60 * 60
    }));

    return c.redirect(302, "/cms/dashboard");
});

routerAdd("POST", "/cms/logout", function(c) {
    var cookie = c.request.cookie("cms_session");
    var sessionId = cookie ? String(cookie.value || "") : "";
    var records;
    var session = null;
    var submitted = c.request.formValue("_csrf");

    if (sessionId) {
        records = $app.findRecordsByFilter(
            "cms_sessions",
            "session_id = {:sid} && expires_at > {:now} && revoked_at = ''",
            "",
            1,
            0,
            { sid: sessionId, now: new Date().toISOString() }
        );
        if (records && records.length) {
            session = records[0];
        }
    }

    if (session && submitted && session.getString("csrf_token") === submitted) {
        session.set("revoked_at", new Date().toISOString());
        $app.save(session);
    }

    c.setCookie(new Cookie({
        name: "cms_session",
        value: "",
        path: "/cms",
        httpOnly: true,
        sameSite: 2,
        secure: false,
        maxAge: -1
    }));

    return c.redirect(302, "/cms/login");
});
