require(__hooks + "/cart.js");
require(__hooks + "/utils.js");

function registerCartRoutes() {
    routerAdd("GET", "/fragments/cart/mini", function(c) {
        var current = globalThis.STORE_CART.currentCart(c);
        return c.html(200, globalThis.STORE_CART.renderMiniCart(current.lines));
    });

    routerAdd("GET", "/fragments/cart/lines", function(c) {
        var current = globalThis.STORE_CART.currentCart(c);
        return c.html(200, globalThis.STORE_CART.renderCartLines(current.lines, current.warnings));
    });

    routerAdd("POST", "/actions/cart/sync-guest", function(c) {
        var customerId = globalThis.STORE_CART.resolveCustomerId(c);
        var intent = globalThis.STORE_CART.getGuestIntent(c);
        var current;

        if (customerId) {
            current = { lines: globalThis.STORE_CART.syncAuthenticatedCart(customerId, intent), warnings: [] };
        } else {
            current = globalThis.STORE_CART.normalizeGuestLines(intent);
        }

        return c.html(200, globalThis.STORE_CART.renderCartLines(current.lines, current.warnings));
    });

    routerAdd("POST", "/actions/cart/add", function(c) {
        var current = globalThis.STORE_CART.normalizeGuestLines([{
            product_id: String(c.request().formValue("product_id") || ""),
            qty: globalThis.STORE_UTILS.parseInteger(c.request().formValue("qty"), 1)
        }]);
        return c.html(200, globalThis.STORE_CART.renderMiniCart(current.lines));
    });

    routerAdd("POST", "/actions/cart/update", function(c) {
        var current = globalThis.STORE_CART.currentCart(c);
        return c.html(200, globalThis.STORE_CART.renderCartLines(current.lines, current.warnings));
    });

    routerAdd("POST", "/actions/cart/remove", function(c) {
        return c.html(200, globalThis.STORE_CART.renderCartLines([], []));
    });
}

registerCartRoutes();
