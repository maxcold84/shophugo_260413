function cmsProductsEsc(value) {
    var input = value === null || value === undefined ? "" : String(value);
    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function cmsProductsLoadSession(sessionId) {
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

function cmsProductsShell(title, csrfToken, body) {
    return [
        "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
        "<title>" + cmsProductsEsc(title) + "</title>",
        "<style>body{font-family:Arial,sans-serif;background:#f6f7fb;color:#1f2937;margin:0;}a{color:#1d4ed8;text-decoration:none;}a:hover{text-decoration:underline;}.shell{display:grid;grid-template-columns:240px 1fr;min-height:100vh;}.nav{background:#111827;color:#fff;padding:24px;}.nav a{display:block;color:#cbd5e1;padding:8px 0;}.nav a.active{color:#fff;font-weight:700;}.content{padding:32px;}.panel{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;box-shadow:0 10px 30px rgba(15,23,42,.05);}.meta{color:#6b7280;font-size:14px;}table{width:100%;border-collapse:collapse;}th,td{text-align:left;padding:12px;border-bottom:1px solid #e5e7eb;}button,.button{display:inline-block;background:#111827;color:#fff;border:none;border-radius:10px;padding:10px 16px;cursor:pointer;}.button.secondary{background:#e5e7eb;color:#111827;}@media (max-width:900px){.shell{grid-template-columns:1fr;}.nav{display:flex;gap:16px;overflow:auto;}}</style>",
        "</head><body><div class=\"shell\"><nav class=\"nav\"><h1 style=\"margin-top:0;font-size:20px;\">CMS</h1>",
        "<a href=\"/cms/dashboard\">Dashboard</a>",
        "<a class=\"active\" href=\"/cms/products\">Products</a>",
        "<a href=\"/cms/categories\">Categories</a>",
        "<a href=\"/cms/builds\">Builds</a>",
        "<form method=\"POST\" action=\"/cms/logout\" style=\"margin-top:16px;\"><input type=\"hidden\" name=\"_csrf\" value=\"" + cmsProductsEsc(csrfToken || "") + "\"><button type=\"submit\" class=\"button secondary\">Logout</button></form>",
        "</nav><main class=\"content\">" + body + "</main></div></body></html>"
    ].join("");
}

routerAdd("GET", "/cms/products", function(c) {
    var cookie = null;
    var sessionId = "";
    var session = null;
    var products;
    var i;
    var rows = "";
    var records;

    try {
        cookie = c.request.cookie("cms_session");
        sessionId = cookie ? String(cookie.value || "") : "";
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
    } catch (e) {
        session = null;
    }

    if (!session) {
        return c.redirect(302, "/cms/login");
    }

    products = $app.findRecordsByFilter("products", "id != ''", "sort_order asc,name asc", 500, 0);
    for (i = 0; i < products.length; i += 1) {
        rows += [
            "<tr>",
            "<td><strong>" + cmsProductsEsc(products[i].getString("name")) + "</strong><div class=\"meta\">" + cmsProductsEsc(products[i].getString("slug")) + "</div></td>",
            "<td>" + cmsProductsEsc(products[i].getString("sku")) + "</td>",
            "<td>" + products[i].getInt("price") + "</td>",
            "<td>" + products[i].getInt("stock") + "</td>",
            "<td>" + (products[i].getBool("active") ? "Active" : "Inactive") + " / " + (products[i].getBool("visible") ? "Visible" : "Hidden") + "</td>",
            "</tr>"
        ].join("");
    }

    if (!rows) {
        rows = "<tr><td colspan=\"5\" class=\"meta\">No products yet.</td></tr>";
    }

    return c.html(200, cmsProductsShell("Products", session.getString("csrf_token"), [
        "<div class=\"panel\"><h1 style=\"margin-top:0;\">Products</h1>",
        "<p class=\"meta\">Storefront-visible product changes should mark the build queue dirty.</p>",
        "<a class=\"button\" href=\"/cms/products/new\">New product</a>",
        "<table style=\"margin-top:24px;\"><thead><tr><th>Name</th><th>SKU</th><th>Price</th><th>Stock</th><th>Status</th></tr></thead><tbody>",
        rows,
        "</tbody></table></div>"
    ].join("")));
});

routerAdd("GET", "/cms/products/new", function(c) {
    var cookie = null;
    var sessionId = "";
    var session = null;
    var records;

    try {
        cookie = c.request.cookie("cms_session");
        sessionId = cookie ? String(cookie.value || "") : "";
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
    } catch (e) {
        session = null;
    }

    if (!session) {
        return c.redirect(302, "/cms/login");
    }

    return c.html(200, cmsProductsShell("New Product", session.getString("csrf_token"), "<div class=\"panel\"><h1 style=\"margin-top:0;\">Create product</h1><p class=\"meta\">Minimal product form route is active. Full CRUD form wiring is the next step.</p></div>"));
});
