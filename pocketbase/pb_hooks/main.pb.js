// Generated from pb_hooks source modules for PocketBase JSVM single-entry loading.
// Edit the source files in pb_hooks/ and regenerate this file if needed.

// BEGIN config.js
globalThis.STORE_CONFIG = {
    cms: {
        cookieName: "cms_session",
        cookiePath: "/cms",
        sessionHours: 4,
        sameSite: 2,
        secure: false
    },
    customer: {
        cookieName: "customer_session",
        cookiePath: "/",
        sameSite: 2,
        secure: false
    },
    build: {
        cronSpec: "* * * * *",
        quietWindowMs: 3000,
        staleLockMs: 300000,
        lockOwner: "pb_hooks.build",
        hugoSource: __hooks + "/../hugo-site",
        hugoDestination: __hooks + "/../pb_public",
        productsDataFile: __hooks + "/../hugo-site/data/products.json",
        categoriesDataFile: __hooks + "/../hugo-site/data/categories.json",
        generatedContentRoot: __hooks + "/../hugo-site/content/generated"
    },
    inventory: {
        lowStockThreshold: 5
    },
    site: {
        title: "Pocket Hugo Store",
        baseUrl: "https://example.com/"
    }
};
// END config.js

// BEGIN utils.js
var config = globalThis.STORE_CONFIG;

