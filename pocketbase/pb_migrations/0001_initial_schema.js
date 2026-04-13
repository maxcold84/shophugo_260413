migrate(
    function(app) {
        var customers = new Collection({
            name: "customers",
            type: "base",
            system: false,
            schema: [
                { name: "email", type: "email", required: true, unique: true },
                { name: "password_hash", type: "text", required: true },
                { name: "active", type: "bool", required: true, options: { default: true } }
            ],
            indexes: [
                "CREATE UNIQUE INDEX idx_customers_email ON customers (email)"
            ]
        });
        app.save(customers);

        var products = new Collection({
            name: "products",
            type: "base",
            system: false,
            schema: [
                { name: "sku", type: "text", required: true, unique: true },
                { name: "name", type: "text", required: true },
                { name: "slug", type: "text", required: true, unique: true },
                { name: "price", type: "number", required: true },
                { name: "compare_price", type: "number", required: false },
                { name: "stock", type: "number", required: true, options: { min: 0, noDecimal: true } },
                { name: "description_markdown", type: "text", required: false },
                { name: "short_description", type: "text", required: false },
                { name: "images", type: "file", required: false, options: { maxSelect: 10, maxSize: 5242880, mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"] } },
                { name: "categories", type: "relation", required: false, options: { collectionId: "", cascadeDelete: false, minSelect: 0, maxSelect: 20, displayFields: ["name"] } },
                { name: "tags", type: "json", required: false },
                { name: "active", type: "bool", required: true, options: { default: true } },
                { name: "featured", type: "bool", required: true, options: { default: false } },
                { name: "visible", type: "bool", required: true, options: { default: true } },
                { name: "meta_title", type: "text", required: false },
                { name: "meta_desc", type: "text", required: false },
                { name: "sort_order", type: "number", required: true, options: { default: 0, noDecimal: true } }
            ],
            indexes: [
                "CREATE UNIQUE INDEX idx_products_sku ON products (sku)",
                "CREATE UNIQUE INDEX idx_products_slug ON products (slug)"
            ]
        });
        app.save(products);

        var categories = new Collection({
            name: "categories",
            type: "base",
            system: false,
            schema: [
                { name: "name", type: "text", required: true },
                { name: "slug", type: "text", required: true, unique: true },
                { name: "description", type: "text", required: false },
                { name: "image", type: "file", required: false, options: { maxSelect: 1, maxSize: 5242880, mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"] } },
                { name: "visible", type: "bool", required: true, options: { default: true } },
                { name: "sort_order", type: "number", required: true, options: { default: 0, noDecimal: true } },
                { name: "meta_title", type: "text", required: false },
                { name: "meta_desc", type: "text", required: false }
            ],
            indexes: [
                "CREATE UNIQUE INDEX idx_categories_slug ON categories (slug)"
            ]
        });
        app.save(categories);

        var orders = new Collection({
            name: "orders",
            type: "base",
            system: false,
            schema: [
                { name: "user", type: "relation", required: false, options: { collectionId: customers.id, cascadeDelete: false, minSelect: 0, maxSelect: 1, displayFields: ["email"] } },
                { name: "email", type: "email", required: false },
                { name: "status", type: "select", required: true, options: { maxSelect: 1, values: ["pending", "paid", "cancelled", "failed", "shipped", "done"] } },
                { name: "items", type: "json", required: true },
                { name: "subtotal_amount", type: "number", required: true, options: { noDecimal: true } },
                { name: "discount_amount", type: "number", required: true, options: { default: 0, noDecimal: true } },
                { name: "shipping_amount", type: "number", required: true, options: { default: 0, noDecimal: true } },
                { name: "tax_amount", type: "number", required: true, options: { default: 0, noDecimal: true } },
                { name: "total_amount", type: "number", required: true, options: { noDecimal: true } },
                { name: "address", type: "json", required: true },
                { name: "paid_at", type: "date", required: false },
                { name: "cancelled_at", type: "date", required: false }
            ]
        });
        app.save(orders);

        var carts = new Collection({
            name: "carts",
            type: "base",
            system: false,
            schema: [
                { name: "user", type: "relation", required: true, options: { collectionId: customers.id, cascadeDelete: true, minSelect: 1, maxSelect: 1, displayFields: ["email"] } },
                { name: "product", type: "relation", required: true, options: { collectionId: products.id, cascadeDelete: true, minSelect: 1, maxSelect: 1, displayFields: ["name"] } },
                { name: "qty", type: "number", required: true, options: { min: 1, noDecimal: true } }
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
            schema: [
                { name: "status", type: "select", required: true, options: { maxSelect: 1, values: ["pending", "running", "success", "failed"] } },
                { name: "triggered_by", type: "text", required: true },
                { name: "output", type: "text", required: false },
                { name: "duration_ms", type: "number", required: false, options: { noDecimal: true } }
            ]
        });
        app.save(buildLogs);

        var buildState = new Collection({
            name: "build_state",
            type: "base",
            system: false,
            schema: [
                { name: "queue_dirty", type: "bool", required: true, options: { default: false } },
                { name: "build_running", type: "bool", required: true, options: { default: false } },
                { name: "rerun_requested", type: "bool", required: true, options: { default: false } },
                { name: "last_changed_at", type: "date", required: true },
                { name: "last_built_at", type: "date", required: false },
                { name: "build_started_at", type: "date", required: false },
                { name: "lock_owner", type: "text", required: false }
            ]
        });
        app.save(buildState);

        var cmsSessions = new Collection({
            name: "cms_sessions",
            type: "base",
            system: false,
            schema: [
                { name: "session_id", type: "text", required: true, unique: true },
                { name: "admin_ref", type: "text", required: true },
                { name: "csrf_token", type: "text", required: true },
                { name: "expires_at", type: "date", required: true },
                { name: "last_seen_at", type: "date", required: false },
                { name: "revoked_at", type: "date", required: false }
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
            "categories",
            "products",
            "customers"
        ];
        var i;
        var collection;
        for (i = 0; i < collections.length; i += 1) {
            collection = app.findCollectionByNameOrId(collections[i]);
            if (collection) {
                app.delete(collection);
            }
        }
    }
);
