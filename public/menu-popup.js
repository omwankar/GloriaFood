(function () {
  var alreadyInitialized = false;

  function findScriptTag() {
    var current = document.currentScript;
    if (current && current.getAttribute("data-menu-url")) {
      return current;
    }

    var scripts = document.querySelectorAll('script[src*="menu-popup.js"][data-menu-url]');
    if (!scripts.length) return null;
    return scripts[scripts.length - 1];
  }

  function createPopup(config) {
    const button = document.createElement("button");
    button.setAttribute("type", "button");
    button.setAttribute("data-menu-button", "true");
    button.textContent = config.buttonText || "Order Online";
    button.style.position = "fixed";
    button.style.right = "24px";
    button.style.bottom = "24px";
    button.style.zIndex = "999999";
    button.style.padding = "12px 16px";
    button.style.borderRadius = "999px";
    button.style.border = "none";
    button.style.cursor = "pointer";
    button.style.color = "#fff";
    button.style.fontWeight = "600";
    button.style.background = "linear-gradient(135deg,#7e22ce,#5b21b6)";
    button.style.boxShadow = "0 10px 25px rgba(0,0,0,0.35)";

    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.55)";
    overlay.style.display = "none";
    overlay.style.zIndex = "999998";

    const modal = document.createElement("div");
    modal.style.position = "absolute";
    modal.style.top = "50%";
    modal.style.left = "50%";
    modal.style.transform = "translate(-50%,-50%)";
    modal.style.width = "min(980px, 95vw)";
    modal.style.height = "min(760px, 90vh)";
    modal.style.borderRadius = "14px";
    modal.style.overflow = "hidden";
    modal.style.background = "#0b0514";

    const close = document.createElement("button");
    close.textContent = "×";
    close.style.position = "absolute";
    close.style.top = "8px";
    close.style.right = "12px";
    close.style.zIndex = "2";
    close.style.border = "none";
    close.style.background = "transparent";
    close.style.color = "#fff";
    close.style.fontSize = "28px";
    close.style.cursor = "pointer";

    const iframe = document.createElement("iframe");
    iframe.src = config.url;
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "0";
    iframe.allow = "clipboard-write";
    iframe.setAttribute(
      "sandbox",
      "allow-scripts allow-same-origin allow-forms allow-popups allow-modals",
    );

    modal.appendChild(close);
    modal.appendChild(iframe);
    overlay.appendChild(modal);

    function openModal() {
      overlay.style.display = "block";
      document.body.style.overflow = "hidden";
    }

    button.addEventListener("click", function (event) {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      openModal();
    });

    function closeModal() {
      overlay.style.display = "none";
      document.body.style.overflow = "";
    }

    close.addEventListener("click", closeModal);
    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) closeModal();
    });

    window.MenuPopup = {
      open: openModal,
      close: closeModal,
    };

    if (config.hideFloatingButton) {
      button.style.display = "none";
    }

    document.body.appendChild(button);
    document.body.appendChild(overlay);
  }

  function init() {
    if (alreadyInitialized) return;
    alreadyInitialized = true;

    var scriptTag = findScriptTag();
    var url = scriptTag && scriptTag.getAttribute("data-menu-url");
    var text = scriptTag && scriptTag.getAttribute("data-button-text");
    var hideFloatingButton =
      (scriptTag && scriptTag.getAttribute("data-hide-floating-button")) === "true";

    if (!url) {
      return;
    }

    createPopup({ url: url, buttonText: text, hideFloatingButton: hideFloatingButton });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
