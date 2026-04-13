function registerCmsRoutes() {
    routerAdd("GET", "/__probe-cms", function(c) {
        return c.string(200, "probe-cms-ok");
    });

    routerAdd("GET", "/cms", function(c) {
        return c.redirect(302, "/cms/dashboard");
    });

    routerAdd("GET", "/cms/dashboard", function(c) {
        var cookie = c.request().cookie("cms_session");
        var sessionId = cookie ? cookie.value() : "";
        var sessions;
        var session;
        var state;
        var productsCount;
        var categoriesCount;
        var ordersCount;
        var body;

        if (!sessionId) {
            return c.redirect(302, "/cms/login");
        }

        sessions = $app.findRecordsByFilter(
            "cms_sessions",
            "session_id = {:sid} && expires_at > {:now} && revoked_at = ''",
            "-created",
            1,
            0,
            { sid: sessionId, now: new Date().toISOString() }
        );

        if (!sessions || !sessions.length) {
            return c.redirect(302, "/cms/login");
        }

        session = sessions[0];
        state = $app.findRecordsByFilter("build_state", "id != ''", "created asc", 1, 0)[0];
        productsCount = $app.findRecordsByFilter("products", "id != ''", "", 500, 0).length;
        categoriesCount = $app.findRecordsByFilter("categories", "id != ''", "", 500, 0).length;
        ordersCount = $app.findRecordsByFilter("orders", "id != ''", "", 500, 0).length;

        body = [
            "<div class=\"panel\">",
            "<h1 style=\"margin-top:0;\">Dashboard</h1>",
            "<p class=\"meta\">PocketBase owns privileged actions and build orchestration. Hugo owns public storefront rendering.</p>",
            "<div class=\"grid two\" style=\"margin-top:24px;\">",
            "<div class=\"panel\"><h2 style=\"margin-top:0;\">Catalog</h2>",
            "<p><strong>" + productsCount + "</strong> products</p>",
            "<p><strong>" + categoriesCount + "</strong> categories</p>",
            "<p><strong>" + ordersCount + "</strong> orders</p></div>",
            "<div class=\"panel\"><h2 style=\"margin-top:0;\">Build Queue</h2>",
            "<p>Queue dirty: <strong>" + state.getBool("queue_dirty") + "</strong></p>",
            "<p>Build running: <strong>" + state.getBool("build_running") + "</strong></p>",
            "<p>Rerun requested: <strong>" + state.getBool("rerun_requested") + "</strong></p>",
            "<p>Last changed: <span class=\"meta\">" + state.getString("last_changed_at") + "</span></p>",
            "<p>Last built: <span class=\"meta\">" + state.getString("last_built_at") + "</span></p></div>",
            "</div></div>"
        ].join("");

        return c.html(200, [
            "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
            "<title>CMS Dashboard</title>",
            "<style>body{font-family:Arial,sans-serif;background:#f6f7fb;color:#1f2937;margin:0;}a{color:#1d4ed8;text-decoration:none;}a:hover{text-decoration:underline;}.shell{display:grid;grid-template-columns:240px 1fr;min-height:100vh;}.nav{background:#111827;color:#fff;padding:24px;}.nav a{display:block;color:#cbd5e1;padding:8px 0;}.nav a.active{color:#fff;font-weight:700;}.content{padding:32px;}.panel{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;box-shadow:0 10px 30px rgba(15,23,42,.05);}.grid{display:grid;gap:16px;}.grid.two{grid-template-columns:repeat(2,minmax(0,1fr));}.meta{color:#6b7280;font-size:14px;}button,.button{display:inline-block;background:#111827;color:#fff;border:none;border-radius:10px;padding:10px 16px;cursor:pointer;}.button.secondary{background:#e5e7eb;color:#111827;}@media (max-width:900px){.shell{grid-template-columns:1fr;}.nav{display:flex;gap:16px;overflow:auto;}.grid.two{grid-template-columns:1fr;}}</style>",
            "</head><body><div class=\"shell\"><nav class=\"nav\"><h1 style=\"margin-top:0;font-size:20px;\">CMS</h1>",
            "<a class=\"active\" href=\"/cms/dashboard\">Dashboard</a>",
            "<a href=\"/cms/products\">Products</a>",
            "<a href=\"/cms/categories\">Categories</a>",
            "<a href=\"/cms/builds\">Builds</a>",
            "<form method=\"POST\" action=\"/cms/logout\" style=\"margin-top:16px;\"><input type=\"hidden\" name=\"_csrf\" value=\"" + session.getString("csrf_token") + "\"><button type=\"submit\" class=\"button secondary\">Logout</button></form>",
            "</nav><main class=\"content\">" + body + "</main></div></body></html>"
        ].join(""));
    });

    routerAdd("GET", "/cms/builds", function(c) {
        var cookie = c.request().cookie("cms_session");
        var sessionId = cookie ? cookie.value() : "";
        var sessions;
        var session;
        var state;
        var logs;
        var i;
        var logHtml = "";

        if (!sessionId) {
            return c.redirect(302, "/cms/login");
        }

        sessions = $app.findRecordsByFilter(
            "cms_sessions",
            "session_id = {:sid} && expires_at > {:now} && revoked_at = ''",
            "-created",
            1,
            0,
            { sid: sessionId, now: new Date().toISOString() }
        );

        if (!sessions || !sessions.length) {
            return c.redirect(302, "/cms/login");
        }

        session = sessions[0];
        state = $app.findRecordsByFilter("build_state", "id != ''", "created asc", 1, 0)[0];
        logs = $app.findRecordsByFilter("build_logs", "id != ''", "-created", 10, 0);

        for (i = 0; i < logs.length; i += 1) {
            logHtml += [
                "<div style=\"border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin-bottom:12px;\">",
                "<p style=\"margin:0 0 6px;\"><strong>" + logs[i].getString("status") + "</strong> via " + logs[i].getString("triggered_by") + "</p>",
                "<p class=\"meta\" style=\"margin:0 0 6px;\">" + logs[i].created + (logs[i].getInt("duration_ms") ? (" · " + logs[i].getInt("duration_ms") + "ms") : "") + "</p>",
                "<pre style=\"white-space:pre-wrap;background:#f8fafc;padding:12px;border-radius:10px;margin:0;\">" + escapeHtml(logs[i].getString("output")) + "</pre>",
                "</div>"
            ].join("");
        }

        return c.html(200, [
            "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
            "<title>Build Status</title>",
            "<style>body{font-family:Arial,sans-serif;background:#f6f7fb;color:#1f2937;margin:0;}a{color:#1d4ed8;text-decoration:none;}a:hover{text-decoration:underline;}.shell{display:grid;grid-template-columns:240px 1fr;min-height:100vh;}.nav{background:#111827;color:#fff;padding:24px;}.nav a{display:block;color:#cbd5e1;padding:8px 0;}.nav a.active{color:#fff;font-weight:700;}.content{padding:32px;}.panel{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;box-shadow:0 10px 30px rgba(15,23,42,.05);}.grid{display:grid;gap:16px;}.grid.two{grid-template-columns:repeat(2,minmax(0,1fr));}.meta{color:#6b7280;font-size:14px;}button,.button{display:inline-block;background:#111827;color:#fff;border:none;border-radius:10px;padding:10px 16px;cursor:pointer;}.button.secondary{background:#e5e7eb;color:#111827;}@media (max-width:900px){.shell{grid-template-columns:1fr;}.nav{display:flex;gap:16px;overflow:auto;}.grid.two{grid-template-columns:1fr;}}</style>",
            "</head><body><div class=\"shell\"><nav class=\"nav\"><h1 style=\"margin-top:0;font-size:20px;\">CMS</h1>",
            "<a href=\"/cms/dashboard\">Dashboard</a>",
            "<a href=\"/cms/products\">Products</a>",
            "<a href=\"/cms/categories\">Categories</a>",
            "<a class=\"active\" href=\"/cms/builds\">Builds</a>",
            "<form method=\"POST\" action=\"/cms/logout\" style=\"margin-top:16px;\"><input type=\"hidden\" name=\"_csrf\" value=\"" + session.getString("csrf_token") + "\"><button type=\"submit\" class=\"button secondary\">Logout</button></form>",
            "</nav><main class=\"content\"><div class=\"panel\"><h1 style=\"margin-top:0;\">Build Status</h1>",
            "<p class=\"meta\">The CMS polls the persisted build state and logs rather than relying on browser-side state.</p>",
            "<div class=\"grid two\" style=\"margin-top:24px;\"><div>",
            "<h2 style=\"margin-top:0;\">Current state</h2>",
            "<p>Queue dirty: <strong>" + state.getBool("queue_dirty") + "</strong></p>",
            "<p>Build running: <strong>" + state.getBool("build_running") + "</strong></p>",
            "<p>Rerun requested: <strong>" + state.getBool("rerun_requested") + "</strong></p>",
            "<p>Last changed: <span class=\"meta\">" + state.getString("last_changed_at") + "</span></p>",
            "<p>Last built: <span class=\"meta\">" + state.getString("last_built_at") + "</span></p>",
            "<p>Build started: <span class=\"meta\">" + state.getString("build_started_at") + "</span></p>",
            "</div><div><h2 style=\"margin-top:0;\">Recent logs</h2>",
            (logHtml || "<p class=\"meta\">No build logs yet.</p>"),
            "</div></div></div></main></div></body></html>"
        ].join(""));
    });

    routerAdd("GET", "/cms/fragments/build-status", function(c) {
        var state = $app.findRecordsByFilter("build_state", "id != ''", "created asc", 1, 0)[0];
        var logs = $app.findRecordsByFilter("build_logs", "id != ''", "-created", 10, 0);
        var i;
        var logHtml = "";

        for (i = 0; i < logs.length; i += 1) {
            logHtml += [
                "<div style=\"border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin-bottom:12px;\">",
                "<p style=\"margin:0 0 6px;\"><strong>" + logs[i].getString("status") + "</strong> via " + logs[i].getString("triggered_by") + "</p>",
                "<p class=\"meta\" style=\"margin:0 0 6px;\">" + logs[i].created + (logs[i].getInt("duration_ms") ? (" · " + logs[i].getInt("duration_ms") + "ms") : "") + "</p>",
                "<pre style=\"white-space:pre-wrap;background:#f8fafc;padding:12px;border-radius:10px;margin:0;\">" + escapeHtml(logs[i].getString("output")) + "</pre>",
                "</div>"
            ].join("");
        }

        return c.html(200, [
            "<div class=\"panel\"><div class=\"grid two\"><div>",
            "<h2 style=\"margin-top:0;\">Current state</h2>",
            "<p>Queue dirty: <strong>" + state.getBool("queue_dirty") + "</strong></p>",
            "<p>Build running: <strong>" + state.getBool("build_running") + "</strong></p>",
            "<p>Rerun requested: <strong>" + state.getBool("rerun_requested") + "</strong></p>",
            "<p>Last changed: <span class=\"meta\">" + state.getString("last_changed_at") + "</span></p>",
            "<p>Last built: <span class=\"meta\">" + state.getString("last_built_at") + "</span></p>",
            "<p>Build started: <span class=\"meta\">" + state.getString("build_started_at") + "</span></p>",
            "</div><div><h2 style=\"margin-top:0;\">Recent logs</h2>",
            (logHtml || "<p class=\"meta\">No build logs yet.</p>"),
            "</div></div></div>"
        ].join(""));
    });
}

registerCmsRoutes();
$app.logger().info("loaded routes_cms");
