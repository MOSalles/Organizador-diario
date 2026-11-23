// ESTRUTURA DE DADOS V3 (Tags, Configurações, Modo Escuro, WIP)
let globalData = JSON.parse(localStorage.getItem('kanbanDataV3'));
let currentBoardId = null;
let isListView = false;

// Migração Automática de Dados (V1/V2 -> V3)
if (!globalData) {
    let oldData = JSON.parse(localStorage.getItem('kanbanDataV2'));
    if (oldData) {
        globalData = { ...oldData, settings: { darkMode: false }, tags: [] };
    } else {
        globalData = {
            boards: [{
                id: 'board-' + Date.now(), name: 'Meu Primeiro Quadro', bgColor: '',
                lists: [
                    { id: 'l1', title: 'A Fazer', wipLimit: null, cards: [] },
                    { id: 'l2', title: 'Em Progresso', wipLimit: 3, cards: [] },
                    { id: 'l3', title: 'Concluído', wipLimit: null, cards: [] }
                ]
            }],
            currentBoardId: null,
            settings: { darkMode: false },
            tags: [
                { id: 'tag-bug', name: 'Bug', color: '#ff5630' },
                { id: 'tag-feature', name: 'Feature', color: '#36b37e' },
                { id: 'tag-task', name: 'Tarefa', color: '#0052cc' }
            ]
        };
    }
    globalData.currentBoardId = globalData.currentBoardId || globalData.boards[0].id;
    saveData();
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    currentBoardId = globalData.currentBoardId || globalData.boards[0].id;
    if(globalData.settings.darkMode) document.body.classList.add('dark-mode');
    
    renderSidebar();
    renderBoard();
});

function saveData() {
    globalData.currentBoardId = currentBoardId;
    localStorage.setItem('kanbanDataV3', JSON.stringify(globalData));
}

// --- CONFIGURAÇÕES GERAIS ---
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    globalData.settings.darkMode = document.body.classList.contains('dark-mode');
    saveData();
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

// --- SIDEBAR & QUADROS ---
function renderSidebar() {
    const list = document.getElementById('boardList');
    list.innerHTML = '';
    globalData.boards.forEach(board => {
        const li = document.createElement('li');
        li.innerText = board.name;
        if (board.id === currentBoardId) {
            li.classList.add('active');
            // Atualiza o color picker da sidebar para a cor atual do quadro
            document.getElementById('boardBgColorPicker').value = board.bgColor || '#f4f5f7';
        }
        li.onclick = () => { currentBoardId = board.id; saveData(); renderSidebar(); renderBoard(); toggleSidebar(); };
        list.appendChild(li);
    });
}

function createNewBoard() {
    const name = prompt("Nome do novo quadro:");
    if (!name) return;
    const newBoard = {
        id: 'board-' + Date.now(), name: name, bgColor: '',
        lists: [ { id: 'l1', title: 'A Fazer', wipLimit: null, cards: [] }, { id: 'l2', title: 'Em Progresso', wipLimit: null, cards: [] }, { id: 'l3', title: 'Concluído', wipLimit: null, cards: [] } ]
    };
    globalData.boards.push(newBoard);
    currentBoardId = newBoard.id;
    saveData(); renderSidebar(); renderBoard();
}

function changeBoardColor(hexColor) {
    const board = getCurrentBoard();
    board.bgColor = hexColor;
    saveData();
    renderBoard();
}

// --- ETIQUETAS PERSONALIZADAS ---
function populateTagSelect() {
    const select = document.getElementById('modalTag');
    select.innerHTML = '<option value="">Sem Etiqueta</option>';
    if(!globalData.tags) globalData.tags = [];
    globalData.tags.forEach(t => {
        select.innerHTML += `<option value="${t.id}">${t.name}</option>`;
    });
}

function createNewTag() {
    const name = prompt("Nome da nova etiqueta (Ex: Urgente):");
    if (!name) return;
    const color = prompt("Código da cor em HEX (Ex: #ff0000 para vermelho, #000000 para preto):", "#0052cc");
    if (!color) return;
    
    const newTag = { id: 'tag-' + Date.now(), name: name, color: color };
    globalData.tags.push(newTag);
    saveData();
    populateTagSelect();
    document.getElementById('modalTag').value = newTag.id;
}

function getTagData(tagId) {
    if(!globalData.tags) return null;
    return globalData.tags.find(t => t.id === tagId);
}

// --- RENDERIZAR QUADRO (BOARD) ---
function getCurrentBoard() { return globalData.boards.find(b => b.id === currentBoardId); }

