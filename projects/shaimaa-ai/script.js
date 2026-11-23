(function () {
  "use strict";

  /* ======================================================================
     الترويسة والقائمة
     ====================================================================== */
  var header = document.getElementById("siteHeader");
  var menuToggle = document.getElementById("menuToggle");
  var mainNav = document.getElementById("mainNav");

  function onScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 18);
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

  /* تمييز القسم النشط */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".main-nav a[href^='#']"));
  var sections = navLinks
    .map(function (link) {
      return document.querySelector(link.getAttribute("href"));
    })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          navLinks.forEach(function (link) {
            link.classList.toggle("is-active", link.getAttribute("href") === "#" + entry.target.id);
          });
        });
      },
      { rootMargin: "-42% 0px -52% 0px" }
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
      item.style.transitionDelay = (index % 4) * 70 + "ms";
      reveal.observe(item);
    });
  } else {
    revealItems.forEach(function (item) {
      item.classList.add("is-visible");
    });
  }

  /* ======================================================================
     أدوات الاستوديو — تبويبات
     ====================================================================== */
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".studio-tab"));
  var panels = {
    tts: document.getElementById("panelTts"),
    stt: document.getElementById("panelStt")
  };

  function activateStudioTab(name) {
    if (!panels[name]) return;

    tabs.forEach(function (tab) {
      var active = tab.getAttribute("data-tab") === name;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });

    Object.keys(panels).forEach(function (key) {
      if (!panels[key]) return;
      var active = key === name;
      panels[key].classList.toggle("is-active", active);
      panels[key].hidden = !active;
    });
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      activateStudioTab(tab.getAttribute("data-tab"));
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-studio-tab]"), function (link) {
    link.addEventListener("click", function () {
      activateStudioTab(link.getAttribute("data-studio-tab"));
    });
  });

  /* ======================================================================
     نص إلى صوت (Web Speech Synthesis)
     ====================================================================== */
  var ttsText = document.getElementById("ttsText");
  var charCount = document.getElementById("charCount");
  var clearText = document.getElementById("clearText");
  var voiceSelect = document.getElementById("voiceSelect");
  var styleSelect = document.getElementById("styleSelect");
  var rateRange = document.getElementById("rateRange");
  var rateValue = document.getElementById("rateValue");
  var pitchRange = document.getElementById("pitchRange");
  var pitchValue = document.getElementById("pitchValue");
  var playBtn = document.getElementById("playBtn");
  var stopBtn = document.getElementById("stopBtn");
  var ttsStatus = document.getElementById("ttsStatus");
  var voicesNote = document.getElementById("voicesNote");

  var synth = window.speechSynthesis || null;
  var SpeechSynthesisUtterance = window.SpeechSynthesisUtterance;
  var allVoices = [];
  var manualVoice = false;
  var ttsPlaybackId = 0;

  var MAX_CHARS = 500;

  function setStatus(el, message, tone) {
    if (!el) return;
    el.textContent = message;
    el.classList.remove("is-error", "is-ok");
    if (tone) el.classList.add("is-" + tone);
  }

  var customVoiceName = document.getElementById("customVoiceName");
  var customVoiceGender = document.getElementById("customVoiceGender");
  var customVoiceFile = document.getElementById("customVoiceFile");
  var recordCustomVoice = document.getElementById("recordCustomVoice");
  var stopCustomVoice = document.getElementById("stopCustomVoice");
  var saveCustomVoice = document.getElementById("saveCustomVoice");
  var customVoiceStatus = document.getElementById("customVoiceStatus");
  var customVoiceList = document.getElementById("customVoiceList");
  var customVoiceBlob = null;
  var customVoiceRecorder = null;
  var customVoiceStream = null;
  var customVoiceChunks = [];
  var customVoiceTimer = null;
  var customVoiceObjectUrls = [];
  var customVoiceDbPromise = null;
  var MAX_CUSTOM_VOICE_BYTES = 20 * 1024 * 1024;
  var MAX_CUSTOM_VOICE_DURATION = 30000;
  var CUSTOM_VOICE_DB = "shaimaa-ai-custom-voices";
  var CUSTOM_VOICE_STORE = "samples";

  function openCustomVoiceDb() {
    if (!window.indexedDB) {
      return Promise.reject(new Error("IndexedDB is not supported in this browser."));
    }

    if (!customVoiceDbPromise) {
      customVoiceDbPromise = new Promise(function (resolve, reject) {
        var request;
        try {
          request = window.indexedDB.open(CUSTOM_VOICE_DB, 1);
        } catch (error) {
          reject(error);
          return;
        }

        request.onupgradeneeded = function () {
          var db = request.result;
          if (!db.objectStoreNames.contains(CUSTOM_VOICE_STORE)) {
            db.createObjectStore(CUSTOM_VOICE_STORE, { keyPath: "id" });
          }
        };
        request.onsuccess = function () {
          var db = request.result;
          db.onversionchange = function () {
            db.close();
            customVoiceDbPromise = null;
          };
          resolve(db);
        };
        request.onerror = function () {
          reject(request.error || new Error("Could not open the voice library."));
        };
        request.onblocked = function () {
          reject(new Error("The voice library is blocked by another open page."));
        };
      }).catch(function (error) {
        customVoiceDbPromise = null;
        throw error;
      });
    }

    return customVoiceDbPromise;
  }

  function useCustomVoiceStore(mode, operation) {
    return openCustomVoiceDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction;
        var request;
        var result;
        try {
          transaction = db.transaction(CUSTOM_VOICE_STORE, mode);
          request = operation(transaction.objectStore(CUSTOM_VOICE_STORE));
        } catch (error) {
          reject(error);
          return;
        }
        request.onsuccess = function () {
          result = request.result;
        };
        request.onerror = function () {
          reject(request.error || new Error("The voice library request failed."));
        };
        transaction.oncomplete = function () {
          resolve(result);
        };
        transaction.onerror = function () {
          reject(transaction.error || new Error("The voice library transaction failed."));
        };
        transaction.onabort = function () {
          reject(transaction.error || new Error("The voice library transaction was aborted."));
        };
      });
    });
  }

  function customVoiceErrorMessage(error, action) {
    if (error && error.name === "QuotaExceededError") {
      return "تعذّر " + action + " لعدم توفر مساحة تخزين كافية في المتصفح.";
    }
    return "تعذّر " + action + " في قائمة الأصوات المحفوظة. تحقق من إعدادات التخزين في المتصفح ثم أعد المحاولة.";
  }

  function setCustomVoicePending(blob) {
    customVoiceBlob = blob;
    if (saveCustomVoice) saveCustomVoice.disabled = !blob;
  }

  function stopCustomVoiceStream() {
    if (!customVoiceStream) return;
    customVoiceStream.getTracks().forEach(function (track) {
      track.stop();
    });
    customVoiceStream = null;
  }

  function renderCustomVoices(voices) {
    if (!customVoiceList) return;
    customVoiceObjectUrls.forEach(function (url) {
      URL.revokeObjectURL(url);
    });
    customVoiceObjectUrls = [];
    customVoiceList.replaceChildren();

    voices.sort(function (a, b) {
      return b.createdAt - a.createdAt;
    }).forEach(function (voice) {
      var card = document.createElement("article");
      card.className = "voice-card custom-voice-card";

      var avatar = document.createElement("span");
      avatar.className = "voice-avatar" + (voice.gender === "female" ? " alt" : "");
      avatar.setAttribute("aria-hidden", "true");
      avatar.textContent = voice.name.charAt(0) || "ص";

      var info = document.createElement("div");
      info.className = "voice-info";
      var name = document.createElement("strong");
      name.textContent = voice.name;
      var details = document.createElement("small");
      details.textContent = "عيّنة محفوظة · " + ({
        female: "أنثوي",
        male: "ذكوري",
        neutral: "غير محدد"
      }[voice.gender] || "غير محدد");
      info.appendChild(name);
      info.appendChild(details);

      var removeButton = document.createElement("button");
      removeButton.className = "custom-voice-delete";
      removeButton.type = "button";
      removeButton.textContent = "حذف";
      removeButton.setAttribute("aria-label", "حذف العينة " + voice.name);
      removeButton.addEventListener("click", function () {
        deleteCustomVoice(voice);
      });

      var audio = document.createElement("audio");
      audio.controls = true;
      audio.preload = "none";
      audio.setAttribute("aria-label", "معاينة العينة " + voice.name);
      var url = URL.createObjectURL(voice.blob);
      customVoiceObjectUrls.push(url);
      audio.src = url;

      card.appendChild(avatar);
      card.appendChild(info);
      card.appendChild(removeButton);
      card.appendChild(audio);
      customVoiceList.appendChild(card);
    });
  }

  function loadCustomVoices() {
    if (!customVoiceList) return;
    useCustomVoiceStore("readonly", function (store) {
      return store.getAll();
    }).then(function (voices) {
      renderCustomVoices(voices || []);
    }).catch(function (error) {
      setStatus(customVoiceStatus, customVoiceErrorMessage(error, "تحميل العينات"), "error");
    });
  }

  function deleteCustomVoice(voice) {
    if (!window.confirm("هل تريد حذف العينة الصوتية «" + voice.name + "» من هذا المتصفح؟")) return;
    useCustomVoiceStore("readwrite", function (store) {
      return store.delete(voice.id);
    }).then(function () {
      setStatus(customVoiceStatus, "تم حذف العينة الصوتية من هذا المتصفح.", "ok");
      loadCustomVoices();
    }).catch(function (error) {
      setStatus(customVoiceStatus, customVoiceErrorMessage(error, "حذف العينة"), "error");
    });
  }

  if (customVoiceList) loadCustomVoices();

  if (customVoiceFile) {
    customVoiceFile.addEventListener("change", function () {
      var file = customVoiceFile.files && customVoiceFile.files[0];
      if (!file) {
        setCustomVoicePending(null);
        return;
      }
      if ((file.type && file.type.indexOf("audio/") !== 0) || !file.size) {
        customVoiceFile.value = "";
        setCustomVoicePending(null);
        setStatus(customVoiceStatus, "اختاري ملفًا صوتيًا صالحًا وغير فارغ.", "error");
        return;
      }
      if (file.size > MAX_CUSTOM_VOICE_BYTES) {
        customVoiceFile.value = "";
        setCustomVoicePending(null);
        setStatus(customVoiceStatus, "حجم الملف أكبر من الحد المسموح (20 ميغابايت). اختاري ملفًا أقصر.", "error");
        return;
      }
      setCustomVoicePending(file);
      setStatus(customVoiceStatus, "تم اختيار الملف. اضغطي «حفظ في قائمتي» لحفظه في هذا المتصفح.", null);
    });
  }

  if (recordCustomVoice) {
    recordCustomVoice.addEventListener("click", async function () {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
        setStatus(customVoiceStatus, "التسجيل غير مدعوم في هذا المتصفح. جرّبي Chrome أو Edge عبر HTTPS أو localhost.", "error");
        return;
      }
      if (!window.isSecureContext) {
        setStatus(customVoiceStatus, "يتطلب الوصول إلى الميكروفون اتصالًا آمنًا (HTTPS أو localhost).", "error");
        return;
      }

      recordCustomVoice.disabled = true;
      if (customVoiceFile) customVoiceFile.disabled = true;
      setCustomVoicePending(null);
      if (customVoiceFile) customVoiceFile.value = "";
      try {
        customVoiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        customVoiceChunks = [];
        var options = {};
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          options.mimeType = "audio/webm;codecs=opus";
        }
        var activeRecorder = new MediaRecorder(customVoiceStream, options);
        customVoiceRecorder = activeRecorder;
        activeRecorder.addEventListener("dataavailable", function (event) {
          if (event.data.size) customVoiceChunks.push(event.data);
        });
        activeRecorder.addEventListener("stop", function () {
          if (customVoiceTimer) window.clearTimeout(customVoiceTimer);
          customVoiceTimer = null;
          stopCustomVoiceStream();
          customVoiceRecorder = null;
          if (stopCustomVoice) stopCustomVoice.disabled = true;
          if (recordCustomVoice) recordCustomVoice.disabled = false;
          if (customVoiceFile) customVoiceFile.disabled = false;
          var blob = new Blob(customVoiceChunks, { type: activeRecorder.mimeType || "audio/webm" });
          if (!blob.size) {
            setStatus(customVoiceStatus, "لم يتم تسجيل صوت. تحققي من الميكروفون ثم حاولي مجددًا.", "error");
            return;
          }
          setCustomVoicePending(blob);
          setStatus(customVoiceStatus, "اكتمل التسجيل. اضغطي «حفظ في قائمتي» للاحتفاظ بالعيّنة.", "ok");
        });
        activeRecorder.addEventListener("error", function () {
          if (customVoiceTimer) window.clearTimeout(customVoiceTimer);
          customVoiceTimer = null;
          stopCustomVoiceStream();
          customVoiceRecorder = null;
          if (stopCustomVoice) stopCustomVoice.disabled = true;
          if (recordCustomVoice) recordCustomVoice.disabled = false;
          if (customVoiceFile) customVoiceFile.disabled = false;
          setStatus(customVoiceStatus, "حدث خطأ أثناء التسجيل. تحققي من الميكروفون وحاولي مجددًا.", "error");
        });
        activeRecorder.start();
        if (stopCustomVoice) stopCustomVoice.disabled = false;
        setStatus(customVoiceStatus, "جارٍ تسجيل العيّنة. سيتوقف التسجيل تلقائيًا بعد 30 ثانية.", null);
        customVoiceTimer = window.setTimeout(function () {
          if (customVoiceRecorder && customVoiceRecorder.state !== "inactive") customVoiceRecorder.stop();
        }, MAX_CUSTOM_VOICE_DURATION);
      } catch (error) {
        stopCustomVoiceStream();
        recordCustomVoice.disabled = false;
        if (customVoiceFile) customVoiceFile.disabled = false;
        var message = error && error.name === "NotAllowedError"
          ? "لم يُسمح باستخدام الميكروفون. امنحي الموقع الإذن من إعدادات المتصفح ثم حاولي مجددًا."
          : "تعذّر بدء التسجيل. تحققي من اتصال الميكروفون وإعدادات المتصفح.";
        setStatus(customVoiceStatus, message, "error");
      }
    });
  }

  if (stopCustomVoice) {
    stopCustomVoice.addEventListener("click", function () {
      if (customVoiceRecorder && customVoiceRecorder.state !== "inactive") {
        customVoiceRecorder.stop();
        setStatus(customVoiceStatus, "جارٍ إنهاء التسجيل…", null);
      }
    });
  }

  if (saveCustomVoice) {
    saveCustomVoice.addEventListener("click", function () {
      var name = customVoiceName ? customVoiceName.value.trim() : "";
      if (!name) {
        setStatus(customVoiceStatus, "اكتبي اسمًا للعيّنة قبل حفظها.", "error");
        if (customVoiceName) customVoiceName.focus();
        return;
      }
      if (!customVoiceBlob || !customVoiceBlob.size) {
        setStatus(customVoiceStatus, "سجّلي عيّنة أو اختاري ملفًا صوتيًا أولًا.", "error");
        return;
      }
      if (customVoiceBlob.size > MAX_CUSTOM_VOICE_BYTES) {
        setStatus(customVoiceStatus, "حجم التسجيل أكبر من الحد المسموح (20 ميغابايت). اختاري عيّنة أقصر.", "error");
        return;
      }

      saveCustomVoice.disabled = true;
      var voice = {
        id: "voice-" + Date.now() + "-" + Math.random().toString(36).slice(2),
        name: name,
        gender: customVoiceGender ? customVoiceGender.value : "female",
        blob: customVoiceBlob,
        createdAt: Date.now()
      };
      useCustomVoiceStore("readwrite", function (store) {
        return store.add(voice);
      }).then(function () {
        setCustomVoicePending(null);
        if (customVoiceFile) customVoiceFile.value = "";
        setStatus(customVoiceStatus, "تم حفظ العينة في هذا المتصفح، ويمكنك تشغيلها أو حذفها من قائمتك.", "ok");
        loadCustomVoices();
      }).catch(function (error) {
        saveCustomVoice.disabled = false;
        setStatus(customVoiceStatus, customVoiceErrorMessage(error, "حفظ العينة"), "error");
      });
    });
  }

  function updateCount() {
    if (!ttsText || !charCount) return;
    charCount.textContent = ttsText.value.length + " / " + MAX_CHARS + " حرف";
  }

  if (ttsText) {
    ttsText.addEventListener("input", function () {
      if (ttsText.value.length > MAX_CHARS) {
        ttsText.value = ttsText.value.slice(0, MAX_CHARS);
      }
      updateCount();
    });
    updateCount();
  }

  if (clearText) {
    clearText.addEventListener("click", function () {
      if (!ttsText) return;
      ttsText.value = "";
      updateCount();
      ttsText.focus();
    });
  }

  function arabicVoices() {
    return allVoices.filter(function (voice) {
      return (voice.lang || "").toLowerCase().indexOf("ar") === 0;
    });
  }

  function fillVoices() {
    if (!voiceSelect || !synth) return;

    allVoices = synth.getVoices() || [];
    var arabic = arabicVoices();

    voiceSelect.innerHTML = "";

    if (!arabic.length) {
      var missing = document.createElement("option");
      missing.value = "";
      missing.textContent = "لا يوجد صوت عربي مثبّت — أضفه من إعدادات الجهاز";
      voiceSelect.appendChild(missing);
      if (playBtn) playBtn.disabled = true;
      Array.prototype.forEach.call(document.querySelectorAll(".voice-play"), function (button) {
        button.disabled = true;
      });
      setStatus(ttsStatus, "لم يُعثر على صوت عربي في الجهاز. ثبّت صوتًا عربيًا من إعدادات النظام ثم أعد تحميل الصفحة.", "error");
      return;
    }

    arabic.forEach(function (voice) {
      var option = document.createElement("option");
      option.value = voice.name;
      option.textContent = voice.name + " — " + voice.lang + (voice.default ? " (افتراضي)" : "");
      voiceSelect.appendChild(option);
    });

    var preferred = arabic.find(function (voice) {
      return (voice.lang || "").toLowerCase() === "ar-sa";
    }) || arabic[0];

    if (preferred && !manualVoice) voiceSelect.value = preferred.name;
    if (playBtn) playBtn.disabled = false;
    Array.prototype.forEach.call(document.querySelectorAll(".voice-play"), function (button) {
      button.disabled = false;
    });

    if (voicesNote) {
      if (arabic.length === 1) {
        voicesNote.textContent =
          "تم اكتشاف صوت عربي واحد (" + arabic[0].name + "). لإضافة أصوات أخرى، ثبّتي أصواتًا عربية من إعدادات اللغة والكلام في Windows. تنويعات النبرة والسرعة أدناه ليست أصواتًا مستقلة.";
      } else {
        voicesNote.textContent =
          "تم اكتشاف " + arabic.length + " أصوات عربية مثبّتة. تنويعات النبرة والسرعة أدناه تغيّر الأداء ولا تنشئ أصواتًا جديدة.";
      }
    }

    setStatus(ttsStatus, "جاهز للتحويل. اكتب النص ثم اضغط «تشغيل الصوت».", "ok");
  }

  if (synth && SpeechSynthesisUtterance) {
    fillVoices();
    synth.addEventListener("voiceschanged", fillVoices);

    if (voiceSelect) {
      voiceSelect.addEventListener("change", function () {
        manualVoice = true;
      });
    }
  } else {
    if (playBtn) playBtn.disabled = true;
    setStatus(ttsStatus, "متصفحك لا يدعم تحويل النص إلى صوت. جرّب Chrome أو Edge.", "error");
  }

  function styleSettings(style) {
    switch (style) {
      case "formal":
        return { rate: 0.92, pitch: 0.96 };
      case "cheerful":
        return { rate: 1.14, pitch: 1.1 };
      case "warm":
        return { rate: 0.96, pitch: 1.06 };
      case "calm":
        return { rate: 0.86, pitch: 1.0 };
      default:
        return { rate: 1, pitch: 1 };
    }
  }

  if (rateRange && rateValue) {
    rateRange.addEventListener("input", function () {
      rateValue.textContent = Number(rateRange.value).toFixed(1) + "×";
    });
  }

  if (pitchRange && pitchValue) {
    pitchRange.addEventListener("input", function () {
      pitchValue.textContent = Number(pitchRange.value).toFixed(1);
    });
  }

  function findVoiceByName(name) {
    return allVoices.find(function (voice) {
      return voice.name === name;
    }) || null;
  }

  function pickArabicVoice(lang) {
    var prefix = (lang || "ar").toLowerCase();
    return allVoices.find(function (voice) {
      return (voice.lang || "").toLowerCase().indexOf(prefix) === 0;
    }) || arabicVoices()[0] || null;
  }

  function resetPlayButton() {
    if (playBtn) {
      playBtn.disabled = !arabicVoices().length;
      playBtn.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16l13-8Z"/></svg> تشغيل الصوت';
    }
    Array.prototype.forEach.call(document.querySelectorAll(".voice-card.is-playing"), function (card) {
      card.classList.remove("is-playing");
      var button = card.querySelector(".voice-play");
      if (button) button.classList.remove("is-playing");
    });
  }

  if (playBtn) {
    playBtn.addEventListener("click", function () {
      if (!synth || !SpeechSynthesisUtterance) {
        setStatus(ttsStatus, "متصفحك لا يدعم تحويل النص إلى صوت.", "error");
        return;
      }

      if (!arabicVoices().length) {
        setStatus(ttsStatus, "ثبّت صوتًا عربيًا على جهازك لاستخدام التحويل.", "error");
        return;
      }

      var text = ttsText ? ttsText.value.trim() : "";
      if (!text) {
        setStatus(ttsStatus, "اكتب نصًا عربيًا أولًا ثم أعد المحاولة.", "error");
        if (ttsText) ttsText.focus();
        return;
      }

      var playbackId = ++ttsPlaybackId;
      synth.cancel();

      var utterance = new SpeechSynthesisUtterance(text);
      var voice = voiceSelect ? findVoiceByName(voiceSelect.value) : null;
      if (!voice) voice = pickArabicVoice("ar");

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = "ar-SA";
      }

      var settings = styleSettings(styleSelect ? styleSelect.value : "normal");
      var rate = rateRange ? Number(rateRange.value) : 1;
      var pitch = pitchRange ? Number(pitchRange.value) : 1;
      utterance.rate = Math.min(1.6, Math.max(0.5, rate * settings.rate));
      utterance.pitch = Math.min(1.5, Math.max(0.5, pitch * settings.pitch));

      utterance.onstart = function () {
        if (playbackId !== ttsPlaybackId) return;
        if (playBtn) {
          playBtn.disabled = true;
          playBtn.innerHTML =
            '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg> جارٍ التشغيل…';
        }
        setStatus(ttsStatus, "جارٍ توليد الصوت واستماعك إليه الآن…", "ok");
      };

      utterance.onend = function () {
        if (playbackId !== ttsPlaybackId) return;
        resetPlayButton();
        setStatus(ttsStatus, "انتهى التشغيل. يمكنك تعديل النص أو الأسلوب وإعادة المحاولة.", "ok");
      };

      utterance.onerror = function (event) {
        if (playbackId !== ttsPlaybackId) return;
        resetPlayButton();
        var messages = {
          "audio-busy": "جهاز الصوت مشغول بتطبيق آخر.",
          "audio-hardware": "تعذّر الوصول إلى جهاز إخراج الصوت.",
          "not-allowed": "منع المتصفح تشغيل الصوت. اضغط تشغيل مجددًا للسماح به.",
          "voice-unavailable": "الصوت المحدد غير متاح على جهازك. اختر صوتًا آخر.",
          "synthesis-failed": "تعذّر على محرك النطق إنشاء الصوت."
        };
        setStatus(ttsStatus, messages[event.error] || "تعذّر تشغيل الصوت. تحقق من إعدادات الصوت واختر صوتًا آخر.", "error");
      };

      synth.speak(utterance);
    });
  }

  if (stopBtn) {
    stopBtn.addEventListener("click", function () {
      ttsPlaybackId += 1;
      if (synth) synth.cancel();
      resetPlayButton();
      setStatus(ttsStatus, "تم إيقاف التشغيل.", null);
    });
  }

  /* معاينة الأصوات */
  var voiceCards = Array.prototype.slice.call(document.querySelectorAll(".voice-card"));

  voiceCards.forEach(function (card) {
    var button = card.querySelector(".voice-play");
    if (!button) return;

    button.addEventListener("click", function () {
      if (!synth || !SpeechSynthesisUtterance) {
        setStatus(ttsStatus, "متصفحك لا يدعم معاينة الأصوات.", "error");
        return;
      }

      if (!arabicVoices().length) {
        setStatus(ttsStatus, "ثبّت صوتًا عربيًا على جهازك لمعاينة الإلقاء.", "error");
        return;
      }

      var playbackId = ++ttsPlaybackId;
      synth.cancel();
      resetPlayButton();

      var sample = button.getAttribute("data-sample") || "مرحبًا بكم في شيماء AI.";
      var utterance = new SpeechSynthesisUtterance(sample);
      var voice = (voiceSelect && findVoiceByName(voiceSelect.value)) || pickArabicVoice("ar");

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = "ar-SA";
      }

      utterance.rate = Number(button.getAttribute("data-rate")) || 1;
      utterance.pitch = Number(button.getAttribute("data-pitch")) || 1;

      card.classList.add("is-playing");
      button.classList.add("is-playing");

      utterance.onend = function () {
        if (playbackId !== ttsPlaybackId) return;
        card.classList.remove("is-playing");
        button.classList.remove("is-playing");
      };

      utterance.onerror = function (event) {
        if (playbackId !== ttsPlaybackId) return;
        card.classList.remove("is-playing");
        button.classList.remove("is-playing");
        setStatus(ttsStatus, event.error === "voice-unavailable"
          ? "الصوت المحدد غير متاح على جهازك."
          : "تعذّرت معاينة هذا الصوت على جهازك.", "error");
      };

      synth.speak(utterance);

      if (ttsStatus) {
        setStatus(ttsStatus, "معاينة صوت: " + card.querySelector("strong").textContent, "ok");
      }
    });
  });

  /* ======================================================================
     تفريغ الصوت محليًا باستخدام Whisper
     ====================================================================== */
  var sttText = document.getElementById("sttText");
  var sttCount = document.getElementById("sttCount");
  var copyText = document.getElementById("copyText");
  var micBtn = document.getElementById("micBtn");
  var micStop = document.getElementById("micStop");
  var sttStatus = document.getElementById("sttStatus");
  var micVisual = document.querySelector(".mic-visual");
  var sttHint = document.getElementById("sttHint");
  var TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";
  var WHISPER_REVISION = "5332fcc35e32a33b86612b9a57a89be7906102b1";
  var SAMPLE_RATE = 16000;
  var localTranscriberPromise = null;
  var mediaRecorder = null;
  var mediaStream = null;
  var recordingChunks = [];
  var recording = false;
  var startingRecording = false;
  var transcribing = false;

  function updateSttCount() {
    if (!sttText || !sttCount) return;
    var words = sttText.value.trim() ? sttText.value.trim().split(/\s+/).length : 0;
    sttCount.textContent = words + " كلمة";
  }

  if (sttText) {
    sttText.addEventListener("input", updateSttCount);
    updateSttCount();
  }

  function setRecording(state) {
    recording = state;
    if (micVisual) micVisual.classList.toggle("is-listening", state);
    if (micBtn) {
      micBtn.disabled = state || startingRecording || transcribing;
      micBtn.innerHTML = state
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg> جارٍ التسجيل…'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z"/><path d="M19 11a7 7 0 0 1-14 0M12 18v3"/></svg> بدء التسجيل';
    }
    if (micStop) micStop.disabled = !state;
  }

  function stopMediaStream() {
    if (!mediaStream) return;
    mediaStream.getTracks().forEach(function (track) {
      track.stop();
    });
    mediaStream = null;
  }

  async function loadLocalTranscriber() {
    if (!localTranscriberPromise) {
      localTranscriberPromise = (async function () {
        var transformers = await import(TRANSFORMERS_URL);
        transformers.env.allowLocalModels = false;
        return transformers.pipeline(
          "automatic-speech-recognition",
          "Xenova/whisper-tiny",
          {
            quantized: true,
            revision: WHISPER_REVISION,
            progress_callback: function (progress) {
              if (progress.status === "progress" && progress.total) {
                var percent = Math.round(progress.progress);
                setStatus(sttStatus, "جارٍ تنزيل نموذج التفريغ للاستخدام المحلي… " + percent + "%", null);
              } else if (progress.status === "download") {
                setStatus(sttStatus, "جارٍ تنزيل نموذج التفريغ للاستخدام المحلي…", null);
              }
            }
          }
        );
      })();
    }

    try {
      return await localTranscriberPromise;
    } catch (error) {
      localTranscriberPromise = null;
      throw error;
    }
  }

  async function audioToMono16k(blob) {
    var AudioContextType = window.AudioContext || window.webkitAudioContext;
    var OfflineAudioContextType = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!AudioContextType || !OfflineAudioContextType) {
      throw new Error("Audio decoding is not supported in this browser.");
    }

    var context = new AudioContextType();
    try {
      var decoded = await context.decodeAudioData(await blob.arrayBuffer());
      var frameCount = Math.ceil(decoded.duration * SAMPLE_RATE);
      var offlineContext = new OfflineAudioContextType(1, frameCount, SAMPLE_RATE);
      var source = offlineContext.createBufferSource();
      source.buffer = decoded;
      source.connect(offlineContext.destination);
      source.start(0);
      var resampled = await offlineContext.startRendering();
      return resampled.getChannelData(0);
    } finally {
      await context.close();
    }
  }

  async function transcribeRecording(blob, transcriber) {
    transcribing = true;
    setRecording(false);
    if (micBtn) micBtn.disabled = true;

    try {
      if (!blob.size) {
        throw new Error("No audio was recorded.");
      }

      setStatus(sttStatus, "جارٍ تجهيز التسجيل للتفريغ المحلي…", null);
      var audio = await audioToMono16k(blob);
      setStatus(sttStatus, "جارٍ تفريغ التسجيل على جهازك…", null);
      var result = await transcriber(audio, {
        language: "arabic",
        task: "transcribe",
        chunk_length_s: 30,
        stride_length_s: 5
      });
      var transcript = result.text.trim();

      if (!transcript) {
        setStatus(sttStatus, "لم يُعثر على كلام واضح في التسجيل. جرّب التحدث بوضوح ثم أعد المحاولة.", "error");
        return;
      }

      sttText.value = [sttText.value.trim(), transcript].filter(Boolean).join(" ");
      updateSttCount();
      setStatus(sttStatus, "اكتمل التفريغ محليًا. لم يُرسل التسجيل إلى خادم.", "ok");
    } catch (error) {
      var message = error.message === "No audio was recorded."
        ? "لم يتم تسجيل صوت. اسمح باستخدام الميكروفون ثم أعد المحاولة."
        : "تعذّر تفريغ التسجيل محليًا. تحقق من اتصال الإنترنت لتنزيل النموذج وتوافق المتصفح، ثم أعد المحاولة.";
      setStatus(sttStatus, message, "error");
    } finally {
      transcribing = false;
      if (micBtn) micBtn.disabled = false;
    }
  }

  function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state === "inactive") return;
    setRecording(false);
    if (micBtn) micBtn.disabled = true;
    setStatus(sttStatus, "جارٍ إنهاء التسجيل…", null);
    mediaRecorder.stop();
  }

  async function startRecording() {
    if (recording || startingRecording || transcribing) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      setStatus(sttStatus, "التسجيل غير مدعوم في هذا المتصفح. جرّب Chrome أو Edge عبر HTTPS أو localhost.", "error");
      return;
    }
    if (!window.isSecureContext) {
      setStatus(sttStatus, "يتطلب الوصول إلى الميكروفون اتصالًا آمنًا (HTTPS أو localhost).", "error");
      return;
    }

    startingRecording = true;
    if (micBtn) micBtn.disabled = true;
    setStatus(sttStatus, "جارٍ تحميل محرك التفريغ المحلي…", null);

    try {
      var transcriber = await loadLocalTranscriber();
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      recordingChunks = [];
      var options = {};
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        options.mimeType = "audio/webm;codecs=opus";
      }

      var activeRecorder = new MediaRecorder(mediaStream, options);
      mediaRecorder = activeRecorder;
      var recorderFailed = false;
      activeRecorder.addEventListener("dataavailable", function (event) {
        if (event.data.size) recordingChunks.push(event.data);
      });
      activeRecorder.addEventListener("stop", function () {
        if (recorderFailed) return;
        var blob = new Blob(recordingChunks, { type: activeRecorder.mimeType || "audio/webm" });
        mediaRecorder = null;
        stopMediaStream();
        transcribeRecording(blob, transcriber);
      });
      activeRecorder.addEventListener("error", function () {
        recorderFailed = true;
        mediaRecorder = null;
        stopMediaStream();
        setRecording(false);
        startingRecording = false;
        if (micBtn) micBtn.disabled = false;
        setStatus(sttStatus, "حدث خطأ أثناء تسجيل الصوت. تحقق من الميكروفون ثم أعد المحاولة.", "error");
      });

      activeRecorder.start(250);
      startingRecording = false;
      setRecording(true);
      setStatus(sttStatus, "أسجّل الآن. تحدث بالعربية ثم اضغط «إيقاف وتفريغ».", "ok");
      if (sttHint) sttHint.textContent = "يُعالج التسجيل على جهازك فقط. المقاطع القصيرة أسرع في التفريغ.";
    } catch (error) {
      startingRecording = false;
      stopMediaStream();
      setRecording(false);
      if (micBtn) micBtn.disabled = false;
      var message = error.name === "NotAllowedError"
        ? "تم رفض إذن الميكروفون. اسمح بالوصول من إعدادات المتصفح ثم أعد المحاولة."
        : error.name === "NotFoundError"
          ? "لم يتم العثور على ميكروفون متاح."
          : "تعذّر تجهيز التفريغ المحلي. تحقق من اتصال الإنترنت لتنزيل النموذج ومن إعدادات الميكروفون.";
      setStatus(sttStatus, message, "error");
    }
  }

  if (!window.isSecureContext) {
    if (micBtn) micBtn.disabled = true;
    if (sttHint) sttHint.textContent = "افتح الموقع عبر HTTPS أو localhost لاستخدام الميكروفون.";
    setStatus(sttStatus, "يتطلب الوصول إلى الميكروفون اتصالًا آمنًا (HTTPS أو localhost).", "error");
  } else if (micBtn) {
    micBtn.addEventListener("click", startRecording);
  }

  if (micStop) {
    micStop.disabled = true;
    micStop.addEventListener("click", function () {
      stopRecording();
    });
  }

  if (copyText) {
    copyText.addEventListener("click", function () {
      if (!sttText || !sttText.value.trim()) {
        setStatus(sttStatus, "لا يوجد نص لنسخه بعد.", "error");
        return;
      }

      var value = sttText.value.trim();

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(value)
          .then(function () {
            setStatus(sttStatus, "تم نسخ النص إلى الحافظة.", "ok");
          })
          .catch(function () {
            sttText.select();
            setStatus(sttStatus, "اختر النص يدويًا ثم انسخه (Ctrl + C).", null);
          });
      } else {
        sttText.select();
        setStatus(sttStatus, "اختر النص يدويًا ثم انسخه (Ctrl + C).", null);
      }
    });
  }

  /* إيقاف الصوت عند مغادرة الصفحة */
  window.addEventListener("beforeunload", function () {
    ttsPlaybackId += 1;
    if (synth) synth.cancel();
    if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
    stopMediaStream();
  });
})();
