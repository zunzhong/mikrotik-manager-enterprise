// Enable development auth headers for the web app.
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.userId', 'demo-user');
localStorage.setItem('mme.devAuth.email', 'demo@example.local');
localStorage.setItem('mme.devAuth.name', 'Demo User');
localStorage.setItem('mme.devAuth.roles', 'admin,auditor');
localStorage.setItem('mme.devAuth.permissions', 'audit:export,device:read');
localStorage.setItem('mme.devAuth.superAdmin', 'false');
location.reload();

// Disable development auth headers.
// localStorage.removeItem('mme.devAuth.enabled');
// localStorage.removeItem('mme.devAuth.userId');
// localStorage.removeItem('mme.devAuth.email');
// localStorage.removeItem('mme.devAuth.name');
// localStorage.removeItem('mme.devAuth.roles');
// localStorage.removeItem('mme.devAuth.permissions');
// localStorage.removeItem('mme.devAuth.superAdmin');
// location.reload();
