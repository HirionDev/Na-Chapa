async function login(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
        document.getElementById('error-message').innerText = 'Por favor, preencha todos os campos.';
        document.getElementById('error-message').style.display = 'block';
        return;
    }

    try {
        const response = await fetch('http://127.0.0.1:3000/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, password: password }), // Alterado de "name" para "username"
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao fazer login');
        }

        const data = await response.json();
        localStorage.setItem('token', data.token);
        console.log('[Renderer] Login bem-sucedido, navegando para dashboard.html...');
        window.electronAPI.navigateTo('dashboard/dashboard.html');
    } catch (error) {
        console.error('[Renderer] Erro ao fazer login:', error);
        document.getElementById('error-message').innerText = `Erro: ${error.message}`;
        document.getElementById('error-message').style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('[Renderer] Carregando login.html...');
});