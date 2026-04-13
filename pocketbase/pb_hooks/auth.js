var config = globalThis.STORE_CONFIG;
var utils = globalThis.STORE_UTILS;

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

globalThis.STORE_AUTH = {
    requireCmsAuth: requireCmsAuth,
    validateCsrf: validateCsrf,
    rejectCsrf: rejectCsrf,
    clearCmsCookie: clearCmsCookie,
    createSession: createSession,
    setCmsCookie: setCmsCookie,
    renderLoginPage: renderLoginPage
};
