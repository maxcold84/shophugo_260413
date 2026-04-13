var cart = require(__hooks + "/cart.pb.js");
var utils = require(__hooks + "/utils.js");

function validateAddress(c) {
    var address = {
        recipient_name: String(c.request().formValue("recipient_name") || "").replace(/^\s+|\s+$/g, ""),
        phone: String(c.request().formValue("phone") || "").replace(/^\s+|\s+$/g, ""),
        country_code: String(c.request().formValue("country_code") || "").replace(/^\s+|\s+$/g, ""),
        postal_code: String(c.request().formValue("postal_code") || "").replace(/^\s+|\s+$/g, ""),
        state_region: String(c.request().formValue("state_region") || "").replace(/^\s+|\s+$/g, ""),
        city: String(c.request().formValue("city") || "").replace(/^\s+|\s+$/g, ""),
        address_line1: String(c.request().formValue("address_line1") || "").replace(/^\s+|\s+$/g, ""),
        address_line2: String(c.request().formValue("address_line2") || "").replace(/^\s+|\s+$/g, "")
    };
    var errors = [];
    if (!address.recipient_name) { errors.push("Recipient name is required."); }
    if (!address.phone) { errors.push("Phone is required."); }
    if (!address.country_code) { errors.push("Country code is required."); }
    if (!address.postal_code) { errors.push("Postal code is required."); }
    if (!address.city) { errors.push("City is required."); }
    if (!address.address_line1) { errors.push("Address line 1 is required."); }
    return { errors: errors, address: address };
}

function computeTotals(lines) {
    var subtotal = 0;
    var i;
    for (i = 0; i < lines.length; i += 1) {
        subtotal += lines[i].line_total;
    }
    return { subtotal: subtotal, discount: 0, shipping: 0, tax: 0, total: subtotal };
}

function buildItemsSnapshot(lines) {
    var items = [];
    var i;
    for (i = 0; i < lines.length; i += 1) {
        items.push({
            product_id: lines[i].product_id,
            sku: lines[i].sku,
            name: lines[i].name,
            slug: lines[i].slug,
            unit_price: lines[i].unit_price,
            quantity: lines[i].qty,
            line_subtotal: lines[i].line_total
        });
    }
    return items;
}

function renderCheckoutSummary(lines, warnings, errors, success) {
    var totals = computeTotals(lines);
    return utils.renderView(__hooks + "/views/hda/checkout-summary.html", {
        lines: lines,
        warnings: warnings || [],
        errors: errors || [],
        success: success || "",
        subtotal_label: utils.formatMoney(totals.subtotal),
        discount_label: utils.formatMoney(totals.discount),
        shipping_label: utils.formatMoney(totals.shipping),
        tax_label: utils.formatMoney(totals.tax),
        total_label: utils.formatMoney(totals.total),
        is_empty: lines.length === 0
    });
}

function requestLines(c) {
    var ids = utils.getFormValues(c, "product_id");
    var qtys = utils.getFormValues(c, "qty");
    var items = [];
    var i;
    for (i = 0; i < ids.length; i += 1) {
        items.push({ product_id: ids[i], qty: utils.parseInteger(qtys[i], 1) });
    }
    return items;
}

function decrementStock(line) {
    var product = $app.findRecordById("products", line.product_id);
    var currentStock = product.getInt("stock");
    if (currentStock < line.qty) {
        throw new Error("Insufficient stock for " + line.name);
    }
    product.set("stock", currentStock - line.qty);
    $app.save(product);
}

routerAdd("GET", "/fragments/cart/checkout-summary", function(c) {
    return c.html(200, renderCheckoutSummary([], [], [], ""));
});

routerAdd("POST", "/actions/checkout/prepare", function(c) {
    var customerId = cart.resolveCustomerId(c);
    var normalized = customerId ? { lines: cart.loadAuthenticatedCart(customerId), warnings: [] } : cart.normalizeGuestLines(requestLines(c));
    if (!normalized.lines.length) {
        return c.html(409, renderCheckoutSummary([], normalized.warnings, ["Your cart is empty or invalid."], ""));
    }
    return c.html(200, renderCheckoutSummary(normalized.lines, normalized.warnings, [], ""));
});

routerAdd("POST", "/actions/checkout/submit", function(c) {
    var customerId = cart.resolveCustomerId(c);
    var normalized = customerId ? { lines: cart.loadAuthenticatedCart(customerId), warnings: [] } : cart.normalizeGuestLines(requestLines(c));
    var addressResult;
    var totals;
    var orders;
    var order;
    var email = String(c.request().formValue("email") || "").replace(/^\s+|\s+$/g, "");
    var i;
    if (!normalized.lines.length) {
        return c.html(409, renderCheckoutSummary([], normalized.warnings, ["Your cart can no longer be checked out."], ""));
    }
    addressResult = validateAddress(c);
    if (addressResult.errors.length) {
        return c.html(422, renderCheckoutSummary(normalized.lines, normalized.warnings, addressResult.errors, ""));
    }
    totals = computeTotals(normalized.lines);
    orders = $app.findCollectionByNameOrId("orders");
    order = new Record(orders);
    order.set("user", customerId || "");
    order.set("email", email || "");
    order.set("status", "pending");
    order.set("items", buildItemsSnapshot(normalized.lines));
    order.set("subtotal_amount", totals.subtotal);
    order.set("discount_amount", totals.discount);
    order.set("shipping_amount", totals.shipping);
    order.set("tax_amount", totals.tax);
    order.set("total_amount", totals.total);
    order.set("address", addressResult.address);
    $app.save(order);
    try {
        for (i = 0; i < normalized.lines.length; i += 1) {
            decrementStock(normalized.lines[i]);
        }
    } catch (e) {
        order.set("status", "failed");
        $app.save(order);
        $app.logger().warn("Checkout stock failure", "order_id", order.id, "error", String(e));
        return c.html(409, renderCheckoutSummary(normalized.lines, normalized.warnings, [String(e)], ""));
    }
    $app.logger().info("Checkout success", "order_id", order.id, "total_amount", totals.total);
    return c.html(200, renderCheckoutSummary([], [], [], "Order " + order.id + " was created successfully."));
});
