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

