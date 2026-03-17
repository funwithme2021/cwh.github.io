// ==UserScript==
// @name         TRA Booking Autofill
// @namespace    https://www.railway.gov.tw/
// @version      0.1.0
// @description  Autofill TRA booking query form from URL hash payload and submit it.
// @match        https://www.railway.gov.tw/tra-tip-web/tip/tip001/tip121/query*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const HASH_KEY = "traAutoFill";
  const MAX_WAIT_MS = 15000;
  const POLL_MS = 150;
  const SUBMIT_DELAY_MS = 350;

  function log(...args) {
    console.log("[TRA Booking Autofill]", ...args);
  }

  function parseHashPayload() {
    const hash = String(window.location.hash || "").replace(/^#/, "");
    if (!hash) return null;

    const params = new URLSearchParams(hash);
    const encoded = params.get(HASH_KEY);
    if (!encoded) return null;

    try {
      return JSON.parse(decodeURIComponent(encoded));
    } catch (error) {
      console.error("[TRA Booking Autofill] Failed to parse hash payload:", error);
      return null;
    }
  }

  function clearHashPayload() {
    try {
      const cleanUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
      window.history.replaceState(null, document.title, cleanUrl);
    } catch (error) {
      console.warn("[TRA Booking Autofill] Failed to clear hash payload:", error);
    }
  }

  function sanitizePayload(payload) {
    if (!payload || typeof payload !== "object") return null;

    const seatQty = Math.max(1, Math.min(6, parseInt(payload.normalQty, 10) || 1));
    const result = {
      pid: String(payload.pid || "").trim().toUpperCase().replace(/\s+/g, ""),
      startStation: String(payload.startStation || "").trim(),
      endStation: String(payload.endStation || "").trim(),
      rideDate: String(payload.rideDate || "").trim(),
      trainNo: String(payload.trainNo || "").trim(),
      normalQty: String(seatQty),
    };

    if (!result.startStation || !result.endStation || !result.rideDate) return null;
    return result;
  }

  function waitFor(condition, timeoutMs = MAX_WAIT_MS) {
    return new Promise((resolve, reject) => {
      const start = Date.now();

      const tick = () => {
        try {
          const value = condition();
          if (value) {
            resolve(value);
            return;
          }
        } catch (error) {
          reject(error);
          return;
        }

        if (Date.now() - start >= timeoutMs) {
          reject(new Error("Timed out while waiting for booking form."));
          return;
        }

        window.setTimeout(tick, POLL_MS);
      };

      tick();
    });
  }

  function dispatchValue(input, value) {
    if (!input) return;
    input.focus();
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.blur();
  }

  function setChecked(input) {
    if (!input) return;
    if (!input.checked) input.click();
    input.checked = true;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function findTrainNoInput(form) {
    const selectors = [
      "#trainNoList1",
      'input[name="trainNoList1"]',
      'input[id="trainNoList1"]',
      'input[name="ticketOrderParamList[0].trainNo"]',
    ];

    for (const selector of selectors) {
      const input = form.querySelector(selector);
      if (input) return input;
    }

    const candidates = Array.from(form.querySelectorAll('input[type="text"]'));
    return candidates.find((input) => {
      const key = `${input.id || ""} ${input.name || ""}`.toLowerCase();
      return key.includes("trainnolist1") || key.includes("trainno");
    }) || null;
  }

  function fillBookingForm(form, payload) {
    const pidInput = form.querySelector("#pid, input[name='pid']");
    const startInput = form.querySelector("#startStation, input[name='startStation']");
    const endInput = form.querySelector("#endStation, input[name='endStation']");
    const qtyInput = form.querySelector("#normalQty, input[name='normalQty']");
    const dateInput = form.querySelector("#rideDate1, input[name='ticketOrderParamList[0].rideDate']");
    const tripOneWay = form.querySelector("#orderType1") ? form.querySelector('input[name="tripType"][value="ONEWAY"]') : form.querySelector('input[name="tripType"][value="ONEWAY"]');
    const orderByTrain = form.querySelector("#orderType1, input[name='orderType'][value='BY_TRAIN_NO']");
    const personalType = form.querySelector("#personlType, input[name='custIdTypeEnum'][value='PERSON_ID']");
    const trainInput = findTrainNoInput(form);

    if (!startInput || !endInput || !dateInput || !qtyInput) {
      throw new Error("Booking form inputs were not found.");
    }

    setChecked(personalType);
    setChecked(tripOneWay);
    setChecked(orderByTrain);

    if (pidInput) dispatchValue(pidInput, payload.pid);
    dispatchValue(startInput, payload.startStation);
    dispatchValue(endInput, payload.endStation);
    dispatchValue(dateInput, payload.rideDate);
    dispatchValue(qtyInput, payload.normalQty);

    if (trainInput && payload.trainNo) {
      dispatchValue(trainInput, payload.trainNo);
    }

    const extraTrainInputs = [
      form.querySelector("#trainNoList2, input[name='trainNoList2']"),
      form.querySelector("#trainNoList3, input[name='trainNoList3']"),
    ];
    extraTrainInputs.forEach((input) => {
      if (input) dispatchValue(input, "");
    });
  }

  function submitBookingForm(form) {
    const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
    window.setTimeout(() => {
      if (submitButton) {
        submitButton.click();
        return;
      }
      if (typeof form.requestSubmit === "function") {
        form.requestSubmit();
        return;
      }
      form.submit();
    }, SUBMIT_DELAY_MS);
  }

  async function run() {
    const payload = sanitizePayload(parseHashPayload());
    if (!payload) return;

    clearHashPayload();
    log("Payload detected, waiting for booking form.", payload);

    try {
      const form = await waitFor(() => document.querySelector("#queryForm"));
      fillBookingForm(form, payload);
      submitBookingForm(form);
      log("Booking form filled and submitted.");
    } catch (error) {
      console.error("[TRA Booking Autofill] Autofill failed:", error);
    }
  }

  run();
})();
