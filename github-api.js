// github-api.js — клиент GitHub API для работы с закрытым репозиторием
// Токен НЕ хранится здесь! Вводится пользователем и хранится в sessionStorage.

const GH = {
  // Настройки закрытого репозитория
  owner: 'sokline',        // ← замените на ваш логин GitHub
  repo: 'putevoy-private',    // ← имя закрытого репозитория
  branch: 'main',
  dataPath: 'data.json',

  get token() {
    return sessionStorage.getItem('gh_token') || '';
  },
  set token(v) {
    if (v) sessionStorage.setItem('gh_token', v);
    else sessionStorage.removeItem('gh_token');
  },

  _headers() {
    if (!this.token) throw new Error('NO_TOKEN');
    return {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    };
  },

  // Получить файл из закрытого репо (возвращает {data, sha})
  async readFile(path) {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}?ref=${this.branch}&t=${Date.now()}`;
    const r = await fetch(url, { headers: this._headers() });
    if (r.status === 404) return { data: null, sha: null };
    if (!r.ok) throw new Error('READ_' + r.status);
    const j = await r.json();
    // GitHub возвращает содержимое в Base64
    const content = decodeURIComponent(escape(atob(j.content.replace(/\n/g, ''))));
    return { data: JSON.parse(content), sha: j.sha };
  },

  // Записать файл в закрытый репо
  async writeFile(path, data, sha) {
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
    const body = {
      message: `update ${path} — ${new Date().toISOString()}`,
      content,
      branch: this.branch,
      ...(sha ? { sha } : {})
    };
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`;
    const r = await fetch(url, {
      method: 'PUT',
      headers: this._headers(),
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      const err = await r.text();
      throw new Error('WRITE_' + r.status + ': ' + err);
    }
    return await r.json();
  },

  // Проверка токена
  async verifyToken() {
    try {
      const r = await fetch('https://api.github.com/user', { headers: this._headers() });
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  },

  // ==== Высокоуровневые операции с данными ====
  async loadAll() {
    const { data, sha } = await this.readFile(this.dataPath);
    if (!data) {
      const empty = { drivers: [], vehicles: [], assignments: [], shifts: [], repairs: [] };
      await this.writeFile(this.dataPath, empty, null);
      return { data: empty, sha: null };
    }
    return { data, sha };
  },

  async addItem(collection, item) {
    const { data, sha } = await this.loadAll();
    if (!item.id) item.id = collection.slice(0, 2) + '_' + Date.now() + Math.random().toString(36).slice(2, 7);
    data[collection].push(item);
    await this.writeFile(this.dataPath, data, sha);
    return item;
  },

  async updateItem(collection, id, patch) {
    const { data, sha } = await this.loadAll();
    const idx = data[collection].findIndex(x => x.id === id);
    if (idx === -1) throw new Error('NOT_FOUND');
    data[collection][idx] = { ...data[collection][idx], ...patch, id };
    await this.writeFile(this.dataPath, data, sha);
    return data[collection][idx];
  },

  async removeItem(collection, id) {
    const { data, sha } = await this.loadAll();
    data[collection] = data[collection].filter(x => x.id !== id);
    await this.writeFile(this.dataPath, data, sha);
  }
};
