(function () {
  if (window.RailFeatureGate) return;

  const STORAGE_KEY = "rail_feature_gate_state_v1";

  function clearState() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {
    }
  }

  clearState();

  window.RailFeatureGate = {
    async ensureAccess() {
      return true;
    },
    getRequirement(feature, options) {
      return {
        required: false,
        reason: "",
        granted: true,
        meta: {
          label: options?.label || "",
          accent: options?.accent || "#2563eb",
        },
      };
    },
    mountInlineChallenge(container, feature, options) {
      if (container) container.innerHTML = "";
      if (typeof options?.onSuccess === "function") {
        queueMicrotask(() => options.onSuccess());
      }
      return { destroy() {} };
    },
    clearState,
  };
})();
