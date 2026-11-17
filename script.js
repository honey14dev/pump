const picsFolderFiles = [
  "Unknown-6.jpg",
  "Unknown-7.jpg",
  "Unknown-8.jpg",
  "Unknown-9.jpg",
  "Unknown-10.jpg",
  "Unknown-11.jpg",
  "Unknown-12.jpg",
  "Unknown-13.jpg",
  "Unknown-14.jpg",
  "Unknown-15.jpg",
  "Unknown-16.jpg",
];

const STORAGE_KEYS = {
  events: "pumpboyz.events",
  reservations: "pumpboyz.reservations",
  purchaseOptions: "pumpboyz.purchaseOptions",
};

const SUPABASE_TABLE = "pumpboyz_state";
const DATA_UPDATED_EVENT = "pumpboyz:data-updated";
const SUPABASE_CONFIG = window.PUMPBOYZ_SUPABASE_CONFIG || {};
const SUPABASE_HAS_CONFIG = Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);
const SUPABASE_READY = Boolean(
  SUPABASE_HAS_CONFIG &&
    window.supabase &&
    typeof window.supabase.createClient === "function",
);
const supabaseClient = SUPABASE_READY
  ? window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)
  : null;
const volatileStore = new Map();

function supabaseRestUrl(pathWithQuery = "") {
  const base = String(SUPABASE_CONFIG.url || "").replace(/\/$/, "");
  return `${base}/rest/v1/${pathWithQuery}`;
}

function supabaseRestHeaders() {
  return {
    apikey: SUPABASE_CONFIG.anonKey,
    Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
    "Content-Type": "application/json",
  };
}

const defaultEvents = [
  {
    id: "e-neon-rush",
    title: "PUMP Fridays: Neon Rush",
    date: "2026-08-23",
    time: "21:00",
    venue: "Main Floor",
    note: "Dress in neon colors for free glow sticks at entry.",
    poster: "",
    floorPlan: "",
  },
  {
    id: "e-bassline",
    title: "Bassline Saturdays",
    date: "2026-08-30",
    time: "22:00",
    venue: "VIP Deck",
    note: "Hip-hop and bass heavy sets all night.",
    poster: "",
    floorPlan: "",
  },
  {
    id: "e-all-white",
    title: "All White Party",
    date: "2026-09-06",
    time: "20:30",
    venue: "Rooftop Lounge",
    note: "All-white attire encouraged.",
    poster: "",
    floorPlan: "",
  },
];

const LEGACY_DEFAULT_EVENT_IDS = new Set(defaultEvents.map((event) => event.id));

const defaultPurchaseOptions = [
  {
    id: "p-neon-admission",
    eventId: "e-neon-rush",
    name: "Admission Fee (250php)",
    detail: "Standard party admission.",
  },
  {
    id: "p-neon-cocktail",
    eventId: "e-neon-rush",
    name: "Cocktail Table (2,000php)",
    detail: "Reserved cocktail table package.",
  },
  {
    id: "p-bass-admission",
    eventId: "e-bassline",
    name: "Admission Fee (250php)",
    detail: "Standard party admission.",
  },
  {
    id: "p-bass-svip",
    eventId: "e-bassline",
    name: "sVIP (3,000php)",
    detail: "Premium seating and service package.",
  },
  {
    id: "p-white-admission",
    eventId: "e-all-white",
    name: "Admission Fee (250php)",
    detail: "Standard party admission.",
  },
  {
    id: "p-white-vip-couch",
    eventId: "e-all-white",
    name: "VIP couch (8,000php)",
    detail: "Top-tier couch reservation package.",
  },
];

const LEGACY_DEFAULT_PURCHASE_OPTION_IDS = new Set(defaultPurchaseOptions.map((option) => option.id));

