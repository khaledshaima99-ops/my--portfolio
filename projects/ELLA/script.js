(function () {
  "use strict";

  var header = document.getElementById("siteHeader");
  var menuToggle = document.getElementById("menuToggle");
  var mainNav = document.getElementById("mainNav");

  function onScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 16);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function closeMenu() {
    if (!mainNav || !menuToggle) return;
    mainNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "فتح القائمة");
    document.body.classList.remove("nav-open");
  }

  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", function () {
      var open = mainNav.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
      menuToggle.setAttribute("aria-label", open ? "إغلاق القائمة" : "فتح القائمة");
      document.body.classList.toggle("nav-open", open);
    });

    mainNav.addEventListener("click", function (event) {
      if (event.target.closest("a")) closeMenu();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu();
    });
  }

  var links = Array.prototype.slice.call(document.querySelectorAll(".main-nav a[href^='#']"));
  var sections = links.map(function (link) {
    return document.querySelector(link.getAttribute("href"));
  }).filter(Boolean);

  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (link) {
          link.classList.toggle("is-active", link.getAttribute("href") === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "-42% 0px -52% 0px" });
    sections.forEach(function (section) { spy.observe(section); });
  }

  var revealItems = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if ("IntersectionObserver" in window) {
    var reveal = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1 });
    revealItems.forEach(function (item, index) {
      item.style.transitionDelay = (index % 4) * 60 + "ms";
      reveal.observe(item);
    });
  } else {
    revealItems.forEach(function (item) { item.classList.add("is-visible"); });
  }

  /* ---------- نافذة تفاصيل المنتج ---------- */
  var dialog = document.getElementById("productDialog");
  var dialogTitle = document.getElementById("dialogTitle");
  var dialogCat = document.getElementById("dialogCat");
  var dialogText = document.getElementById("dialogText");
  var dialogClose = document.getElementById("dialogClose");
  var dialogBtn = dialog ? dialog.querySelector(".dialog-btn") : null;

  var products = {
    gift: {
      cat: "بوكسات",
      title: "بوكس الشوكولاتة الفاخر",
      text: "تشكيلة شوكولاتة مختارة بعناية، بتغليف هادئ ولمسات ذهبية. مناسب للهدايا الشخصية وهدايا الشكر، ويمكن تنسيقه حسب المناسبة."
    },
    events: {
      cat: "مناسبات",
      title: "توزيعات المناسبات",
      text: "توزيعات متناسقة للأعراس والتهاني، تُختار ألوانها وتفاصيلها لتحمل اسم المناسبة وطابعها. تُنسّق يدويًا لتبدو موحّدة وأنيقة."
    },
    giftbox: {
      cat: "هدايا",
      title: "بوكس الهدايا المخصص",
      text: "أنت تختار التفاصيل، ونحن ننسّق الشكل النهائي: الألوان، البطاقة، وطريقة التغليف. بوكس يُبنى حول شخص المناسبة وذوقه."
    },
    detail: {
      cat: "ضيافة",
      title: "تنسيق الضيافة",
      text: "تفاصيل صغيرة تصنع فرقًا في استقبال الضيوف: تنسيق هادئ، تغليف مرتب، ولمسة تحمل هوية المناسبة."
    }
  };

  function openProduct(key) {
    var product = products[key];
    if (!dialog || !product) return;
    dialogCat.textContent = product.cat;
    dialogTitle.textContent = product.title;
    dialogText.textContent = product.text;
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  Array.prototype.slice.call(document.querySelectorAll("[data-product]")).forEach(function (button) {
    button.addEventListener("click", function () {
      openProduct(button.getAttribute("data-product"));
    });
  });

  if (dialog) {
    if (dialogClose) {
      dialogClose.addEventListener("click", function () { dialog.close(); });
    }
    if (dialogBtn) {
      dialogBtn.addEventListener("click", function () { dialog.close(); });
    }
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });
  }
})();
