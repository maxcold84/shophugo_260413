$app.logger().info("loaded routes_build");

routerAdd("GET", "/__probe-build", function(c) {
    return c.string(200, "probe-build-ok");
});
