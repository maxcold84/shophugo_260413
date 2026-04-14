routerAdd("GET", "/cms/builds", function(c) {
    var cookie = null;
    var sessionId = "";
    var records;
    var session = null;

    try {
        cookie = c.request.cookie("cms_session");
        sessionId = cookie ? String(cookie.value || "") : "";
    } catch (e) {
        sessionId = "";
    }

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

    if (!session) {
        return c.redirect(302, "/cms/login");
    }

    return c.html(200, "<div>builds-ok</div>");
});

routerAdd("GET", "/cms/fragments/build-status", function(c) {
    var cookie = null;
    var sessionId = "";
    var records;
    var session = null;

    try {
        cookie = c.request.cookie("cms_session");
        sessionId = cookie ? String(cookie.value || "") : "";
    } catch (e) {
        sessionId = "";
    }

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

    if (!session) {
        return c.html(401, "<div>You need to sign in to continue.</div>");
    }

    return c.html(200, "<div>build-status-ok</div>");
});
