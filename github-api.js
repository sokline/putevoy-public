// github-api.js - клиент Yandex Cloud Function
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

  // ВАЖНО: возвращает записанные данные с сервера (актуальные)
  async saveAll(data) {
    var r = await fetch(this.workerUrl + "/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: this.code, data: data })
    });
    if (!r.ok) {
      var t = "";
      try { t = await r.text(); } catch (e) {}
      throw new Error("SAVE_" + r.status + ": " + t);
    }
    var j = await r.json();
    return j.data || data;
  },

  async addItem(collection, item) {
    var res = await this.loadAll();
    var data = res.data;
    if (!item.id) item.id = collection.slice(0, 2) + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    data[collection].push(item);
    var saved = await this.saveAll(data);
    return saved;
  },

  async updateItem(collection, id, patch) {
    var res = await this.loadAll();
    var data = res.data;
    var idx = data[collection].findIndex(function (x) { return x.id === id; });
    if (idx === -1) throw new Error("NOT_FOUND");
    data[collection][idx] = Object.assign({}, data[collection][idx], patch, { id: id });
    var saved = await this.saveAll(data);
    return saved;
  },

  async removeItem(collection, id) {
    var res = await this.loadAll();
    var data = res.data;
    data[collection] = data[collection].filter(function (x) { return x.id !== id; });
    var saved = await this.saveAll(data);
    return saved;
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
  }
};