function escapeHtml(value) {
    var input = value === null || value === undefined ? "" : String(value);
    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function stripHtml(value) {
    return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
}

function slugify(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function truncateText(value, length) {
    var input = String(value || "");
    if (input.length <= length) {
        return input;
    }
    return input.slice(0, length - 1) + "…";
}

function parseInteger(value, fallback) {
    var parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
        return fallback;
    }
    return parsed;
}

function parseBoolean(value) {
    return value === true || value === "true" || value === "1" || value === "on" || value === "yes";
}

function normalizeTags(value) {
    var items;
    var i;
    var current;
    var map = {};
    var normalized = [];

    if (!value) {
        return [];
    }

    if (Object.prototype.toString.call(value) === "[object Array]") {
        items = value;
    } else if (String(value).charAt(0) === "[") {
        try {
            items = JSON.parse(String(value));
        } catch (e) {
            items = String(value).split(",");
        }
    } else {
        items = String(value).split(",");
    }

    for (i = 0; i < items.length; i += 1) {
        current = String(items[i] || "").toLowerCase().replace(/^\s+|\s+$/g, "");
        if (current && !map[current]) {
            map[current] = true;
            normalized.push(current);
        }
    }

    normalized.sort();
    return normalized;
}

function getFormValues(c, name) {
    var request = c.request();
    var values;
    if (request.formValues) {
        values = request.formValues(name);
        if (values && values.length) {
            return values;
        }
    }

    values = request.formValue(name);
    if (!values) {
        return [];
    }
    if (Object.prototype.toString.call(values) === "[object Array]") {
        return values;
    }
    return String(values).split(",");
}

function markdownToHtml(markdown) {
    var lines = String(markdown || "").replace(/\r/g, "").split("\n");
    var html = [];
    var inList = false;
    var i;
    var line;
    var escaped;

    for (i = 0; i < lines.length; i += 1) {
        line = lines[i];
        escaped = escapeHtml(line);

        if (!line.replace(/\s+/g, "")) {
            if (inList) {
                html.push("</ul>");
                inList = false;
            }
            continue;
        }

        if (/^###\s+/.test(line)) {
            if (inList) {
                html.push("</ul>");
                inList = false;
            }
            html.push("<h3>" + escapeHtml(line.replace(/^###\s+/, "")) + "</h3>");
            continue;
        }

        if (/^##\s+/.test(line)) {
            if (inList) {
                html.push("</ul>");
                inList = false;
            }
            html.push("<h2>" + escapeHtml(line.replace(/^##\s+/, "")) + "</h2>");
            continue;
        }

        if (/^#\s+/.test(line)) {
            if (inList) {
                html.push("</ul>");
                inList = false;
            }
            html.push("<h1>" + escapeHtml(line.replace(/^#\s+/, "")) + "</h1>");
            continue;
        }

        if (/^[-*]\s+/.test(line)) {
            if (!inList) {
                html.push("<ul>");
                inList = true;
            }
            html.push("<li>" + escapeHtml(line.replace(/^[-*]\s+/, "")) + "</li>");
            continue;
        }

        if (inList) {
            html.push("</ul>");
            inList = false;
        }

        escaped = escaped
            .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
            .replace(/\*([^*]+)\*/g, "<em>$1</em>");
        html.push("<p>" + escaped + "</p>");
    }

    if (inList) {
        html.push("</ul>");
    }

    return html.join("");
}

function formatMoney(minor) {
    var amount = parseInteger(minor, 0);
    var dollars = Math.floor(amount / 100);
    var cents = amount % 100;
    if (cents < 10) {
        return "$" + dollars + ".0" + cents;
    }
    return "$" + dollars + "." + cents;
}

function templateLoad(files) {
    if (files.length === 1) {
        return $template.loadFiles(files[0]);
    }
    if (files.length === 2) {
        return $template.loadFiles(files[0], files[1]);
    }
    if (files.length === 3) {
        return $template.loadFiles(files[0], files[1], files[2]);
    }
    if (files.length === 4) {
        return $template.loadFiles(files[0], files[1], files[2], files[3]);
    }
    if (files.length === 5) {
        return $template.loadFiles(files[0], files[1], files[2], files[3], files[4]);
    }
    throw new Error("Unsupported template file count: " + files.length);
}

function renderTemplate(files, data) {
    return templateLoad(files).render(data || {});
}

function renderCmsPage(viewName, data) {
    var body = renderTemplate([__hooks + "/views/cms/" + viewName], data);
    var title = escapeHtml(data.page_title || config.site.title);
    var active = String(data.active_nav || "");

    return [
        "<!doctype html>",
        "<html lang=\"en\">",
        "<head>",
        "<meta charset=\"utf-8\">",
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
        "<title>" + title + "</title>",
        "<style>",
        "body{font-family:Arial,sans-serif;background:#f6f7fb;color:#1f2937;margin:0;}",
        "a{color:#1d4ed8;text-decoration:none;}a:hover{text-decoration:underline;}",
        ".shell{display:grid;grid-template-columns:240px 1fr;min-height:100vh;}",
        ".nav{background:#111827;color:#fff;padding:24px;}.nav a{display:block;color:#cbd5e1;padding:8px 0;}.nav a.active{color:#fff;font-weight:700;}",
        ".content{padding:32px;}.panel{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;box-shadow:0 10px 30px rgba(15,23,42,.05);}",
        ".grid{display:grid;gap:16px;}.grid.two{grid-template-columns:repeat(2,minmax(0,1fr));}",
        "table{width:100%;border-collapse:collapse;}th,td{text-align:left;padding:12px;border-bottom:1px solid #e5e7eb;}",
        "input,textarea,select{width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;box-sizing:border-box;}",
        "button,.button{display:inline-block;background:#111827;color:#fff;border:none;border-radius:10px;padding:10px 16px;cursor:pointer;}",
        ".button.secondary{background:#e5e7eb;color:#111827;}",
        ".flash{padding:12px 16px;border-radius:12px;margin-bottom:16px;}.flash.error{background:#fef2f2;color:#991b1b;border:1px solid #fecaca;}.flash.success{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0;}",
        ".field{margin-bottom:16px;}.field .error{display:block;color:#b91c1c;font-size:14px;margin-top:6px;}",
        ".meta{color:#6b7280;font-size:14px;}.row-actions form{display:inline-block;margin-right:8px;}",
        "@media (max-width:900px){.shell{grid-template-columns:1fr;}.nav{display:flex;gap:16px;overflow:auto;}.grid.two{grid-template-columns:1fr;}}",
        "</style>",
        "</head>",
        "<body>",
        "<div class=\"shell\">",
        "<nav class=\"nav\">",
        "<h1 style=\"margin-top:0;font-size:20px;\">CMS</h1>",
        "<a class=\"" + (active === "dashboard" ? "active" : "") + "\" href=\"/cms/dashboard\">Dashboard</a>",
        "<a class=\"" + (active === "products" ? "active" : "") + "\" href=\"/cms/products\">Products</a>",
        "<a class=\"" + (active === "categories" ? "active" : "") + "\" href=\"/cms/categories\">Categories</a>",
        "<a class=\"" + (active === "builds" ? "active" : "") + "\" href=\"/cms/builds\">Builds</a>",
        "<form method=\"POST\" action=\"/cms/logout\" style=\"margin-top:16px;\">",
        "<input type=\"hidden\" name=\"_csrf\" value=\"" + escapeHtml(data.csrf_token || "") + "\">",
        "<button type=\"submit\" class=\"button secondary\">Logout</button>",
        "</form>",
        "</nav>",
        "<main class=\"content\">" + body + "</main>",
        "</div>",
        "</body>",
        "</html>"
    ].join("");
}

function renderView(viewPath, data) {
    return renderTemplate([viewPath], data);
}

function isHtmx(c) {
    var header = c.request().header ? c.request().header("HX-Request") : "";
    return String(header || "").toLowerCase() === "true";
}

function ensureDir(path) {
    if ($os.mkdirAll) {
        $os.mkdirAll(path, 511);
    }
}

function removeAll(path) {
    if ($os.removeAll) {
        $os.removeAll(path);
    }
}

function writeTextFile(path, content) {
    if ($os.writeTextFile) {
        $os.writeTextFile(path, String(content));
        return;
    }
    throw new Error("writeTextFile is not available in this PocketBase runtime");
}

function writeJsonFile(path, value) {
    writeTextFile(path, JSON.stringify(value, null, 2));
}

function productFileUrl(record, fileName) {
    return "/api/files/products/" + record.id + "/" + fileName;
}

function categoryFileUrl(record, fileName) {
    return "/api/files/categories/" + record.id + "/" + fileName;
}

function nowIso() {
    return new Date().toISOString();
}

globalThis.STORE_UTILS = {
    escapeHtml: escapeHtml,
    stripHtml: stripHtml,
    slugify: slugify,
    truncateText: truncateText,
    parseInteger: parseInteger,
    parseBoolean: parseBoolean,
    normalizeTags: normalizeTags,
    getFormValues: getFormValues,
    markdownToHtml: markdownToHtml,
    formatMoney: formatMoney,
    renderCmsPage: renderCmsPage,
    renderView: renderView,
    isHtmx: isHtmx,
    ensureDir: ensureDir,
    removeAll: removeAll,
    writeTextFile: writeTextFile,
    writeJsonFile: writeJsonFile,
    productFileUrl: productFileUrl,
    categoryFileUrl: categoryFileUrl,
    nowIso: nowIso
};
// END utils.js

// BEGIN auth.js
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
// END auth.js

// BEGIN build.js
var config = globalThis.STORE_CONFIG;
var utils = globalThis.STORE_UTILS;

function getBuildState() {
    var records = $app.findRecordsByFilter("build_state", "id != ''", "created asc", 1, 0);
    if (!records || !records.length) {
        throw new Error("build_state singleton missing");
    }
    return records[0];
}

function logBuild(status, triggeredBy, output, durationMs) {
    var collection = $app.findCollectionByNameOrId("build_logs");
    var record = new Record(collection);
    record.set("status", status);
    record.set("triggered_by", triggeredBy);
    record.set("output", String(output || ""));
    if (durationMs !== undefined && durationMs !== null) {
        record.set("duration_ms", durationMs);
    }
    $app.save(record);
}

function markBuildDirty(triggeredBy) {
    var state = getBuildState();
    if (state.getBool("build_running")) {
        state.set("rerun_requested", true);
    } else {
        state.set("queue_dirty", true);
    }
    state.set("last_changed_at", utils.nowIso());
    $app.save(state);
    $app.logger().info("Marked storefront build dirty", "trigger", triggeredBy);
}

function normalizeCategory(record) {
    var file = record.getString("image");
    return {
        id: record.id,
        slug: record.getString("slug"),
        name: record.getString("name"),
        description: record.getString("description") || "",
        visible: record.getBool("visible"),
        sort_order: record.getInt("sort_order"),
        meta: {
            title: record.getString("meta_title") || record.getString("name"),
            description: record.getString("meta_desc") || utils.truncateText(record.getString("description") || record.getString("name"), 155)
        },
        image: file ? {
            url: utils.categoryFileUrl(record, file),
            alt: record.getString("name")
        } : null
    };
}

function normalizeProduct(record, categoryMap) {
    var files = record.get("images") || [];
    var categoryIds = record.get("categories") || [];
    var tags = utils.normalizeTags(record.get("tags"));
    var categories = [];
    var images = [];
    var i;
    for (i = 0; i < categoryIds.length; i += 1) {
        if (categoryMap[categoryIds[i]]) {
            categories.push(categoryMap[categoryIds[i]]);
        }
    }
    for (i = 0; i < files.length; i += 1) {
        images.push({
            url: utils.productFileUrl(record, files[i]),
            alt: record.getString("name"),
            position: i
        });
    }
    return {
        id: record.id,
        sku: record.getString("sku"),
        slug: record.getString("slug"),
        name: record.getString("name"),
        price: record.getInt("price"),
        compare_price: record.getInt("compare_price"),
        stock: record.getInt("stock"),
        active: record.getBool("active"),
        visible: record.getBool("visible"),
        featured: record.getBool("featured"),
        sort_order: record.getInt("sort_order"),
        short_description: record.getString("short_description") || "",
        description_html: utils.markdownToHtml(record.getString("description_markdown") || ""),
        meta: {
            title: record.getString("meta_title") || record.getString("name"),
            description: record.getString("meta_desc") || utils.truncateText(record.getString("short_description") || record.getString("name"), 155)
        },
        images: images,
        categories: categories,
        tags: tags
    };
}

function writeGeneratedContent(section, entries) {
    var root = config.build.generatedContentRoot + "/" + section;
    var i;
    var entry;
    var content;
    utils.removeAll(root);
    utils.ensureDir(root);
    for (i = 0; i < entries.length; i += 1) {
        entry = entries[i];
        content = [
            "---",
            "title: \"" + String(entry.name || "").replace(/\"/g, "\\\"") + "\"",
            "type: \"" + section + "\"",
            "slug: \"" + entry.slug + "\"",
            "url: \"/" + section + "/" + entry.slug + "/\"",
            "---",
            ""
        ].join("\n");
        utils.writeTextFile(root + "/" + entry.slug + ".md", content);
    }
}

function exportStorefrontData() {
    var categoryRecords = $app.findRecordsByFilter("categories", "id != ''", "sort_order asc,name asc", 500, 0);
    var productRecords = $app.findRecordsByFilter("products", "id != ''", "sort_order asc,name asc", 500, 0);
    var categories = [];
    var products = [];
    var categoryMap = {};
    var i;
    var current;

    for (i = 0; i < categoryRecords.length; i += 1) {
        current = normalizeCategory(categoryRecords[i]);
        categoryMap[current.id] = {
            id: current.id,
            slug: current.slug,
            name: current.name
        };
        if (current.visible) {
            categories.push(current);
        }
    }

    for (i = 0; i < productRecords.length; i += 1) {
        current = normalizeProduct(productRecords[i], categoryMap);
        if (current.active && current.visible) {
            products.push(current);
        }
    }

    utils.ensureDir(config.build.hugoSource + "/data");
    utils.ensureDir(config.build.generatedContentRoot);
    utils.writeJsonFile(config.build.productsDataFile, products);
    utils.writeJsonFile(config.build.categoriesDataFile, categories);
    writeGeneratedContent("products", products);
    writeGeneratedContent("categories", categories);
    return {
        products: products,
        categories: categories
    };
}

function runBuild(triggeredBy) {
    var state = getBuildState();
    var startedAt = Date.now();
    var result;
    var command;
    var output;
    try {
        exportStorefrontData();
        command = $os.exec("hugo", "--source", config.build.hugoSource, "--destination", config.build.hugoDestination);
        output = String.fromCharCode.apply(null, command.output());
        result = { status: "success", output: output };
    } catch (e) {
        result = { status: "failed", output: String(e) };
        $app.logger().error("Storefront build failed", "trigger", triggeredBy, "error", String(e));
    }
    state = getBuildState();
    state.set("build_running", false);
    state.set("lock_owner", "");
    state.set("build_started_at", "");
    if (result.status === "success") {
        state.set("last_built_at", utils.nowIso());
    }
    if (state.getBool("rerun_requested")) {
        state.set("queue_dirty", true);
        state.set("rerun_requested", false);
    }
    $app.save(state);
    logBuild(result.status, triggeredBy, result.output, Date.now() - startedAt);
}

function renderBuildStatusFragment() {
    var state = getBuildState();
    var logs = $app.findRecordsByFilter("build_logs", "id != ''", "-created", 10, 0);
    var items = [];
    var i;
    for (i = 0; i < logs.length; i += 1) {
        items.push({
            status: logs[i].getString("status"),
            triggered_by: logs[i].getString("triggered_by"),
            output: logs[i].getString("output"),
            duration_ms: logs[i].getInt("duration_ms"),
            created: logs[i].created
        });
    }
    return utils.renderView(__hooks + "/views/cms/build-status.html", {
        queue_dirty: state.getBool("queue_dirty"),
        build_running: state.getBool("build_running"),
        rerun_requested: state.getBool("rerun_requested"),
        last_changed_at: state.getString("last_changed_at"),
        last_built_at: state.getString("last_built_at"),
        build_started_at: state.getString("build_started_at"),
        logs: items
    });
}

function recoverStaleLockIfNeeded() {
    var state = getBuildState();
    var startedAt;
    if (!state.getBool("build_running")) {
        return false;
    }
    startedAt = state.getDateTime("build_started_at").time().unixMilli();
    if ((Date.now() - startedAt) <= config.build.staleLockMs) {
        return false;
    }
    state.set("build_running", false);
    state.set("lock_owner", "");
    state.set("build_started_at", "");
    $app.save(state);
    logBuild("failed", "stale_lock_recovery", "Recovered stale build lock after threshold.", 0);
    return true;
}

globalThis.STORE_BUILD = {
    getBuildState: getBuildState,
    logBuild: logBuild,
    markBuildDirty: markBuildDirty,
    exportStorefrontData: exportStorefrontData,
    renderBuildStatusFragment: renderBuildStatusFragment,
    recoverStaleLockIfNeeded: recoverStaleLockIfNeeded,
    runBuild: runBuild
};
// END build.js

// BEGIN cart.js
var config = globalThis.STORE_CONFIG;
var utils = globalThis.STORE_UTILS;

function resolveCustomerId(c) {
    var cookie = c.request().cookie(config.customer.cookieName);
    return cookie ? String(cookie.value() || "") : "";
}

function loadProduct(productId) {
    return $app.findRecordById("products", productId);
}

function validatePurchasable(product, qty) {
    if (!product.getBool("active") || !product.getBool("visible")) {
        return "This product is no longer available.";
    }
    if (qty < 1) {
        return "Quantity must be at least 1.";
    }
    if (product.getInt("stock") < qty) {
        return "Only " + product.getInt("stock") + " in stock.";
    }
    return "";
}

function normalizeLine(product, qty) {
    return {
        product_id: product.id,
        slug: product.getString("slug"),
        sku: product.getString("sku"),
        name: product.getString("name"),
        qty: qty,
        unit_price: product.getInt("price"),
        line_total: product.getInt("price") * qty,
        line_total_label: utils.formatMoney(product.getInt("price") * qty),
        stock_state: product.getInt("stock") <= 0 ? "out_of_stock" : (product.getInt("stock") <= config.inventory.lowStockThreshold ? "low_stock" : "available"),
        short_description: product.getString("short_description")
    };
}

function getGuestIntent(c) {
    var productIds = utils.getFormValues(c, "product_id");
    var qtys = utils.getFormValues(c, "qty");
    var lines = [];
    var i;
    for (i = 0; i < productIds.length; i += 1) {
        lines.push({
            product_id: productIds[i],
            qty: utils.parseInteger(qtys[i], 1)
        });
    }
    return lines;
}

function loadAuthenticatedCart(customerId) {
    var rows;
    var normalized = [];
    var i;
    var product;
    if (!customerId) {
        return normalized;
    }
    rows = $app.findRecordsByFilter("carts", "user = {:user}", "created asc", 200, 0, { user: customerId });
    for (i = 0; i < rows.length; i += 1) {
        product = loadProduct(rows[i].getString("product"));
        if (product) {
            normalized.push(normalizeLine(product, rows[i].getInt("qty")));
        }
    }
    return normalized;
}

function syncAuthenticatedCart(customerId, intentLines) {
    var collection = $app.findCollectionByNameOrId("carts");
    var i;
    var line;
    var product;
    var existing;
    var qty;
    if (!customerId) {
        return [];
    }
    for (i = 0; i < intentLines.length; i += 1) {
        line = intentLines[i];
        product = loadProduct(line.product_id);
        if (!product) {
            continue;
        }
        qty = line.qty;
        if (qty > product.getInt("stock")) {
            qty = product.getInt("stock");
        }
        if (qty < 1 || !product.getBool("active") || !product.getBool("visible")) {
            continue;
        }
        existing = $app.findRecordsByFilter("carts", "user = {:user} && product = {:product}", "-created", 1, 0, {
            user: customerId,
            product: product.id
        });
        if (existing && existing.length) {
            existing[0].set("qty", qty);
            $app.save(existing[0]);
        } else {
            existing = new Record(collection);
            existing.set("user", customerId);
            existing.set("product", product.id);
            existing.set("qty", qty);
            $app.save(existing);
        }
    }
    return loadAuthenticatedCart(customerId);
}

function normalizeGuestLines(intentLines) {
    var normalized = [];
    var warnings = [];
    var i;
    var line;
    var product;
    var qty;
    var message;
    for (i = 0; i < intentLines.length; i += 1) {
        line = intentLines[i];
        try {
            product = loadProduct(line.product_id);
        } catch (e) {
            warnings.push("A product in your cart no longer exists.");
            continue;
        }
        qty = line.qty;
        if (qty > product.getInt("stock")) {
            warnings.push(product.getString("name") + " was clamped to available stock.");
            qty = product.getInt("stock");
        }
        message = validatePurchasable(product, qty);
        if (message) {
            warnings.push(product.getString("name") + ": " + message);
            continue;
        }
        normalized.push(normalizeLine(product, qty));
    }
    return {
        lines: normalized,
        warnings: warnings
    };
}

function summarizeCart(lines) {
    var count = 0;
    var subtotal = 0;
    var i;
    for (i = 0; i < lines.length; i += 1) {
        count += lines[i].qty;
        subtotal += lines[i].line_total;
    }
    return {
        count: count,
        subtotal: subtotal,
        subtotal_label: utils.formatMoney(subtotal)
    };
}

function renderMiniCart(lines) {
    var summary = summarizeCart(lines);
    return utils.renderView(__hooks + "/views/hda/cart-mini.html", {
        count: summary.count,
        subtotal_label: summary.subtotal_label,
        is_empty: summary.count === 0
    });
}

function renderCartLines(lines, warnings) {
    var summary = summarizeCart(lines);
    return utils.renderView(__hooks + "/views/hda/cart-lines.html", {
        lines: lines,
        warnings: warnings || [],
        is_empty: lines.length === 0,
        subtotal_label: summary.subtotal_label
    });
}

function currentCart(c) {
    var customerId = resolveCustomerId(c);
    if (customerId) {
        return { lines: loadAuthenticatedCart(customerId), warnings: [] };
    }
    return normalizeGuestLines(getGuestIntent(c));
}

globalThis.STORE_CART = {
    resolveCustomerId: resolveCustomerId,
    getGuestIntent: getGuestIntent,
    syncAuthenticatedCart: syncAuthenticatedCart,
    loadAuthenticatedCart: loadAuthenticatedCart,
    normalizeGuestLines: normalizeGuestLines,
    summarizeCart: summarizeCart,
    renderMiniCart: renderMiniCart,
    renderCartLines: renderCartLines,
    currentCart: currentCart
};
// END cart.js

// BEGIN routes_auth.js
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

// END routes_auth.js

// BEGIN routes_build.js
var build = globalThis.STORE_BUILD;
var config = globalThis.STORE_CONFIG;
var utils = globalThis.STORE_UTILS;

cronAdd("storefront_build_tick", config.build.cronSpec, function() {
    var state;
    var lastChangedAt;

    build.recoverStaleLockIfNeeded();
    state = build.getBuildState();
    if (state.getBool("build_running") || !state.getBool("queue_dirty")) {
        return;
    }

    lastChangedAt = state.getDateTime("last_changed_at").time().unixMilli();
    if ((Date.now() - lastChangedAt) < config.build.quietWindowMs) {
        return;
    }

    state.set("build_running", true);
    state.set("queue_dirty", false);
    state.set("rerun_requested", false);
    state.set("build_started_at", utils.nowIso());
    state.set("lock_owner", config.build.lockOwner);
    $app.save(state);
    build.runBuild("cron");
});

// END routes_build.js

// BEGIN routes_cms.js
var auth = globalThis.STORE_AUTH;
var utils = globalThis.STORE_UTILS;
var build = globalThis.STORE_BUILD;

function countRecords(collectionName) {
    try {
        return $app.findRecordsByFilter(collectionName, "id != ''", "", 500, 0).length;
    } catch (e) {
        return 0;
    }
}

function dashboardResponse(session) {
    var state = build.getBuildState();
    return utils.renderCmsPage("dashboard.html", {
        page_title: "CMS Dashboard",
        active_nav: "dashboard",
        csrf_token: session.getString("csrf_token"),
        products_count: STORE_CMS.countRecords("products"),
        categories_count: STORE_CMS.countRecords("categories"),
        orders_count: STORE_CMS.countRecords("orders"),
        queue_dirty: state.getBool("queue_dirty"),
        build_running: state.getBool("build_running"),
        rerun_requested: state.getBool("rerun_requested"),
        last_changed_at: state.getString("last_changed_at"),
        last_built_at: state.getString("last_built_at")
    });
}

STORE_CMS = {
    countRecords: countRecords,
    dashboardResponse: dashboardResponse
};

function registerCmsRoutes() {
    routerAdd("GET", "/cms", function(c) {
        return c.redirect(302, "/cms/dashboard");
    });

    routerAdd("GET", "/cms/dashboard", function(c) {
        var gate = auth.requireCmsAuth(c);
        if (!gate.ok) {
            return gate.response;
        }
        return c.html(200, STORE_CMS.dashboardResponse(gate.session));
    });

    routerAdd("GET", "/cms/builds", function(c) {
        var gate = auth.requireCmsAuth(c);
        if (!gate.ok) {
            return gate.response;
        }
        return c.html(200, utils.renderCmsPage("builds.html", {
            page_title: "Build Status",
            active_nav: "builds",
            csrf_token: gate.session.getString("csrf_token"),
            build_status_html: build.renderBuildStatusFragment()
        }));
    });

    routerAdd("GET", "/cms/fragments/build-status", function(c) {
        var gate = auth.requireCmsAuth(c);
        if (!gate.ok) {
            return gate.response;
        }
        return c.html(200, build.renderBuildStatusFragment());
    });
}

registerCmsRoutes();

// END routes_cms.js

// BEGIN routes_products.js
var auth = globalThis.STORE_AUTH;
var build = globalThis.STORE_BUILD;
var utils = globalThis.STORE_UTILS;

function findCategories() {
    return $app.findRecordsByFilter("categories", "id != ''", "sort_order asc,name asc", 500, 0);
}

function loadProduct(id) {
    return $app.findRecordById("products", id);
}

function selectedCategoryMap(values) {
    var i;
    var map = {};
    for (i = 0; i < values.length; i += 1) {
        map[values[i]] = true;
    }
    return map;
}

function serializeProduct(record) {
    return {
        id: record.id,
        sku: record.getString("sku"),
        name: record.getString("name"),
        slug: record.getString("slug"),
        price: record.getInt("price"),
        compare_price: record.getInt("compare_price"),
        stock: record.getInt("stock"),
        description_markdown: record.getString("description_markdown"),
        short_description: record.getString("short_description"),
        categories: record.get("categories") || [],
        tags: (record.get("tags") || []).join(", "),
        active: record.getBool("active"),
        featured: record.getBool("featured"),
        visible: record.getBool("visible"),
        meta_title: record.getString("meta_title"),
        meta_desc: record.getString("meta_desc"),
        sort_order: record.getInt("sort_order")
    };
}

function listProductsPage(session) {
    var records = $app.findRecordsByFilter("products", "id != ''", "sort_order asc,name asc", 500, 0);
    var rows = [];
    var i;
    for (i = 0; i < records.length; i += 1) {
        rows.push({
            id: records[i].id,
            sku: records[i].getString("sku"),
            name: records[i].getString("name"),
            slug: records[i].getString("slug"),
            price_label: utils.formatMoney(records[i].getInt("price")),
            stock: records[i].getInt("stock"),
            active: records[i].getBool("active"),
            visible: records[i].getBool("visible")
        });
    }
    return utils.renderCmsPage("products-list.html", {
        page_title: "Products",
        active_nav: "products",
        csrf_token: session.getString("csrf_token"),
        products: rows
    });
}

function productFormPage(session, values, errors, mode) {
    var categories = findCategories();
    var options = [];
    var i;
    var selected = selectedCategoryMap(values.categories || []);
    for (i = 0; i < categories.length; i += 1) {
        options.push({
            id: categories[i].id,
            name: categories[i].getString("name"),
            checked: !!selected[categories[i].id]
        });
    }
    return utils.renderCmsPage("product-form.html", {
        page_title: mode === "edit" ? "Edit Product" : "New Product",
        active_nav: "products",
        csrf_token: session.getString("csrf_token"),
        values: values,
        errors: errors || {},
        categories: options,
        form_action: mode === "edit" ? ("/cms/products/" + values.id) : "/cms/products",
        submit_label: mode === "edit" ? "Update product" : "Create product",
        form_heading: mode === "edit" ? "Edit product" : "Create product"
    });
}

function validateProductInput(values, productId) {
    var errors = {};
    var skuMatches;
    var slugMatches;
    if (!values.sku) {
        errors.sku = "SKU is required.";
    }
    if (!values.name) {
        errors.name = "Name is required.";
    }
    if (!values.slug) {
        errors.slug = "Slug is required.";
    }
    if (values.price < 0) {
        errors.price = "Price must be zero or greater.";
    }
    if (values.stock < 0) {
        errors.stock = "Stock must be zero or greater.";
    }
    skuMatches = $app.findRecordsByFilter("products", "sku = {:sku}", "-created", 10, 0, { sku: values.sku });
    if (skuMatches && skuMatches.length && skuMatches[0].id !== productId) {
        errors.sku = "SKU must be unique.";
    }
    slugMatches = $app.findRecordsByFilter("products", "slug = {:slug}", "-created", 10, 0, { slug: values.slug });
    if (slugMatches && slugMatches.length && slugMatches[0].id !== productId) {
        errors.slug = "Slug must be unique.";
    }
    return errors;
}

function extractProductValues(c, existing) {
    return {
        id: existing ? existing.id : "",
        sku: String(c.request().formValue("sku") || (existing ? existing.getString("sku") : "")).replace(/^\s+|\s+$/g, ""),
        name: String(c.request().formValue("name") || (existing ? existing.getString("name") : "")).replace(/^\s+|\s+$/g, ""),
        slug: String(c.request().formValue("slug") || "").replace(/^\s+|\s+$/g, "") || utils.slugify(c.request().formValue("name") || ""),
        price: utils.parseInteger(c.request().formValue("price"), 0),
        compare_price: utils.parseInteger(c.request().formValue("compare_price"), 0),
        stock: utils.parseInteger(c.request().formValue("stock"), 0),
        description_markdown: String(c.request().formValue("description_markdown") || ""),
        short_description: String(c.request().formValue("short_description") || ""),
        categories: utils.getFormValues(c, "categories"),
        tags: utils.normalizeTags(c.request().formValue("tags")),
        active: utils.parseBoolean(c.request().formValue("active")),
        featured: utils.parseBoolean(c.request().formValue("featured")),
        visible: utils.parseBoolean(c.request().formValue("visible")),
        meta_title: String(c.request().formValue("meta_title") || ""),
        meta_desc: String(c.request().formValue("meta_desc") || ""),
        sort_order: utils.parseInteger(c.request().formValue("sort_order"), 0)
    };
}

function persistProduct(record, values, c) {
    var images = c.request().formFiles ? c.request().formFiles("images") : [];
    record.set("sku", values.sku);
    record.set("name", values.name);
    record.set("slug", values.slug);
    record.set("price", values.price);
    record.set("compare_price", values.compare_price || 0);
    record.set("stock", values.stock);
    record.set("description_markdown", values.description_markdown);
    record.set("short_description", values.short_description);
    record.set("categories", values.categories);
    record.set("tags", values.tags);
    record.set("active", values.active);
    record.set("featured", values.featured);
    record.set("visible", values.visible);
    record.set("meta_title", values.meta_title);
    record.set("meta_desc", values.meta_desc);
    record.set("sort_order", values.sort_order);
    if (images && images.length) {
        record.set("images", images);
    }
    $app.save(record);
}

STORE_PRODUCTS = {
    findCategories: findCategories,
    loadProduct: loadProduct,
    serializeProduct: serializeProduct,
    listProductsPage: listProductsPage,
    productFormPage: productFormPage,
    validateProductInput: validateProductInput,
    extractProductValues: extractProductValues,
    persistProduct: persistProduct
};

function registerProductRoutes() {
    routerAdd("GET", "/cms/products", function(c) {
        var gate = auth.requireCmsAuth(c);
        if (!gate.ok) {
            return gate.response;
        }
        return c.html(200, STORE_PRODUCTS.listProductsPage(gate.session));
    });

    routerAdd("GET", "/cms/products/new", function(c) {
        var gate = auth.requireCmsAuth(c);
        if (!gate.ok) {
            return gate.response;
        }
        return c.html(200, STORE_PRODUCTS.productFormPage(gate.session, {
            id: "",
            sku: "",
            name: "",
            slug: "",
            price: 0,
            compare_price: 0,
            stock: 0,
            description_markdown: "",
            short_description: "",
            categories: [],
            tags: "",
            active: true,
            featured: false,
            visible: true,
            meta_title: "",
            meta_desc: "",
            sort_order: 0
        }, {}, "new"));
    });

    routerAdd("POST", "/cms/products", function(c) {
        var gate = auth.requireCmsAuth(c);
        var collection;
        var record;
        var values;
        var errors;
        if (!gate.ok) {
            return gate.response;
        }
        if (!auth.validateCsrf(c, gate.session)) {
            return auth.rejectCsrf(c);
        }
        values = STORE_PRODUCTS.extractProductValues(c, null);
        errors = STORE_PRODUCTS.validateProductInput(values, "");
        if (Object.keys(errors).length) {
            return c.html(422, STORE_PRODUCTS.productFormPage(gate.session, values, errors, "new"));
        }
        collection = $app.findCollectionByNameOrId("products");
        record = new Record(collection);
        STORE_PRODUCTS.persistProduct(record, values, c);
        build.markBuildDirty("cms_product_create");
        return c.redirect(302, "/cms/products");
    });

    routerAdd("GET", "/cms/products/:id/edit", function(c) {
        var gate = auth.requireCmsAuth(c);
        var record;
        if (!gate.ok) {
            return gate.response;
        }
        record = STORE_PRODUCTS.loadProduct(c.pathParam("id"));
        return c.html(200, STORE_PRODUCTS.productFormPage(gate.session, STORE_PRODUCTS.serializeProduct(record), {}, "edit"));
    });

    routerAdd("POST", "/cms/products/:id", function(c) {
        var gate = auth.requireCmsAuth(c);
        var record;
        var values;
        var errors;
        if (!gate.ok) {
            return gate.response;
        }
        if (!auth.validateCsrf(c, gate.session)) {
            return auth.rejectCsrf(c);
        }
        record = STORE_PRODUCTS.loadProduct(c.pathParam("id"));
        values = STORE_PRODUCTS.extractProductValues(c, record);
        errors = STORE_PRODUCTS.validateProductInput(values, record.id);
        if (Object.keys(errors).length) {
            return c.html(422, STORE_PRODUCTS.productFormPage(gate.session, values, errors, "edit"));
        }
        STORE_PRODUCTS.persistProduct(record, values, c);
        build.markBuildDirty("cms_product_update");
        return c.redirect(302, "/cms/products");
    });

    routerAdd("POST", "/cms/products/:id/delete", function(c) {
        var gate = auth.requireCmsAuth(c);
        var record;
        if (!gate.ok) {
            return gate.response;
        }
        if (!auth.validateCsrf(c, gate.session)) {
            return auth.rejectCsrf(c);
        }
        record = STORE_PRODUCTS.loadProduct(c.pathParam("id"));
        $app.delete(record);
        build.markBuildDirty("cms_product_delete");
        return c.redirect(302, "/cms/products");
    });
}

registerProductRoutes();

// END routes_products.js

// BEGIN routes_categories.js
var auth = globalThis.STORE_AUTH;
var build = globalThis.STORE_BUILD;
var utils = globalThis.STORE_UTILS;

function loadCategory(id) {
    return $app.findRecordById("categories", id);
}

function serializeCategory(record) {
    return {
        id: record.id,
        name: record.getString("name"),
        slug: record.getString("slug"),
        description: record.getString("description"),
        visible: record.getBool("visible"),
        sort_order: record.getInt("sort_order"),
        meta_title: record.getString("meta_title"),
        meta_desc: record.getString("meta_desc")
    };
}

function categoryListPage(session) {
    var records = $app.findRecordsByFilter("categories", "id != ''", "sort_order asc,name asc", 500, 0);
    var rows = [];
    var i;
    for (i = 0; i < records.length; i += 1) {
        rows.push({
            id: records[i].id,
            name: records[i].getString("name"),
            slug: records[i].getString("slug"),
            visible: records[i].getBool("visible")
        });
    }
    return utils.renderCmsPage("categories-list.html", {
        page_title: "Categories",
        active_nav: "categories",
        csrf_token: session.getString("csrf_token"),
        categories: rows
    });
}

function categoryFormPage(session, values, errors, mode) {
    return utils.renderCmsPage("category-form.html", {
        page_title: mode === "edit" ? "Edit Category" : "New Category",
        active_nav: "categories",
        csrf_token: session.getString("csrf_token"),
        values: values,
        errors: errors || {},
        form_action: mode === "edit" ? ("/cms/categories/" + values.id) : "/cms/categories",
        submit_label: mode === "edit" ? "Update category" : "Create category",
        form_heading: mode === "edit" ? "Edit category" : "Create category"
    });
}

function extractCategoryValues(c, existing) {
    return {
        id: existing ? existing.id : "",
        name: String(c.request().formValue("name") || (existing ? existing.getString("name") : "")).replace(/^\s+|\s+$/g, ""),
        slug: String(c.request().formValue("slug") || "").replace(/^\s+|\s+$/g, "") || utils.slugify(c.request().formValue("name") || ""),
        description: String(c.request().formValue("description") || ""),
        visible: utils.parseBoolean(c.request().formValue("visible")),
        sort_order: utils.parseInteger(c.request().formValue("sort_order"), 0),
        meta_title: String(c.request().formValue("meta_title") || ""),
        meta_desc: String(c.request().formValue("meta_desc") || "")
    };
}

function validateCategoryInput(values, categoryId) {
    var errors = {};
    var matches;
    if (!values.name) {
        errors.name = "Name is required.";
    }
    if (!values.slug) {
        errors.slug = "Slug is required.";
    }
    matches = $app.findRecordsByFilter("categories", "slug = {:slug}", "-created", 10, 0, { slug: values.slug });
    if (matches && matches.length && matches[0].id !== categoryId) {
        errors.slug = "Slug must be unique.";
    }
    return errors;
}

function persistCategory(record, values, c) {
    var image = c.request().formFiles ? c.request().formFiles("image") : [];
    record.set("name", values.name);
    record.set("slug", values.slug);
    record.set("description", values.description);
    record.set("visible", values.visible);
    record.set("sort_order", values.sort_order);
    record.set("meta_title", values.meta_title);
    record.set("meta_desc", values.meta_desc);
    if (image && image.length) {
        record.set("image", image[0]);
    }
    $app.save(record);
}

STORE_CATEGORIES = {
    loadCategory: loadCategory,
    serializeCategory: serializeCategory,
    categoryListPage: categoryListPage,
    categoryFormPage: categoryFormPage,
    extractCategoryValues: extractCategoryValues,
    validateCategoryInput: validateCategoryInput,
    persistCategory: persistCategory
};

function registerCategoryRoutes() {
    routerAdd("GET", "/cms/categories", function(c) {
        var gate = auth.requireCmsAuth(c);
        if (!gate.ok) {
            return gate.response;
        }
        return c.html(200, STORE_CATEGORIES.categoryListPage(gate.session));
    });

    routerAdd("GET", "/cms/categories/new", function(c) {
        var gate = auth.requireCmsAuth(c);
        if (!gate.ok) {
            return gate.response;
        }
        return c.html(200, STORE_CATEGORIES.categoryFormPage(gate.session, {
            id: "",
            name: "",
            slug: "",
            description: "",
            visible: true,
            sort_order: 0,
            meta_title: "",
            meta_desc: ""
        }, {}, "new"));
    });

    routerAdd("POST", "/cms/categories", function(c) {
        var gate = auth.requireCmsAuth(c);
        var collection;
        var record;
        var values;
        var errors;
        if (!gate.ok) {
            return gate.response;
        }
        if (!auth.validateCsrf(c, gate.session)) {
            return auth.rejectCsrf(c);
        }
        values = STORE_CATEGORIES.extractCategoryValues(c, null);
        errors = STORE_CATEGORIES.validateCategoryInput(values, "");
        if (Object.keys(errors).length) {
            return c.html(422, STORE_CATEGORIES.categoryFormPage(gate.session, values, errors, "new"));
        }
        collection = $app.findCollectionByNameOrId("categories");
        record = new Record(collection);
        STORE_CATEGORIES.persistCategory(record, values, c);
        build.markBuildDirty("cms_category_create");
        return c.redirect(302, "/cms/categories");
    });

    routerAdd("GET", "/cms/categories/:id/edit", function(c) {
        var gate = auth.requireCmsAuth(c);
        if (!gate.ok) {
            return gate.response;
        }
        return c.html(200, STORE_CATEGORIES.categoryFormPage(gate.session, STORE_CATEGORIES.serializeCategory(STORE_CATEGORIES.loadCategory(c.pathParam("id"))), {}, "edit"));
    });

    routerAdd("POST", "/cms/categories/:id", function(c) {
        var gate = auth.requireCmsAuth(c);
        var record;
        var values;
        var errors;
        if (!gate.ok) {
            return gate.response;
        }
        if (!auth.validateCsrf(c, gate.session)) {
            return auth.rejectCsrf(c);
        }
        record = STORE_CATEGORIES.loadCategory(c.pathParam("id"));
        values = STORE_CATEGORIES.extractCategoryValues(c, record);
        errors = STORE_CATEGORIES.validateCategoryInput(values, record.id);
        if (Object.keys(errors).length) {
            return c.html(422, STORE_CATEGORIES.categoryFormPage(gate.session, values, errors, "edit"));
        }
        STORE_CATEGORIES.persistCategory(record, values, c);
        build.markBuildDirty("cms_category_update");
        return c.redirect(302, "/cms/categories");
    });

    routerAdd("POST", "/cms/categories/:id/delete", function(c) {
        var gate = auth.requireCmsAuth(c);
        var record;
        if (!gate.ok) {
            return gate.response;
        }
        if (!auth.validateCsrf(c, gate.session)) {
            return auth.rejectCsrf(c);
        }
        record = STORE_CATEGORIES.loadCategory(c.pathParam("id"));
        $app.delete(record);
        build.markBuildDirty("cms_category_delete");
        return c.redirect(302, "/cms/categories");
    });
}

registerCategoryRoutes();

// END routes_categories.js

// BEGIN routes_cart.js
var cart = globalThis.STORE_CART;
var utils = globalThis.STORE_UTILS;

function registerCartRoutes() {
    routerAdd("GET", "/fragments/cart/mini", function(c) {
        var current = cart.currentCart(c);
        return c.html(200, cart.renderMiniCart(current.lines));
    });

    routerAdd("GET", "/fragments/cart/lines", function(c) {
        var current = cart.currentCart(c);
        return c.html(200, cart.renderCartLines(current.lines, current.warnings));
    });

    routerAdd("POST", "/actions/cart/sync-guest", function(c) {
        var customerId = cart.resolveCustomerId(c);
        var intent = cart.getGuestIntent(c);
        var current;

        if (customerId) {
            current = { lines: cart.syncAuthenticatedCart(customerId, intent), warnings: [] };
        } else {
            current = cart.normalizeGuestLines(intent);
        }

        return c.html(200, cart.renderCartLines(current.lines, current.warnings));
    });

    routerAdd("POST", "/actions/cart/add", function(c) {
        var current = cart.normalizeGuestLines([{
            product_id: String(c.request().formValue("product_id") || ""),
            qty: utils.parseInteger(c.request().formValue("qty"), 1)
        }]);
        return c.html(200, cart.renderMiniCart(current.lines));
    });

    routerAdd("POST", "/actions/cart/update", function(c) {
        var current = cart.currentCart(c);
        return c.html(200, cart.renderCartLines(current.lines, current.warnings));
    });

    routerAdd("POST", "/actions/cart/remove", function(c) {
        return c.html(200, cart.renderCartLines([], []));
    });
}

registerCartRoutes();

// END routes_cart.js

// BEGIN routes_checkout.js
var cart = globalThis.STORE_CART;
var utils = globalThis.STORE_UTILS;

function validateAddress(c) {
    var address = {
        recipient_name: String(c.request().formValue("recipient_name") || "").replace(/^\s+|\s+$/g, ""),
        phone: String(c.request().formValue("phone") || "").replace(/^\s+|\s+$/g, ""),
        country_code: String(c.request().formValue("country_code") || "").replace(/^\s+|\s+$/g, ""),
        postal_code: String(c.request().formValue("postal_code") || "").replace(/^\s+|\s+$/g, ""),
        state_region: String(c.request().formValue("state_region") || "").replace(/^\s+|\s+$/g, ""),
        city: String(c.request().formValue("city") || "").replace(/^\s+|\s+$/g, ""),
        address_line1: String(c.request().formValue("address_line1") || "").replace(/^\s+|\s+$/g, ""),
        address_line2: String(c.request().formValue("address_line2") || "").replace(/^\s+|\s+$/g, "")
    };
    var errors = [];
    if (!address.recipient_name) { errors.push("Recipient name is required."); }
    if (!address.phone) { errors.push("Phone is required."); }
    if (!address.country_code) { errors.push("Country code is required."); }
    if (!address.postal_code) { errors.push("Postal code is required."); }
    if (!address.city) { errors.push("City is required."); }
    if (!address.address_line1) { errors.push("Address line 1 is required."); }
    return { errors: errors, address: address };
}

function computeTotals(lines) {
    var subtotal = 0;
    var i;
    for (i = 0; i < lines.length; i += 1) {
        subtotal += lines[i].line_total;
    }
    return { subtotal: subtotal, discount: 0, shipping: 0, tax: 0, total: subtotal };
}

function buildItemsSnapshot(lines) {
    var items = [];
    var i;
    for (i = 0; i < lines.length; i += 1) {
        items.push({
            product_id: lines[i].product_id,
            sku: lines[i].sku,
            name: lines[i].name,
            slug: lines[i].slug,
            unit_price: lines[i].unit_price,
            quantity: lines[i].qty,
            line_subtotal: lines[i].line_total
        });
    }
    return items;
}

function renderCheckoutSummary(lines, warnings, errors, success) {
    var totals = computeTotals(lines);
    return utils.renderView(__hooks + "/views/hda/checkout-summary.html", {
        lines: lines,
        warnings: warnings || [],
        errors: errors || [],
        success: success || "",
        subtotal_label: utils.formatMoney(totals.subtotal),
        discount_label: utils.formatMoney(totals.discount),
        shipping_label: utils.formatMoney(totals.shipping),
        tax_label: utils.formatMoney(totals.tax),
        total_label: utils.formatMoney(totals.total),
        is_empty: lines.length === 0
    });
}

function requestLines(c) {
    var ids = utils.getFormValues(c, "product_id");
    var qtys = utils.getFormValues(c, "qty");
    var items = [];
    var i;
    for (i = 0; i < ids.length; i += 1) {
        items.push({ product_id: ids[i], qty: utils.parseInteger(qtys[i], 1) });
    }
    return items;
}

function decrementStock(line) {
    var product = $app.findRecordById("products", line.product_id);
    var currentStock = product.getInt("stock");
    if (currentStock < line.qty) {
        throw new Error("Insufficient stock for " + line.name);
    }
    product.set("stock", currentStock - line.qty);
    $app.save(product);
}

STORE_CHECKOUT = {
    validateAddress: validateAddress,
    computeTotals: computeTotals,
    buildItemsSnapshot: buildItemsSnapshot,
    renderCheckoutSummary: renderCheckoutSummary,
    requestLines: requestLines,
    decrementStock: decrementStock
};

function registerCheckoutRoutes() {
    routerAdd("GET", "/fragments/cart/checkout-summary", function(c) {
        return c.html(200, renderCheckoutSummary([], [], [], ""));
    });

    routerAdd("POST", "/actions/checkout/prepare", function(c) {
        var customerId = cart.resolveCustomerId(c);
        var normalized = customerId ? { lines: cart.loadAuthenticatedCart(customerId), warnings: [] } : cart.normalizeGuestLines(requestLines(c));
        if (!normalized.lines.length) {
            return c.html(409, renderCheckoutSummary([], normalized.warnings, ["Your cart is empty or invalid."], ""));
        }
        return c.html(200, renderCheckoutSummary(normalized.lines, normalized.warnings, [], ""));
    });

    routerAdd("POST", "/actions/checkout/submit", function(c) {
        var customerId = cart.resolveCustomerId(c);
        var normalized = customerId ? { lines: cart.loadAuthenticatedCart(customerId), warnings: [] } : cart.normalizeGuestLines(requestLines(c));
        var addressResult;
        var totals;
        var orders;
        var order;
        var email = String(c.request().formValue("email") || "").replace(/^\s+|\s+$/g, "");
        var i;
        if (!normalized.lines.length) {
            return c.html(409, renderCheckoutSummary([], normalized.warnings, ["Your cart can no longer be checked out."], ""));
        }
        addressResult = validateAddress(c);
        if (addressResult.errors.length) {
            return c.html(422, renderCheckoutSummary(normalized.lines, normalized.warnings, addressResult.errors, ""));
        }
        totals = computeTotals(normalized.lines);
        orders = $app.findCollectionByNameOrId("orders");
        order = new Record(orders);
        order.set("user", customerId || "");
        order.set("email", email || "");
        order.set("status", "pending");
        order.set("items", buildItemsSnapshot(normalized.lines));
        order.set("subtotal_amount", totals.subtotal);
        order.set("discount_amount", totals.discount);
        order.set("shipping_amount", totals.shipping);
        order.set("tax_amount", totals.tax);
        order.set("total_amount", totals.total);
        order.set("address", addressResult.address);
        $app.save(order);
        try {
            for (i = 0; i < normalized.lines.length; i += 1) {
                decrementStock(normalized.lines[i]);
            }
        } catch (e) {
            order.set("status", "failed");
            $app.save(order);
            $app.logger().warn("Checkout stock failure", "order_id", order.id, "error", String(e));
            return c.html(409, renderCheckoutSummary(normalized.lines, normalized.warnings, [String(e)], ""));
        }
        $app.logger().info("Checkout success", "order_id", order.id, "total_amount", totals.total);
        return c.html(200, renderCheckoutSummary([], [], [], "Order " + order.id + " was created successfully."));
    });
}

registerCheckoutRoutes();

// END routes_checkout.js

// BEGIN routes_stock.js
var config = globalThis.STORE_CONFIG;
var utils = globalThis.STORE_UTILS;

function stockState(product) {
    if (!product.getBool("active") || !product.getBool("visible")) {
        return "unavailable";
    }
    if (product.getInt("stock") <= 0) {
        return "out_of_stock";
    }
    if (product.getInt("stock") <= config.inventory.lowStockThreshold) {
        return "low_stock";
    }
    return "available";
}

STORE_STOCK = {
    stockState: stockState
};

function registerStockRoutes() {
    routerAdd("GET", "/fragments/products/stock-badge", function(c) {
        var sku = String(c.request().queryParam("sku") || "");
        var matches = $app.findRecordsByFilter("products", "sku = {:sku}", "-created", 1, 0, { sku: sku });
        var product;
        if (!matches || !matches.length) {
            return c.html(404, "<span class=\"rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700\">Unavailable</span>");
        }
        product = matches[0];
        return c.html(200, utils.renderView(__hooks + "/views/hda/stock-badge.html", {
            state: stockState(product),
            stock: product.getInt("stock")
        }));
    });

    routerAdd("GET", "/fragments/products/listing", function(c) {
        var records = $app.findRecordsByFilter("products", "id != ''", "sort_order asc,name asc", 500, 0);
        var items = [];
        var i;
        for (i = 0; i < records.length; i += 1) {
            if (!records[i].getBool("active") || !records[i].getBool("visible")) {
                continue;
            }
            items.push({
                name: records[i].getString("name"),
                slug: records[i].getString("slug"),
                short_description: records[i].getString("short_description"),
                price_label: utils.formatMoney(records[i].getInt("price"))
            });
        }
        return c.html(200, utils.renderView(__hooks + "/views/hda/product-listing.html", {
            products: items,
            is_empty: items.length === 0
        }));
    });
}

registerStockRoutes();

// END routes_stock.js

