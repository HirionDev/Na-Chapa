let ws;
let allItems = [];
let selectedItems = [];
let currentItem = null;
let isPaid = false;
let lastWsMessageTime = 0;
const DEBOUNCE_TIME = 500; // 500ms debounce para chamadas do WebSocket

async function loadMenuItems() {
    console.log('[Balcão] Carregando itens do cardápio...');
    try {
        const response = await fetch('http://127.0.0.1:3000/api/menu-items', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!response.ok) throw new Error('Erro ao carregar itens do cardápio');
        const items = await response.json();
        console.log('[Balcão] Itens carregados:', items);
        allItems = items;

        const categories = [...new Set(items.map(item => item.category))];
        const menuItemsDiv = document.getElementById('menu-items');
        menuItemsDiv.innerHTML = '';

        categories.forEach(category => {
            const categoryItems = items.filter(item => item.category === category && item.available);
            if (categoryItems.length === 0) return;

            const section = document.createElement('div');
            section.className = 'menu-section';
            section.innerHTML = `<h2>${category}</h2>`;
            categoryItems.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'item-card';
                itemDiv.onclick = () => openItemModal(item);
                itemDiv.innerHTML = `
                            ${item.image ? `<img src="/public/assets/${item.image}" alt="${item.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='block';">` : ''}
                            <div class="placeholder-image" style="${item.image ? 'display: none;' : ''}"></div>
                            <div class="item-details">
                                <p><strong>${item.name}</strong> - R$${item.price.toFixed(2)}</p>
                                ${item.description ? `<p>${item.description}</p>` : ''}
                                ${item.ingredients ? `<p>Ingredientes: ${item.ingredients.join(', ')}</p>` : ''}
                                ${item.volume ? `<p>Volume: ${item.volume}</p>` : ''}
                                ${item.items ? `<p>Itens do Combo: ${item.items.join(', ')}</p>` : ''}
                            </div>
                        `;
                section.appendChild(itemDiv);
            });
            menuItemsDiv.appendChild(section);
        });
    } catch (error) {
        console.error('[Balcão] Erro ao carregar itens do cardápio:', error);
        alert('Erro ao carregar itens do cardápio');
    }
}

function openItemModal(item) {
    if (!item.available) {
        alert('Este item não está disponível no momento.');
        return;
    }
    currentItem = item;
    document.getElementById('modal-item-name').textContent = item.name;
    document.getElementById('modal-item-quantity').value = 1;
    document.getElementById('modal-item-observations').value = '';

    const optionalsList = document.getElementById('optionals-list');
    const optionalItems = allItems.filter(i => i.category === 'Opcional');
    optionalsList.innerHTML = optionalItems.map(opt => `
                <label><input type="checkbox" value="${opt.name}"> ${opt.name} (+R$${opt.price.toFixed(2)})</label>
            `).join('');

    document.getElementById('item-modal').style.display = 'flex';
}

function closeItemModal() {
    document.getElementById('item-modal').style.display = 'none';
    currentItem = null;
}

function addItemToOrder() {
    const quantity = parseInt(document.getElementById('modal-item-quantity').value);
    const observations = document.getElementById('modal-item-observations').value;
    const optionals = Array.from(document.querySelectorAll('#optionals-list input:checked')).map(cb => cb.value);

    const item = {
        name: currentItem.name,
        price: currentItem.price,
        quantity,
        category: currentItem.category,
        ingredients: currentItem.ingredients || [], // Incluindo ingredientes do item
        observations,
        optionals,
    };

    selectedItems.push(item);
    updateOrderSummary();
    closeItemModal();
}