function renderBoard() {
    const boardObj = getCurrentBoard();
    
    // Atualizar cor de fundo do quadro principal
    document.querySelector('.main-content').style.backgroundColor = boardObj.bgColor || '';
    document.getElementById('currentBoardTitle').innerHTML = `<i class="fa-solid fa-layer-group"></i> ${boardObj.name}`;
    
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = ''; 
    
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();

    boardObj.lists.forEach(list => {
        const listEl = document.createElement('div');
        
        // Verificação de Limite WIP (Work in Progress)
        const totalCards = list.cards.length;
        const isWipExceeded = list.wipLimit && totalCards > list.wipLimit;
        const wipText = list.wipLimit ? `${totalCards}/${list.wipLimit}` : `${totalCards}`;
        
        listEl.className = `list ${isWipExceeded ? 'wip-exceeded' : ''}`;
        listEl.innerHTML = `
            <div class="list-header" title="Clique para definir limite de tarefas">
                <span onclick="setWipLimit('${list.id}')">${list.title}</span>
                <span class="wip-badge" onclick="setWipLimit('${list.id}')">${wipText}</span>
            </div>
            <div class="cards-container" data-list-id="${list.id}"></div>
            <button class="add-card-btn" onclick="addNewCard('${list.id}')"><i class="fa-solid fa-plus"></i> Adicionar Cartão</button>
        `;
        
        const cardsContainer = listEl.querySelector('.cards-container');
        
        list.cards.forEach(card => {
            // Lógica do Filtro/Pesquisa
            if (searchQuery && !card.title.toLowerCase().includes(searchQuery)) return; // Esconde se não bater com a pesquisa

            const cardEl = document.createElement('div');
            cardEl.className = `card ${checkOverdue(card.dueDate) ? 'overdue' : ''}`;
            cardEl.dataset.cardId = card.id;
            cardEl.addEventListener('click', () => openModal(list.id, card));

            // Etiqueta Visual Customizada
            let tagHTML = '';
            if (card.tag) {
                const tagData = getTagData(card.tag);
                if (tagData) {
                    tagHTML = `<div class="tag-custom" style="background-color: ${tagData.color}">${tagData.name}</div>`;
                }
            }

            let dateHTML = card.dueDate ? `<span><i class="fa-regular fa-clock"></i> ${formatDate(card.dueDate)}</span>` : '';
            let avatarHTML = card.member ? `<div class="avatar-badge" title="${card.member}">${getInitials(card.member)}</div>` : '';
            let commentsHTML = (card.comments && card.comments.length > 0) ? `<span><i class="fa-regular fa-comment"></i> ${card.comments.length}</span>` : '';
            
            let checklistHTML = '';
            if (card.checklist && card.checklist.length > 0) {
                const done = card.checklist.filter(i => i.done).length;
                checklistHTML = `<div class="badge-checklist ${done === card.checklist.length ? 'completed' : ''}"><i class="fa-regular fa-square-check"></i> ${done}/${card.checklist.length}</div>`;
            }

            cardEl.innerHTML = `
                ${tagHTML}
                <div class="card-title">${card.title}</div>
                <div class="card-meta">${dateHTML} ${checklistHTML} ${commentsHTML}</div>
                ${avatarHTML}
            `;
            cardsContainer.appendChild(cardEl);
        });
        boardEl.appendChild(listEl);

        // DRAG & DROP E AUTOMAÇÃO (BUTLER)
        new Sortable(cardsContainer, {
            group: 'kanban', animation: 150, ghostClass: 'sortable-ghost',
            onEnd: function (evt) {
                const fromList = boardObj.lists.find(l => l.id === evt.from.dataset.listId);
                const toList = boardObj.lists.find(l => l.id === evt.to.dataset.listId);
                
                const cardIndex = fromList.cards.findIndex(c => c.id === evt.item.dataset.cardId);
                const [movedCard] = fromList.cards.splice(cardIndex, 1);
                
                // Automação: 100% ao mover para Concluído
                if (toList.title.toLowerCase().includes('concluído') || toList.title.toLowerCase().includes('concluido')) {
                    if(movedCard.checklist) movedCard.checklist.forEach(item => item.done = true);
                }
                
                toList.cards.splice(evt.newIndex, 0, movedCard);
                saveData(); renderBoard();
            }
        });
    });
}

// WIP LIMIT (Limites de Tarefa)
function setWipLimit(listId) {
    const list = getCurrentBoard().lists.find(l => l.id === listId);
    const limit = prompt(`Defina o limite máximo de tarefas para "${list.title}" (Deixe em branco para remover):`, list.wipLimit || '');
    if (limit === null) return; // Cancelou
    list.wipLimit = limit === '' ? null : parseInt(limit);
    saveData();
    renderBoard();
}

function addNewCard(listId) {
    const title = prompt("Título da nova tarefa:");
    if (!title) return;
    const newCard = { id: 'card-' + Date.now(), title, description: '', dueDate: '', tag: '', member: '', checklist: [], comments: [] };
    getCurrentBoard().lists.find(l => l.id === listId).cards.push(newCard);
    saveData(); renderBoard();
}

