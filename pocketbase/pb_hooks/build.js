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