function updateOrderSummary() {
    const orderItemsDiv = document.getElementById('order-items');
    let total = 0;

    orderItemsDiv.innerHTML = selectedItems.map((item, index) => {
        const itemTotal = item.price * item.quantity;
        const optionalsTotal = item.optionals.reduce((sum, optName) => {
            const opt = allItems.find(i => i.name === optName);
            return sum + (opt ? opt.price : 0);
        }, 0);
        const itemWithOptionalsTotal = itemTotal + optionalsTotal;
        total += itemWithOptionalsTotal;

        return `
                    <div class="order-item">
                        <span>${item.quantity}x ${item.name}${item.observations ? ' (' + item.observations + ')' : ''}${item.optionals.length > 0 ? ' + ' + item.optionals.join(', ') : ''} - R$${itemWithOptionalsTotal.toFixed(2)}</span>
                        <button onclick="removeItem(${index})">Remover</button>
                    </div>
                `;
    }).join('');

    document.getElementById('order-total').textContent = total.toFixed(2);
}

function removeItem(index) {
    selectedItems.splice(index, 1);
    updateOrderSummary();
}

function togglePayment() {
    const button = document.getElementById('confirm-payment');
    const submitButton = document.getElementById('submit-order');
    isPaid = !isPaid;
    if (isPaid) {
        button.classList.add('confirmed');
        button.innerHTML = `<i class="fas fa-check"></i> Pagamento Confirmado`;
        submitButton.disabled = false; // Habilitar o botão "Finalizar Pedido"
    } else {
        button.classList.remove('confirmed');
        button.innerHTML = `<i class="fas fa-check"></i> Confirmar Pagamento`;
        submitButton.disabled = true; // Desabilitar o botão "Finalizar Pedido"
    }
}

function formatOrderForPrint(order) {
    const itemsList = order.items.map((item, index) => {
        let itemText = `${index + 1}. ${item.quantity}x ${item.name}`;
        if (item.ingredients && item.ingredients.length > 0) {
            itemText += `\n   Ingredientes: ${item.ingredients.join(', ')}`;
        }
        if (item.observations) {
            itemText += `\n   Observação: ${item.observations}`;
        }
        if (item.optionals && item.optionals.length > 0) {
            itemText += `\n   Opcionais: ${item.optionals.join(', ')}`;
        }
        return itemText;
    }).join('\n');
    return `
Na Chapa - Recibo de Pedido
----------------------------
Cliente: ${order.customerName || 'Não informado'}
Telefone: ${order.customerPhone || 'Não informado'}
Itens:
${itemsList}
Total: R$${order.total.toFixed(2)}
Tipo de Serviço: ${order.serviceType}
Método de Pagamento: ${order.paymentMethod}
Pago: ${order.isPaid ? 'Sim' : 'Não'}
Status: ${order.status || 'preparação'}
Origem: ${order.source}
Data: ${new Date().toLocaleString()}
----------------------------
Obrigado por escolher o Na Chapa!
            `;
}

function showPrintPreview(order) {
    const printContent = formatOrderForPrint(order);
    document.getElementById('print-preview-content').innerText = printContent;
    document.getElementById('print-preview-modal').style.display = 'flex';
}

function closePrintPreviewModal() {
    document.getElementById('print-preview-modal').style.display = 'none';
}

function printOrder(order) {
    if (localStorage.getItem('printerEnabled') !== 'true') return;
    const printContent = formatOrderForPrint(order);
    const printerName = localStorage.getItem('printerName') || '';
    window.electronAPI.printOrder(printContent, printerName);
}

function resetOrderForm() {
    selectedItems = [];
    isPaid = false;
    updateOrderSummary();
    document.getElementById('customer-name').value = '';
    document.getElementById('customer-phone').value = '';
    document.getElementById('service-type').value = 'Local (Mesa 1)';
    document.getElementById('payment-method').value = 'pix';
    const confirmButton = document.getElementById('confirm-payment');
    const submitButton = document.getElementById('submit-order');
    confirmButton.classList.remove('confirmed');
    confirmButton.innerHTML = `<i class="fas fa-check"></i> Confirmar Pagamento`;
    submitButton.disabled = true;
}

