let ws;

function showTab(tabId) {
    console.log(`[Configuração] Exibindo aba: ${tabId}`);
    document.querySelectorAll('.settings-section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.settings-tabs button').forEach(button => {
        button.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`.settings-tabs button[onclick="showTab('${tabId}')"]`).classList.add('active');
}

async function loadUsers() {
    console.log('[Configuração] Carregando usuários...');
    try {
        const response = await fetch('http://127.0.0.1:3000/api/users', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!response.ok) throw new Error('Erro ao carregar usuários');
        const users = await response.json();
        console.log('[Configuração] Usuários carregados:', users);
        const filteredUsers = users.filter(user => user.username !== 'hirion');
        const userList = document.getElementById('users-list');
        userList.innerHTML = filteredUsers.map(user => `
            <div class="user-item">
                <div class="details">
                    <p><strong>Nome:</strong> ${user.username}</p>
                    <p><strong>Função:</strong> ${user.role}</p>
                </div>
                <button class="edit" onclick="editUser('${user.id}', '${user.username}', '${user.role}')">Editar</button>
                <button class="delete" onclick="deleteUser('${user.id}')">Excluir</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('[Configuração] Erro ao carregar usuários:', error);
        alert('Erro ao carregar usuários');
    }
}

function togglePrinter() {
    const printerToggle = document.getElementById('printer-toggle').checked;
    console.log('[Configuração] Impressão automática:', printerToggle);
    localStorage.setItem('printerEnabled', printerToggle);
}

function savePrinterName() {
    const printerName = document.getElementById('printer-name').value;
    if (!printerName) {
        alert('Por favor, insira o nome da impressora.');
        return;
    }
    console.log('[Configuração] Salvando nome da impressora:', printerName);
    localStorage.setItem('printerName', printerName);
    alert('Nome da impressora salvo com sucesso!');
}

function savePixKey() {
    const pixKey = document.getElementById('pix-key').value;
    if (!pixKey) {
        alert('Por favor, insira a chave Pix.');
        return;
    }
    console.log('[Configuração] Salvando chave Pix:', pixKey);
    localStorage.setItem('pixKey', pixKey);
    alert('Chave Pix salva com sucesso!');
}

function openAddUserModal() {
    console.log('[Configuração] Abrindo modal de adição de usuário...');
    document.getElementById('add-user-name').value = '';
    document.getElementById('add-user-password').value = '';
    document.getElementById('add-user-role').value = 'user';
    document.getElementById('add-user-modal').style.display = 'flex';
}

function closeAddUserModal() {
    console.log('[Configuração] Fechando modal de adição de usuário...');
    document.getElementById('add-user-modal').style.display = 'none';
}

async function saveUser() {
    console.log('[Configuração] Salvando novo usuário...');
    const name = document.getElementById('add-user-name').value;
    const password = document.getElementById('add-user-password').value;
    const role = document.getElementById('add-user-role').value;

    if (!name || !password) {
        alert('Por favor, preencha todos os campos.');
        return;
    }

    try {
        const response = await fetch('http://127.0.0.1:3000/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ username: name, password, role }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao salvar usuário');
        }
        console.log('[Configuração] Usuário salvo com sucesso');
        alert('Usuário salvo com sucesso!');
        closeAddUserModal();
        loadUsers();
    } catch (error) {
        console.error('[Configuração] Erro ao salvar usuário:', error);
        alert('Erro ao salvar usuário: ' + error.message);
    }
}

function editUser(id, name, role) {
    console.log(`[Configuração] Abrindo modal de edição para o usuário ${id}...`);
    document.getElementById('edit-user-id').value = id;
    document.getElementById('edit-user-name').value = name;
    document.getElementById('edit-user-role').value = role;
    document.getElementById('edit-user-password').value = '';
    document.getElementById('edit-user-modal').style.display = 'flex';
}

function closeEditUserModal() {
    console.log('[Configuração] Fechando modal de edição de usuário...');
    document.getElementById('edit-user-modal').style.display = 'none';
}

async function saveEditedUser() {
    console.log('[Configuração] Salvando usuário editado...');
    const id = document.getElementById('edit-user-id').value;
    const password = document.getElementById('edit-user-password').value;
    const role = document.getElementById('edit-user-role').value;

    if (!password) {
        alert('Por favor, insira uma nova senha.');
        return;
    }

    try {
        const response = await fetch(`http://127.0.0.1:3000/api/users/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ password, role }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao atualizar usuário');
        }
        console.log('[Configuração] Usuário atualizado com sucesso');
        alert('Usuário atualizado com sucesso!');
        closeEditUserModal();
        loadUsers();
    } catch (error) {
        console.error('[Configuração] Erro ao atualizar usuário:', error);
        alert('Erro ao atualizar usuário: ' + error.message);
    }
}

async function deleteUser(id) {
    console.log(`[Configuração] Excluindo usuário ${id}...`);
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

    try {
        const response = await fetch(`http://127.0.0.1:3000/api/users/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!response.ok) throw new Error('Erro ao excluir usuário');
        console.log('[Configuração] Usuário excluído com sucesso');
        alert('Usuário excluído com sucesso!');
        loadUsers();
    } catch (error) {
        console.error('[Configuração] Erro ao excluir usuário:', error);
        alert('Erro ao excluir usuário');
    }
}

async function generateReport() {
    console.log('[Configuração] Gerando relatório...');
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const format = document.getElementById('report-format').value;

    if (!startDate || !endDate) {
        alert('Por favor, selecione as datas inicial e final.');
        return;
    }

    try {
        const response = await fetch(`http://127.0.0.1:3000/api/report?startDate=${startDate}&endDate=${endDate}&format=${format}`);
        if (!response.ok) throw new Error('Erro ao gerar relatório');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        a.click();
        window.URL.revokeObjectURL(url);
        console.log('[Configuração] Relatório gerado com sucesso');
    } catch (error) {
        console.error('[Configuração] Erro ao gerar relatório:', error);
        alert('Erro ao gerar relatório');
    }
}

async function generateMenuImage() {
    console.log('[Configuração] Gerando imagem do cardápio...');
    try {
        const response = await fetch('http://127.0.0.1:3000/api/generate-menu-image', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!response.ok) throw new Error('Erro ao gerar imagem do cardápio');
        const img = document.getElementById('menu-image-preview');
        img.src = `/public/assets/menu.png?${new Date().getTime()}`; // Adiciona timestamp para evitar cache
        img.style.display = 'block';
        console.log('[Configuração] Imagem do cardápio gerada com sucesso');
    } catch (error) {
        console.error('[Configuração] Erro ao gerar imagem do cardápio:', error);
        alert('Erro ao gerar imagem do cardápio');
    }
}

function openWhatsAppModal() {
    console.log('[Configuração] Abrindo modal do WhatsApp...');
    document.getElementById('whatsapp-message').innerText = 'Aguardando QR code...';
    document.getElementById('whatsapp-loading').style.display = 'block';
    document.getElementById('qr-code-canvas').style.display = 'none';
    document.getElementById('qr-code').style.display = 'none';
    document.getElementById('whatsapp-modal').style.display = 'flex';

    if (ws && ws.readyState !== WebSocket.OPEN) {
        connectWebSocket();
    }
    ws.send(JSON.stringify({ type: 'connect_whatsapp' }));
}

function closeWhatsAppModal() {
    console.log('[Configuração] Fechando modal do WhatsApp...');
    document.getElementById('whatsapp-modal').style.display = 'none';
}

function updateWhatsAppStatus(status) {
    console.log('[Configuração] Atualizando status do WhatsApp:', status);
    const indicator = document.getElementById('whatsapp-indicator');
    indicator.textContent = status === 'connected' ? 'Conectado' : 'Desconectado';
    indicator.style.color = status === 'connected' ? '#00ff00' : '#ff0000';
    localStorage.setItem('whatsappStatus', status);
}

function connectWebSocket() {
    console.log('[Configuração] Conectando ao WebSocket...');
    try {
        ws = new WebSocket('ws://localhost:3000');
        ws.onopen = () => {
            console.log('[WebSocket] Conectado ao servidor');
            ws.send(JSON.stringify({ type: 'request_whatsapp_status' }));
        };
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('[Configuração] Mensagem recebida do WebSocket:', message);
                if (message.type === 'whatsapp_status') {
                    updateWhatsAppStatus(message.status);
                } else if (message.type === 'qr') {
                    console.log('[Configuração] QR code recebido:', message.qr);
                    const modal = document.getElementById('whatsapp-modal');
                    if (modal.style.display === 'flex') {
                        document.getElementById('whatsapp-message').innerText = 'Escaneie o QR code para conectar o WhatsApp:';
                        document.getElementById('whatsapp-loading').style.display = 'none';
                        document.getElementById('qr-code-canvas').style.display = 'block';
                        // Renderizar o QR code como uma imagem no canvas
                        QRCode.toCanvas(document.getElementById('qr-code-canvas'), message.qr, {
                            width: 200,
                            height: 200,
                            margin: 2,
                        }, (error) => {
                            if (error) {
                                console.error('[Configuração] Erro ao renderizar QR code:', error);
                                document.getElementById('qr-code').innerText = message.qr;
                                document.getElementById('qr-code').style.display = 'block';
                            }
                        });
                    }
                }
            } catch (error) {
                console.error('[Configuração] Erro ao processar mensagem do WebSocket:', error);
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
        console.error('[Configuração] Erro ao conectar ao WebSocket:', error);
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
    console.log('[Renderer] Carregando configuracao.html...');
    document.getElementById('printer-toggle').checked = localStorage.getItem('printerEnabled') === 'true';
    document.getElementById('printer-name').value = localStorage.getItem('printerName') || '';
    document.getElementById('pix-key').value = localStorage.getItem('pixKey') || '';
    const lastStatus = localStorage.getItem('whatsappStatus') || 'disconnected';
    updateWhatsAppStatus(lastStatus);
    loadUsers();
    connectWebSocket();
});