function formatDate(isoDate) {
  if (!isoDate) {
    return "";
  }

  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatTime(timeValue) {
  if (!timeValue) {
    return "";
  }

  const [rawHour, rawMinute] = timeValue.split(":");
  const hour = Number(rawHour);
  const minute = Number(rawMinute);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return timeValue;
  }

  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function loadCollection(key, fallback) {
  const memoryValue = volatileStore.get(key);
  if (Array.isArray(memoryValue)) {
    return memoryValue;
  }

  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return fallback;
    }

    volatileStore.set(key, parsed);
    return parsed;
  } catch {
    return fallback;
  }
}

function emitDataUpdated(key) {
  window.dispatchEvent(
    new CustomEvent(DATA_UPDATED_EVENT, {
      detail: { key },
    }),
  );
}

async function pushCollectionToSupabase(key, value) {
  if (!SUPABASE_HAS_CONFIG) {
    return true;
  }

  if (!supabaseClient) {
    try {
      const response = await fetch(supabaseRestUrl(`${SUPABASE_TABLE}?on_conflict=key`), {
        method: "POST",
        headers: {
          ...supabaseRestHeaders(),
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify([
          {
            key,
            value,
          },
        ]),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  const { error } = await supabaseClient.from(SUPABASE_TABLE).upsert(
    {
      key,
      value,
    },
    {
      onConflict: "key",
    },
  );

  return !error;
}

async function pullCollectionsFromSupabase() {
  if (!SUPABASE_HAS_CONFIG) {
    return;
  }

  const keys = Object.values(STORAGE_KEYS);

  let data = null;
  if (!supabaseClient) {
    const encodedKeys = keys.map((key) => encodeURIComponent(key)).join(",");
    try {
      const response = await fetch(
        supabaseRestUrl(`${SUPABASE_TABLE}?select=key,value&key=in.(${encodedKeys})`),
        {
          method: "GET",
          headers: {
            ...supabaseRestHeaders(),
          },
        },
      );

      if (!response.ok) {
        return;
      }

      data = await response.json();
    } catch {
      return;
    }
  } else {
    const result = await supabaseClient
      .from(SUPABASE_TABLE)
      .select("key, value")
      .in("key", keys);

    if (result.error) {
      return;
    }

    data = result.data;
  }

  const rows = new Map((data || []).map((row) => [row.key, row.value]));

  keys.forEach((key) => {
    const remoteValue = rows.get(key);
    if (Array.isArray(remoteValue)) {
      const normalizeLegacyEvents = key === STORAGE_KEYS.events && isLegacyDefaultEvents(remoteValue);
      const normalizeLegacyPurchaseOptions =
        key === STORAGE_KEYS.purchaseOptions && isLegacyDefaultPurchaseOptions(remoteValue);
      const normalizedValue = normalizeLegacyEvents || normalizeLegacyPurchaseOptions ? [] : remoteValue;
      volatileStore.set(key, normalizedValue);
      try {
        localStorage.setItem(key, JSON.stringify(normalizedValue));
      } catch {
        // Ignore local storage write errors and keep current in-memory flow.
      }
      emitDataUpdated(key);

      if (normalizeLegacyEvents) {
        void pushCollectionToSupabase(STORAGE_KEYS.events, []);
      }

      if (normalizeLegacyPurchaseOptions) {
        void pushCollectionToSupabase(STORAGE_KEYS.purchaseOptions, []);
      }
      return;
    }

    const localValue = loadCollection(key, []);
    void pushCollectionToSupabase(key, localValue);
  });
}

function subscribeToSupabaseChanges() {
  if (!supabaseClient) {
    return;
  }

  const keys = Object.values(STORAGE_KEYS);
  supabaseClient
    .channel("pumpboyz-live-state")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: SUPABASE_TABLE,
      },
      (payload) => {
        const key = payload.new?.key || payload.old?.key;
        if (!key || !keys.includes(key)) {
          return;
        }

        if (!Array.isArray(payload.new?.value)) {
          return;
        }

        volatileStore.set(key, payload.new.value);
        try {
          localStorage.setItem(key, JSON.stringify(payload.new.value));
        } catch {
          // Ignore local storage write errors and keep current in-memory flow.
        }
        emitDataUpdated(key);
      },
    )
    .subscribe();
}

async function initializeSupabaseLiveSync() {
  if (!SUPABASE_HAS_CONFIG) {
    return;
  }

  await pullCollectionsFromSupabase();

  if (supabaseClient) {
    subscribeToSupabaseChanges();
    return;
  }

  // Fallback live sync loop when realtime client is unavailable.
  window.setInterval(() => {
    void pullCollectionsFromSupabase();
  }, 4000);
}

function saveCollection(key, value) {
  volatileStore.set(key, value);

  let localSaved = true;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    localSaved = false;
  }

  emitDataUpdated(key);
  void pushCollectionToSupabase(key, value);
  return localSaved || SUPABASE_HAS_CONFIG;
}

function loadEvents() {
  const saved = loadCollection(STORAGE_KEYS.events, []);
  if (!isLegacyDefaultEvents(saved)) {
    return saved;
  }

  saveCollection(STORAGE_KEYS.events, []);
  return [];
}

function isLegacyDefaultEvents(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return false;
  }

  if (events.length !== LEGACY_DEFAULT_EVENT_IDS.size) {
    return false;
  }

  return events.every((event) => LEGACY_DEFAULT_EVENT_IDS.has(event.id));
}

function saveEvents(events) {
  return saveCollection(STORAGE_KEYS.events, events);
}

function loadReservations() {
  return loadCollection(STORAGE_KEYS.reservations, []);
}

function saveReservations(reservations) {
  return saveCollection(STORAGE_KEYS.reservations, reservations);
}

function loadPurchaseOptions() {
  const saved = loadCollection(STORAGE_KEYS.purchaseOptions, []);
  if (saved.length > 0) {
    if (isLegacyDefaultPurchaseOptions(saved)) {
      saveCollection(STORAGE_KEYS.purchaseOptions, []);
      return [];
    }

    const hasEventScopedOptions = saved.some((option) => Boolean(option.eventId));
    if (!hasEventScopedOptions) {
      const events = loadEvents();
      const fallbackEventId = events[0]?.id || "";
      const migrated = saved.map((option, index) => ({
        id: option.id || `p-migrated-${index}`,
        eventId: fallbackEventId,
        name: option.name || "",
        detail: option.detail || "",
      }));
      saveCollection(STORAGE_KEYS.purchaseOptions, migrated);
      return migrated;
    }

    return saved;
  }

  return [];
}

function isLegacyDefaultPurchaseOptions(options) {
  if (!Array.isArray(options) || options.length === 0) {
    return false;
  }

  if (options.length !== LEGACY_DEFAULT_PURCHASE_OPTION_IDS.size) {
    return false;
  }

  return options.every((option) => LEGACY_DEFAULT_PURCHASE_OPTION_IDS.has(option.id));
}

function savePurchaseOptions(options) {
  return saveCollection(STORAGE_KEYS.purchaseOptions, options);
}

function getPurchaseOptionsForEvent(eventId) {
  if (!eventId) {
    return [];
  }

  return loadPurchaseOptions().filter((option) => option.eventId === eventId);
}

function createEventCard(event) {
  const article = document.createElement("article");
  article.className = "event-item";

  const name = document.createElement("p");
  name.className = "event-name";
  name.textContent = event.title || "Untitled Event";
  article.appendChild(name);

  const meta = document.createElement("p");
  meta.className = "event-meta";
  const dateText = formatDate(event.date);
  const timeText = formatTime(event.time);
  meta.textContent = [dateText, timeText, event.venue].filter(Boolean).join(" • ") || "TBA";
  article.appendChild(meta);

  if (event.note) {
    const note = document.createElement("p");
    note.className = "event-note";
    note.textContent = event.note;
    article.appendChild(note);
  }

  if (event.poster) {
    const poster = document.createElement("img");
    poster.src = event.poster;
    poster.alt = `${event.title || "Event"} poster`;
    poster.className = "event-poster";
    article.appendChild(poster);
  }

  if (event.floorPlan) {
    const floorPlan = document.createElement("img");
    floorPlan.src = event.floorPlan;
    floorPlan.alt = `${event.title || "Event"} floor plan`;
    floorPlan.className = "event-poster";
    article.appendChild(floorPlan);
  }

  return article;
}

function updateReservationEntryAccess(events) {
  const reserveNowLink = document.getElementById("reserveNowLink");
  if (!reserveNowLink) {
    return;
  }

  const hasEvents = Array.isArray(events) && events.length > 0;
  if (hasEvents) {
    reserveNowLink.classList.remove("is-disabled");
    reserveNowLink.setAttribute("href", "reservation.html");
    reserveNowLink.removeAttribute("aria-disabled");
    reserveNowLink.removeAttribute("title");
    return;
  }

  reserveNowLink.classList.add("is-disabled");
  reserveNowLink.setAttribute("aria-disabled", "true");
  reserveNowLink.setAttribute("title", "No upcoming events yet.");
  reserveNowLink.removeAttribute("href");
}

function renderIntroEvents() {
  const eventList = document.getElementById("eventList");
  if (!eventList) {
    return;
  }

  const events = loadEvents();
  eventList.innerHTML = "";
  updateReservationEntryAccess(events);

  if (events.length === 0) {
    const empty = document.createElement("article");
    empty.className = "event-item";
    empty.textContent = "No upcoming events yet.";
    eventList.appendChild(empty);
    return;
  }

  events.forEach((event) => {
    eventList.appendChild(createEventCard(event));
  });
}

function initBackgroundSlideshow() {
  const fromPicsFolder = picsFolderFiles.map((fileName) => `pump pics/${fileName}`);
  const fallbackImages = ["04AC3406-98D2-4B26-B905-48922F0EB1BA_1_105_c.jpeg"];
  const imageUrls = (fromPicsFolder.length > 0 ? fromPicsFolder : fallbackImages).filter(Boolean);

  if (imageUrls.length === 0) {
    return;
  }

  const slideshow = document.createElement("div");
  slideshow.className = "bg-slideshow";
  slideshow.setAttribute("aria-hidden", "true");

  const overlay = document.createElement("div");
  overlay.className = "bg-overlay";
  overlay.setAttribute("aria-hidden", "true");

  const initialIndex = Math.floor(Math.random() * imageUrls.length);

  imageUrls.forEach((url, index) => {
    const slide = document.createElement("div");
    slide.className = `bg-slide${index === initialIndex ? " is-active" : ""}`;
    slide.style.backgroundImage = `url("${url}")`;
    slideshow.appendChild(slide);
  });

  document.body.prepend(overlay);
  document.body.prepend(slideshow);

  if (imageUrls.length < 2) {
    return;
  }

  const slides = Array.from(slideshow.querySelectorAll(".bg-slide"));
  let activeIndex = initialIndex;

  window.setInterval(() => {
    let nextIndex = activeIndex;
    while (nextIndex === activeIndex) {
      nextIndex = Math.floor(Math.random() * slides.length);
    }

    slides[activeIndex].classList.remove("is-active");
    activeIndex = nextIndex;
    slides[activeIndex].classList.add("is-active");
  }, 5000);
}

function angleFromCenter(event, centerX, centerY) {
  return Math.atan2(event.clientY - centerY, event.clientX - centerX);
}

function initDiscWheels() {
  const wheels = document.querySelectorAll("[data-disc-wheel]");

  wheels.forEach((wheel) => {
    let currentAngle = 0;
    let dragging = false;
    let startPointerAngle = 0;
    let startWheelAngle = 0;
    let angularVelocity = 0;
    let lastPointerAngle = 0;
    let lastMoveTime = 0;
    let rafId = 0;

    const applyRotation = () => {
      wheel.style.setProperty("--spin-angle", `${currentAngle}deg`);
    };

    const runMomentum = () => {
      if (Math.abs(angularVelocity) < 0.04) {
        angularVelocity = 0;
        cancelAnimationFrame(rafId);
        return;
      }

      currentAngle += angularVelocity;
      angularVelocity *= 0.97;
      applyRotation();
      rafId = requestAnimationFrame(runMomentum);
    };

    const onPointerMove = (event) => {
      if (!dragging) {
        return;
      }

      const rect = wheel.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const pointerAngle = angleFromCenter(event, centerX, centerY);
      const angleDelta = pointerAngle - startPointerAngle;
      currentAngle = startWheelAngle + (angleDelta * 180) / Math.PI;

      const now = performance.now();
      const stepRadians = pointerAngle - lastPointerAngle;
      const deltaTime = Math.max(now - lastMoveTime, 1);
      angularVelocity = ((stepRadians * 180) / Math.PI / deltaTime) * 16;
      lastPointerAngle = pointerAngle;
      lastMoveTime = now;

      applyRotation();
    };

    const stopDragging = (pointerId) => {
      if (!dragging) {
        return;
      }

      dragging = false;
      wheel.classList.remove("is-dragging");
      wheel.releasePointerCapture(pointerId);

      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(runMomentum);
    };

    wheel.addEventListener("pointerdown", (event) => {
      dragging = true;
      wheel.classList.add("is-dragging");
      wheel.setPointerCapture(event.pointerId);

      const rect = wheel.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      startPointerAngle = angleFromCenter(event, centerX, centerY);
      startWheelAngle = currentAngle;
      lastPointerAngle = startPointerAngle;
      lastMoveTime = performance.now();
      angularVelocity = 0;
      cancelAnimationFrame(rafId);
    });

    wheel.addEventListener("pointermove", onPointerMove);
    wheel.addEventListener("pointerup", (event) => stopDragging(event.pointerId));
    wheel.addEventListener("pointercancel", (event) => stopDragging(event.pointerId));

    wheel.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        angularVelocity += 10;
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(runMomentum);
      }
    });
  });
}

