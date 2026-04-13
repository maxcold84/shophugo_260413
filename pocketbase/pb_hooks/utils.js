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
