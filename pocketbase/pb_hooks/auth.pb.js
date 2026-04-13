var config = require(__hooks + "/config.js");
var utils = require(__hooks + "/utils.js");

function loadCmsSession(sessionId) {
    var records;
    if (!sessionId) {
        return null;
    }
    try {
        records = $app.findRecordsByFilter(
            "cms_sessions",
            "session_id = {:sid} && expires_at > {:now} && revoked_at = ''",
            "-created",
            1,
            0,
            { sid: sessionId, now: utils.nowIso() }
        );
    } catch (e) {
        $app.logger().warn("CMS session lookup failed", "error", String(e));
        return null;
    }
    if (!records || !records.length) {
        return null;
    }
    return records[0];
}

function resolveSessionAdmin(session) {
    if (!session) {
        return null;
    }
    try {
        return $app.findAuthRecordById("_superusers", session.getString("admin_ref"));
    } catch (e) {
        $app.logger().warn("CMS session admin resolution failed", "admin_ref", session.getString("admin_ref"));
        return null;
    }
}

function touchSession(session) {
    try {
        session.set("last_seen_at", utils.nowIso());
        $app.save(session);
    } catch (e) {
        $app.logger().warn("CMS session touch failed", "session_id", session.getString("session_id"));
    }
}

function clearCmsCookie(c) {
    c.setCookie({
        name: config.cms.cookieName,
        value: "",
        path: config.cms.cookiePath,
        httpOnly: true,
        sameSite: config.cms.sameSite,
        secure: config.cms.secure,
        maxAge: -1
    });
}

function unauthenticatedResponse(c) {
    if (utils.isHtmx(c)) {
        return c.html(401, "<div class=\"flash error\">You need to sign in to continue.</div>");
    }
    return c.redirect(302, "/cms/login");
}

function requireCmsAuth(c) {
    var cookie = c.request().cookie(config.cms.cookieName);
    var sessionId = cookie ? cookie.value() : "";
    var session = loadCmsSession(sessionId);
    var admin = resolveSessionAdmin(session);

    if (!session || !admin) {
        return {
            ok: false,
            response: unauthenticatedResponse(c)
        };
    }

    touchSession(session);
    return {
        ok: true,
        session: session,
        admin: admin
    };
}

function validateCsrf(c, session) {
    var submitted = c.request().formValue("_csrf");
    var expected = session ? session.getString("csrf_token") : "";
    return !!submitted && !!expected && submitted === expected;
}

function rejectCsrf(c) {
    $app.logger().error("CMS CSRF validation failed", "path", c.request().url().path(), "ip", c.realIP());
    return c.html(403, "<div class=\"flash error\">Your session could not be verified. Refresh the page and try again.</div>");
}

function createSession(admin) {
    var sessions = $app.findCollectionByNameOrId("cms_sessions");
    var record = new Record(sessions);
    var sessionId = $security.randomStringWithAlphabet(40, "abcdefghijklmnopqrstuvwxyz0123456789");
    var csrfToken = $security.randomStringWithAlphabet(40, "abcdefghijklmnopqrstuvwxyz0123456789");
    var expiresAt = new Date(Date.now() + (config.cms.sessionHours * 60 * 60 * 1000)).toISOString();

    record.set("session_id", sessionId);
    record.set("admin_ref", admin.id);
    record.set("csrf_token", csrfToken);
    record.set("expires_at", expiresAt);
    record.set("last_seen_at", utils.nowIso());
    $app.save(record);
    return record;
}

function setCmsCookie(c, session) {
    c.setCookie({
        name: config.cms.cookieName,
        value: session.getString("session_id"),
        path: config.cms.cookiePath,
        httpOnly: true,
        sameSite: config.cms.sameSite,
        secure: config.cms.secure,
        maxAge: config.cms.sessionHours * 60 * 60
    });
}

function renderLoginPage(errorMessage, values) {
    return utils.renderView(__hooks + "/views/cms/login.html", {
        error: errorMessage || "",
        values: values || {}
    });
}

routerAdd("GET", "/cms/login", function(c) {
    return c.html(200, renderLoginPage("", {}));
});

routerAdd("POST", "/cms/login", function(c) {
    var email = String(c.request().formValue("email") || "").replace(/^\s+|\s+$/g, "");
    var password = String(c.request().formValue("password") || "");
    var admin;
    var session;

    if (!email || !password) {
        return c.html(422, renderLoginPage("Email and password are required.", { email: email }));
    }

    try {
        admin = $app.findAuthRecordByEmail("_superusers", email);
        if (!admin || !admin.validatePassword(password)) {
            throw new Error("invalid_credentials");
        }
    } catch (e) {
        $app.logger().warn("CMS login failed", "email", email, "ip", c.realIP());
        return c.html(401, renderLoginPage("Invalid credentials.", { email: email }));
    }

    session = createSession(admin);
    setCmsCookie(c, session);
    $app.logger().info("CMS login success", "email", email);
    return c.redirect(302, "/cms/dashboard");
});

routerAdd("POST", "/cms/logout", function(c) {
    var auth = requireCmsAuth(c);
    if (!auth.ok) {
        clearCmsCookie(c);
        return c.redirect(302, "/cms/login");
    }
    if (!validateCsrf(c, auth.session)) {
        return rejectCsrf(c);
    }
    auth.session.set("revoked_at", utils.nowIso());
    $app.save(auth.session);
    clearCmsCookie(c);
    return c.redirect(302, "/cms/login");
});

module.exports = {
    requireCmsAuth: requireCmsAuth,
    validateCsrf: validateCsrf,
    rejectCsrf: rejectCsrf,
    clearCmsCookie: clearCmsCookie
};
