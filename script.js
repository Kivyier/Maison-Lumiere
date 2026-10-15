const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.getElementById("site-nav");

menuToggle.addEventListener("click", () => {
  const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isExpanded));
  siteNav.classList.toggle("is-open", !isExpanded);
});

siteNav.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    menuToggle.setAttribute("aria-expanded", "false");
    siteNav.classList.remove("is-open");
  }
});

document.getElementById("year").textContent = new Date().getFullYear();

const menuPreview = document.querySelector(".menu-preview");
if (menuPreview) {
  const previewGrid = menuPreview.querySelector(".menu-preview-grid");
  const previewDescription = menuPreview.querySelector(".menu-heading > p");
  const defaultPreviewDescription = previewDescription.textContent;

  function showMenuPreviewDescription(event) {
    const card = event.target.closest(".menu-preview-card");
    if (!card || !previewGrid.contains(card) || card.contains(event.relatedTarget)) {
      return;
    }

    previewDescription.textContent = card.dataset.previewDescription;
  }

  function restoreMenuPreviewDescription(event) {
    const card = event.target.closest(".menu-preview-card");
    if (!card || !previewGrid.contains(card) || card.contains(event.relatedTarget)) {
      return;
    }

    previewDescription.textContent = defaultPreviewDescription;
  }

  previewGrid.addEventListener("mouseover", showMenuPreviewDescription);
  previewGrid.addEventListener("mouseout", restoreMenuPreviewDescription);
  previewGrid.addEventListener("focusin", showMenuPreviewDescription);
  previewGrid.addEventListener("focusout", restoreMenuPreviewDescription);
}

const reservationForm = document.querySelector(".reservation-form");
if (reservationForm) {
  const dateInput = reservationForm.elements.date;
  const reservationToast = document.querySelector(".reservation-toast");
  const today = new Date();
  let reservationToastTimeout;
  dateInput.min = new Date(today.getTime() - today.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);

  function showReservationToast(message) {
    reservationToast.textContent = message;
    reservationToast.classList.add("is-visible");
    window.clearTimeout(reservationToastTimeout);
    reservationToastTimeout = window.setTimeout(() => {
      reservationToast.classList.remove("is-visible");
    }, 4000);
  }

  function updateReservationSelection(event) {
    if (!event.target.matches('[name="date"], [name="time"], [name="guests"]')) {
      return;
    }

    const selectedDate = dateInput.value
      ? new Date(`${dateInput.value}T00:00:00`).toLocaleDateString("en-PH", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "";
    const selection = [
      reservationForm.querySelector('[name="guests"]').value,
      reservationForm.querySelector('[name="time"]').value,
      selectedDate,
    ]
      .filter(Boolean)
      .join(" · ");

    if (selection) showReservationToast(`Reservation details updated: ${selection}.`);
  }

  reservationForm.addEventListener("change", updateReservationSelection);
  reservationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    showReservationToast("Thank you! Your reservation request is ready.");
  });
}

