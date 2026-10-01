(async () => {
  if (!TeamForge.requireAuth()) return;
  document.querySelectorAll('[data-logout]').forEach(b => b.addEventListener('click', TeamForge.logout));
  const recent = document.querySelector('#recentProjects');
  try {
    const [me, response] = await Promise.all([TeamForge.request('/api/auth/me'), TeamForge.request('/api/projects')]);
    document.querySelector('#greeting').textContent = `Welcome, ${me.data.user.name}`;
    const projects = response.data.projects || [];
    document.querySelector('#totalProjects').textContent = projects.length;
    document.querySelector('#activeProjects').textContent = projects.filter(p => p.status === 'active').length;
    document.querySelector('#completedProjects').textContent = projects.filter(p => p.status === 'completed').length;
    document.querySelector('#heldProjects').textContent = projects.filter(p => p.status === 'on-hold').length;
    if (!projects.length) { recent.innerHTML = '<div class="empty">No projects yet. Create your first project to begin.</div>'; return; }
    recent.innerHTML = projects.slice(0, 4).map(p => `<article class="project-card card"><div><span class="badge ${TeamForge.escapeHtml(p.status)}">${TeamForge.escapeHtml(p.status)}</span><h3>${TeamForge.escapeHtml(p.name)}</h3><p>${TeamForge.escapeHtml(p.description || 'No description provided.')}</p></div><a class="btn secondary small" href="/project.html?id=${encodeURIComponent(p.id)}">Open project</a></article>`).join('');
  } catch (error) { if (error.status === 401) return TeamForge.logout(); recent.innerHTML = `<div class="message show error">${TeamForge.escapeHtml(error.message)}</div>`; }
})();
