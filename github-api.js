const GH = {
  workerUrl: 'https://putevoy-api.sokyrstyle.workers.dev',

  get code() { return sessionStorage.getItem('pl_code') || ''; },
  set code(v) { if (v) sessionStorage.setItem('pl_code', v); else sessionStorage.removeItem('pl_code'); },

  async login(code) {
    var r = await fetch(this.workerUrl + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code })
    });
    if (!r.ok) return null;
    var j = await r.json();
    this.code = code;
    sessionStorage.setItem('pl_role', j.role);
    if (j.driverId) sessionStorage.setItem('pl_driverId', j.driverId);
    return j;
  },

  async boot(code) {
    // Fallback: если /boot не работает, используем /login + /data
    var r = await fetch(this.workerUrl + '/boot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code })
    });
    if (r.ok) {
      var j = await r.json();
      this.code = code;
      sessionStorage.setItem('pl_role', j.role);
      if (j.driverId) sessionStorage.setItem('pl_driverId', j.driverId);
      return j;
    }
    // Fallback на два запроса
    var s = await this.login(code);
    if (!s) return null;
    var d = await this.loadAll();
    return { role: s.role, driverId: s.driverId, name: s.name, data: d.data };
  },

  logout() {
    this.code = '';
    sessionStorage.removeItem('pl_role');
    sessionStorage.removeItem('pl_driverId');
  },

  async loadAll() {
    var r = await fetch(this.workerUrl + '/data?code=' + encodeURIComponent(this.code));
    if (!r.ok) throw new Error('LOAD_' + r.status);
    return { data: await r.json() };
  },

  async saveAll(data) {
    var r = await fetch(this.workerUrl + '/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: this.code, data: data })
    });
    if (!r.ok) throw new Error('SAVE_' + r.status + ': ' + await r.text());
    return r.json();
  },

  async addItem(collection, item) {
    var res = await this.loadAll();
    var data = res.data;
    if (!item.id) item.id = collection.slice(0, 2) + '_' + Date.now() + Math.random().toString(36).slice(2, 7);
    data[collection].push(item);
    await this.saveAll(data);
    return item;
  },

  async updateItem(collection, id, patch) {
    var res = await this.loadAll();
    var data = res.data;
    var idx = data[collection].findIndex(function (x) { return x.id === id; });
    if (idx === -1) throw new Error('NOT_FOUND');
    data[collection][idx] = Object.assign({}, data[collection][idx], patch, { id: id });
    await this.saveAll(data);
    return data[collection][idx];
  },

  async removeItem(collection, id) {
    var res = await this.loadAll();
    var data = res.data;
    data[collection] = data[collection].filter(function (x) { return x.id !== id; });
    await this.saveAll(data);
  },

  async loadCodes() {
    var r = await fetch(this.workerUrl + '/codes?code=' + encodeURIComponent(this.code));
    if (!r.ok) throw new Error('CODES_' + r.status);
    return await r.json();
  }
};
