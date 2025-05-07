let ws;
let currentOrderId, currentPrintContent;
const timers = new Map();
const printedOrders = new Set();

async function loadOrders() {
    console.log('[Status] Carregando pedidos...');
    try {
        const response = await fetch('http://127.0.0.1:3000/api/orders', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!response.ok) throw new Error('Erro ao carregar pedidos');
        const orders = await response.json();
        console.log('[Status] Pedidos carregados:', orders);

        const filter = document.getElementById('status-filter').value;
        const filteredOrders = filter === 'all' ? orders : orders.filter(order => order.status === filter);

        const ordersList = document.getElementById('orders-list');
        ordersList.innerHTML = filteredOrders.map(order => {
            const preparationTime = order.status === 'preparação' ? 300 : 0;
            const completedTime = ['pronto', 'concluído'].includes(order.status) ? 900 : 0;
            const timeLeft = preparationTime || completedTime;
            const initialTime = timeLeft;
            return `
                        <div class="order-card" data-order-id="${order.id}">
                            <p><strong>ID:</strong> ${order.id}</p>
                            <p><strong>Cliente:</strong> ${order.customerName}${order.customerPhone ? ` (${order.customerPhone})` : ''}</p>
                            <p><strong>Itens:</strong> ${order.items.map(item => `${item.quantity}x ${item.name}${item.observations ? ' (' + item.observations + ')' : ''}${item.optionals && item.optionals.length > 0 ? ' + ' + item.optionals.join(', ') : ''}`).join(', ')}</p>
                            <p><strong>Total:</strong> R$${order.total.toFixed(2)}</p>
                            <p><strong>Status:</strong> ${order.status}</p>
                            ${timeLeft ? `
                                <p class="timer" id="timer-${order.id}">Tempo Restante: --:--</p>
                                <div class="progress-bar" id="progress-bar-${order.id}">
                                    <div class="progress" style="width: 100%"></div>
                                </div>
                            ` : ''}
                            ${printedOrders.has(order.id) ? '<span class="printed-indicator"><i class="fas fa-print"></i> Impresso</span>' : ''}
                            <p><strong>Tipo de Serviço:</strong> ${order.serviceType}</p>
                            <p><strong>Pago:</strong> ${order.isPaid ? 'Sim' : 'Não'}</p>
                            <p><strong>Origem:</strong> ${order.source === 'whatsapp' ? 'WhatsApp' : 'Balcão'}</p>
                            <div class="actions">
                                ${order.status === 'pendente' ? `<button class="prepare" onclick="updateOrderStatus(${order.id}, 'preparação')">Iniciar Preparação</button>` : ''}
                                ${order.status === 'preparação' ? `<button class="ready" onclick="updateOrderStatus(${order.id}, 'pronto', '${order.customerPhone}')">Marcar como Pronto</button>` : ''}
                                ${order.status === 'pronto' ? `<button class="complete" onclick="updateOrderStatus(${order.id}, 'concluído')">Marcar como Concluído</button>` : ''}
                                <button class="print" onclick="previewPrint(${order.id}, '${order.customerName}', '${order.customerPhone || ''}', \`${order.items.map(item => `${item.quantity}x ${item.name}${item.observations ? ' (' + item.observations + ')' : ''}${item.optionals && item.optionals.length > 0 ? ' + ' + item.optionals.join(', ') : ''}`).join(', ')}\`, ${order.total}, '${order.serviceType}', ${order.isPaid}, '${order.source}', '${JSON.stringify(order.items)}')">Imprimir</button>
                                ${order.status !== 'concluído' ? `<button class="cancel" onclick="cancelOrder(${order.id})">Cancelar</button>` : ''}
                            </div>
                        </div>
                    `;
        }).join('');

        filteredOrders.forEach(order => {
            if (order.status === 'preparação') {
                console.log(`[Status] Iniciando timer para pedido ${order.id} (preparação)`);
                startPreparationTimer(order.id, 300);
            } else if (['pronto', 'concluído'].includes(order.status)) {
                console.log(`[Status] Iniciando timer para pedido ${order.id} (pronto/concluído)`);
                startCompletedTimer(order.id, 900);
            }
        });
    } catch (error) {
        console.error('[Status] Erro ao carregar pedidos:', error);
        alert('Erro ao carregar pedidos');
    }
}

