require(__hooks + "/config.js");
require(__hooks + "/utils.js");

function stockState(product) {
    if (!product.getBool("active") || !product.getBool("visible")) {
        return "unavailable";
    }
    if (product.getInt("stock") <= 0) {
        return "out_of_stock";
    }
    if (product.getInt("stock") <= globalThis.STORE_CONFIG.inventory.lowStockThreshold) {
        return "low_stock";
    }
    return "available";
}

globalThis.STORE_STOCK = {
    stockState: stockState
};

function registerStockRoutes() {
    routerAdd("GET", "/fragments/products/stock-badge", function(c) {
        var sku = String(c.request().queryParam("sku") || "");
        var matches = $app.findRecordsByFilter("products", "sku = {:sku}", "-created", 1, 0, { sku: sku });
        var product;
        if (!matches || !matches.length) {
            return c.html(404, "<span class=\"rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700\">Unavailable</span>");
        }
        product = matches[0];
        return c.html(200, globalThis.STORE_UTILS.renderView(__hooks + "/views/hda/stock-badge.html", {
            state: globalThis.STORE_STOCK.stockState(product),
            stock: product.getInt("stock")
        }));
    });

    routerAdd("GET", "/fragments/products/listing", function(c) {
        var records = $app.findRecordsByFilter("products", "id != ''", "sort_order asc,name asc", 500, 0);
        var items = [];
        var i;
        for (i = 0; i < records.length; i += 1) {
            if (!records[i].getBool("active") || !records[i].getBool("visible")) {
                continue;
            }
            items.push({
                name: records[i].getString("name"),
                slug: records[i].getString("slug"),
                short_description: records[i].getString("short_description"),
                price_label: globalThis.STORE_UTILS.formatMoney(records[i].getInt("price"))
            });
        }
        return c.html(200, globalThis.STORE_UTILS.renderView(__hooks + "/views/hda/product-listing.html", {
            products: items,
            is_empty: items.length === 0
        }));
    });
}

registerStockRoutes();
