routerAdd("GET", "/__debug-request", function(c) {
    var parts = [];
    var req = c.request;
    var headers;
    var cookieValue = "";
    var cookieError = "";
    var headerGet = "";
    var headerError = "";

    parts.push("typeof request: " + typeof req);
    parts.push("typeof request.header: " + typeof req.header);
    parts.push("typeof request.cookie: " + typeof req.cookie);
    parts.push("typeof request.formValue: " + typeof req.formValue);

    try {
        headers = (typeof req.header === "function") ? req.header() : req.header;
        parts.push("typeof headers: " + typeof headers);
        parts.push("typeof headers.get: " + (headers ? typeof headers.get : "undefined"));
        if (headers && typeof headers.get === "function") {
            headerGet = String(headers.get("Cookie") || "");
        } else if (headers && headers["Cookie"]) {
            headerGet = String(headers["Cookie"]);
        }
    } catch (e) {
        headerError = String(e);
    }

    try {
        if (typeof req.cookie === "function") {
            cookieValue = String(req.cookie("cms_session"));
        } else if (req.cookie) {
            cookieValue = String(req.cookie);
        }
    } catch (e2) {
        cookieError = String(e2);
    }

    return c.html(200, [
        "<!doctype html><html><body><pre>",
        parts.join("\n"),
        "\nheaderGet: " + headerGet,
        "\nheaderError: " + headerError,
        "\ncookieValue: " + cookieValue,
        "\ncookieError: " + cookieError,
        "</pre></body></html>"
    ].join(""));
});