async function updateOrderStatus(orderId, status, customerPhone = null) {
    console.log(`[Status] Atualizando status do pedido ${orderId} para ${status}...`);
    try {
        const response = await fetch(`http://127.0.0.1:3000/api/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ status }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.errors ? errorData.errors.map(e => e.msg).join(', ') : 'Erro ao atualizar status do pedido');
        }
        console.log('[Status] Status do pedido atualizado com sucesso');

        // Enviar notificação via WhatsApp se o status for "pronto"
        if (status === 'pronto' && customerPhone) {
            await sendOrderReadyNotification(orderId, customerPhone);
        }

        loadOrders();
    } catch (error) {
        console.error('[Status] Erro ao atualizar status do pedido:', error);
        alert('Erro ao atualizar status do pedido');
    }
}

async function sendOrderReadyNotification(orderId, customerPhone) {
    console.log(`[Status] Enviando notificação para ${customerPhone}...`);
    try {
        const response = await fetch('http://127.0.0.1:3000/api/notify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
                phone: customerPhone,
                message: `Seu pedido #${orderId} está pronto! 😊 Você pode retirá-lo ou aguardar na sua mesa. Agradecemos pela preferência!`
            }),
        });
        if (!response.ok) throw new Error('Erro ao enviar notificação');
        console.log('[Status] Notificação enviada com sucesso');
    } catch (error) {
        console.error('[Status] Erro ao enviar notificação:', error);
    }
}

async function cancelOrder(orderId) {
    if (!confirm('Tem certeza que deseja cancelar este pedido?')) return;
    await updateOrderStatus(orderId, 'cancelado');
}

function previewPrint(orderId, customerName, customerPhone, items, total, serviceType, isPaid, source, itemsJson, auto = false) {
    console.log(`[Status] Exibindo pré-visualização do pedido ${orderId}... Auto: ${auto}`);
    currentOrderId = orderId;
    const itemsArray = JSON.parse(itemsJson);
    const printContent = `
                <p><strong>Pedido #${orderId}</strong></p>
                <p><strong>Cliente:</strong> ${customerName}${customerPhone ? ` (${customerPhone})` : ''}</p>
                <p><strong>Itens:</strong> ${items}</p>
                ${itemsArray.map(item => `
                    <div class="item-details">
                        <p><strong>${item.quantity}x ${item.name}</strong></p>
                        ${item.ingredients ? `<p>Ingredientes: ${item.ingredients.join(', ')}</p>` : ''}
                        ${item.observations ? `<p>Observações: ${item.observations}</p>` : ''}
                        ${item.optionals && item.optionals.length > 0 ? `<p>Opcionais: ${item.optionals.join(', ')}</p>` : ''}
                    </div>
                `).join('')}
                <p><strong>Total:</strong> R$${total.toFixed(2)}</p>
                <p><strong>Tipo de Serviço:</strong> ${serviceType}</p>
                <p><strong>Pago:</strong> ${isPaid ? 'Sim' : 'Não'}</p>
                <p><strong>Origem:</strong> ${source === 'whatsapp' ? 'WhatsApp' : 'Balcão'}</p>
                <p><strong>Data:</strong> ${new Date().toLocaleString()}</p>
            `;
    currentPrintContent = printContent;
    document.getElementById('print-preview-content').innerHTML = printContent;
    document.getElementById('print-preview-modal').style.display = 'flex';

    if (auto) {
        setTimeout(() => {
            confirmPrint(true);
        }, 3000);
    }
}

function confirmPrint(auto = false) {
    console.log(`[Status] Iniciando impressão do pedido ${currentOrderId}... Auto: ${auto}`);
    const printerEnabled = localStorage.getItem('printerEnabled') === 'true';
    console.log(`[Status] Printer Enabled: ${printerEnabled}`);
    if (!printerEnabled) {
        console.log('[Status] Impressão desativada nas configurações.');
        if (!auto) alert('Impressão desativada nas configurações. Ative a impressão automática nas configurações do sistema.');
        closeModal();
        return;
    }

    const printerName = localStorage.getItem('printerName') || undefined;
    console.log(`[Status] Nome da impressora: ${printerName || 'Não especificado'}`);
    try {
        printJS({
            printable: currentPrintContent,
            type: 'raw-html',
            style: 'p { font-size: 14px; margin: 5px 0; } .item-details { margin-left: 20px; }',
            documentTitle: `Pedido #${currentOrderId}`,
            printer: printerName,
            onError: (error) => {
                console.error('[Status] Erro ao imprimir:', error);
                if (!auto) alert('Erro ao imprimir: ' + error.message);
            },
            onPrintDialogCancelled: () => {
                console.log('[Status] Impressão cancelada pelo usuário');
                if (!auto) alert('Impressão cancelada pelo usuário');
            },
            onPrintDialogSuccess: () => {
                console.log('[Status] Impressão realizada com sucesso');
                printedOrders.add(currentOrderId);
                loadOrders();
            }
        });
        console.log(`[Status] Impressão do pedido ${currentOrderId} disparada com sucesso`);
    } catch (error) {
        console.error('[Status] Erro ao disparar impressão:', error);
        if (!auto) alert('Erro ao disparar impressão: ' + error.message);
    }
    closeModal();
}

