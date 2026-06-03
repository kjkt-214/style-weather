// Default initial inventory data
const DEFAULT_INVENTORY = [
    { id: 1, name: 'BoTT ロゴTシャツ (白)', category: 'tops', formality: 1, warmth: 1, icon: 'fa-shirt', status: 'clean' },
    { id: 2, name: 'Our Legacy シルクシャツ', category: 'tops', formality: 2, warmth: 2, icon: 'fa-user-tie', status: 'clean' },
    { id: 3, name: 'Needles トラックパンツ', category: 'bottoms', formality: 1, warmth: 2, icon: 'fa-person', status: 'clean' },
    { id: 4, name: 'Stone Island デニム', category: 'bottoms', formality: 1, warmth: 2, icon: 'fa-person', status: 'clean' },
    { id: 5, name: 'Stone Island ナイロンシェル', category: 'outer', formality: 2, warmth: 2, icon: 'fa-user-tie', status: 'clean' },
    { id: 6, name: 'Moose Knuckles ダウンジャケット', category: 'outer', formality: 1, warmth: 3, icon: 'fa-temperature-arrow-up', status: 'clean' },
    { id: 7, name: 'Nike Air Force 1 (白)', category: 'shoes', formality: 1, warmth: 2, icon: 'fa-shoe-prints', status: 'clean' },
    { id: 8, name: 'Our Legacy ローファー', category: 'shoes', formality: 3, warmth: 2, icon: 'fa-shoe-prints', status: 'clean' }
];

// Load from LocalStorage or fallback to default
const INVENTORY_VERSION = 'v2_keiju'; 
let inventory = JSON.parse(localStorage.getItem('sw_inventory'));
const savedVersion = localStorage.getItem('sw_inventory_version');
let wearHistory = JSON.parse(localStorage.getItem('sw_history')) || [];

if (!inventory || inventory.length === 0 || savedVersion !== INVENTORY_VERSION) {
    inventory = DEFAULT_INVENTORY;
    localStorage.setItem('sw_inventory', JSON.stringify(inventory));
    localStorage.setItem('sw_inventory_version', INVENTORY_VERSION);
    localStorage.removeItem('sw_history');
    wearHistory = [];
}

function saveInventory() {
    localStorage.setItem('sw_inventory', JSON.stringify(inventory));
}

function saveHistory() {
    localStorage.setItem('sw_history', JSON.stringify(wearHistory));
}

// Helper: Get Icon based on category
function getCategoryIcon(category) {
    const icons = {
        tops: 'fa-shirt',
        bottoms: 'fa-person',
        outer: 'fa-user-tie',
        shoes: 'fa-shoe-prints'
    };
    return icons[category] || 'fa-shirt';
}

function getCategoryName(category) {
    const names = {
        tops: 'トップス',
        bottoms: 'ボトムス',
        outer: 'アウター',
        shoes: 'シューズ'
    };
    return names[category] || category;
}

// Navigation Logic
document.querySelectorAll('.nav-links li').forEach(item => {
    item.addEventListener('click', (e) => {
        // Remove active from all nav
        document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
        // Add active to clicked
        e.currentTarget.classList.add('active');

        // Hide all views
        document.querySelectorAll('.view-section').forEach(section => section.classList.remove('active'));
        // Show target view
        const target = e.currentTarget.getAttribute('data-target');
        document.getElementById(target).classList.add('active');

        // Render appropriate views
        if(target === 'closet') renderCloset();
        if(target === 'shopping') analyzeShopping();
        if(target === 'history') renderHistoryView();
    });
});

// Closet Logic
let editModeItemId = null;

function isRecentlyWorn(itemId) {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    return wearHistory.some(record => {
        const recordTime = new Date(record.timestamp).getTime();
        return recordTime > threeDaysAgo && record.itemIds.includes(itemId);
    });
}

