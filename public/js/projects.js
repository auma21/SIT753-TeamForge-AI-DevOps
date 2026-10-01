(() => {
  if (!TeamForge.requireAuth()) return;
  document.querySelectorAll('[data-logout]').forEach(b => b.addEventListener('click', TeamForge.logout));
  const list = document.querySelector('#projectList');
  const modal = document.querySelector('#projectModal');
  const form = document.querySelector('#projectForm');
  const msg = document.querySelector('#projectMessage');
  let editingId = null;
  function open(project = null) {
    editingId = project?.id || null; form.reset();
    form.name.value = project?.name || ''; form.description.value = project?.description || ''; form.status.value = project?.status || 'active';
    document.querySelector('#modalTitle').textContent = editingId ? 'Edit Project' : 'Create Project'; msg.className = 'message'; modal.classList.add('open');
  }
  function close() { modal.classList.remove('open'); }
  async function load() {
    try {
      const response = await TeamForge.request('/api/projects'); const projects = response.data.projects || [];
      if (!projects.length) { list.innerHTML = '<div class="card empty">No projects yet. Select “New Project” to create one.</div>'; return; }
      list.innerHTML = projects.map(p => `<article class="project-card card"><div><span class="badge ${TeamForge.escapeHtml(p.status)}">${TeamForge.escapeHtml(p.status)}</span><h3>${TeamForge.escapeHtml(p.name)}</h3><p>${TeamForge.escapeHtml(p.description || 'No description provided.')}</p></div><div class="toolbar"><a class="btn secondary small" href="/project.html?id=${encodeURIComponent(p.id)}">Open backlog</a><button class="btn secondary small" data-edit="${p.id}">Edit</button><button class="btn danger small" data-delete="${p.id}">Delete</button></div></article>`).join('');
      list.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => open(projects.find(p => p.id === b.dataset.edit))));
      list.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', async () => { if (!confirm('Delete this project and its tasks?')) return; await TeamForge.request(`/api/projects/${b.dataset.delete}`, { method: 'DELETE' }); load(); }));
    } catch (error) { if (error.status === 401) return TeamForge.logout(); list.innerHTML = `<div class="message show error">${TeamForge.escapeHtml(error.message)}</div>`; }
  }
  document.querySelector('#newProject').addEventListener('click', () => open());
  document.querySelector('#closeProjectModal').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  form.addEventListener('submit', async e => {
    e.preventDefault(); const data = Object.fromEntries(new FormData(form).entries());
    try { await TeamForge.request(editingId ? `/api/projects/${editingId}` : '/api/projects', { method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(data) }); close(); load(); }
    catch (error) { TeamForge.message(msg, error.message); }
  });
  load();
})();
