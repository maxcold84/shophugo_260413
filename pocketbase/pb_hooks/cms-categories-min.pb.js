function cmsCategoriesEsc(value) {
    var input = value === null || value === undefined ? "" : String(value);
    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function cmsCategoriesLoadSession(sessionId) {
    var records;
    if (!sessionId) {
        return null;
    }
    records = $app.findRecordsByFilter(
        "cms_sessions",
        "session_id = {:sid} && expires_at > {:now} && revoked_at = ''",
        "",
        1,
        0,
        { sid: sessionId, now: new Date().toISOString() }
    );
    return records && records.length ? records[0] : null;
}

function cmsCategoriesShell(title, csrfToken, body) {
    return [
        "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
        "<title>" + cmsCategoriesEsc(title) + "</title>",
        "<style>body{font-family:Arial,sans-serif;background:#f6f7fb;color:#1f2937;margin:0;}a{color:#1d4ed8;text-decoration:none;}a:hover{text-decoration:underline;}.shell{display:grid;grid-template-columns:240px 1fr;min-height:100vh;}.nav{background:#111827;color:#fff;padding:24px;}.nav a{display:block;color:#cbd5e1;padding:8px 0;}.nav a.active{color:#fff;font-weight:700;}.content{padding:32px;}.panel{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;box-shadow:0 10px 30px rgba(15,23,42,.05);}.meta{color:#6b7280;font-size:14px;}table{width:100%;border-collapse:collapse;}th,td{text-align:left;padding:12px;border-bottom:1px solid #e5e7eb;}button,.button{display:inline-block;background:#111827;color:#fff;border:none;border-radius:10px;padding:10px 16px;cursor:pointer;}.button.secondary{background:#e5e7eb;color:#111827;}@media (max-width:900px){.shell{grid-template-columns:1fr;}.nav{display:flex;gap:16px;overflow:auto;}}</style>",
        "</head><body><div class=\"shell\"><nav class=\"nav\"><h1 style=\"margin-top:0;font-size:20px;\">CMS</h1>",
        "<a href=\"/cms/dashboard\">Dashboard</a>",
        "<a href=\"/cms/products\">Products</a>",
        "<a class=\"active\" href=\"/cms/categories\">Categories</a>",
        "<a href=\"/cms/builds\">Builds</a>",
        "<form method=\"POST\" action=\"/cms/logout\" style=\"margin-top:16px;\"><input type=\"hidden\" name=\"_csrf\" value=\"" + cmsCategoriesEsc(csrfToken || "") + "\"><button type=\"submit\" class=\"button secondary\">Logout</button></form>",
        "</nav><main class=\"content\">" + body + "</main></div></body></html>"
    ].join("");
}

routerAdd("GET", "/cms/categories", function(c) {
    var cookie = null;
    var sessionId = "";
    var session = null;
    var categories;
    var i;
    var rows = "";

    try {
        cookie = c.request.cookie("cms_session");
        sessionId = cookie ? String(cookie.value || "") : "";
        session = cmsCategoriesLoadSession(sessionId);
    } catch (e) {
        session = null;
    }

    if (!session) {
        return c.redirect(302, "/cms/login");
    }

    categories = $app.findRecordsByFilter("categories", "id != ''", "sort_order asc,name asc", 500, 0);
    for (i = 0; i < categories.length; i += 1) {
        rows += [
            "<tr>",
            "<td>" + cmsCategoriesEsc(categories[i].getString("name")) + "</td>",
            "<td>" + cmsCategoriesEsc(categories[i].getString("slug")) + "</td>",
            "<td>" + (categories[i].getBool("visible") ? "Visible" : "Hidden") + "</td>",
            "</tr>"
        ].join("");
    }

    if (!rows) {
        rows = "<tr><td colspan=\"3\" class=\"meta\">No categories yet.</td></tr>";
    }

    return c.html(200, cmsCategoriesShell("Categories", session.getString("csrf_token"), [
        "<div class=\"panel\"><h1 style=\"margin-top:0;\">Categories</h1>",
        "<p class=\"meta\">Category visibility affects storefront build output.</p>",
        "<a class=\"button\" href=\"/cms/categories/new\">New category</a>",
        "<table style=\"margin-top:24px;\"><thead><tr><th>Name</th><th>Slug</th><th>Visibility</th></tr></thead><tbody>",
        rows,
        "</tbody></table></div>"
    ].join("")));
});

routerAdd("GET", "/cms/categories/new", function(c) {
    var cookie = null;
    var sessionId = "";
    var session = null;

    try {
        cookie = c.request.cookie("cms_session");
        sessionId = cookie ? String(cookie.value || "") : "";
        session = cmsCategoriesLoadSession(sessionId);
    } catch (e) {
        session = null;
    }

    if (!session) {
        return c.redirect(302, "/cms/login");
    }

    return c.html(200, cmsCategoriesShell("New Category", session.getString("csrf_token"), "<div class=\"panel\"><h1 style=\"margin-top:0;\">Create category</h1><p class=\"meta\">Minimal category form route is active. Full CRUD form wiring is the next step.</p></div>"));
});
