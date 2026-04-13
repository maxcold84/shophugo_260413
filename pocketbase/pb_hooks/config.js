module.exports = {
    cms: {
        cookieName: "cms_session",
        cookiePath: "/cms",
        sessionHours: 4,
        sameSite: 2,
        secure: false
    },
    customer: {
        cookieName: "customer_session",
        cookiePath: "/",
        sameSite: 2,
        secure: false
    },
    build: {
        cronSpec: "*/5 * * * * *",
        quietWindowMs: 3000,
        staleLockMs: 300000,
        lockOwner: "pb_hooks.build",
        hugoSource: __hooks + "/../hugo-site",
        hugoDestination: __hooks + "/../pb_public",
        productsDataFile: __hooks + "/../hugo-site/data/products.json",
        categoriesDataFile: __hooks + "/../hugo-site/data/categories.json",
        generatedContentRoot: __hooks + "/../hugo-site/content/generated"
    },
    inventory: {
        lowStockThreshold: 5
    },
    site: {
        title: "Pocket Hugo Store",
        baseUrl: "https://example.com/"
    }
};
