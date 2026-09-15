// github-api.js — клиент Worker. Токен GitHub живёт на стороне Worker.
// Owner: sokline

const GH = {
  workerUrl: 'https://putevoy-api.sokerstyle.workers.dev',  // ← ваш URL Worker

  get code() { return sessionStorage.getItem('pl_code') || ''; },
  set code(v) {
    if (v) sessionStorage.setItem('pl_code', v);
    else sessionStorage.removeItem('pl_code');
  },
  get role() { return sessionStorage.getItem('pl_role') || null; },
  get driverId() { return sessionStorage.getItem('pl_driverId') || null; },

  async login(code) {
    const r = await fetch(this.workerUrl + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    if (!r.ok) return null;
    const j = await r.json();
    this.code = code;
    sessionStorage.setItem('pl_role', j.role);
    if (j.driverId) sessionStorage.setItem('pl_driverId', j.driverId);
    else sessionStorage.removeItem('pl_driverId');
    return j;
  },

  logout() {
    this.code = '';
    sessionStorage.removeItem('pl_role');
    sessionStorage.removeItem('pl_driverId');
  },

  async loadAll() {
    const r = await fetch(`${this.workerUrl}/data?code=${encodeURIComponent(this.code)}`);
    if (!r.ok) throw new Error('LOAD_' + r.status);
    return { data: await r.json() };
  },

  async saveAll(data) {
    const r = await fetch(this.workerUrl + '/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: this.code, data })
    });
    if (!r.ok) throw new Error('SAVE_' + r.status + ': ' + await r.text());
    return r.json();
  },

  async addItem(collection, item) {
    const { data } = await this.loadAll();
    if (!item.id) item.id = collection.slice(0, 2) + '_' + Date.now() + Math.random().toString(36).slice(2, 7);
    data[collection].push(item);
    await this.saveAll(data);
    return item;
  },

  async updateItem(collection, id, patch) {
    const { data } = await this.loadAll();
    const idx = data[collection].findIndex(x => x.id === id);
    if (idx === -1) throw new Error('NOT_FOUND');
    data[collection][idx] = { ...data[collection][idx], ...patch, id };
    await this.saveAll(data);
    return data[collection][idx];
  },

  async removeItem(collection, id) {
    const { data } = await this.loadAll();
    data[collection] = data[collection].filter(x => x.id !== id);
    await this.saveAll(data);
  },

  async loadCodes() {
    const r = await fetch(`${this.workerUrl}/codes?code=${encodeURIComponent(this.code)}`);
    if (!r.ok) throw new Error('CODES_' + r.status);
    return await r.json();
  }
};
