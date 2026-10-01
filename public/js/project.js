(() => {
  if (!TeamForge.requireAuth()) return;
  document.querySelectorAll('[data-logout]').forEach(b => b.addEventListener('click', TeamForge.logout));
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { location.replace('/projects.html'); return; }
  const board = document.querySelector('#taskBoard'); const modal = document.querySelector('#taskModal'); const form = document.querySelector('#taskForm'); const msg = document.querySelector('#taskMessage');
  const statuses = [['backlog','Backlog'],['todo','To Do'],['in-progress','In Progress'],['review','Review'],['done','Done']]; let editingId = null;
  function open(task = null) { editingId = task?.id || null; form.reset(); form.title.value = task?.title || ''; form.description.value = task?.description || ''; form.priority.value = task?.priority || 'medium'; form.status.value = task?.status || 'backlog'; document.querySelector('#taskModalTitle').textContent = editingId ? 'Edit Task' : 'Create Task'; document.querySelector('#deleteTask').style.display = editingId ? 'inline-flex' : 'none'; msg.className = 'message'; modal.classList.add('open'); }
  function close() { modal.classList.remove('open'); }
  async function load() {
    try {
      const [projectResponse, taskResponse] = await Promise.all([TeamForge.request(`/api/projects/${id}`), TeamForge.request(`/api/projects/${id}/tasks`)]);
      const project = projectResponse.data.project; const tasks = taskResponse.data.tasks || [];
      document.querySelector('#projectName').textContent = project.name; document.querySelector('#projectDescription').textContent = project.description || 'No description provided.'; document.querySelector('#projectStatus').textContent = project.status;
      board.innerHTML = statuses.map(([key,label]) => { const items = tasks.filter(t => t.status === key); return `<section class="column"><div class="column-head"><span>${label}</span><span>${items.length}</span></div>${items.map(t => `<article class="task-card" data-task="${t.id}"><span class="priority ${TeamForge.escapeHtml(t.priority)}">${TeamForge.escapeHtml(t.priority)}</span><h3>${TeamForge.escapeHtml(t.title)}</h3><p>${TeamForge.escapeHtml(t.description || 'No description.')}</p></article>`).join('') || '<div class="muted">No tasks</div>'}</section>`; }).join('');
      board.querySelectorAll('[data-task]').forEach(el => el.addEventListener('click', () => open(tasks.find(t => t.id === el.dataset.task))));
    } catch (error) { if (error.status === 401) return TeamForge.logout(); board.innerHTML = `<div class="message show error">${TeamForge.escapeHtml(error.message)}</div>`; }
  }
  document.querySelector('#newTask').addEventListener('click', () => open()); document.querySelector('#closeTaskModal').addEventListener('click', close); modal.addEventListener('click', e => { if (e.target === modal) close(); });
  form.addEventListener('submit', async e => { e.preventDefault(); const data = Object.fromEntries(new FormData(form).entries()); try { await TeamForge.request(editingId ? `/api/tasks/${editingId}` : `/api/projects/${id}/tasks`, { method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(data) }); close(); load(); } catch (error) { TeamForge.message(msg, error.message); } });
  document.querySelector('#deleteTask').addEventListener('click', async () => { if (!editingId || !confirm('Delete this task?')) return; await TeamForge.request(`/api/tasks/${editingId}`, { method: 'DELETE' }); close(); load(); });
  load();
})();