function initPosterLightbox() {
  const lightbox = document.createElement("div");
  lightbox.className = "poster-lightbox is-hidden";
  lightbox.setAttribute("aria-hidden", "true");

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "lightbox-close";
  closeBtn.textContent = "Close";

  const image = document.createElement("img");
  image.alt = "Enlarged event poster";

  lightbox.appendChild(closeBtn);
  lightbox.appendChild(image);
  document.body.appendChild(lightbox);

  const close = () => {
    lightbox.classList.add("is-hidden");
    lightbox.setAttribute("aria-hidden", "true");
    image.removeAttribute("src");
  };

  const open = (src, alt) => {
    image.src = src;
    image.alt = alt || "Enlarged event poster";
    lightbox.classList.remove("is-hidden");
    lightbox.setAttribute("aria-hidden", "false");
  };

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.matches(".event-poster")) {
      const poster = target;
      if (poster instanceof HTMLImageElement && poster.src) {
        open(poster.src, poster.alt);
      }
      return;
    }

    if (target === lightbox || target === closeBtn) {
      close();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close();
    }
  });
}

function initReservationForm() {
  const form = document.getElementById("reservationForm");
  const summary = document.getElementById("tierSummary");
  const resultMessage = document.getElementById("resultMessage");
  const reservationEventField = document.getElementById("reservationEventField");
  const reservationEventSelect = document.getElementById("reservationEvent");
  const ticketTierOptions = document.getElementById("ticketTierOptions");

  if (!form || !summary || !resultMessage) {
    return;
  }

  let tierDetailsMap = {};
  let activeEventId = "";

  const showResultMessage = (message, type = "success") => {
    resultMessage.textContent = message;
    resultMessage.className = `result ${type} is-visible`;
  };

  const hideResultMessage = () => {
    resultMessage.textContent = "";
    resultMessage.className = "result";
  };

  const setReservationFormEnabled = (enabled) => {
    const controls = form.querySelectorAll("input, select, textarea, button");
    controls.forEach((control) => {
      const element = control;
      if (!(element instanceof HTMLElement)) {
        return;
      }

      if (enabled) {
        element.removeAttribute("disabled");
      } else {
        element.setAttribute("disabled", "true");
      }
    });

    if (enabled) {
      hideResultMessage();
      return;
    }

    showResultMessage("Reservations are closed because there are no upcoming events yet.", "error");
  };

  const renderPurchaseOptions = (eventId) => {
    if (!ticketTierOptions) {
      return;
    }

    const options = getPurchaseOptionsForEvent(eventId);
    ticketTierOptions.innerHTML = "";
    tierDetailsMap = {};

    if (options.length === 0) {
      const empty = document.createElement("p");
      empty.className = "event-meta";
      if (!eventId && loadEvents().length > 1) {
        empty.textContent = "Select an event first to see available purchase options.";
      } else {
        empty.textContent = "No purchase options set for this event yet. Please contact admin.";
      }
      ticketTierOptions.appendChild(empty);
      return;
    }

    options.forEach((option, index) => {
      tierDetailsMap[option.name] = option.detail || "";

      const label = document.createElement("label");
      label.className = "tier-option";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "ticketTier";
      input.value = option.name;
      input.required = index === 0;
      input.checked = index === 0;

      const span = document.createElement("span");
      span.textContent = option.name;

      label.appendChild(input);
      label.appendChild(span);

      if (option.detail) {
        const detail = document.createElement("small");
        detail.textContent = option.detail;
        label.appendChild(detail);
      }

      ticketTierOptions.appendChild(label);
    });
  };

  const populateReservationEvents = () => {
    if (!reservationEventField || !reservationEventSelect) {
      return;
    }

    const events = loadEvents();
    reservationEventSelect.innerHTML = "";

    if (events.length === 0) {
      reservationEventField.classList.add("is-hidden");
      reservationEventSelect.required = false;
      reservationEventSelect.disabled = true;
      activeEventId = "";
      renderPurchaseOptions("");
      setReservationFormEnabled(false);
      return;
    }

    setReservationFormEnabled(true);

    if (events.length > 1) {
      reservationEventField.classList.remove("is-hidden");
      reservationEventSelect.required = true;
      reservationEventSelect.disabled = false;

      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Select event";
      reservationEventSelect.appendChild(placeholder);

      events.forEach((eventData) => {
        const option = document.createElement("option");
        option.value = eventData.id;
        option.textContent = `${eventData.title} (${formatDate(eventData.date)} ${formatTime(eventData.time)})`;
        reservationEventSelect.appendChild(option);
      });

      activeEventId = "";
      renderPurchaseOptions(activeEventId);
      return;
    }

    reservationEventField.classList.add("is-hidden");
    reservationEventSelect.required = false;
    reservationEventSelect.disabled = true;

    activeEventId = events[0]?.id || "";
    renderPurchaseOptions(activeEventId);
  };

  const refreshTierSummary = () => {
    if (loadEvents().length === 0) {
      summary.innerHTML = "Selected purchase: <strong>N/A</strong>.";
      return;
    }

    const tier = getSelectedTier();
    const detail = tierDetailsMap[tier] || "";
    summary.innerHTML = `Selected purchase: <strong>${tier || "N/A"}</strong>. ${detail}`;
  };

  populateReservationEvents();

  if (reservationEventSelect) {
    reservationEventSelect.addEventListener("change", () => {
      activeEventId = reservationEventSelect.value;
      renderPurchaseOptions(activeEventId);
      refreshTierSummary();
    });
  }

  window.addEventListener(DATA_UPDATED_EVENT, () => {
    populateReservationEvents();
    refreshTierSummary();
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.name === "ticketTier") {
      refreshTierSummary();
    }
  });

  form.addEventListener("input", () => {
    if (resultMessage.classList.contains("is-visible")) {
      hideResultMessage();
    }
  });

  form.addEventListener("change", () => {
    if (resultMessage.classList.contains("is-visible")) {
      hideResultMessage();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      showResultMessage("Please complete all required fields before submitting.", "error");
      form.reportValidity();
      return;
    }

    const tier = getSelectedTier();
    const name = document.getElementById("fullName").value.trim();
    const instagram = document.getElementById("instagramUsername").value.trim();
    const receiptPhotoInput = document.getElementById("receiptPhoto");
    let receiptPhoto = "";
    let referenceNumber = "";

    try {
      const file = receiptPhotoInput instanceof HTMLInputElement ? receiptPhotoInput.files?.[0] : null;
      if (file) {
        receiptPhoto = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
          reader.onerror = () => reject(new Error("Could not read receipt image."));
          reader.readAsDataURL(file);
        });
        referenceNumber = `Receipt: ${file.name}`;
      }
    } catch {
      showResultMessage("Please upload a valid receipt image before submitting.", "error");
      return;
    }

    const events = loadEvents();

    let reservedEventId = "";
    let reservedEventTitle = "";
    if (events.length > 1) {
      reservedEventId = reservationEventSelect?.value || "";
      const selectedEvent = events.find((eventData) => eventData.id === reservedEventId);
      reservedEventTitle = selectedEvent?.title || "";
    } else if (events.length === 1) {
      reservedEventId = events[0].id;
      reservedEventTitle = events[0].title;
    }

    const reservations = loadReservations();
    const reservationId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

    reservations.unshift({
      id: reservationId,
      fullName: name,
      instagramUsername: instagram,
      ticketTier: tier,
      referenceNumber,
      receiptPhoto,
      eventId: reservedEventId,
      eventTitle: reservedEventTitle,
      status: "Pending",
      createdAt: new Date().toISOString(),
    });

    const saved = saveReservations(reservations);
    if (!saved) {
      showResultMessage("Reservation failed to save on this browser. Please free storage or disable private mode.", "error");
      return;
    }

    const reservationSummary = [
      `Reservation submitted for ${name}.`,
      `Instagram: @${instagram.replace(/^@/, "")}`,
      `Purchase: ${tier}`,
      `Event: ${reservedEventTitle || "General Admission"}`,
      `Please take a screenshot of this confirmation to present at the entrance.`,
    ].join("\n");

    showResultMessage(reservationSummary, "success");
    form.reset();

    const firstTier = document.querySelector('input[name="ticketTier"]');
    if (firstTier instanceof HTMLInputElement) {
      firstTier.checked = true;
    }

    if (reservationEventSelect && !reservationEventSelect.disabled) {
      reservationEventSelect.selectedIndex = 0;
      activeEventId = "";
      renderPurchaseOptions(activeEventId);
    } else {
      activeEventId = events[0]?.id || "";
      renderPurchaseOptions(activeEventId);
    }

    refreshTierSummary();
  });

  refreshTierSummary();
}

function getSelectedTier() {
  return document.querySelector('input[name="ticketTier"]:checked')?.value || "";
}

initBackgroundSlideshow();
initDiscWheels();
renderIntroEvents();
initReservationForm();
initPosterLightbox();
window.addEventListener(DATA_UPDATED_EVENT, (event) => {
  if (event.detail?.key === STORAGE_KEYS.events) {
    renderIntroEvents();
  }
});
void initializeSupabaseLiveSync();
