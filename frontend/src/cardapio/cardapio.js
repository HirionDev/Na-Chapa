let ws;
let currentItemId = null;
let allItems = []; // Armazenar os itens para uso no modal

async function loadMenuItems() {
    console.log('[Cardápio] Carregando itens do cardápio...');
    try {
        const response = await fetch('http://127.0.0.1:3000/api/menu-items', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!response.ok) throw new Error('Erro ao carregar itens do cardápio');
        const items = await response.json();
        console.log('[Cardápio] Itens carregados:', items);
        allItems = items;

        const categories = [...new Set(items.map(item => item.category))];
        const menuSectionsDiv = document.getElementById('menu-sections');
        menuSectionsDiv.innerHTML = '';

        categories.forEach(category => {
            const categoryItems = items.filter(item => item.category === category);
            const section = document.createElement('div');
            section.className = 'menu-section';
            section.innerHTML = `<h2>${category}</h2>`;
            categoryItems.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'menu-item';
                itemDiv.innerHTML = `
                    ${item.image ? `<img src="/public/assets/${item.image}?${new Date().getTime()}" alt="${item.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='block';">` : ''}
                    <div class="placeholder-image" style="${item.image ? 'display: none;' : ''}"></div>
                    <div class="item-details">
                        <p><strong>${item.name}</strong> - R$${item.price.toFixed(2)}</p>
                        ${item.description ? `<p>${item.description}</p>` : ''}
                        ${item.ingredients ? `<p>Ingredientes: ${item.ingredients.join(', ')}</p>` : ''}
                        ${item.volume ? `<p>Volume: ${item.volume}</p>` : ''}
                        ${item.items ? `<p>Itens do Combo: ${item.items.join(', ')}</p>` : ''}
                        <p class="availability ${item.available ? 'available' : 'unavailable'}">Disponível: ${item.available ? 'Sim' : 'Não'}</p>
                    </div>
                    <div class="actions">
                        <button class="edit" onclick="openModal(${item.id})">Editar</button>
                        <button class="delete" onclick="deleteItem(${item.id})">Excluir</button>
                    </div>
                `;
                section.appendChild(itemDiv);
            });
            menuSectionsDiv.appendChild(section);
        });

        // Gerar a imagem do cardápio automaticamente após carregar os itens
        await generateMenuImage();
    } catch (error) {
        console.error('[Cardápio] Erro ao carregar itens do cardápio:', error);
        alert('Erro ao carregar itens do cardápio');
    }
}

async function generateMenuImage() {
    try {
        const response = await fetch('http://127.0.0.1:3000/api/generate-menu-image', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!response.ok) throw new Error('Erro ao gerar imagem do cardápio');
        console.log('[Cardápio] Imagem do cardápio gerada com sucesso');
    } catch (error) {
        console.error('[Cardápio] Erro ao gerar imagem do cardápio:', error);
        alert('Erro ao gerar imagem do cardápio');
    }
}

