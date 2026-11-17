function initAdminPage() {
  const eventForm = document.getElementById("eventForm");
  const eventList = document.getElementById("adminEventList");
  const reservationInbox = document.getElementById("reservationInbox");

  if (!eventForm || !eventList || !reservationInbox) {
    return;
  }

  const eventPosterFile = document.getElementById("eventPosterFile");
  const eventPosterUrl = document.getElementById("eventPosterUrl");
  const eventPosterPreview = document.getElementById("eventPosterPreview");
  const eventFloorPlanFile = document.getElementById("eventFloorPlanFile");
  const eventFloorPlanUrl = document.getElementById("eventFloorPlanUrl");
  const eventFloorPlanPreview = document.getElementById("eventFloorPlanPreview");
  const eventResult = document.getElementById("eventResult");
  const eventResetBtn = document.getElementById("eventResetBtn");
  const eventCancelEditBtn = document.getElementById("eventCancelEditBtn");
  const eventSubmitBtn = document.getElementById("eventSubmitBtn");
  const eventEditStatus = document.getElementById("eventEditStatus");
  const eventIdInput = document.getElementById("eventId");
  const purchaseOptionForm = document.getElementById("purchaseOptionForm");
  const purchaseOptionId = document.getElementById("purchaseOptionId");
  const purchaseOptionEventId = document.getElementById("purchaseOptionEventId");
  const purchaseOptionName = document.getElementById("purchaseOptionName");
  const purchaseOptionDetail = document.getElementById("purchaseOptionDetail");
  const purchaseOptionResetBtn = document.getElementById("purchaseOptionResetBtn");
  const purchaseOptionResult = document.getElementById("purchaseOptionResult");
  const purchaseOptionList = document.getElementById("purchaseOptionList");
  const refreshAdminBtn = document.getElementById("refreshAdminBtn");
  const exportDataBtn = document.getElementById("exportDataBtn");
  const importDataBtn = document.getElementById("importDataBtn");
  const importDataFile = document.getElementById("importDataFile");
  const syncMessage = document.getElementById("syncMessage");

  let uploadedPosterData = "";
  let uploadedFloorPlanData = "";

  const setSyncMessage = (message, isError = false) => {
    if (!syncMessage) {
      return;
    }

    syncMessage.textContent = message;
    syncMessage.style.color = isError ? "#ffd8d3" : "";
  };

  const readSyncBundle = () => {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      events: loadEvents(),
      purchaseOptions: loadPurchaseOptions(),
      reservations: loadReservations(),
    };
  };

  const writeSyncBundle = (bundle) => {
    const safeEvents = Array.isArray(bundle.events) ? bundle.events : [];
    const safeOptions = Array.isArray(bundle.purchaseOptions) ? bundle.purchaseOptions : [];
    const safeReservations = Array.isArray(bundle.reservations) ? bundle.reservations : [];

    const eventsOk = saveEvents(safeEvents);
    const optionsOk = savePurchaseOptions(safeOptions);
    const reservationsOk = saveReservations(safeReservations);
    return eventsOk && optionsOk && reservationsOk;
  };

  const setEventMode = (mode, eventTitle = "") => {
    if (mode === "edit") {
      eventSubmitBtn.textContent = "Update Event";
      eventEditStatus.textContent = `Editing event: ${eventTitle}`;
      eventCancelEditBtn.disabled = false;
      return;
    }

    eventSubmitBtn.textContent = "Save Event";
    eventEditStatus.textContent = "Create a new event or click Edit on a specific event below.";
    eventCancelEditBtn.disabled = true;
  };

  const showPosterPreview = (src) => {
    if (!src) {
      eventPosterPreview.classList.add("preview-hidden");
      eventPosterPreview.removeAttribute("src");
      return;
    }

    eventPosterPreview.classList.remove("preview-hidden");
    eventPosterPreview.src = src;
  };

  const showFloorPlanPreview = (src) => {
    if (!src) {
      eventFloorPlanPreview.classList.add("preview-hidden");
      eventFloorPlanPreview.removeAttribute("src");
      return;
    }

    eventFloorPlanPreview.classList.remove("preview-hidden");
    eventFloorPlanPreview.src = src;
  };

  const resetEventForm = (clearMessage = true) => {
    eventForm.reset();
    eventIdInput.value = "";
    uploadedPosterData = "";
    uploadedFloorPlanData = "";
    showPosterPreview("");
    showFloorPlanPreview("");
    setEventMode("create");
    if (clearMessage) {
      eventResult.textContent = "";
      eventResult.className = "result full-span";
    }
  };

  const renderAdminEvents = () => {
    const events = loadEvents();
    eventList.innerHTML = "";

    if (events.length === 0) {
      const empty = document.createElement("p");
      empty.className = "event-meta";
      empty.textContent = "No upcoming events yet.";
      eventList.appendChild(empty);
      return;
    }

    events.forEach((eventData) => {
      const card = document.createElement("article");
      card.className = "admin-item";

      const title = document.createElement("p");
      title.className = "event-name";
      title.textContent = eventData.title;
      card.appendChild(title);

      const meta = document.createElement("p");
      meta.className = "event-meta";
      meta.textContent = [formatDate(eventData.date), formatTime(eventData.time), eventData.venue].filter(Boolean).join(" • ");
      card.appendChild(meta);

      if (eventData.note) {
        const note = document.createElement("p");
        note.className = "event-note";
        note.textContent = eventData.note;
        card.appendChild(note);
      }

      if (eventData.poster) {
        const poster = document.createElement("img");
        poster.className = "event-poster";
        poster.src = eventData.poster;
        poster.alt = `${eventData.title} poster`;
        card.appendChild(poster);
      }

      if (eventData.floorPlan) {
        const floorPlan = document.createElement("img");
        floorPlan.className = "event-poster";
        floorPlan.src = eventData.floorPlan;
        floorPlan.alt = `${eventData.title} floor plan`;
        card.appendChild(floorPlan);
      }

      const actions = document.createElement("div");
      actions.className = "admin-actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "submit-btn secondary-btn";
      editBtn.textContent = "Edit";
      editBtn.dataset.action = "edit-event";
      editBtn.dataset.id = eventData.id;
      actions.appendChild(editBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "submit-btn danger-btn";
      deleteBtn.textContent = "Delete";
      deleteBtn.dataset.action = "delete-event";
      deleteBtn.dataset.id = eventData.id;
      actions.appendChild(deleteBtn);

      card.appendChild(actions);
      eventList.appendChild(card);
    });
  };

  const renderReservationInbox = () => {
    const reservations = loadReservations();
    reservationInbox.innerHTML = "";

    if (reservations.length === 0) {
      const empty = document.createElement("p");
      empty.className = "event-meta";
      empty.textContent = "No reservation entries yet.";
      reservationInbox.appendChild(empty);
      return;
    }

    reservations.forEach((reservation) => {
      const card = document.createElement("article");
      card.className = "admin-item";

      const name = document.createElement("p");
      name.className = "event-name";
      name.textContent = reservation.fullName;
      card.appendChild(name);

      const meta = document.createElement("p");
      meta.className = "event-meta";
      const eventLabel = reservation.eventTitle ? ` • ${reservation.eventTitle}` : "";
      meta.textContent = `${reservation.ticketTier}${eventLabel} • @${reservation.instagramUsername.replace(/^@/, "")}`;
      card.appendChild(meta);

      const receipt = document.createElement("div");
      receipt.className = "event-meta";

      if (reservation.receiptPhoto) {
        const receiptLabel = document.createElement("p");
        receiptLabel.className = "event-meta";
        receiptLabel.textContent = "Receipt:";
        receipt.appendChild(receiptLabel);

        const receiptPreview = document.createElement("img");
        receiptPreview.src = reservation.receiptPhoto;
        receiptPreview.alt = `Receipt for ${reservation.fullName}`;
        receiptPreview.style.maxWidth = "180px";
        receiptPreview.style.maxHeight = "180px";
        receiptPreview.style.objectFit = "contain";
        receiptPreview.style.borderRadius = "8px";
        receiptPreview.style.marginTop = "8px";
        receipt.appendChild(receiptPreview);
      } else {
        receipt.textContent = `Reference #: ${reservation.referenceNumber || "N/A"}`;
      }

      card.appendChild(receipt);

      const status = document.createElement("p");
      status.className = "event-note";
      status.textContent = `Status: ${reservation.status || "Pending"}`;
      card.appendChild(status);

      const createdAt = document.createElement("p");
      createdAt.className = "event-meta";
      const when = reservation.createdAt ? new Date(reservation.createdAt).toLocaleString() : "Unknown time";
      createdAt.textContent = `Submitted: ${when}`;
      card.appendChild(createdAt);

      const actions = document.createElement("div");
      actions.className = "admin-actions";

      const confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.className = "submit-btn secondary-btn";
      confirmBtn.textContent = reservation.status === "Confirmed" ? "Mark Pending" : "Confirm";
      confirmBtn.dataset.action = "toggle-reservation";
      confirmBtn.dataset.id = reservation.id;
      actions.appendChild(confirmBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "submit-btn danger-btn";
      deleteBtn.textContent = "Delete";
      deleteBtn.dataset.action = "delete-reservation";
      deleteBtn.dataset.id = reservation.id;
      actions.appendChild(deleteBtn);

      card.appendChild(actions);
      reservationInbox.appendChild(card);
    });
  };

  const resetPurchaseOptionForm = (clearMessage = true) => {
    purchaseOptionForm.reset();
    purchaseOptionId.value = "";
    if (clearMessage) {
      purchaseOptionResult.textContent = "";
      purchaseOptionResult.className = "result full-span";
    }
  };

  const populatePurchaseEventSelector = (selectedEventId = "") => {
    const events = loadEvents();
    purchaseOptionEventId.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select event";
    purchaseOptionEventId.appendChild(placeholder);

    events.forEach((eventData) => {
      const option = document.createElement("option");
      option.value = eventData.id;
      option.textContent = eventData.title;
      purchaseOptionEventId.appendChild(option);
    });

    if (selectedEventId) {
      purchaseOptionEventId.value = selectedEventId;
    }
  };

  const renderPurchaseOptions = () => {
    const options = loadPurchaseOptions();
    const events = loadEvents();
    purchaseOptionList.innerHTML = "";

    if (options.length === 0) {
      const empty = document.createElement("p");
      empty.className = "event-meta";
      empty.textContent = "No purchase options yet.";
      purchaseOptionList.appendChild(empty);
      return;
    }

    const grouped = new Map();
    options.forEach((option) => {
      const key = option.eventId || "";
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(option);
    });

    events.forEach((eventData) => {
      const items = grouped.get(eventData.id) || [];
      if (items.length === 0) {
        return;
      }

      const block = document.createElement("section");
      block.className = "admin-group";

      const title = document.createElement("p");
      title.className = "admin-group-title";
      title.textContent = eventData.title;
      block.appendChild(title);

      items.forEach((option) => {
        const card = document.createElement("article");
        card.className = "admin-item";

        const name = document.createElement("p");
        name.className = "event-name";
        name.textContent = option.name;
        card.appendChild(name);

        if (option.detail) {
          const detail = document.createElement("p");
          detail.className = "event-note";
          detail.textContent = option.detail;
          card.appendChild(detail);
        }

        const actions = document.createElement("div");
        actions.className = "admin-actions";

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "submit-btn secondary-btn";
        editBtn.textContent = "Edit";
        editBtn.dataset.action = "edit-option";
        editBtn.dataset.id = option.id;
        actions.appendChild(editBtn);

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "submit-btn danger-btn";
        deleteBtn.textContent = "Delete";
        deleteBtn.dataset.action = "delete-option";
        deleteBtn.dataset.id = option.id;
        actions.appendChild(deleteBtn);

        card.appendChild(actions);
        block.appendChild(card);
      });

      purchaseOptionList.appendChild(block);
      grouped.delete(eventData.id);
    });

    grouped.forEach((items, eventId) => {
      const block = document.createElement("section");
      block.className = "admin-group";

      const title = document.createElement("p");
      title.className = "admin-group-title";
      title.textContent = eventId ? "Unknown event" : "Unassigned";
      block.appendChild(title);

      items.forEach((option) => {
        const card = document.createElement("article");
        card.className = "admin-item";

        const name = document.createElement("p");
        name.className = "event-name";
        name.textContent = option.name;
        card.appendChild(name);

        if (option.detail) {
          const detail = document.createElement("p");
          detail.className = "event-note";
          detail.textContent = option.detail;
          card.appendChild(detail);
        }

        const actions = document.createElement("div");
        actions.className = "admin-actions";

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "submit-btn secondary-btn";
        editBtn.textContent = "Edit";
        editBtn.dataset.action = "edit-option";
        editBtn.dataset.id = option.id;
        actions.appendChild(editBtn);

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "submit-btn danger-btn";
        deleteBtn.textContent = "Delete";
        deleteBtn.dataset.action = "delete-option";
        deleteBtn.dataset.id = option.id;
        actions.appendChild(deleteBtn);

        card.appendChild(actions);
        block.appendChild(card);
      });

      purchaseOptionList.appendChild(block);
    });
  };

  eventPosterFile.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      uploadedPosterData = "";
      showPosterPreview(eventPosterUrl.value.trim());
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      uploadedPosterData = typeof reader.result === "string" ? reader.result : "";
      showPosterPreview(uploadedPosterData);
    };
    reader.readAsDataURL(file);
  });

  eventFloorPlanFile.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      uploadedFloorPlanData = "";
      showFloorPlanPreview(eventFloorPlanUrl.value.trim());
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      uploadedFloorPlanData = typeof reader.result === "string" ? reader.result : "";
      showFloorPlanPreview(uploadedFloorPlanData);
    };
    reader.readAsDataURL(file);
  });

  eventPosterUrl.addEventListener("input", () => {
    if (!uploadedPosterData) {
      showPosterPreview(eventPosterUrl.value.trim());
    }
  });

  eventFloorPlanUrl.addEventListener("input", () => {
    if (!uploadedFloorPlanData) {
      showFloorPlanPreview(eventFloorPlanUrl.value.trim());
    }
  });

  eventForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!eventForm.checkValidity()) {
      eventForm.reportValidity();
      return;
    }

    const events = loadEvents();
    const payload = {
      id: eventIdInput.value || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
      title: document.getElementById("eventTitle").value.trim(),
      date: document.getElementById("eventDate").value,
      time: document.getElementById("eventTime").value,
      venue: document.getElementById("eventVenue").value.trim(),
      note: document.getElementById("eventNote").value.trim(),
      poster: uploadedPosterData || eventPosterUrl.value.trim(),
      floorPlan: uploadedFloorPlanData || eventFloorPlanUrl.value.trim(),
    };

    const index = events.findIndex((item) => item.id === payload.id);
    if (index === -1) {
      events.unshift(payload);
      eventResult.textContent = "Event added.";
    } else {
      events[index] = payload;
      eventResult.textContent = "Event updated.";
    }

    eventResult.className = "result success full-span";
    const saved = saveEvents(events);
    if (!saved) {
      eventResult.textContent = "Save failed. Storage may be full or blocked on this browser.";
      eventResult.className = "result error full-span";
      return;
    }
    renderAdminEvents();
    renderReservationInbox();
    renderIntroEvents();
    resetEventForm(false);
  });

  eventResetBtn.addEventListener("click", resetEventForm);

  purchaseOptionForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!purchaseOptionForm.checkValidity()) {
      purchaseOptionForm.reportValidity();
      return;
    }

    const options = loadPurchaseOptions();
    const payload = {
      id: purchaseOptionId.value || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
      eventId: purchaseOptionEventId.value,
      name: purchaseOptionName.value.trim(),
      detail: purchaseOptionDetail.value.trim(),
    };

    const index = options.findIndex((item) => item.id === payload.id);
    if (index === -1) {
      options.push(payload);
      purchaseOptionResult.textContent = "Purchase option added.";
    } else {
      options[index] = payload;
      purchaseOptionResult.textContent = "Purchase option updated.";
    }

    purchaseOptionResult.className = "result success full-span";
    const saved = savePurchaseOptions(options);
    if (!saved) {
      purchaseOptionResult.textContent = "Save failed. Storage may be full or blocked on this browser.";
      purchaseOptionResult.className = "result error full-span";
      return;
    }
    renderPurchaseOptions();
    renderReservationInbox();
    resetPurchaseOptionForm(false);
  });

  purchaseOptionResetBtn.addEventListener("click", resetPurchaseOptionForm);

  eventList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const action = target.dataset.action;
    const id = target.dataset.id;
    if (!action || !id) {
      return;
    }

    const events = loadEvents();
    const eventData = events.find((item) => item.id === id);

    if (action === "edit-event" && eventData) {
      eventIdInput.value = eventData.id;
      document.getElementById("eventTitle").value = eventData.title || "";
      document.getElementById("eventDate").value = eventData.date || "";
      document.getElementById("eventTime").value = eventData.time || "";
      document.getElementById("eventVenue").value = eventData.venue || "";
      document.getElementById("eventNote").value = eventData.note || "";
      document.getElementById("eventPosterUrl").value = eventData.poster || "";
      document.getElementById("eventFloorPlanUrl").value = eventData.floorPlan || "";
      uploadedPosterData = "";
      uploadedFloorPlanData = "";
      showPosterPreview(eventData.poster || "");
      showFloorPlanPreview(eventData.floorPlan || "");
      setEventMode("edit", eventData.title || "Untitled Event");
      eventForm.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (action === "delete-event") {
      const next = events.filter((item) => item.id !== id);
      const eventsSaved = saveEvents(next);

      const purchaseOptions = loadPurchaseOptions().filter((option) => option.eventId !== id);
      const optionsSaved = savePurchaseOptions(purchaseOptions);

      if (!eventsSaved || !optionsSaved) {
        setSyncMessage("Delete failed. Storage may be full or blocked on this browser.", true);
        return;
      }

      renderAdminEvents();
      renderIntroEvents();
      populatePurchaseEventSelector();
      renderPurchaseOptions();
    }
  });

  reservationInbox.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const action = target.dataset.action;
    const id = target.dataset.id;
    if (!action || !id) {
      return;
    }

    const reservations = loadReservations();
    const index = reservations.findIndex((item) => item.id === id);
    if (index === -1) {
      return;
    }

    if (action === "toggle-reservation") {
      const current = reservations[index];
      reservations[index] = {
        ...current,
        status: current.status === "Confirmed" ? "Pending" : "Confirmed",
      };
      const saved = saveReservations(reservations);
      if (!saved) {
        setSyncMessage("Status update failed. Storage may be full or blocked on this browser.", true);
        return;
      }
      renderReservationInbox();
      return;
    }

    if (action === "delete-reservation") {
      reservations.splice(index, 1);
      const saved = saveReservations(reservations);
      if (!saved) {
        setSyncMessage("Delete failed. Storage may be full or blocked on this browser.", true);
        return;
      }
      renderReservationInbox();
    }
  });

  purchaseOptionList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const action = target.dataset.action;
    const id = target.dataset.id;
    if (!action || !id) {
      return;
    }

    const options = loadPurchaseOptions();
    const option = options.find((item) => item.id === id);

    if (action === "edit-option" && option) {
      purchaseOptionId.value = option.id;
      purchaseOptionEventId.value = option.eventId || "";
      purchaseOptionName.value = option.name || "";
      purchaseOptionDetail.value = option.detail || "";
      return;
    }

    if (action === "delete-option") {
      const next = options.filter((item) => item.id !== id);
      const saved = savePurchaseOptions(next);
      if (!saved) {
        setSyncMessage("Delete failed. Storage may be full or blocked on this browser.", true);
        return;
      }
      renderPurchaseOptions();
    }
  });

  eventCancelEditBtn.addEventListener("click", () => {
    resetEventForm(false);
  });

  if (refreshAdminBtn) {
    refreshAdminBtn.addEventListener("click", () => {
      renderAdminEvents();
      populatePurchaseEventSelector();
      renderPurchaseOptions();
      renderReservationInbox();
      setSyncMessage("Data refreshed.");
    });
  }

  if (exportDataBtn) {
    exportDataBtn.addEventListener("click", () => {
      try {
        const bundle = readSyncBundle();
        const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
        const fileName = `pumpboyz-sync-${new Date().toISOString().slice(0, 10)}.json`;
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        setSyncMessage(`Exported data to ${fileName}.`);
      } catch {
        setSyncMessage("Export failed. Please try again.", true);
      }
    });
  }

  if (importDataBtn && importDataFile) {
    importDataBtn.addEventListener("click", () => {
      importDataFile.click();
    });
  }

  if (importDataFile) {
    importDataFile.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      try {
        const raw = await file.text();
        const parsed = JSON.parse(raw);
        const imported = writeSyncBundle(parsed || {});
        if (!imported) {
          setSyncMessage("Import failed. Storage may be full or blocked on this browser.", true);
          return;
        }

        renderAdminEvents();
        populatePurchaseEventSelector();
        renderPurchaseOptions();
        renderReservationInbox();
        renderIntroEvents();
        resetEventForm(false);
        resetPurchaseOptionForm(false);
        setSyncMessage("Import complete. Data is now synced on this device.");
      } catch {
        setSyncMessage("Import failed. Please use a valid export JSON file.", true);
      } finally {
        importDataFile.value = "";
      }
    });
  }

  window.addEventListener("pumpboyz:data-updated", () => {
    try {
      renderAdminEvents();
      populatePurchaseEventSelector();
      renderPurchaseOptions();
      renderReservationInbox();
    } catch {
      // Ignore transient rendering errors in cross-tab updates.
    }
  });

  renderAdminEvents();
  populatePurchaseEventSelector();
  renderPurchaseOptions();
  renderReservationInbox();
  setEventMode("create");
}

initAdminPage();
