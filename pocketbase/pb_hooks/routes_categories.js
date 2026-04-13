require(__hooks + "/auth.js");
require(__hooks + "/build.js");
require(__hooks + "/utils.js");

function loadCategory(id) {
    return $app.findRecordById("categories", id);
}

function serializeCategory(record) {
    return {
        id: record.id,
        name: record.getString("name"),
        slug: record.getString("slug"),
        description: record.getString("description"),
        visible: record.getBool("visible"),
        sort_order: record.getInt("sort_order"),
        meta_title: record.getString("meta_title"),
        meta_desc: record.getString("meta_desc")
    };
}

function categoryListPage(session) {
    var records = $app.findRecordsByFilter("categories", "id != ''", "sort_order asc,name asc", 500, 0);
    var rows = [];
    var i;
    for (i = 0; i < records.length; i += 1) {
        rows.push({
            id: records[i].id,
            name: records[i].getString("name"),
            slug: records[i].getString("slug"),
            visible: records[i].getBool("visible")
        });
    }
    return globalThis.STORE_UTILS.renderCmsPage("categories-list.html", {
        page_title: "Categories",
        active_nav: "categories",
        csrf_token: session.getString("csrf_token"),
        categories: rows
    });
}

function categoryFormPage(session, values, errors, mode) {
    return globalThis.STORE_UTILS.renderCmsPage("category-form.html", {
        page_title: mode === "edit" ? "Edit Category" : "New Category",
        active_nav: "categories",
        csrf_token: session.getString("csrf_token"),
        values: values,
        errors: errors || {},
        form_action: mode === "edit" ? ("/cms/categories/" + values.id) : "/cms/categories",
        submit_label: mode === "edit" ? "Update category" : "Create category",
        form_heading: mode === "edit" ? "Edit category" : "Create category"
    });
}

function extractCategoryValues(c, existing) {
    return {
        id: existing ? existing.id : "",
        name: String(c.request().formValue("name") || (existing ? existing.getString("name") : "")).replace(/^\s+|\s+$/g, ""),
        slug: String(c.request().formValue("slug") || "").replace(/^\s+|\s+$/g, "") || globalThis.STORE_UTILS.slugify(c.request().formValue("name") || ""),
        description: String(c.request().formValue("description") || ""),
        visible: globalThis.STORE_UTILS.parseBoolean(c.request().formValue("visible")),
        sort_order: globalThis.STORE_UTILS.parseInteger(c.request().formValue("sort_order"), 0),
        meta_title: String(c.request().formValue("meta_title") || ""),
        meta_desc: String(c.request().formValue("meta_desc") || "")
    };
}

function validateCategoryInput(values, categoryId) {
    var errors = {};
    var matches;
    if (!values.name) {
        errors.name = "Name is required.";
    }
    if (!values.slug) {
        errors.slug = "Slug is required.";
    }
    matches = $app.findRecordsByFilter("categories", "slug = {:slug}", "-created", 10, 0, { slug: values.slug });
    if (matches && matches.length && matches[0].id !== categoryId) {
        errors.slug = "Slug must be unique.";
    }
    return errors;
}

function persistCategory(record, values, c) {
    var image = c.request().formFiles ? c.request().formFiles("image") : [];
    record.set("name", values.name);
    record.set("slug", values.slug);
    record.set("description", values.description);
    record.set("visible", values.visible);
    record.set("sort_order", values.sort_order);
    record.set("meta_title", values.meta_title);
    record.set("meta_desc", values.meta_desc);
    if (image && image.length) {
        record.set("image", image[0]);
    }
    $app.save(record);
}

globalThis.STORE_CATEGORIES = {
    loadCategory: loadCategory,
    serializeCategory: serializeCategory,
    categoryListPage: categoryListPage,
    categoryFormPage: categoryFormPage,
    extractCategoryValues: extractCategoryValues,
    validateCategoryInput: validateCategoryInput,
    persistCategory: persistCategory
};

