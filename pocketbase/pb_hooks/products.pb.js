var auth = require(__hooks + "/auth.pb.js");
var build = require(__hooks + "/build.pb.js");
var utils = require(__hooks + "/utils.js");

function findCategories() {
    return $app.findRecordsByFilter("categories", "id != ''", "sort_order asc,name asc", 500, 0);
}

function loadProduct(id) {
    return $app.findRecordById("products", id);
}

function selectedCategoryMap(values) {
    var i;
    var map = {};
    for (i = 0; i < values.length; i += 1) {
        map[values[i]] = true;
    }
    return map;
}

function serializeProduct(record) {
    return {
        id: record.id,
        sku: record.getString("sku"),
        name: record.getString("name"),
        slug: record.getString("slug"),
        price: record.getInt("price"),
        compare_price: record.getInt("compare_price"),
        stock: record.getInt("stock"),
        description_markdown: record.getString("description_markdown"),
        short_description: record.getString("short_description"),
        categories: record.get("categories") || [],
        tags: (record.get("tags") || []).join(", "),
        active: record.getBool("active"),
        featured: record.getBool("featured"),
        visible: record.getBool("visible"),
        meta_title: record.getString("meta_title"),
        meta_desc: record.getString("meta_desc"),
        sort_order: record.getInt("sort_order")
    };
}

function listProductsPage(session) {
    var records = $app.findRecordsByFilter("products", "id != ''", "sort_order asc,name asc", 500, 0);
    var rows = [];
    var i;
    for (i = 0; i < records.length; i += 1) {
        rows.push({
            id: records[i].id,
            sku: records[i].getString("sku"),
            name: records[i].getString("name"),
            slug: records[i].getString("slug"),
            price_label: utils.formatMoney(records[i].getInt("price")),
            stock: records[i].getInt("stock"),
            active: records[i].getBool("active"),
            visible: records[i].getBool("visible")
        });
    }
    return utils.renderCmsPage("products-list.html", {
        page_title: "Products",
        active_nav: "products",
        csrf_token: session.getString("csrf_token"),
        products: rows
    });
}

function productFormPage(session, values, errors, mode) {
    var categories = findCategories();
    var options = [];
    var i;
    var selected = selectedCategoryMap(values.categories || []);
    for (i = 0; i < categories.length; i += 1) {
        options.push({
            id: categories[i].id,
            name: categories[i].getString("name"),
            checked: !!selected[categories[i].id]
        });
    }
    return utils.renderCmsPage("product-form.html", {
        page_title: mode === "edit" ? "Edit Product" : "New Product",
        active_nav: "products",
        csrf_token: session.getString("csrf_token"),
        values: values,
        errors: errors || {},
        categories: options,
        form_action: mode === "edit" ? ("/cms/products/" + values.id) : "/cms/products",
        submit_label: mode === "edit" ? "Update product" : "Create product",
        form_heading: mode === "edit" ? "Edit product" : "Create product"
    });
}

function validateProductInput(values, productId) {
    var errors = {};
    var skuMatches;
    var slugMatches;
    if (!values.sku) {
        errors.sku = "SKU is required.";
    }
    if (!values.name) {
        errors.name = "Name is required.";
    }
    if (!values.slug) {
        errors.slug = "Slug is required.";
    }
    if (values.price < 0) {
        errors.price = "Price must be zero or greater.";
    }
    if (values.stock < 0) {
        errors.stock = "Stock must be zero or greater.";
    }
    skuMatches = $app.findRecordsByFilter("products", "sku = {:sku}", "-created", 10, 0, { sku: values.sku });
    if (skuMatches && skuMatches.length && skuMatches[0].id !== productId) {
        errors.sku = "SKU must be unique.";
    }
    slugMatches = $app.findRecordsByFilter("products", "slug = {:slug}", "-created", 10, 0, { slug: values.slug });
    if (slugMatches && slugMatches.length && slugMatches[0].id !== productId) {
        errors.slug = "Slug must be unique.";
    }
    return errors;
}