function closeModal() {
    console.log('[Status] Fechando modal de pré-visualização...');
    document.getElementById('print-preview-modal').style.display = 'none';
}

function startPreparationTimer(orderId, totalTime) {
    console.log(`[Status] Iniciando timer de preparação para o pedido ${orderId}...`);
    let timeLeft = totalTime;
    const timerElement = document.querySelector(`#timer-${orderId}`);
    const progressBar = document.querySelector(`#progress-bar-${orderId} .progress`);
    if (!timerElement || !progressBar) {
        console.error(`[Status] Elementos de timer ou barra de progresso para o pedido ${orderId} não encontrados`);
        return;
    }

    const timer = setInterval(async () => {
        if (timeLeft <= 0) {
            clearInterval(timer);
            timers.delete(orderId);
            console.log(`[Status] Timer de preparação zerado, atualizando pedido ${orderId} para pronto...`);
            await updateOrderStatus(orderId, 'pronto');
            return;
        }
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = `Tempo Restante: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        const progressPercent = (timeLeft / totalTime) * 100;
        progressBar.style.width = `${progressPercent}%`;
        timeLeft--;
    }, 1000);

    timers.set(orderId, timer);
}

function startCompletedTimer(orderId, totalTime) {
    console.log(`[Status] Iniciando timer de concluído para o pedido ${orderId}...`);
    let timeLeft = totalTime;
    const timerElement = document.querySelector(`#timer-${orderId}`);
    const progressBar = document.querySelector(`#progress-bar-${orderId} .progress`);
    if (!timerElement || !progressBar) {
        console.error(`[Status] Elementos de timer ou barra de progresso para o pedido ${orderId} não encontrados`);
        return;
    }

    const timer = setInterval(async () => {
        if (timeLeft <= 0) {
            clearInterval(timer);
            timers.delete(orderId);
            console.log(`[Status] Timer de concluído zerado, removendo pedido ${orderId} da tela...`);
            const orderElement = document.querySelector(`.order-card[data-order-id="${orderId}"]`);
            if (orderElement) orderElement.remove();
            return;
        }
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = `Tempo Restante: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        const progressPercent = (timeLeft / totalTime) * 100;
        progressBar.style.width = `${progressPercent}%`;
        timeLeft--;
    }, 1000);

    timers.set(orderId, timer);
}

function updateWhatsAppStatus(status) {
    console.log('[Status] Atualizando status do WhatsApp:', status);
    const indicator = document.getElementById('whatsapp-indicator');
    indicator.textContent = status === 'connected' ? 'Conectado' : 'Desconectado';
    indicator.style.color = status === 'connected' ? '#00ff00' : '#ff0000';
    localStorage.setItem('whatsappStatus', status);
}

function connectWebSocket() {
    console.log('[Status] Conectando ao WebSocket...');
    try {
        ws = new WebSocket('ws://localhost:3000');
        ws.onopen = () => {
            console.log('[WebSocket] Conectado ao servidor');
            ws.send(JSON.stringify({ type: 'request_whatsapp_status' }));
        };
        ws.onmessage = (event) => {
            try {
                console.log('[WebSocket] Mensagem recebida do servidor');
                const message = JSON.parse(event.data);
                console.log('[WebSocket] Mensagem detalhada:', message);
                if (message.type === 'new_order') {
                    console.log('[Status] Novo pedido recebido:', message.order);
                    loadOrders();
                    const order = message.order;
                    console.log('[Status] Abrindo janela de notificação para o pedido:', order.id);
                    previewPrint(order.id, order.customerName, order.customerPhone || '', order.items.map(item => `${item.quantity}x ${item.name}${item.observations ? ' (' + item.observations + ')' : ''}${item.optionals && item.optionals.length > 0 ? ' + ' + item.optionals.join(', ') : ''}`).join(', '), order.total, order.serviceType, order.isPaid, order.source, JSON.stringify(order.items), true);
                    console.log('[Status] Iniciando preparação automaticamente para o pedido', order.id);
                    updateOrderStatus(order.id, 'preparação');
                } else if (message.type === 'whatsapp_status') {
                    updateWhatsAppStatus(message.status);
                }
            } catch (error) {
                console.error('[WebSocket] Erro ao processar mensagem:', error);
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
        console.error('[Status] Erro ao conectar ao WebSocket:', error);
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
    console.log('[Renderer] Carregando status_status.html...');
    if (!localStorage.getItem('printerEnabled')) {
        localStorage.setItem('printerEnabled', 'true');
        console.log('[Status] printerEnabled definido como true');
    }
    const lastStatus = localStorage.getItem('whatsappStatus') || 'disconnected';
    updateWhatsAppStatus(lastStatus);
    loadOrders();
    connectWebSocket();
});