function registerCategoryRoutes() {
    routerAdd("GET", "/cms/categories", function(c) {
        var gate = globalThis.STORE_AUTH.requireCmsAuth(c);
        if (!gate.ok) {
            return gate.response;
        }
        return c.html(200, globalThis.STORE_CATEGORIES.categoryListPage(gate.session));
    });

    routerAdd("GET", "/cms/categories/new", function(c) {
        var gate = globalThis.STORE_AUTH.requireCmsAuth(c);
        if (!gate.ok) {
            return gate.response;
        }
        return c.html(200, globalThis.STORE_CATEGORIES.categoryFormPage(gate.session, {
            id: "",
            name: "",
            slug: "",
            description: "",
            visible: true,
            sort_order: 0,
            meta_title: "",
            meta_desc: ""
        }, {}, "new"));
    });

    routerAdd("POST", "/cms/categories", function(c) {
        var gate = globalThis.STORE_AUTH.requireCmsAuth(c);
        var collection;
        var record;
        var values;
        var errors;
        if (!gate.ok) {
            return gate.response;
        }
        if (!globalThis.STORE_AUTH.validateCsrf(c, gate.session)) {
            return globalThis.STORE_AUTH.rejectCsrf(c);
        }
        values = globalThis.STORE_CATEGORIES.extractCategoryValues(c, null);
        errors = globalThis.STORE_CATEGORIES.validateCategoryInput(values, "");
        if (Object.keys(errors).length) {
            return c.html(422, globalThis.STORE_CATEGORIES.categoryFormPage(gate.session, values, errors, "new"));
        }
        collection = $app.findCollectionByNameOrId("categories");
        record = new Record(collection);
        globalThis.STORE_CATEGORIES.persistCategory(record, values, c);
        globalThis.STORE_BUILD.markBuildDirty("cms_category_create");
        return c.redirect(302, "/cms/categories");
    });

    routerAdd("GET", "/cms/categories/:id/edit", function(c) {
        var gate = globalThis.STORE_AUTH.requireCmsAuth(c);
        if (!gate.ok) {
            return gate.response;
        }
        return c.html(200, globalThis.STORE_CATEGORIES.categoryFormPage(gate.session, globalThis.STORE_CATEGORIES.serializeCategory(globalThis.STORE_CATEGORIES.loadCategory(c.pathParam("id"))), {}, "edit"));
    });

    routerAdd("POST", "/cms/categories/:id", function(c) {
        var gate = globalThis.STORE_AUTH.requireCmsAuth(c);
        var record;
        var values;
        var errors;
        if (!gate.ok) {
            return gate.response;
        }
        if (!globalThis.STORE_AUTH.validateCsrf(c, gate.session)) {
            return globalThis.STORE_AUTH.rejectCsrf(c);
        }
        record = globalThis.STORE_CATEGORIES.loadCategory(c.pathParam("id"));
        values = globalThis.STORE_CATEGORIES.extractCategoryValues(c, record);
        errors = globalThis.STORE_CATEGORIES.validateCategoryInput(values, record.id);
        if (Object.keys(errors).length) {
            return c.html(422, globalThis.STORE_CATEGORIES.categoryFormPage(gate.session, values, errors, "edit"));
        }
        globalThis.STORE_CATEGORIES.persistCategory(record, values, c);
        globalThis.STORE_BUILD.markBuildDirty("cms_category_update");
        return c.redirect(302, "/cms/categories");
    });

    routerAdd("POST", "/cms/categories/:id/delete", function(c) {
        var gate = globalThis.STORE_AUTH.requireCmsAuth(c);
        var record;
        if (!gate.ok) {
            return gate.response;
        }
        if (!globalThis.STORE_AUTH.validateCsrf(c, gate.session)) {
            return globalThis.STORE_AUTH.rejectCsrf(c);
        }
        record = globalThis.STORE_CATEGORIES.loadCategory(c.pathParam("id"));
        $app.delete(record);
        globalThis.STORE_BUILD.markBuildDirty("cms_category_delete");
        return c.redirect(302, "/cms/categories");
    });
}

registerCategoryRoutes();
