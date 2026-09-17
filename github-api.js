// github-api.js — клиент Yandex Cloud Function
// Owner: sokline

var GH = {
  workerUrl: "https://d5djrprsrjmft38gdkvp.0ly8ed4d.apigw.yandexcloud.net",

  get code() { return sessionStorage.getItem("pl_code") || ""; },
  set code(v) {
    if (v) sessionStorage.setItem("pl_code", v);
    else sessionStorage.removeItem("pl_code");
  },
  get role() { return sessionStorage.getItem("pl_role") || null; },
  get driverId() { return sessionStorage.getItem("pl_driverId") || null; },

  async login(code) {
    var r = await fetch(this.workerUrl + "/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code })
    });
    if (!r.ok) return null;
    var j = await r.json();
    this.code = code;
    sessionStorage.setItem("pl_role", j.role);
    if (j.driverId) sessionStorage.setItem("pl_driverId", j.driverId);
    else sessionStorage.removeItem("pl_driverId");
    return j;
  },

  async boot(code) {
    var r = await fetch(this.workerUrl + "/boot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code })
    });
    if (r.ok) {
      var j = await r.json();
      this.code = code;
      sessionStorage.setItem("pl_role", j.role);
      if (j.driverId) sessionStorage.setItem("pl_driverId", j.driverId);
      else sessionStorage.removeItem("pl_driverId");
      return j;
    }
    var s = await this.login(code);
    if (!s) return null;
    var d = await this.loadAll();
    return { role: s.role, driverId: s.driverId, name: s.name, data: d.data };
  },

  logout() {
    this.code = "";
    sessionStorage.removeItem("pl_role");
    sessionStorage.removeItem("pl_driverId");
  },

  async loadAll() {
    var r = await fetch(this.workerUrl + "/data?code=" + encodeURIComponent(this.code));
    if (!r.ok) throw new Error("LOAD_" + r.status);
    return { data: await r.json() };
  },

  async saveAll(data) {
    var r = await fetch(this.workerUrl + "/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: this.code, data: data })
    });
    if (!r.ok) {
      var t = "";
      try { t = await r.text(); } catch (e) {}
      throw new Error("SAVE_" + r.status + ": " + t.slice(0, 300));
    }
    var j = await r.json();
    return j.data || data;
  },

  async loadCodes() {
    var r = await fetch(this.workerUrl + "/codes?code=" + encodeURIComponent(this.code));
    if (!r.ok) throw new Error("CODES_" + r.status);
    return await r.json();
  },

  async saveCodes(codes) {
    var r = await fetch(this.workerUrl + "/codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: this.code, data: codes })
    });
    if (!r.ok) throw new Error("SAVE_CODES_" + r.status);
    return r.json();
  },

  // ===== СПРАВОЧНИК ТОЧЕК =====
  async loadLocations() {
    var r = await fetch(this.workerUrl + "/locations?code=" + encodeURIComponent(this.code));
    if (!r.ok) throw new Error("LOCATIONS_" + r.status);
    return await r.json(); // { locations: [...], lastModified }
  },

  async saveLocations(locObj) {
    var r = await fetch(this.workerUrl + "/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: this.code, data: locObj })
    });
    if (!r.ok) {
      var t = "";
      try { t = await r.text(); } catch (e) {}
      throw new Error("SAVE_LOCATIONS_" + r.status + ": " + t.slice(0, 200));
    }
    return r.json();
  },

  async importLocations(items) {
    var r = await fetch(this.workerUrl + "/locations/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: this.code, items: items })
    });
    if (!r.ok) {
      var t = "";
      try { t = await r.text(); } catch (e) {}
      throw new Error("IMPORT_LOCATIONS_" + r.status + ": " + t.slice(0, 200));
    }
    return r.json();
  }
};
