// Verificar autenticación
function checkAuth() {
    const token = localStorage.getItem('admin_token');
    if (!token) {
        window.location.href = '/admin/login.html';
        return false;
    }
    return true;
}

// Cerrar sesión
function logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    window.location.href = '/admin/login.html';
}

// Obtener token
function getToken() {
    return localStorage.getItem('admin_token');
}

// Obtener datos del admin
function getAdminUser() {
    return JSON.parse(localStorage.getItem('admin_user') || '{}');
}
