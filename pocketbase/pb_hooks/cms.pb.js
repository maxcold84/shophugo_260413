var auth = require(__hooks + "/auth.pb.js");
var utils = require(__hooks + "/utils.js");
var build = require(__hooks + "/build.pb.js");

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
        products_count: countRecords("products"),
        categories_count: countRecords("categories"),
        orders_count: countRecords("orders"),
        queue_dirty: state.getBool("queue_dirty"),
        build_running: state.getBool("build_running"),
        rerun_requested: state.getBool("rerun_requested"),
        last_changed_at: state.getString("last_changed_at"),
        last_built_at: state.getString("last_built_at")
    });
}

routerAdd("GET", "/cms", function(c) {
    return c.redirect(302, "/cms/dashboard");
});

routerAdd("GET", "/cms/dashboard", function(c) {
    var gate = auth.requireCmsAuth(c);
    if (!gate.ok) {
        return gate.response;
    }
    return c.html(200, dashboardResponse(gate.session));
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