function renderCloset() {
    const grid = document.getElementById('closet-grid');
    grid.innerHTML = '';

    inventory.forEach(item => {
        const div = document.createElement('div');
        
        if (item.id === editModeItemId) {
            // Edit Mode Form
            div.className = 'cloth-card edit-mode';
            div.innerHTML = `
                <form onsubmit="saveEdit(event, ${item.id})" class="card-edit-form">
                    <input type="text" id="edit-name-${item.id}" value="${item.name}" required placeholder="アイテム名">
                    <select id="edit-category-${item.id}" required>
                        <option value="tops" ${item.category === 'tops' ? 'selected' : ''}>トップス</option>
                        <option value="bottoms" ${item.category === 'bottoms' ? 'selected' : ''}>ボトムス</option>
                        <option value="outer" ${item.category === 'outer' ? 'selected' : ''}>アウター</option>
                        <option value="shoes" ${item.category === 'shoes' ? 'selected' : ''}>シューズ</option>
                    </select>
                    <select id="edit-formality-${item.id}" required>
                        <option value="1" ${item.formality === 1 ? 'selected' : ''}>カジュアル</option>
                        <option value="2" ${item.formality === 2 ? 'selected' : ''}>きれいめ</option>
                        <option value="3" ${item.formality === 3 ? 'selected' : ''}>フォーマル</option>
                    </select>
                    <select id="edit-warmth-${item.id}" required>
                        <option value="1" ${item.warmth === 1 ? 'selected' : ''}>涼しい (夏)</option>
                        <option value="2" ${item.warmth === 2 ? 'selected' : ''}>普通 (春秋)</option>
                        <option value="3" ${item.warmth === 3 ? 'selected' : ''}>暖かい (冬)</option>
                    </select>
                    <div class="edit-form-actions">
                        <button type="submit" class="primary-btn btn-sm">保存</button>
                        <button type="button" class="secondary-btn btn-sm" onclick="cancelEdit()">戻る</button>
                    </div>
                </form>
            `;
        } else {
            // Normal Mode Card
            div.className = `cloth-card ${item.status || 'clean'}`;
            
            const isRecent = isRecentlyWorn(item.id);
            if (item.status === 'clean' && isRecent) {
                div.classList.add('recent');
            }

            let badgeHtml = '';
            let actionBtnText = '洗濯かごへ';
            
            if (item.status === 'laundry') {
                badgeHtml = '<span class="status-badge laundry">洗濯中</span>';
                actionBtnText = '洗濯完了';
            } else if (isRecent) {
                badgeHtml = '<span class="status-badge recent">最近着用(3日内)</span>';
            }

            div.innerHTML = `
                ${badgeHtml}
                <i class="fa-solid ${item.icon || getCategoryIcon(item.category)} icon"></i>
                <h4>${item.name}</h4>
                <div class="tags">
                    <span class="tag">${getCategoryName(item.category)}</span>
                    <span class="tag">フォーマル度: ${item.formality}</span>
                    <span class="tag">暖かさ: ${item.warmth}</span>
                </div>
                <div class="cloth-card-actions">
                    <button class="secondary-btn btn-sm" onclick="toggleLaundry(${item.id})">${actionBtnText}</button>
                    <div class="edit-delete-btns">
                        <button class="secondary-btn btn-sm edit-btn" onclick="startEdit(${item.id})"><i class="fa-solid fa-pen"></i> 編集</button>
                        <button class="secondary-btn btn-sm delete-btn" onclick="deleteItem(${item.id})"><i class="fa-solid fa-trash"></i> 削除</button>
                    </div>
                </div>
            `;
        }
        grid.appendChild(div);
    });
}

// Toggle laundry status (exposed globally)
window.toggleLaundry = function(itemId) {
    const item = inventory.find(i => i.id === itemId);
    if (item) {
        item.status = item.status === 'laundry' ? 'clean' : 'laundry';
        saveInventory();
        renderCloset();
        if (document.getElementById('history').classList.contains('active')) {
            renderHistoryView();
        }
    }
};

// Edit actions (exposed globally)
window.startEdit = function(itemId) {
    editModeItemId = itemId;
    renderCloset();
};

window.cancelEdit = function() {
    editModeItemId = null;
    renderCloset();
};

