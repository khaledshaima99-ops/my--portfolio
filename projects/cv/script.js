(function () {
  "use strict";

  var header = document.getElementById("siteHeader");
  var menuToggle = document.getElementById("menuToggle");
  var mainNav = document.getElementById("mainNav");

  /* ظل الترويسة */
  function onScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 18);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* قائمة الجوال */
  function closeMenu() {
    if (!mainNav || !menuToggle) return;
    mainNav.classList.remove("is-open");
    mainNav.inert = window.innerWidth <= 1100;
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "فتح القائمة");
    document.body.classList.remove("nav-open");
  }

  if (menuToggle && mainNav) {
    mainNav.inert = window.innerWidth <= 1100;

    menuToggle.addEventListener("click", function () {
      var open = mainNav.classList.toggle("is-open");
      mainNav.inert = !open;
      menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
      menuToggle.setAttribute("aria-label", open ? "إغلاق القائمة" : "فتح القائمة");
      document.body.classList.toggle("nav-open", open);
    });

    mainNav.addEventListener("click", function (event) {
      if (event.target.closest("a")) closeMenu();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && mainNav.classList.contains("is-open")) {
        closeMenu();
        menuToggle.focus();
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 1100) {
        closeMenu();
      } else if (!mainNav.classList.contains("is-open")) {
        mainNav.inert = true;
      }
    });
  }

  /* تمييز القسم النشط */
  var links = Array.prototype.slice.call(document.querySelectorAll(".main-nav a[href^='#']"));
  var sections = links
    .map(function (link) {
      return document.querySelector(link.getAttribute("href"));
    })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          links.forEach(function (link) {
            var isActive = link.getAttribute("href") === "#" + entry.target.id;
            link.classList.toggle("is-active", isActive);
            if (isActive) {
              link.setAttribute("aria-current", "location");
            } else {
              link.removeAttribute("aria-current");
            }
          });
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach(function (section) {
      spy.observe(section);
    });
  }

  /* ظهور العناصر */
  var revealItems = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if ("IntersectionObserver" in window) {
    var reveal = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.1 }
    );
    revealItems.forEach(function (item, index) {
      item.style.transitionDelay = (index % 4) * 60 + "ms";
      reveal.observe(item);
    });
  } else {
    revealItems.forEach(function (item) {
      item.classList.add("is-visible");
    });
  }

  /* زر الطباعة */
  var printBtn = document.getElementById("printBtn");
  if (printBtn) {
    printBtn.addEventListener("click", function () {
      window.print();
    });
  }

  /* نموذج التواصل — يفتح تطبيق البريد */
  var form = document.getElementById("contactForm");
  var formNote = document.getElementById("formNote");
  var EMAIL = "khaledshaima99@gmail.com";

  function setNote(message, tone) {
    if (!formNote) return;
    formNote.textContent = message;
    formNote.classList.remove("is-error", "is-ok");
    if (tone) formNote.classList.add("is-" + tone);
  }

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var nameField = document.getElementById("name");
      var emailField = document.getElementById("email");
      var messageField = document.getElementById("message");

      var name = nameField ? nameField.value.trim() : "";
      var email = emailField ? emailField.value.trim() : "";
      var message = messageField ? messageField.value.trim() : "";

      if (!name || !email || !message) {
        setNote("يرجى تعبئة الاسم والبريد والرسالة قبل الإرسال.", "error");
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setNote("يرجى إدخال بريد إلكتروني صحيح.", "error");
        if (emailField) emailField.focus();
        return;
      }

      var subject = "رسالة من " + name + " عبر السيرة الذاتية";
      var body = message + "\n\n— " + name + "\n" + email;
      var mailto =
        "mailto:" + EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);

      setNote("يتم فتح تطبيق البريد لإرسال رسالتك…", "ok");
      window.location.href = mailto;
    });

    form.addEventListener("input", function () {
      if (formNote && formNote.classList.contains("is-error")) {
        setNote("سيتم فتح تطبيق البريد لديك لإرسال الرسالة مباشرة.", null);
      }
    });
  }
})();
