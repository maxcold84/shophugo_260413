function storeEval(path) {
    eval(String($os.readFile(path)));
}

storeEval(__hooks + "/config.js");
storeEval(__hooks + "/utils.js");
storeEval(__hooks + "/auth.js");
storeEval(__hooks + "/build.js");
storeEval(__hooks + "/cart.js");
storeEval(__hooks + "/routes_auth.js");
storeEval(__hooks + "/routes_build.js");
storeEval(__hooks + "/routes_cms.js");
storeEval(__hooks + "/routes_products.js");
storeEval(__hooks + "/routes_categories.js");
storeEval(__hooks + "/routes_cart.js");
storeEval(__hooks + "/routes_checkout.js");
storeEval(__hooks + "/routes_stock.js");