window.saveEdit = function(event, itemId) {
    event.preventDefault();
    const item = inventory.find(i => i.id === itemId);
    if (item) {
        const newName = document.getElementById(`edit-name-${itemId}`).value;
        const newCategory = document.getElementById(`edit-category-${itemId}`).value;
        const newFormality = parseInt(document.getElementById(`edit-formality-${itemId}`).value);
        const newWarmth = parseInt(document.getElementById(`edit-warmth-${itemId}`).value);

        item.name = newName;
        if (item.category !== newCategory) {
            item.category = newCategory;
            item.icon = getCategoryIcon(newCategory);
        }
        item.formality = newFormality;
        item.warmth = newWarmth;

        saveInventory();
        editModeItemId = null;
        renderCloset();
    }
};

window.deleteItem = function(itemId) {
    const item = inventory.find(i => i.id === itemId);
    if (item && confirm(`「${item.name}」をクローゼットから削除しますか？`)) {
        inventory = inventory.filter(i => i.id !== itemId);
        saveInventory();
        renderCloset();
        if (document.getElementById('history').classList.contains('active')) {
            renderHistoryView();
        }
    }
};

// Add Item
document.getElementById('add-cloth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const category = document.getElementById('new-category').value;
    const name = document.getElementById('new-name').value;
    const formality = parseInt(document.getElementById('new-formality').value);
    const warmth = parseInt(document.getElementById('new-warmth').value);

    const newItem = {
        id: Date.now(),
        name,
        category,
        formality,
        warmth,
        status: 'clean',
        icon: getCategoryIcon(category)
    };

    inventory.push(newItem);
    saveInventory();
    
    // Reset form
    e.target.reset();
    renderCloset();
    
    // Add brief animation or feedback
    const btn = e.target.querySelector('button');
    btn.textContent = '追加完了!';
    setTimeout(() => btn.textContent = '追加', 2000);
});

// Generate Outfit Logic
let currentSuggestedOutfit = [];
let selectedRating = 0;

document.getElementById('generate-btn').addEventListener('click', () => {
    const temp = parseInt(document.getElementById('temp-input').value);
    const place = document.getElementById('location-select').value;
    const companion = document.getElementById('companion-select').value;

    // Determine Required Warmth
    let reqWarmth = 2; // default
    if (temp >= 25) reqWarmth = 1; // Summer
    if (temp <= 12) reqWarmth = 3; // Winter

    // Determine Required Formality
    let reqFormality = 1; // Default
    if (['formal', 'party'].includes(place)) reqFormality = 3;
    if (['office'].includes(place)) reqFormality = 2;
    if (['casual', 'cafe', 'school', 'outdoor', 'sports', 'convenience'].includes(place)) reqFormality = 1;
    
    // Companion overrides/adjustments
    if (companion === 'boss') reqFormality = 3;
    if (reqFormality < 2 && companion === 'date') reqFormality = 2; // Date upgrades casual to smart casual

    const resultGrid = document.getElementById('outfit-grid');
    const resultCard = document.getElementById('outfit-result');
    
    resultGrid.innerHTML = '';

    // Get recently worn item IDs (within 3 days)
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    const recentlyWornIds = new Set();
    wearHistory.forEach(record => {
        const recordTime = new Date(record.timestamp).getTime();
        if (recordTime > threeDaysAgo) {
            record.itemIds.forEach(id => recentlyWornIds.add(id));
        }
    });

    // Simple matching algorithm
    const filterAndPick = (category) => {
        // Exclude laundry items
        let candidates = inventory.filter(item => item.category === category && item.status !== 'laundry');
        if (candidates.length === 0) return null;

        // Exclude recently worn items (preferred)
        let preferredCandidates = candidates.filter(item => !recentlyWornIds.has(item.id));
        
        const pickBest = (pool) => {
            if (pool.length === 0) return null;
            let exact = pool.find(item => item.warmth === reqWarmth && item.formality === reqFormality);
            if (exact) return exact;
            let formMatch = pool.find(item => item.formality === reqFormality);
            if (formMatch) return formMatch;
            let warmthMatch = pool.find(item => item.warmth === reqWarmth);
            if (warmthMatch) return warmthMatch;
            return pool[0];
        };

        // Try to pick from non-recently worn items first
        let best = pickBest(preferredCandidates);
        if (best) return best;

        // Fallback: pick from recently worn items if no other choices
        return pickBest(candidates);
    };

    const outfit = [];
    
    const top = filterAndPick('tops');
    if(top) outfit.push(top);

    const bottom = filterAndPick('bottoms');
    if(bottom) outfit.push(bottom);

    // Outerwear only if cold
    if (reqWarmth > 1) {
        const outer = filterAndPick('outer');
        if(outer) outfit.push(outer);
    }

    const shoes = filterAndPick('shoes');
    if(shoes) outfit.push(shoes);

    if (outfit.length === 0) {
        resultGrid.innerHTML = '<p>手持ちの候補がありません。洗濯を完了するかクローゼットに服を追加してください。</p>';
        document.querySelector('.outfit-actions').classList.add('hidden');
    } else {
        outfit.forEach(item => {
            const div = document.createElement('div');
            div.className = 'outfit-item';
            div.innerHTML = `
                <span class="category-label">${getCategoryName(item.category)}</span>
                <i class="fa-solid ${item.icon || getCategoryIcon(item.category)} icon"></i>
                <h4>${item.name}</h4>
            `;
            resultGrid.appendChild(div);
        });
        
        currentSuggestedOutfit = outfit;
        resetRatingStars();
        document.getElementById('wear-btn').disabled = true;
        document.querySelector('.outfit-actions').classList.remove('hidden');
    }

    resultCard.classList.remove('hidden');
    resultCard.scrollIntoView({ behavior: 'smooth' });
});

