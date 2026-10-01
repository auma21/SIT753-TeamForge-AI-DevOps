(() => {
  const TOKEN_KEY = 'teamforge_token';
  const USER_KEY = 'teamforge_user';
  function token() { return sessionStorage.getItem(TOKEN_KEY); }
  function saveSession(jwt, user) { sessionStorage.setItem(TOKEN_KEY, jwt); sessionStorage.setItem(USER_KEY, JSON.stringify(user)); }
  function clearSession() { sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(USER_KEY); }
  async function request(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    if (token()) headers.Authorization = `Bearer ${token()}`;
    const response = await fetch(path, { ...options, headers });
    let body = {};
    if ((response.headers.get('content-type') || '').includes('application/json')) body = await response.json();
    if (!response.ok) {
      const validation = body?.errors?.map?.(x => x.message || x.msg).join(' ') || '';
      const error = new Error(validation || body?.message || `Request failed with HTTP ${response.status}.`);
      error.status = response.status;
      throw error;
    }
    return body;
  }
  function requireAuth() { if (!token()) { location.replace('/login.html'); return false; } return true; }
  function logout() { clearSession(); location.replace('/login.html'); }
  function message(el, text, kind = 'error') { if (!el) return; el.textContent = text; el.className = `message show ${kind}`; }
  function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  window.TeamForge = { token, saveSession, clearSession, request, requireAuth, logout, message, escapeHtml };
})();
