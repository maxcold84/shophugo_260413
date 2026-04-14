routerAdd("GET", "/cms", function(c) {
    return c.redirect(302, "/cms/dashboard");
});

routerAdd("GET", "/cms/dashboard", function(c) {
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

    return c.html(200, [
        "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
        "<title>CMS Dashboard</title>",
        "<body><div>dashboard-ok</div></body></html>"
    ].join(""));
});
