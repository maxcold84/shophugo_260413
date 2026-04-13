require(__hooks + "/build.js");
require(__hooks + "/config.js");
require(__hooks + "/utils.js");

cronAdd("storefront_build_tick", globalThis.STORE_CONFIG.build.cronSpec, function() {
    var state;
    var lastChangedAt;

    globalThis.STORE_BUILD.recoverStaleLockIfNeeded();
    state = globalThis.STORE_BUILD.getBuildState();
    if (state.getBool("build_running") || !state.getBool("queue_dirty")) {
        return;
    }

    lastChangedAt = state.getDateTime("last_changed_at").time().unixMilli();
    if ((Date.now() - lastChangedAt) < globalThis.STORE_CONFIG.build.quietWindowMs) {
        return;
    }

    state.set("build_running", true);
    state.set("queue_dirty", false);
    state.set("rerun_requested", false);
    state.set("build_started_at", globalThis.STORE_UTILS.nowIso());
    state.set("lock_owner", globalThis.STORE_CONFIG.build.lockOwner);
    $app.save(state);
    globalThis.STORE_BUILD.runBuild("cron");
});
