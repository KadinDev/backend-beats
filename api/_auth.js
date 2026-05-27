function getAdminPassword(request) {
  return request.headers['x-admin-password'] || request.headers['X-Admin-Password'];
}

function isAuthorized(request) {
  const configuredPassword = process.env.ADMIN_PASSWORD;

  if (!configuredPassword) {
    return false;
  }

  return getAdminPassword(request) === configuredPassword;
}

function requireAdmin(request, response) {
  if (isAuthorized(request)) {
    return true;
  }

  response.status(401).json({
    error: 'Nao autorizado. Configure ADMIN_PASSWORD na Vercel e informe a senha no painel.'
  });

  return false;
}

module.exports = {
  isAuthorized,
  requireAdmin
};