function extractProductValues(c, existing) {
    return {
        id: existing ? existing.id : "",
        sku: String(c.request().formValue("sku") || (existing ? existing.getString("sku") : "")).replace(/^\s+|\s+$/g, ""),
        name: String(c.request().formValue("name") || (existing ? existing.getString("name") : "")).replace(/^\s+|\s+$/g, ""),
        slug: String(c.request().formValue("slug") || "").replace(/^\s+|\s+$/g, "") || utils.slugify(c.request().formValue("name") || ""),
        price: utils.parseInteger(c.request().formValue("price"), 0),
        compare_price: utils.parseInteger(c.request().formValue("compare_price"), 0),
        stock: utils.parseInteger(c.request().formValue("stock"), 0),
        description_markdown: String(c.request().formValue("description_markdown") || ""),
        short_description: String(c.request().formValue("short_description") || ""),
        categories: utils.getFormValues(c, "categories"),
        tags: utils.normalizeTags(c.request().formValue("tags")),
        active: utils.parseBoolean(c.request().formValue("active")),
        featured: utils.parseBoolean(c.request().formValue("featured")),
        visible: utils.parseBoolean(c.request().formValue("visible")),
        meta_title: String(c.request().formValue("meta_title") || ""),
        meta_desc: String(c.request().formValue("meta_desc") || ""),
        sort_order: utils.parseInteger(c.request().formValue("sort_order"), 0)
    };
}

function persistProduct(record, values, c) {
    var images = c.request().formFiles ? c.request().formFiles("images") : [];
    record.set("sku", values.sku);
    record.set("name", values.name);
    record.set("slug", values.slug);
    record.set("price", values.price);
    record.set("compare_price", values.compare_price || 0);
    record.set("stock", values.stock);
    record.set("description_markdown", values.description_markdown);
    record.set("short_description", values.short_description);
    record.set("categories", values.categories);
    record.set("tags", values.tags);
    record.set("active", values.active);
    record.set("featured", values.featured);
    record.set("visible", values.visible);
    record.set("meta_title", values.meta_title);
    record.set("meta_desc", values.meta_desc);
    record.set("sort_order", values.sort_order);
    if (images && images.length) {
        record.set("images", images);
    }
    $app.save(record);
}

routerAdd("GET", "/cms/products", function(c) {
    var gate = auth.requireCmsAuth(c);
    if (!gate.ok) {
        return gate.response;
    }
    return c.html(200, listProductsPage(gate.session));
});

routerAdd("GET", "/cms/products/new", function(c) {
    var gate = auth.requireCmsAuth(c);
    if (!gate.ok) {
        return gate.response;
    }
    return c.html(200, productFormPage(gate.session, {
        id: "",
        sku: "",
        name: "",
        slug: "",
        price: 0,
        compare_price: 0,
        stock: 0,
        description_markdown: "",
        short_description: "",
        categories: [],
        tags: "",
        active: true,
        featured: false,
        visible: true,
        meta_title: "",
        meta_desc: "",
        sort_order: 0
    }, {}, "new"));
});

routerAdd("POST", "/cms/products", function(c) {
    var gate = auth.requireCmsAuth(c);
    var collection;
    var record;
    var values;
    var errors;
    if (!gate.ok) {
        return gate.response;
    }
    if (!auth.validateCsrf(c, gate.session)) {
        return auth.rejectCsrf(c);
    }
    values = extractProductValues(c, null);
    errors = validateProductInput(values, "");
    if (Object.keys(errors).length) {
        return c.html(422, productFormPage(gate.session, values, errors, "new"));
    }
    collection = $app.findCollectionByNameOrId("products");
    record = new Record(collection);
    persistProduct(record, values, c);
    build.markBuildDirty("cms_product_create");
    return c.redirect(302, "/cms/products");
});

routerAdd("GET", "/cms/products/:id/edit", function(c) {
    var gate = auth.requireCmsAuth(c);
    var record;
    if (!gate.ok) {
        return gate.response;
    }
    record = loadProduct(c.pathParam("id"));
    return c.html(200, productFormPage(gate.session, serializeProduct(record), {}, "edit"));
});

routerAdd("POST", "/cms/products/:id", function(c) {
    var gate = auth.requireCmsAuth(c);
    var record;
    var values;
    var errors;
    if (!gate.ok) {
        return gate.response;
    }
    if (!auth.validateCsrf(c, gate.session)) {
        return auth.rejectCsrf(c);
    }
    record = loadProduct(c.pathParam("id"));
    values = extractProductValues(c, record);
    errors = validateProductInput(values, record.id);
    if (Object.keys(errors).length) {
        return c.html(422, productFormPage(gate.session, values, errors, "edit"));
    }
    persistProduct(record, values, c);
    build.markBuildDirty("cms_product_update");
    return c.redirect(302, "/cms/products");
});

routerAdd("POST", "/cms/products/:id/delete", function(c) {
    var gate = auth.requireCmsAuth(c);
    var record;
    if (!gate.ok) {
        return gate.response;
    }
    if (!auth.validateCsrf(c, gate.session)) {
        return auth.rejectCsrf(c);
    }
    record = loadProduct(c.pathParam("id"));
    $app.delete(record);
    build.markBuildDirty("cms_product_delete");
    return c.redirect(302, "/cms/products");
});