async function submitOrder() {
    console.log('[Balcão] Realizando pedido...');
    if (selectedItems.length === 0) {
        alert('Por favor, adicione itens ao pedido.');
        return;
    }

    if (!isPaid) {
        alert('Por favor, confirme o pagamento antes de finalizar o pedido.');
        return;
    }

    const customerName = document.getElementById('customer-name').value.trim();
    const customerPhone = document.getElementById('customer-phone').value.trim();
    const serviceType = document.getElementById('service-type').value;
    const paymentMethod = document.getElementById('payment-method').value;

    if (!customerName && !customerPhone) {
        alert('Por favor, preencha o nome ou o telefone do cliente.');
        return;
    }

    if (customerPhone && !/^\d{10,15}$/.test(customerPhone)) {
        alert('O telefone do cliente deve ter entre 10 e 15 dígitos.');
        return;
    }

    const order = {
        customerName: customerName || 'Não informado',
        customerPhone: customerPhone || 'Não informado',
        items: selectedItems.map(item => ({
            name: item.name,
            quantity: item.quantity,
            ingredients: item.ingredients,
            observations: item.observations || '',
            optionals: item.optionals || [],
        })),
        total: selectedItems.reduce((sum, item) => {
            const itemTotal = item.price * item.quantity;
            const optionalsTotal = item.optionals.reduce((s, optName) => {
                const opt = allItems.find(i => i.name === optName);
                return s + (opt ? opt.price : 0);
            }, 0);
            return sum + itemTotal + optionalsTotal;
        }, 0),
        serviceType: serviceType === 'Retirada' ? 'pickup' : 'local',
        paymentMethod: paymentMethod === 'Dinheiro' ? 'cash' : paymentMethod === 'Cartão' ? 'card' : 'pix',
        isPaid,
        source: 'balcao',
    };

    try {
        const response = await fetch('http://127.0.0.1:3000/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify(order),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.errors ? errorData.errors.map(e => e.msg).join(', ') : 'Erro ao realizar pedido');
        }
        console.log('[Balcão] Pedido realizado com sucesso');
        alert('Pedido realizado com sucesso!');
        showPrintPreview(order);
        printOrder(order);
        resetOrderForm(); // Zerar o pedido após finalização
    } catch (error) {
        console.error('[Balcão] Erro ao realizar pedido:', error);
        alert(`Erro ao realizar pedido: ${error.message}`);
    }
}

function updateWhatsAppStatus(status) {
    console.log('[Balcão] Atualizando status do WhatsApp:', status);
    const indicator = document.getElementById('whatsapp-indicator');
    indicator.textContent = status === 'connected' ? 'Conectado' : 'Desconectado';
    indicator.style.color = status === 'connected' ? '#00ff00' : '#ff0000';
    localStorage.setItem('whatsappStatus', status);
}

function connectWebSocket() {
    console.log('[Balcão] Conectando ao WebSocket...');
    try {
        ws = new WebSocket('ws://localhost:3000');
        ws.onopen = () => {
            console.log('[WebSocket] Conectado ao servidor');
            ws.send(JSON.stringify({ type: 'request_whatsapp_status' }));
        };
        ws.onmessage = (event) => {
            const now = Date.now();
            if (now - lastWsMessageTime < DEBOUNCE_TIME) return;
            lastWsMessageTime = now;

            try {
                const message = JSON.parse(event.data);
                console.log('[Balcão] Mensagem recebida do WebSocket:', message);
                if (message.type === 'whatsapp_status') {
                    updateWhatsAppStatus(message.status);
                } else if (message.type === 'new_order') {
                    console.log('[Balcão] Novo pedido recebido:', message.order);
                    showPrintPreview(message.order);
                    printOrder(message.order);
                }
            } catch (error) {
                console.error('[Balcão] Erro ao processar mensagem do WebSocket:', error);
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
        console.error('[Balcão] Erro ao conectar ao WebSocket:', error);
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
    console.log('[Renderer] Carregando counter_counter.html...');
    const lastStatus = localStorage.getItem('whatsappStatus') || 'disconnected';
    updateWhatsAppStatus(lastStatus);
    loadMenuItems();
    connectWebSocket();
});