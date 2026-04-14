(function () {
  var script = document.currentScript;
  if (!script) {
    var scripts = document.querySelectorAll('script[src*="/widget.js"]');
    script = scripts.length ? scripts[scripts.length - 1] : null;
  }

  if (!script) return;

  var slug = script.getAttribute("data-ordering-slug");
  if (!slug) return;

  var buttonText = script.getAttribute("data-button-text") || "Order Now";
  var iframeHeight = script.getAttribute("data-iframe-height") || "680";
  var hideFloatingButton = script.getAttribute("data-hide-floating-button") === "true";
  var triggerSelector = script.getAttribute("data-trigger-selector") || "[data-ordering-link]";
  var scriptSrc = script.getAttribute("src") || "";

  var scriptOrigin = "";
  try {
    scriptOrigin = new URL(scriptSrc, window.location.href).origin;
  } catch {
    scriptOrigin = window.location.origin;
  }

  var iframeUrl = scriptOrigin + "/r/" + encodeURIComponent(slug) + "?embed=true";

  var button = document.createElement("button");
  button.type = "button";
  button.textContent = buttonText;
  button.style.position = "fixed";
  button.style.bottom = "20px";
  button.style.right = "20px";
  button.style.zIndex = "999999";
  button.style.border = "none";
  button.style.borderRadius = "999px";
  button.style.padding = "12px 18px";
  button.style.font = "600 14px sans-serif";
  button.style.cursor = "pointer";
  button.style.background = "#111827";
  button.style.color = "#ffffff";
  button.style.boxShadow = "0 10px 25px rgba(0,0,0,0.3)";

  var overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.55)";
  overlay.style.display = "none";
  overlay.style.zIndex = "999998";

  var modal = document.createElement("div");
  modal.style.position = "absolute";
  modal.style.left = "50%";
  modal.style.top = "50%";
  modal.style.transform = "translate(-50%, -50%)";
  modal.style.width = "min(1000px, 96vw)";
  modal.style.height = "min(" + iframeHeight + "px, 92vh)";
  modal.style.background = "#ffffff";
  modal.style.borderRadius = "14px";
  modal.style.overflow = "hidden";

  var close = document.createElement("button");
  close.type = "button";
  close.textContent = "Close";
  close.style.position = "absolute";
  close.style.top = "10px";
  close.style.right = "10px";
  close.style.zIndex = "2";
  close.style.border = "none";
  close.style.borderRadius = "8px";
  close.style.padding = "6px 10px";
  close.style.background = "rgba(17,24,39,0.9)";
  close.style.color = "#ffffff";
  close.style.cursor = "pointer";

  var iframe = document.createElement("iframe");
  iframe.src = iframeUrl;
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";
  iframe.setAttribute("title", "Restaurant ordering widget");

  function openModal() {
    overlay.style.display = "block";
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    overlay.style.display = "none";
    document.body.style.overflow = "";
  }

  function attachLinkTriggers() {
    var links = document.querySelectorAll(triggerSelector);
    links.forEach(function (node) {
      node.addEventListener("click", function (event) {
        event.preventDefault();
        openModal();
      });
    });
  }

  button.addEventListener("click", openModal);
  close.addEventListener("click", closeModal);
  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) {
      closeModal();
    }
  });

  modal.appendChild(close);
  modal.appendChild(iframe);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  if (!hideFloatingButton) {
    document.body.appendChild(button);
  }

  attachLinkTriggers();

  window.OrderingWidget = {
    open: openModal,
    close: closeModal,
  };
})();
