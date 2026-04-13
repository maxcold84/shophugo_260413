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

