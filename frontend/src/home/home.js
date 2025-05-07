let ws;

function updateWhatsAppStatus(status) {
    console.log('[Dashboard] Atualizando status do WhatsApp:', status);
    const indicator = document.getElementById('whatsapp-indicator');
    indicator.textContent = status === 'connected' ? 'Conectado' : 'Desconectado';
    indicator.style.color = status === 'connected' ? '#00ff00' : '#ff0000';
    localStorage.setItem('whatsappStatus', status);
}

function connectWebSocket() {
    console.log('[Dashboard] Conectando ao WebSocket...');
    try {
        ws = new WebSocket('ws://localhost:3000');
        ws.onopen = () => {
            console.log('[WebSocket] Conectado ao servidor');
            ws.send(JSON.stringify({ type: 'request_whatsapp_status' }));
        };
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('[Dashboard] Mensagem recebida do WebSocket:', message);
                if (message.type === 'whatsapp_status') {
                    updateWhatsAppStatus(message.status);
                }
            } catch (error) {
                console.error('[Dashboard] Erro ao processar mensagem do WebSocket:', error);
            }
        };
        ws.onclose = () => {
            console.log('[WebSocket] Desconectado do servidor, tentando reconectar...');
            setTimeout(connectWebSocket, 10000);
        };
        ws.onerror = (error) => {
            console.error('[WebSocket] Erro:', error);
        };
    } catch (error) {
        console.error('[Dashboard] Erro ao conectar ao WebSocket:', error);
        setTimeout(connectWebSocket, 10000);
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    sidebar.classList.toggle('hidden');
    mainContent.classList.toggle('full');
}

document.querySelectorAll('.sidebar ul li a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.getAttribute('data-page');
        console.log(`[Renderer] Solicitando navegação para a tela: ${page}`);
        window.electronAPI.navigateTo(page);
    });
});

document.addEventListener('DOMContentLoaded', () => {
    console.log('[Renderer] Carregando dashboard.html...');
    const lastStatus = localStorage.getItem('whatsappStatus') || 'disconnected';
    updateWhatsAppStatus(lastStatus);
    connectWebSocket();
});