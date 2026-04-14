routerAdd("GET", "/fragments/cart/checkout-summary", function(c) {
    return c.html(200, [
        "<div class=\"rounded-3xl border border-slate-200 bg-white p-6 shadow-sm\">",
        "<h2 style=\"margin-top:0;\">Checkout summary</h2>",
        "<p class=\"text-sm text-slate-500\">No checkout lines are available.</p>",
        "</div>"
    ].join(""));
});