// --- MODAL & LÓGICAS DO CARTÃO ---
function openModal(listId, card) {
    populateTagSelect();
    document.getElementById('modalListId').value = listId;
    document.getElementById('modalCardId').value = card.id;
    document.getElementById('modalTitle').value = card.title;
    document.getElementById('modalDesc').value = card.description || '';
    document.getElementById('modalDueDate').value = card.dueDate || '';
    document.getElementById('modalTag').value = card.tag || '';
    document.getElementById('modalMember').value = card.member || '';
    
    switchTab('edit');
    renderChecklist(card);
    renderComments(card);
    document.getElementById('cardModal').style.display = 'flex';
}

function saveCard() {
    const listId = document.getElementById('modalListId').value;
    const cardId = document.getElementById('modalCardId').value;
    const card = getCurrentBoard().lists.find(l => l.id === listId).cards.find(c => c.id === cardId);
    
    card.title = document.getElementById('modalTitle').value;
    card.description = document.getElementById('modalDesc').value;
    card.dueDate = document.getElementById('modalDueDate').value;
    card.tag = document.getElementById('modalTag').value;
    card.member = document.getElementById('modalMember').value;
    
    saveData(); renderBoard(); closeModal();
}

// COMENTÁRIOS
function addComment() {
    const input = document.getElementById('newCommentInput');
    if (!input.value.trim()) return;
    const card = getCurrentBoard().lists.find(l => l.id === document.getElementById('modalListId').value).cards.find(c => c.id === document.getElementById('modalCardId').value);
    if(!card.comments) card.comments = [];
    card.comments.push({ text: input.value.trim(), date: new Date().toLocaleString('pt-BR') });
    input.value = ''; saveData(); renderComments(card); renderBoard();
}
function renderComments(card) {
    const container = document.getElementById('commentsList');
    container.innerHTML = '';
    if(!card.comments) return;
    card.comments.slice().reverse().forEach(c => { container.innerHTML += `<div class="comment-item"><span class="comment-date">${c.date}</span>${c.text}</div>`; });
}

// CHECKLIST
function renderChecklist(card) {
    if(!card.checklist) card.checklist = [];
    const container = document.getElementById('checklistItems');
    container.innerHTML = '';
    let doneCount = 0;
    card.checklist.forEach((item, i) => {
        if(item.done) doneCount++;
        container.innerHTML += `<div class="checklist-item ${item.done ? 'done' : ''}"><input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleChecklistItem(${i})"><span>${item.text}</span></div>`;
    });
    const perc = card.checklist.length === 0 ? 0 : Math.round((doneCount / card.checklist.length) * 100);
    document.getElementById('checklistProgress').style.width = `${perc}%`;
    document.getElementById('checklistProgressText').innerText = `${perc}%`;
}
function addChecklistItem() {
    const input = document.getElementById('newChecklistItem');
    if(!input.value.trim()) return;
    const card = getCurrentBoard().lists.find(l => l.id === document.getElementById('modalListId').value).cards.find(c => c.id === document.getElementById('modalCardId').value);
    card.checklist.push({ text: input.value.trim(), done: false });
    input.value = ''; saveData(); renderChecklist(card); renderBoard();
}
function handleChecklistEnter(e) { if(e.key === 'Enter') addChecklistItem(); }
function toggleChecklistItem(index) {
    const card = getCurrentBoard().lists.find(l => l.id === document.getElementById('modalListId').value).cards.find(c => c.id === document.getElementById('modalCardId').value);
    card.checklist[index].done = !card.checklist[index].done;
    saveData(); renderChecklist(card); renderBoard();
}

// FUNÇÕES GERAIS
function closeModal() { document.getElementById('cardModal').style.display = 'none'; }
function deleteCard() { if(confirm("Excluir?")) { getCurrentBoard().lists.find(l => l.id === document.getElementById('modalListId').value).cards = getCurrentBoard().lists.find(l => l.id === document.getElementById('modalListId').value).cards.filter(c => c.id !== document.getElementById('modalCardId').value); saveData(); renderBoard(); closeModal(); } }
function switchTab(tab) {
    if(tab === 'preview') { document.getElementById('modalDesc').style.display='none'; document.getElementById('modalPreview').style.display='block'; document.getElementById('modalPreview').innerHTML = marked.parse(document.getElementById('modalDesc').value); }
    else { document.getElementById('modalDesc').style.display='block'; document.getElementById('modalPreview').style.display='none'; }
}
function toggleView() { isListView = !isListView; document.getElementById('board').classList.toggle('list-view', isListView); }
function checkOverdue(d) { if(!d) return false; const dueDate = new Date(d); const today = new Date(); today.setHours(0,0,0,0); return dueDate < today; }
function formatDate(d) { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; }
function getInitials(name) { return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(); }
function exportData() { const a = document.createElement('a'); a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(globalData)); a.download = "meu_kanban_v3.json"; a.click(); }
function importData(event) {
    const reader = new FileReader();
    reader.onload = e => { globalData = JSON.parse(e.target.result); saveData(); currentBoardId = globalData.boards[0].id; renderSidebar(); renderBoard(); if(globalData.settings.darkMode){ document.body.classList.add('dark-mode'); } alert("Importado!"); };
    reader.readAsText(event.target.files[0]);
}