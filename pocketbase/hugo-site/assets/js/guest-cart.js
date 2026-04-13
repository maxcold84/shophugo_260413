(function () {
  var storageKey = "phs_guest_cart";

  function readCart() {
    try {
      return JSON.parse(window.localStorage.getItem(storageKey) || "[]");
    } catch (error) {
      return [];
    }
  }

  function writeCart(lines) {
    window.localStorage.setItem(storageKey, JSON.stringify(lines));
  }

  function upsertLine(productId, qty) {
    var lines = readCart();
    var next = [];
    var found = false;
    lines.forEach(function (line) {
      if (line.product_id === productId) {
        found = true;
        if (qty > 0) {
          next.push({ product_id: productId, qty: qty });
        }
      } else {
        next.push(line);
      }
    });
    if (!found && qty > 0) {
      next.push({ product_id: productId, qty: qty });
    }
    writeCart(next);
    return next;
  }

  function attachProductForms() {
    document.querySelectorAll("[data-guest-cart-form]").forEach(function (form) {
      form.addEventListener("submit", function (event) {
        var productId = form.querySelector("[name='product_id']").value;
        var qtyField = form.querySelector("[name='qty']");
        var qty = parseInt(qtyField.value || "1", 10);
        if (Number.isNaN(qty) || qty < 1) {
          qty = 1;
        }
        upsertLine(productId, qty);
      });
    });
  }

  function hydrateCheckoutForms() {
    document.querySelectorAll("[data-guest-cart-lines]").forEach(function (container) {
      var lines = readCart();
      container.innerHTML = "";
      lines.forEach(function (line) {
        var id = document.createElement("input");
        id.type = "hidden";
        id.name = "product_id";
        id.value = line.product_id;
        container.appendChild(id);

        var qty = document.createElement("input");
        qty.type = "hidden";
        qty.name = "qty";
        qty.value = String(line.qty);
        container.appendChild(qty);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    attachProductForms();
    hydrateCheckoutForms();
  });
})();
