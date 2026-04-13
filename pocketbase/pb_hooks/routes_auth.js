function registerAuthRoutes() {
    routerAdd("GET", "/cms/login", function(c) {
        return c.html(200, [
            "<!doctype html>",
            "<html lang=\"en\">",
            "<head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>CMS Login</title></head>",
            "<body>",
            "<main style=\"max-width:420px;margin:4rem auto;font-family:Arial,sans-serif;\">",
            "<h1>CMS Login</h1>",
            "<form method=\"POST\" action=\"/cms/login\">",
            "<label>Email <input type=\"email\" name=\"email\"></label><br><br>",
            "<label>Password <input type=\"password\" name=\"password\"></label><br><br>",
            "<button type=\"submit\">Sign in</button>",
            "</form>",
            "</main>",
            "</body>",
            "</html>"
        ].join(""));
    });

    routerAdd("POST", "/cms/login", function(c) {
        var email = String(c.request().formValue("email") || "").replace(/^\s+|\s+$/g, "");
        var password = String(c.request().formValue("password") || "");
        var admin;
        var session;
        var sessions;
        var record;
        var sessionId;
        var csrfToken;
        var expiresAt;

        if (!email || !password) {
            return c.html(422, $template.loadFiles(__hooks + "/views/cms/login.html").render({
                error: "Email and password are required.",
                values: { email: email }
            }));
        }

        try {
            admin = $app.findAuthRecordByEmail("_superusers", email);
            if (!admin || !admin.validatePassword(password)) {
                throw new Error("invalid_credentials");
            }
        } catch (e) {
            $app.logger().warn("CMS login failed", "email", email, "ip", c.realIP());
            return c.html(401, $template.loadFiles(__hooks + "/views/cms/login.html").render({
                error: "Invalid credentials.",
                values: { email: email }
            }));
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
        $app.logger().info("CMS login success", "email", email);
        return c.redirect(302, "/cms/dashboard");
    });

    routerAdd("POST", "/cms/logout", function(c) {
        var gate = globalThis.STORE_AUTH.requireCmsAuth(c);
        if (!gate.ok) {
            globalThis.STORE_AUTH.clearCmsCookie(c);
            return c.redirect(302, "/cms/login");
        }
        if (!globalThis.STORE_AUTH.validateCsrf(c, gate.session)) {
            return globalThis.STORE_AUTH.rejectCsrf(c);
        }
        gate.session.set("revoked_at", globalThis.STORE_UTILS.nowIso());
        $app.save(gate.session);
        globalThis.STORE_AUTH.clearCmsCookie(c);
        return c.redirect(302, "/cms/login");
    });
}

registerAuthRoutes();
$app.logger().info("loaded routes_auth");

