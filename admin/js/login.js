// Admin Login Script
// Verificar si ya está autenticado
if (localStorage.getItem('admin_token')) {
    window.location.href = '/admin/index.html';
}

document.getElementById('btn-submit').addEventListener('click', async (e) => {
    e.preventDefault();
    console.log('Login button clicked');

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('error-message');
    const btnSubmit = document.getElementById('btn-submit');

    console.log('Username:', username, 'Password length:', password.length);

    // Reset error
    errorEl.classList.remove('active');
    errorEl.textContent = '';

    // Disable button
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Iniciando sesión...';

    try {
        // Llamar al API
        // Usar lógica dinámica para la URL
        const apiUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? 'http://localhost:3000/api/admin/login'
            : '/api/admin/login';

        console.log('Calling API:', apiUrl);
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);

        if (!response.ok) {
            throw new Error(data.error || 'Error al iniciar sesión');
        }

        // Guardar token y datos del admin
        localStorage.setItem('admin_token', data.token);
        localStorage.setItem('admin_user', JSON.stringify(data.admin));

        console.log('Token saved, redirecting...');
        // Redirigir al dashboard
        window.location.href = '/admin/index.html';

    } catch (error) {
        console.error('Login error:', error);
        errorEl.textContent = error.message;
        errorEl.classList.add('active');

        // Re-enable button
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Iniciar Sesión';
    }
});
