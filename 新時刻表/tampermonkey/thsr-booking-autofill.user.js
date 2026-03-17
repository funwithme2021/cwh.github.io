// ==UserScript==
// @name         THSR Booking Autofill
// @namespace    https://irs.thsrc.com.tw/
// @version      0.1.0
// @description  Autofill THSR booking form from URL hash payload and submit it.
// @match        https://irs.thsrc.com.tw/IMINT/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const HASH_KEY = "thsrAutoFill";
  const MAX_WAIT_MS = 15000;
  const POLL_MS = 150;
  const SUBMIT_DELAY_MS = 1400;

  const STATION_VALUE_MAP = {
    "南港": "1",
    "台北": "2",
    "臺北": "2",
    "板橋": "3",
    "桃園": "4",
    "新竹": "5",
    "苗栗": "6",
    "台中": "7",
    "臺中": "7",
    "彰化": "8",
    "雲林": "9",
    "嘉義": "10",
    "台南": "11",
    "臺南": "11",
    "左營": "12",
    "高雄": "12",
    "新左營": "12",
  };

  function parsePayloadFromSearchOrHash() {
    const searchParams = new URLSearchParams(window.location.search || "");
    const hashParams = new URLSearchParams(String(window.location.hash || "").replace(/^#/, ""));
    const encoded = searchParams.get(HASH_KEY) || hashParams.get(HASH_KEY);
    if (!encoded) return null;

    try {
      return JSON.parse(decodeURIComponent(encoded));
    } catch (error) {
      console.error("[THSR Booking Autofill] Failed to parse payload:", error);
      return null;
    }
  }

  function clearPayloadFromUrl() {
    try {
      const searchParams = new URLSearchParams(window.location.search || "");
      searchParams.delete(HASH_KEY);
      const query = searchParams.toString();
      const cleanUrl = `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ""}`;
      window.history.replaceState(null, document.title, cleanUrl);
    } catch (error) {
      console.warn("[THSR Booking Autofill] Failed to clear payload:", error);
    }
  }

  function normalizeStationName(name) {
    const value = String(name || "").trim().replace(/臺/g, "台");
    if (value === "高雄" || value === "新左營") return "左營";
    return value;
  }

  function sanitizePayload(payload) {
    if (!payload || typeof payload !== "object") return null;

    const result = {
      startStation: normalizeStationName(payload.startStation),
      endStation: normalizeStationName(payload.endStation),
      rideDate: String(payload.rideDate || "").trim(),
      trainNo: String(payload.trainNo || "").trim(),
      seatPreference: Math.max(0, Math.min(2, parseInt(payload.seatPreference, 10) || 0)),
    };

    if (!result.startStation || !result.endStation || !result.rideDate || !result.trainNo) return null;
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
          reject(new Error("Timed out while waiting for THSR booking form."));
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

  function dispatchSelect(select, value) {
    if (!select) return;
    select.value = value;
    const matchedOption = Array.from(select.options || []).find((option) => option.value === value);
    if (matchedOption) matchedOption.selected = true;
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
    select.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }

  function setChecked(input) {
    if (!input) return;
    if (!input.checked) input.click();
    input.checked = true;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function fillTHSRForm(form, payload) {
    const startValue = STATION_VALUE_MAP[payload.startStation];
    const endValue = STATION_VALUE_MAP[payload.endStation];
    if (!startValue || !endValue) {
      throw new Error("Unable to map THSR station to official select value.");
    }

    const trainType = form.querySelector('select[name="trainCon:trainRadioGroup"]');
    const tripType = form.querySelector('select[name="tripCon:typesoftrip"]');
    const startSelect = form.querySelector('select[name="selectStartStation"]');
    const endSelect = form.querySelector('select[name="selectDestinationStation"]');
    const dateInput = form.querySelector('#toTimeInputField, input[name="toTimeInputField"]');
    const visibleDateInput = dateInput?.parentElement?.querySelector('input[type="text"]:not([name])');
    const trainInput = form.querySelector('input[name="toTrainIDInputField"]');
    const bookingMethodTrain = form.querySelector('input[name="bookingMethod"][data-target="search-by-trainNo"]');

    if (!trainType || !tripType || !startSelect || !endSelect || !dateInput || !trainInput || !bookingMethodTrain) {
      throw new Error("THSR booking form inputs were not found.");
    }

    dispatchSelect(trainType, "0");
    dispatchSelect(tripType, "0");
    setChecked(bookingMethodTrain);
    dispatchSelect(startSelect, startValue);
    dispatchSelect(endSelect, endValue);
    dispatchValue(dateInput, payload.rideDate);
    if (visibleDateInput) dispatchValue(visibleDateInput, payload.rideDate);
    dispatchValue(trainInput, payload.trainNo);

    if (window.BookingS1 && typeof window.BookingS1.typesoftrainCheck === "function") {
      try {
        window.BookingS1.typesoftrainCheck();
      } catch (error) {
        console.warn("[THSR Booking Autofill] typesoftrainCheck failed:", error);
      }
    }
  }

  function submitForm(form) {
    window.setTimeout(() => {
      const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
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
    const payload = sanitizePayload(parsePayloadFromSearchOrHash());
    if (!payload) return;

    clearPayloadFromUrl();

    try {
      const form = await waitFor(() => document.querySelector("#BookingS1Form"));
      fillTHSRForm(form, payload);
      submitForm(form);
    } catch (error) {
      console.error("[THSR Booking Autofill] Autofill failed:", error);
    }
  }

  run();
})();