const menuGrid = document.querySelector(".menu-grid");
const orderSummary = document.getElementById("order-summary");
const menuCategorySelect = document.getElementById("menu-category-select");
if (menuCategorySelect && menuGrid) {
  let categoryScrollFrame = 0;

  const updateMenuCategorySelection = () => {
    categoryScrollFrame = 0;
    const activationLine =
      document.querySelector(".site-header").getBoundingClientRect().height + 48;
    const gridBounds = menuGrid.getBoundingClientRect();

    if (gridBounds.top > activationLine || gridBounds.bottom < activationLine) {
      menuCategorySelect.value = "#menu";
      return;
    }

    const visibleCategories = menuCategories.filter(
      (category) => !category.hidden,
    );
    if (visibleCategories.length === 0) {
      menuCategorySelect.value = "#menu";
      return;
    }

    let activeCategory = visibleCategories[0];
    for (const category of visibleCategories) {
      if (category.getBoundingClientRect().top <= activationLine) {
        activeCategory = category;
      } else {
        break;
      }
    }
    menuCategorySelect.value = `#${activeCategory.id}`;
  };

  const scheduleMenuCategorySelectionUpdate = () => {
    if (!categoryScrollFrame) {
      categoryScrollFrame = window.requestAnimationFrame(
        updateMenuCategorySelection,
      );
    }
  };

  menuCategorySelect.addEventListener("change", () => {
    const selectedCategory = menuCategorySelect.value;
    if (menuSearch && menuSearch.value) {
      menuSearch.value = "";
      updateMenuSearch();
      menuCategorySelect.value = selectedCategory;
    }
    const target = document.querySelector(menuCategorySelect.value);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  window.addEventListener("scroll", scheduleMenuCategorySelectionUpdate, {
    passive: true,
  });
  window.addEventListener("resize", scheduleMenuCategorySelectionUpdate);
  updateMenuCategorySelection();
}

if (menuGrid && orderSummary) {
  const cartButton = document.querySelector(".order-cart-toggle");
  const orderToast = document.querySelector(".order-toast");
  const countDisplay = cartButton.querySelector(".order-count");
  const cartTotalDisplay = cartButton.querySelector(".order-cart-total");
  const itemList = orderSummary.querySelector(".order-items");
  const emptyMessage = orderSummary.querySelector(".order-empty");
  const totalDisplay = orderSummary.querySelector(".order-total strong");
  const statusMessage = orderSummary.querySelector(".order-status");
  const clearButton = orderSummary.querySelector(".order-clear");
  const submitButton = orderSummary.querySelector(".order-submit");
  const cart = new Map();
  let toastTimeout;

  const formatPrice = (price) => `₱${price.toLocaleString("en-PH")}`;
  const showOrderToast = (message) => {
    orderToast.textContent = message;
    orderToast.classList.add("is-visible");
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => {
      orderToast.classList.remove("is-visible");
    }, 4000);
  };
  const getOrderTotal = () =>
    [...cart.values()].reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );

  const renderOrder = () => {
    const itemCount = [...cart.values()].reduce(
      (total, item) => total + item.quantity,
      0,
    );
    const orderTotal = getOrderTotal();
    countDisplay.textContent = String(itemCount);
    cartTotalDisplay.textContent = formatPrice(orderTotal);
    cartButton.setAttribute(
      "aria-label",
      `View your order, ${itemCount} ${itemCount === 1 ? "item" : "items"}, ${formatPrice(orderTotal)}`,
    );
    emptyMessage.hidden = cart.size > 0;
    itemList.replaceChildren();

    for (const [name, item] of cart) {
      const row = document.createElement("li");
      const itemName = document.createElement("span");
      itemName.className = "order-item-name";
      itemName.textContent = name;

      const subtotal = document.createElement("span");
      subtotal.className = "order-item-subtotal";
      subtotal.textContent = formatPrice(item.price * item.quantity);

      const controls = document.createElement("div");
      controls.className = "order-quantity-controls";
      controls.setAttribute("aria-label", `Quantity for ${name}`);

      const decreaseButton = document.createElement("button");
      decreaseButton.type = "button";
      decreaseButton.dataset.orderAction = "decrease";
      decreaseButton.dataset.itemName = name;
      decreaseButton.setAttribute("aria-label", `Remove one ${name}`);
      decreaseButton.textContent = "−";

      const quantity = document.createElement("span");
      quantity.className = "order-quantity";
      quantity.textContent = String(item.quantity);
      quantity.setAttribute("aria-label", "Quantity");

      const increaseButton = document.createElement("button");
      increaseButton.type = "button";
      increaseButton.dataset.orderAction = "increase";
      increaseButton.dataset.itemName = name;
      increaseButton.setAttribute("aria-label", `Add one ${name}`);
      increaseButton.textContent = "+";

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "order-remove";
      removeButton.dataset.orderAction = "remove";
      removeButton.dataset.itemName = name;
      removeButton.textContent = "Remove";
      removeButton.setAttribute("aria-label", `Remove ${name} from your order`);

      controls.append(
        decreaseButton,
        quantity,
        increaseButton,
        removeButton,
      );
      row.append(itemName, subtotal, controls);
      itemList.append(row);
    }

    totalDisplay.textContent = formatPrice(orderTotal);
    clearButton.disabled = cart.size === 0;
    submitButton.disabled = cart.size === 0;
  };

  menuGrid.querySelectorAll(".menu-list li").forEach((menuItem) => {
    const name = menuItem.querySelector("h4").textContent.trim();
    const priceText = menuItem.querySelector(".menu-price").textContent;
    const price = Number(priceText.replace(/[^\d]/g, ""));
    const details = menuItem.querySelector("div");
    const addButton = document.createElement("button");

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(`Invalid menu price for "${name}": ${priceText}`);
    }

    addButton.type = "button";
    addButton.className = "add-to-order";
    addButton.setAttribute("aria-label", `Add ${name} to your order`);
    addButton.append(document.createTextNode("Add to order "));
    const addIcon = document.createElement("span");
    addIcon.setAttribute("aria-hidden", "true");
    addIcon.textContent = "+";
    addButton.append(addIcon);
    details.append(addButton);
  });

  menuGrid.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest(".add-to-order");
    if (!button) return;

    const menuItem = button.closest("li");
    const name = menuItem.querySelector("h4").textContent.trim();
    const priceText = menuItem.querySelector(".menu-price").textContent;
    const price = Number(priceText.replace(/[^\d]/g, ""));
    const item = cart.get(name) || { price, quantity: 0 };
    item.quantity += 1;
    cart.set(name, item);
    const message = `${name} added to your order.`;
    statusMessage.textContent = message;
    renderOrder();
    showOrderToast(message);
  });

  cartButton.addEventListener("click", () => {
    orderSummary.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const orderVisibilityObserver = new IntersectionObserver(
    ([entry]) => {
      cartButton.classList.toggle("is-hidden", entry.isIntersecting);
    },
    { threshold: 0.15 },
  );
  orderVisibilityObserver.observe(orderSummary);

  itemList.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest("button[data-order-action]");
    if (!button) return;

    const item = cart.get(button.dataset.itemName);
    if (!item) return;

    if (button.dataset.orderAction === "increase") {
      item.quantity += 1;
    } else if (button.dataset.orderAction === "decrease") {
      item.quantity -= 1;
      if (item.quantity <= 0) cart.delete(button.dataset.itemName);
    } else if (button.dataset.orderAction === "remove") {
      cart.delete(button.dataset.itemName);
    }

    statusMessage.textContent = "";
    renderOrder();
  });

  clearButton.addEventListener("click", () => {
    cart.clear();
    statusMessage.textContent = "Your order has been cleared.";
    renderOrder();
  });

  submitButton.addEventListener("click", () => {
    const message = "Your order has been placed.";
    statusMessage.textContent = message;
    showOrderToast(message);
  });

  renderOrder();
}