// Rating Stars Handling
function resetRatingStars() {
    selectedRating = 0;
    document.querySelectorAll('#rating-stars i').forEach(star => {
        star.className = 'fa-regular fa-star';
        star.classList.remove('active');
    });
}

function updateStars(rating, isHover = false) {
    document.querySelectorAll('#rating-stars i').forEach(star => {
        const val = parseInt(star.getAttribute('data-value'));
        if (val <= rating) {
            star.className = 'fa-solid fa-star';
            if (!isHover) star.classList.add('active');
        } else {
            star.className = 'fa-regular fa-star';
            star.classList.remove('active');
        }
    });
}

document.querySelectorAll('#rating-stars i').forEach(star => {
    star.addEventListener('click', (e) => {
        selectedRating = parseInt(e.currentTarget.getAttribute('data-value'));
        updateStars(selectedRating);
        document.getElementById('wear-btn').disabled = false;
    });

    star.addEventListener('mouseenter', (e) => {
        const val = parseInt(e.currentTarget.getAttribute('data-value'));
        updateStars(val, true);
    });

    star.addEventListener('mouseleave', () => {
        updateStars(selectedRating);
    });
});

// Wear Button Event
document.getElementById('wear-btn').addEventListener('click', () => {
    if (currentSuggestedOutfit.length === 0 || selectedRating === 0) return;

    // Record to history
    const newRecord = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        itemIds: currentSuggestedOutfit.map(i => i.id),
        rating: selectedRating
    };
    wearHistory.unshift(newRecord);
    saveHistory();

    // Send to laundry
    currentSuggestedOutfit.forEach(outfitItem => {
        const item = inventory.find(i => i.id === outfitItem.id);
        if (item) {
            item.status = 'laundry';
        }
    });
    saveInventory();

    // Button feedback
    const wearBtn = document.getElementById('wear-btn');
    wearBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> 着用を記録しました！';
    wearBtn.disabled = true;

    setTimeout(() => {
        wearBtn.innerHTML = '<i class="fa-solid fa-check"></i> このコーデを着用して洗濯かごへ';
        document.getElementById('outfit-result').classList.add('hidden');
        resetRatingStars();
    }, 1500);
});

