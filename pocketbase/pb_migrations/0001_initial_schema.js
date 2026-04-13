migrate(
    function(app) {
        var customers = new Collection({
            name: "customers",
            type: "base",
            system: false,
            fields: [
                { name: "email", type: "email", required: true },
                { name: "password_hash", type: "text", required: true },
                { name: "active", type: "bool" }
            ],
            indexes: [
                "CREATE UNIQUE INDEX idx_customers_email ON customers (email)"
            ]
        });
        app.save(customers);

        var categories = new Collection({
            name: "categories",
            type: "base",
            system: false,
            fields: [
                { name: "name", type: "text", required: true },
                { name: "slug", type: "text", required: true },
                { name: "description", type: "text" },
                { name: "image", type: "file", maxSelect: 1, maxSize: 5242880, mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
                { name: "visible", type: "bool" },
                { name: "sort_order", type: "number", required: true, onlyInt: true },
                { name: "meta_title", type: "text" },
                { name: "meta_desc", type: "text" }
            ],
            indexes: [
                "CREATE UNIQUE INDEX idx_categories_slug ON categories (slug)"
            ]
        });
        app.save(categories);

        var products = new Collection({
            name: "products",
            type: "base",
            system: false,
            fields: [
                { name: "sku", type: "text", required: true },
                { name: "name", type: "text", required: true },
                { name: "slug", type: "text", required: true },
                { name: "price", type: "number", required: true, onlyInt: true },
                { name: "compare_price", type: "number", onlyInt: true },
                { name: "stock", type: "number", required: true, min: 0, onlyInt: true },
                { name: "description_markdown", type: "text" },
                { name: "short_description", type: "text" },
                { name: "images", type: "file", maxSelect: 10, maxSize: 5242880, mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
                { name: "categories", type: "relation", collectionId: categories.id, cascadeDelete: false, minSelect: 0, maxSelect: 20 },
                { name: "tags", type: "json" },
                { name: "active", type: "bool" },
                { name: "featured", type: "bool" },
                { name: "visible", type: "bool" },
                { name: "meta_title", type: "text" },
                { name: "meta_desc", type: "text" },
                { name: "sort_order", type: "number", required: true, onlyInt: true }
            ],
            indexes: [
                "CREATE UNIQUE INDEX idx_products_sku ON products (sku)",
                "CREATE UNIQUE INDEX idx_products_slug ON products (slug)"
            ]
        });
        app.save(products);

        var orders = new Collection({
            name: "orders",
            type: "base",
            system: false,
            fields: [
                { name: "user", type: "relation", collectionId: customers.id, cascadeDelete: false, minSelect: 0, maxSelect: 1 },
                { name: "email", type: "email" },
                { name: "status", type: "select", required: true, maxSelect: 1, values: ["pending", "paid", "cancelled", "failed", "shipped", "done"] },
                { name: "items", type: "json", required: true },
                { name: "subtotal_amount", type: "number", required: true, onlyInt: true },
                { name: "discount_amount", type: "number", required: true, onlyInt: true },
                { name: "shipping_amount", type: "number", required: true, onlyInt: true },
                { name: "tax_amount", type: "number", required: true, onlyInt: true },
                { name: "total_amount", type: "number", required: true, onlyInt: true },
                { name: "address", type: "json", required: true },
                { name: "paid_at", type: "date" },
                { name: "cancelled_at", type: "date" }
            ]
        });
        app.save(orders);

        var carts = new Collection({
            name: "carts",
            type: "base",
            system: false,
            fields: [
                { name: "user", type: "relation", required: true, collectionId: customers.id, cascadeDelete: true, minSelect: 1, maxSelect: 1 },
                { name: "product", type: "relation", required: true, collectionId: products.id, cascadeDelete: true, minSelect: 1, maxSelect: 1 },
                { name: "qty", type: "number", required: true, min: 1, onlyInt: true }
            ],
            indexes: [
                "CREATE UNIQUE INDEX idx_carts_user_product ON carts (user, product)"
            ]
        });
        app.save(carts);

        var buildLogs = new Collection({
            name: "build_logs",
            type: "base",
            system: false,
            fields: [
                { name: "status", type: "select", required: true, maxSelect: 1, values: ["pending", "running", "success", "failed"] },
                { name: "triggered_by", type: "text", required: true },
                { name: "output", type: "text" },
                { name: "duration_ms", type: "number", onlyInt: true }
            ]
        });
        app.save(buildLogs);

        var buildState = new Collection({
            name: "build_state",
            type: "base",
            system: false,
            fields: [
                { name: "queue_dirty", type: "bool" },
                { name: "build_running", type: "bool" },
                { name: "rerun_requested", type: "bool" },
                { name: "last_changed_at", type: "date", required: true },
                { name: "last_built_at", type: "date" },
                { name: "build_started_at", type: "date" },
                { name: "lock_owner", type: "text" }
            ]
        });
        app.save(buildState);

        var cmsSessions = new Collection({
            name: "cms_sessions",
            type: "base",
            system: false,
            fields: [
                { name: "session_id", type: "text", required: true },
                { name: "admin_ref", type: "text", required: true },
                { name: "csrf_token", type: "text", required: true },
                { name: "expires_at", type: "date", required: true },
                { name: "last_seen_at", type: "date" },
                { name: "revoked_at", type: "date" }
            ],
            indexes: [
                "CREATE UNIQUE INDEX idx_cms_sessions_session_id ON cms_sessions (session_id)"
            ]
        });
        app.save(cmsSessions);

        var singleton = new Record(buildState);
        singleton.set("queue_dirty", false);
        singleton.set("build_running", false);
        singleton.set("rerun_requested", false);
        singleton.set("last_changed_at", new Date().toISOString());
        app.save(singleton);
    },
    function(app) {
        var collections = [
            "cms_sessions",
            "build_state",
            "build_logs",
            "carts",
            "orders",
            "products",
            "categories",
            "customers"
        ];
        var i;
        var collection;
        for (i = 0; i < collections.length; i += 1) {
            try {
                collection = app.findCollectionByNameOrId(collections[i]);
            } catch (e) {
                collection = null;
            }
            if (collection) {
                app.delete(collection);
            }
        }
    }
);
