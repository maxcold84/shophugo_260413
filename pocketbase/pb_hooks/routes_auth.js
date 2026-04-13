var auth = globalThis.STORE_AUTH;
var utils = globalThis.STORE_UTILS;

function registerAuthRoutes() {
    routerAdd("GET", "/cms/login", function(c) {
        return c.html(200, auth.renderLoginPage("", {}));
    });

    routerAdd("POST", "/cms/login", function(c) {
        var email = String(c.request().formValue("email") || "").replace(/^\s+|\s+$/g, "");
        var password = String(c.request().formValue("password") || "");
        var admin;
        var session;

        if (!email || !password) {
            return c.html(422, auth.renderLoginPage("Email and password are required.", { email: email }));
        }

        try {
            admin = $app.findAuthRecordByEmail("_superusers", email);
            if (!admin || !admin.validatePassword(password)) {
                throw new Error("invalid_credentials");
            }
        } catch (e) {
            $app.logger().warn("CMS login failed", "email", email, "ip", c.realIP());
            return c.html(401, auth.renderLoginPage("Invalid credentials.", { email: email }));
        }

        session = auth.createSession(admin);
        auth.setCmsCookie(c, session);
        $app.logger().info("CMS login success", "email", email);
        return c.redirect(302, "/cms/dashboard");
    });

    routerAdd("POST", "/cms/logout", function(c) {
        var gate = auth.requireCmsAuth(c);
        if (!gate.ok) {
            auth.clearCmsCookie(c);
            return c.redirect(302, "/cms/login");
        }
        if (!auth.validateCsrf(c, gate.session)) {
            return auth.rejectCsrf(c);
        }
        gate.session.set("revoked_at", utils.nowIso());
        $app.save(gate.session);
        auth.clearCmsCookie(c);
        return c.redirect(302, "/cms/login");
    });
}

registerAuthRoutes();