function openModal(itemId) {
    currentItemId = itemId;
    document.getElementById('modal-title').textContent = itemId ? 'Editar Item' : 'Adicionar Item';
    document.getElementById('item-name').value = '';
    document.getElementById('item-price').value = '';
    document.getElementById('item-category').value = 'Hambúrguer';
    document.getElementById('item-available').checked = true;
    document.getElementById('item-ingredients').value = '';
    document.getElementById('item-volume').value = '';
    document.getElementById('item-items').value = '';
    document.getElementById('item-description').value = '';
    document.getElementById('item-image').value = '';

    if (itemId) {
        const item = allItems.find(i => i.id === itemId);
        if (item) {
            document.getElementById('item-name').value = item.name;
            document.getElementById('item-price').value = item.price;
            document.getElementById('item-category').value = item.category;
            document.getElementById('item-available').checked = item.available;
            document.getElementById('item-ingredients').value = item.ingredients ? item.ingredients.join(', ') : '';
            document.getElementById('item-volume').value = item.volume || '';
            document.getElementById('item-items').value = item.items ? item.items.join(', ') : '';
            document.getElementById('item-description').value = item.description || '';
        }
    }

    document.getElementById('modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
    currentItemId = null;
    document.querySelectorAll('.error-message').forEach(error => error.style.display = 'none');
}

async function saveItem() {
    const name = document.getElementById('item-name').value;
    const price = parseFloat(document.getElementById('item-price').value);
    const category = document.getElementById('item-category').value;
    const available = document.getElementById('item-available').checked;
    const ingredients = document.getElementById('item-ingredients').value ? document.getElementById('item-ingredients').value.split(',').map(i => i.trim()) : null;
    const volume = document.getElementById('item-volume').value || null;
    const items = document.getElementById('item-items').value ? document.getElementById('item-items').value.split(',').map(i => i.trim()) : null;
    const description = document.getElementById('item-description').value || null;
    const imageInput = document.getElementById('item-image');
    const imageFile = imageInput.files[0];

    let hasError = false;
    if (!name) {
        document.getElementById('error-name').textContent = 'Nome é obrigatório';
        document.getElementById('error-name').style.display = 'block';
        hasError = true;
    } else {
        document.getElementById('error-name').style.display = 'none';
    }
    if (!price || price <= 0) {
        document.getElementById('error-price').textContent = 'Preço deve ser maior que zero';
        document.getElementById('error-price').style.display = 'block';
        hasError = true;
    } else {
        document.getElementById('error-price').style.display = 'none';
    }

    if (hasError) return;

    const formData = new FormData();
    formData.append('name', name);
    formData.append('price', price);
    formData.append('category', category);
    formData.append('available', available);
    if (ingredients) formData.append('ingredients', JSON.stringify(ingredients));
    if (volume) formData.append('volume', volume);
    if (items) formData.append('items', JSON.stringify(items));
    if (description) formData.append('description', description);
    if (imageFile) formData.append('image', imageFile);

    try {
        const method = currentItemId ? 'PUT' : 'POST';
        const url = currentItemId ? `http://127.0.0.1:3000/api/menu-items/${currentItemId}` : 'http://127.0.0.1:3000/api/menu-items';
        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: formData,
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.errors ? errorData.errors.map(e => e.msg).join(', ') : 'Erro ao salvar item');
        }
        console.log('[Cardápio] Item salvo com sucesso');
        closeModal();
        await loadMenuItems();
    } catch (error) {
        console.error('[Cardápio] Erro ao salvar item:', error);
        alert(`Erro ao salvar item: ${error.message}`);
    }
}

async function deleteItem(id) {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;

    try {
        const response = await fetch(`http://127.0.0.1:3000/api/menu-items/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!response.ok) throw new Error('Erro ao excluir item');
        console.log('[Cardápio] Item excluído com sucesso');
        await loadMenuItems();
    } catch (error) {
        console.error('[Cardápio] Erro ao excluir item:', error);
        alert('Erro ao excluir item');
    }
}

function updateWhatsAppStatus(status) {
    console.log('[Cardápio] Atualizando status do WhatsApp:', status);
    const indicator = document.getElementById('whatsapp-indicator');
    indicator.textContent = status === 'connected' ? 'Conectado' : 'Desconectado';
    indicator.style.color = status === 'connected' ? '#00ff00' : '#ff0000';
    localStorage.setItem('whatsappStatus', status);
}

function connectWebSocket() {
    console.log('[Cardápio] Conectando ao WebSocket...');
    try {
        ws = new WebSocket('ws://localhost:3000');
        ws.onopen = () => {
            console.log('[WebSocket] Conectado ao servidor');
            ws.send(JSON.stringify({ type: 'request_whatsapp_status' }));
        };
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('[Cardápio] Mensagem recebida do WebSocket:', message);
                if (message.type === 'whatsapp_status') {
                    updateWhatsAppStatus(message.status);
                }
            } catch (error) {
                console.error('[Cardápio] Erro ao processar mensagem do WebSocket:', error);
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
        console.error('[Cardápio] Erro ao conectar ao WebSocket:', error);
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
    console.log('[Renderer] Carregando cardapio.html...');
    const lastStatus = localStorage.getItem('whatsappStatus') || 'disconnected';
    updateWhatsAppStatus(lastStatus);
    loadMenuItems();
    connectWebSocket();
});