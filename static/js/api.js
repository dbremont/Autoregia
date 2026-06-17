/**
 * PRS API Client
 * Thin wrapper around fetch() for all backend endpoints.
 */
const PRS_API = (function () {
  const BASE = "/api";

  async function _fetch(url, options) {
    const res = await fetch(url, options);
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        msg = body.error || msg;
      } catch (_) {
        /* non-JSON error */
      }
      throw new Error(msg);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  function _json(method, body) {
    return {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    };
  }

  return {
    // --- Records ---
    listRecords(filter = "all", q = "") {
      const params = new URLSearchParams();
      if (filter && filter !== "all") params.set("filter", filter);
      if (q) params.set("q", q);
      const qs = params.toString();
      return _fetch(`${BASE}/records${qs ? "?" + qs : ""}`);
    },

    getRecord(id) {
      return _fetch(`${BASE}/records/${encodeURIComponent(id)}`);
    },

    createRecord(data) {
      return _fetch(`${BASE}/records`, _json("POST", data));
    },

    updateRecord(id, data) {
      return _fetch(
        `${BASE}/records/${encodeURIComponent(id)}`,
        _json("PUT", data)
      );
    },

    deleteRecord(id) {
      return _fetch(
        `${BASE}/records/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
    },

    exportPRSL(id) {
      return _fetch(`${BASE}/records/${encodeURIComponent(id)}/prsl`);
    },

    // --- Aggregates ---
    getStats() {
      return _fetch(`${BASE}/stats`);
    },

    getGraph() {
      return _fetch(`${BASE}/graph`);
    },

    getTimeline() {
      return _fetch(`${BASE}/timeline`);
    },

    getMeta() {
      return _fetch(`${BASE}/meta`);
    },
  };
})();