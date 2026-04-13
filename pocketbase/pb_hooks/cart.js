var config = globalThis.STORE_CONFIG;
var utils = globalThis.STORE_UTILS;

function resolveCustomerId(c) {
    var cookie = c.request().cookie(config.customer.cookieName);
    return cookie ? String(cookie.value() || "") : "";
}

function loadProduct(productId) {
    return $app.findRecordById("products", productId);
}

function validatePurchasable(product, qty) {
    if (!product.getBool("active") || !product.getBool("visible")) {
        return "This product is no longer available.";
    }
    if (qty < 1) {
        return "Quantity must be at least 1.";
    }
    if (product.getInt("stock") < qty) {
        return "Only " + product.getInt("stock") + " in stock.";
    }
    return "";
}

function normalizeLine(product, qty) {
    return {
        product_id: product.id,
        slug: product.getString("slug"),
        sku: product.getString("sku"),
        name: product.getString("name"),
        qty: qty,
        unit_price: product.getInt("price"),
        line_total: product.getInt("price") * qty,
        line_total_label: utils.formatMoney(product.getInt("price") * qty),
        stock_state: product.getInt("stock") <= 0 ? "out_of_stock" : (product.getInt("stock") <= config.inventory.lowStockThreshold ? "low_stock" : "available"),
        short_description: product.getString("short_description")
    };
}

function getGuestIntent(c) {
    var productIds = utils.getFormValues(c, "product_id");
    var qtys = utils.getFormValues(c, "qty");
    var lines = [];
    var i;
    for (i = 0; i < productIds.length; i += 1) {
        lines.push({
            product_id: productIds[i],
            qty: utils.parseInteger(qtys[i], 1)
        });
    }
    return lines;
}

function loadAuthenticatedCart(customerId) {
    var rows;
    var normalized = [];
    var i;
    var product;
    if (!customerId) {
        return normalized;
    }
    rows = $app.findRecordsByFilter("carts", "user = {:user}", "created asc", 200, 0, { user: customerId });
    for (i = 0; i < rows.length; i += 1) {
        product = loadProduct(rows[i].getString("product"));
        if (product) {
            normalized.push(normalizeLine(product, rows[i].getInt("qty")));
        }
    }
    return normalized;
}

function syncAuthenticatedCart(customerId, intentLines) {
    var collection = $app.findCollectionByNameOrId("carts");
    var i;
    var line;
    var product;
    var existing;
    var qty;
    if (!customerId) {
        return [];
    }
    for (i = 0; i < intentLines.length; i += 1) {
        line = intentLines[i];
        product = loadProduct(line.product_id);
        if (!product) {
            continue;
        }
        qty = line.qty;
        if (qty > product.getInt("stock")) {
            qty = product.getInt("stock");
        }
        if (qty < 1 || !product.getBool("active") || !product.getBool("visible")) {
            continue;
        }
        existing = $app.findRecordsByFilter("carts", "user = {:user} && product = {:product}", "-created", 1, 0, {
            user: customerId,
            product: product.id
        });
        if (existing && existing.length) {
            existing[0].set("qty", qty);
            $app.save(existing[0]);
        } else {
            existing = new Record(collection);
            existing.set("user", customerId);
            existing.set("product", product.id);
            existing.set("qty", qty);
            $app.save(existing);
        }
    }
    return loadAuthenticatedCart(customerId);
}

function normalizeGuestLines(intentLines) {
    var normalized = [];
    var warnings = [];
    var i;
    var line;
    var product;
    var qty;
    var message;
    for (i = 0; i < intentLines.length; i += 1) {
        line = intentLines[i];
        try {
            product = loadProduct(line.product_id);
        } catch (e) {
            warnings.push("A product in your cart no longer exists.");
            continue;
        }
        qty = line.qty;
        if (qty > product.getInt("stock")) {
            warnings.push(product.getString("name") + " was clamped to available stock.");
            qty = product.getInt("stock");
        }
        message = validatePurchasable(product, qty);
        if (message) {
            warnings.push(product.getString("name") + ": " + message);
            continue;
        }
        normalized.push(normalizeLine(product, qty));
    }
    return {
        lines: normalized,
        warnings: warnings
    };
}

function summarizeCart(lines) {
    var count = 0;
    var subtotal = 0;
    var i;
    for (i = 0; i < lines.length; i += 1) {
        count += lines[i].qty;
        subtotal += lines[i].line_total;
    }
    return {
        count: count,
        subtotal: subtotal,
        subtotal_label: utils.formatMoney(subtotal)
    };
}

function renderMiniCart(lines) {
    var summary = summarizeCart(lines);
    return utils.renderView(__hooks + "/views/hda/cart-mini.html", {
        count: summary.count,
        subtotal_label: summary.subtotal_label,
        is_empty: summary.count === 0
    });
}

function renderCartLines(lines, warnings) {
    var summary = summarizeCart(lines);
    return utils.renderView(__hooks + "/views/hda/cart-lines.html", {
        lines: lines,
        warnings: warnings || [],
        is_empty: lines.length === 0,
        subtotal_label: summary.subtotal_label
    });
}

function currentCart(c) {
    var customerId = resolveCustomerId(c);
    if (customerId) {
        return { lines: loadAuthenticatedCart(customerId), warnings: [] };
    }
    return normalizeGuestLines(getGuestIntent(c));
}

globalThis.STORE_CART = {
    resolveCustomerId: resolveCustomerId,
    getGuestIntent: getGuestIntent,
    syncAuthenticatedCart: syncAuthenticatedCart,
    loadAuthenticatedCart: loadAuthenticatedCart,
    normalizeGuestLines: normalizeGuestLines,
    summarizeCart: summarizeCart,
    renderMiniCart: renderMiniCart,
    renderCartLines: renderCartLines,
    currentCart: currentCart
};
