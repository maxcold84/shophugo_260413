require(__hooks + "/auth.js");
require(__hooks + "/utils.js");

function registerAuthRoutes() {
    routerAdd("GET", "/cms/login", function(c) {
        return c.html(200, globalThis.STORE_AUTH.renderLoginPage("", {}));
    });

    routerAdd("POST", "/cms/login", function(c) {
        var email = String(c.request().formValue("email") || "").replace(/^\s+|\s+$/g, "");
        var password = String(c.request().formValue("password") || "");
        var admin;
        var session;

        if (!email || !password) {
            return c.html(422, globalThis.STORE_AUTH.renderLoginPage("Email and password are required.", { email: email }));
        }

        try {
            admin = $app.findAuthRecordByEmail("_superusers", email);
            if (!admin || !admin.validatePassword(password)) {
                throw new Error("invalid_credentials");
            }
        } catch (e) {
            $app.logger().warn("CMS login failed", "email", email, "ip", c.realIP());
            return c.html(401, globalThis.STORE_AUTH.renderLoginPage("Invalid credentials.", { email: email }));
        }

        session = globalThis.STORE_AUTH.createSession(admin);
        globalThis.STORE_AUTH.setCmsCookie(c, session);
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
