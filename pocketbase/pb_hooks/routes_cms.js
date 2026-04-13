require(__hooks + "/auth.js");
require(__hooks + "/utils.js");
require(__hooks + "/build.js");

function countRecords(collectionName) {
    try {
        return $app.findRecordsByFilter(collectionName, "id != ''", "", 500, 0).length;
    } catch (e) {
        return 0;
    }
}

function dashboardResponse(session) {
    var state = globalThis.STORE_BUILD.getBuildState();
    return globalThis.STORE_UTILS.renderCmsPage("dashboard.html", {
        page_title: "CMS Dashboard",
        active_nav: "dashboard",
        csrf_token: session.getString("csrf_token"),
        products_count: globalThis.STORE_CMS.countRecords("products"),
        categories_count: globalThis.STORE_CMS.countRecords("categories"),
        orders_count: globalThis.STORE_CMS.countRecords("orders"),
        queue_dirty: state.getBool("queue_dirty"),
        build_running: state.getBool("build_running"),
        rerun_requested: state.getBool("rerun_requested"),
        last_changed_at: state.getString("last_changed_at"),
        last_built_at: state.getString("last_built_at")
    });
}

globalThis.STORE_CMS = {
    countRecords: countRecords,
    dashboardResponse: dashboardResponse
};

function registerCmsRoutes() {
    routerAdd("GET", "/cms", function(c) {
        return c.redirect(302, "/cms/dashboard");
    });

    routerAdd("GET", "/cms/dashboard", function(c) {
        var gate = globalThis.STORE_AUTH.requireCmsAuth(c);
        if (!gate.ok) {
            return gate.response;
        }
        return c.html(200, globalThis.STORE_CMS.dashboardResponse(gate.session));
    });

    routerAdd("GET", "/cms/builds", function(c) {
        var gate = globalThis.STORE_AUTH.requireCmsAuth(c);
        if (!gate.ok) {
            return gate.response;
        }
        return c.html(200, globalThis.STORE_UTILS.renderCmsPage("builds.html", {
            page_title: "Build Status",
            active_nav: "builds",
            csrf_token: gate.session.getString("csrf_token"),
            build_status_html: globalThis.STORE_BUILD.renderBuildStatusFragment()
        }));
    });

    routerAdd("GET", "/cms/fragments/build-status", function(c) {
        var gate = globalThis.STORE_AUTH.requireCmsAuth(c);
        if (!gate.ok) {
            return gate.response;
        }
        return c.html(200, globalThis.STORE_BUILD.renderBuildStatusFragment());
    });
}

registerCmsRoutes();