// History & Laundry rendering
function renderHistoryView() {
    // 1. Laundry Basket
    const laundryList = document.getElementById('laundry-list');
    laundryList.innerHTML = '';
    const laundryItems = inventory.filter(item => item.status === 'laundry');
    
    if (laundryItems.length === 0) {
        laundryList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem 0;">洗濯かごは空です</p>';
        document.getElementById('wash-all-btn').style.display = 'none';
    } else {
        document.getElementById('wash-all-btn').style.display = 'inline-block';
        laundryItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'laundry-item';
            div.innerHTML = `
                <div class="laundry-item-info">
                    <i class="fa-solid ${item.icon || getCategoryIcon(item.category)}"></i>
                    <div>
                        <h4>${item.name}</h4>
                        <span class="category">${getCategoryName(item.category)}</span>
                    </div>
                </div>
                <button class="secondary-btn btn-sm" onclick="toggleLaundry(${item.id})"><i class="fa-solid fa-soap"></i> 洗濯完了</button>
            `;
            laundryList.appendChild(div);
        });
    }

    // 2. Wear History
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';

    if (wearHistory.length === 0) {
        historyList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem 0;">着用記録がありません</p>';
    } else {
        wearHistory.forEach(record => {
            const date = new Date(record.timestamp);
            const dateString = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            
            let starsHtml = '';
            for (let i = 1; i <= 5; i++) {
                if (i <= record.rating) {
                    starsHtml += '<i class="fa-solid fa-star"></i>';
                } else {
                    starsHtml += '<i class="fa-regular fa-star"></i>';
                }
            }

            const clothesHtml = record.itemIds.map(id => {
                const item = inventory.find(i => i.id === id);
                if (!item) return '';
                return `
                    <span class="history-item-cloth-tag">
                        <i class="fa-solid ${item.icon || getCategoryIcon(item.category)}"></i> ${item.name}
                    </span>
                `;
            }).join('');

            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="history-item-header">
                    <span class="history-item-date">${dateString}</span>
                    <span class="history-item-stars">${starsHtml}</span>
                </div>
                <div class="history-item-clothes">
                    ${clothesHtml}
                </div>
            `;
            historyList.appendChild(div);
        });
    }
}

// Wash All Event
document.getElementById('wash-all-btn').addEventListener('click', () => {
    inventory.forEach(item => {
        if (item.status === 'laundry') {
            item.status = 'clean';
        }
    });
    saveInventory();
    renderHistoryView();
});

// Shopping Analysis Logic
function analyzeShopping() {
    const list = document.getElementById('shopping-suggestions');
    list.innerHTML = '';

    const suggestions = [];

    // Count categories
    const counts = {
        tops: inventory.filter(i => i.category === 'tops').length,
        bottoms: inventory.filter(i => i.category === 'bottoms').length,
        outer: inventory.filter(i => i.category === 'outer').length,
        shoes: inventory.filter(i => i.category === 'shoes').length
    };

    if (counts.tops < 2) {
        suggestions.push({
            icon: 'fa-shirt',
            title: 'トップスのバリエーション不足',
            desc: '着回しを増やすために、シンプルな無地のTシャツやシャツを買い足すのがおすすめです。'
        });
    }
    
    if (counts.bottoms < 2) {
        suggestions.push({
            icon: 'fa-person',
            title: 'ボトムスが不足気味',
            desc: 'どんなトップスにも合う「黒の細身パンツ」や「定番デニム」があるとコーディネートの幅が広がります。'
        });
    }

    // Check for formal items
    const formalTops = inventory.filter(i => i.category === 'tops' && i.formality === 3).length;
    if (formalTops === 0) {
        suggestions.push({
            icon: 'fa-user-tie',
            title: 'フォーマルなトップスがありません',
            desc: 'オフィスやフォーマルな場に備えて、きれいめのシャツやブラウスを1着持っておくと安心です。'
        });
    }

    // Default suggestion if everything is well-balanced
    if (suggestions.length === 0) {
        suggestions.push({
            icon: 'fa-wand-magic-sparkles',
            title: 'クローゼットは充実しています！',
            desc: '基本的なアイテムは揃っています。次は少し遊び心のある柄物や、季節のトレンドカラーを取り入れたアイテムに挑戦してみてはいかがでしょうか。'
        });
    }

    suggestions.forEach(s => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.innerHTML = `
            <div class="icon-wrapper"><i class="fa-solid ${s.icon}"></i></div>
            <div class="suggestion-content">
                <h4>${s.title}</h4>
                <p>${s.desc}</p>
            </div>
        `;
        list.appendChild(div);
    });
}

// Initial render
renderCloset();

