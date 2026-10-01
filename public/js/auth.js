(() => {
  const form = document.querySelector('[data-auth-form]');
  if (!form) return;
  const box = document.querySelector('#message');
  const mode = form.dataset.authForm;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    box.className = 'message';
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const data = Object.fromEntries(new FormData(form).entries());
      if (mode === 'register') {
        if (data.password !== data.confirmPassword) throw new Error('Passwords do not match.');
        await TeamForge.request('/api/auth/register', { method: 'POST', body: JSON.stringify({ name: data.name, email: data.email, password: data.password }) });
        TeamForge.message(box, 'Account created successfully. Redirecting to sign in…', 'success');
        setTimeout(() => location.replace('/login.html'), 700);
      } else {
        const response = await TeamForge.request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: data.email, password: data.password }) });
        TeamForge.saveSession(response.data.token, response.data.user);
        location.replace('/dashboard.html');
      }
    } catch (error) { TeamForge.message(box, error.message); }
    finally { submit.disabled = false; }
  });
})();
