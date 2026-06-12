// Firebase configuration (Placeholder for user project)
const firebaseConfig = {
    apiKey: "AIzaSyDummyKeyForInitializationOnly",
    authDomain: "style-weather-dummy.firebaseapp.com",
    projectId: "style-weather-dummy",
    storageBucket: "style-weather-dummy.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456"
};

let auth, db;
let isFirebaseInitialized = false;

try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        isFirebaseInitialized = true;
    } else {
        console.warn("Firebase SDK not loaded. Running in offline localStorage mode.");
    }
} catch (e) {
    console.warn("Firebase failed to initialize. Running in offline localStorage mode.", e);
}

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

function saveInventoryLocal() {
    localStorage.setItem('sw_inventory', JSON.stringify(inventory));
}

function saveHistoryLocal() {
    localStorage.setItem('sw_history', JSON.stringify(wearHistory));
}

async function saveInventory() {
    saveInventoryLocal();
    if (isFirebaseInitialized && currentUser) {
        try {
            await db.collection("users").doc(currentUser.uid).update({
                inventory: inventory,
                updatedAt: new Date().toISOString()
            });
        } catch (e) {
            console.error("Failed to update inventory to Firestore:", e);
        }
    }
}

async function saveHistory() {
    saveHistoryLocal();
    if (isFirebaseInitialized && currentUser) {
        try {
            await db.collection("users").doc(currentUser.uid).update({
                wearHistory: wearHistory,
                updatedAt: new Date().toISOString()
            });
        } catch (e) {
            console.error("Failed to update history to Firestore:", e);
        }
    }
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
    let reqWarmth = 2; // default
    let reqFormality = 1; // Default
    const companion = document.getElementById('companion-select').value;
    const adviceEl = document.getElementById('outfit-advice');
    let adviceMsgs = [];

    if (isScheduleMode && scheduleData.length > 0) {
        // Schedule Mode Logic
        let maxFormality = 1;
        let minTemp = 99;
        let maxTemp = -99;
        let hasRain = false;

        scheduleData.forEach(item => {
            if (item.sceneFormality > maxFormality) maxFormality = item.sceneFormality;
            if (item.temp < minTemp) minTemp = item.temp;
            if (item.temp > maxTemp) maxTemp = item.temp;
            if (item.weatherVal === 'rainy') hasRain = true;
        });

        reqFormality = maxFormality;

        // Use average temp to determine base warmth
        const avgTemp = (minTemp + maxTemp) / 2;
        if (avgTemp >= 25) reqWarmth = 1;
        else if (avgTemp <= 12) reqWarmth = 3;
        else reqWarmth = 2;

        const tempDiff = maxTemp - minTemp;
        if (tempDiff >= 8) {
            adviceMsgs.push("寒暖差が激しい一日です。脱ぎ着しやすいアウターや羽織りものを持参することをおすすめします。");
        } else if (minTemp <= 10) {
            adviceMsgs.push("冷え込む時間帯があります。暖かいインナーやマフラー等の防寒具を活用してください。");
        }

        if (hasRain) {
            adviceMsgs.push("雨が降る予報があります。傘の持参と、雨に強い靴（または防水スプレー）をおすすめします。");
        }

    } else {
        // Simple Mode Logic
        const temp = parseInt(document.getElementById('temp-input').value);
        const place = document.getElementById('location-select').value;

        if (temp >= 25) reqWarmth = 1; // Summer
        if (temp <= 12) reqWarmth = 3; // Winter

        if (['formal', 'party'].includes(place)) reqFormality = 3;
        if (['office'].includes(place)) reqFormality = 2;
        if (['casual', 'cafe', 'school', 'outdoor', 'sports', 'convenience'].includes(place)) reqFormality = 1;
    }

    // Companion overrides/adjustments
    if (companion === 'boss') reqFormality = 3;
    if (reqFormality < 2 && companion === 'date') reqFormality = 2; // Date upgrades casual to smart casual

    if (adviceEl) {
        if (adviceMsgs.length > 0) {
            adviceEl.innerHTML = `<strong><i class="fa-solid fa-lightbulb"></i> 今日のポイント</strong><ul>` + adviceMsgs.map(m => `<li>${m}</li>`).join('') + `</ul>`;
            adviceEl.classList.remove('hidden');
        } else {
            adviceEl.classList.add('hidden');
        }
    }

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

// Firebase Synchronization & Auth Control Logic
let currentUser = null;

function loadLocalData() {
    inventory = JSON.parse(localStorage.getItem('sw_inventory'));
    if (!inventory || inventory.length === 0) {
        inventory = DEFAULT_INVENTORY;
        localStorage.setItem('sw_inventory', JSON.stringify(inventory));
    }
    wearHistory = JSON.parse(localStorage.getItem('sw_history')) || [];
}

async function syncDataWithCloud(uid) {
    if (!isFirebaseInitialized) return;
    try {
        const userDocRef = db.collection("users").doc(uid);
        const userDocSnap = await userDocRef.get();

        if (userDocSnap.exists) {
            const cloudData = userDocSnap.data();
            const cloudInventory = cloudData.inventory || [];
            const cloudHistory = cloudData.wearHistory || [];

            // マージ処理
            // 1. Inventoryのマージ (IDで紐付け)
            const mergedInventory = [...cloudInventory];
            inventory.forEach(localItem => {
                if (!mergedInventory.some(cloudItem => cloudItem.id === localItem.id)) {
                    mergedInventory.push(localItem); // ローカルにしかないアイテムを追加
                }
            });
            inventory = mergedInventory;

            // 2. WearHistoryのマージ (タイムスタンプ等のIDで重複排除)
            const mergedHistory = [...cloudHistory];
            wearHistory.forEach(localRecord => {
                if (!mergedHistory.some(cloudRecord => cloudRecord.id === localRecord.id)) {
                    mergedHistory.push(localRecord);
                }
            });
            // 最新順に並び替え
            mergedHistory.sort((a, b) => b.id - a.id);
            wearHistory = mergedHistory;

            // ローカルストレージに保存
            saveInventoryLocal();
            saveHistoryLocal();

            // クラウドに書き戻し（最新マージ状態を両者で共有）
            await userDocRef.set({
                inventory: inventory,
                wearHistory: wearHistory,
                updatedAt: new Date().toISOString()
            });

        } else {
            // クラウドにまだデータがない＝新規登録などの場合
            // ローカルにあるデータをそのままクラウドへアップロード
            await userDocRef.set({
                inventory: inventory,
                wearHistory: wearHistory,
                updatedAt: new Date().toISOString()
            });
        }
    } catch (e) {
        console.error("Failed to sync data with Firebase:", e);
    }
}

// 認証状態の変更リスナー
if (isFirebaseInitialized) {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            showAuthenticatedUI(user.email);
            await syncDataWithCloud(user.uid);
        } else {
            currentUser = null;
            showUnauthenticatedUI();
            loadLocalData();
        }
        renderCloset();
        if (document.getElementById('history').classList.contains('active')) {
            renderHistoryView();
        }
    });
}

// モーダル表示とログイン処理のUI制御
const loginModal = document.getElementById('login-modal');
const openLoginBtn = document.getElementById('open-login-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const loginForm = document.getElementById('login-form');
const toggleAuthModeBtn = document.getElementById('toggle-auth-mode-btn');
const modalTitle = document.getElementById('modal-title');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const toggleAuthModeText = document.getElementById('toggle-auth-mode-text');
const authErrorMsg = document.getElementById('auth-error-msg');
const logoutBtn = document.getElementById('logout-btn');

let isSignUpMode = false;

// UI Toggle Functions
function showAuthenticatedUI(email) {
    document.querySelector('.account-unauthenticated').classList.add('hidden');
    document.querySelector('.account-authenticated').classList.remove('hidden');
    document.getElementById('user-email').textContent = email;
}

// Toggle unauthenticated
function showUnauthenticatedUI() {
    document.querySelector('.account-unauthenticated').classList.remove('hidden');
    document.querySelector('.account-authenticated').classList.add('hidden');
    document.getElementById('user-email').textContent = '';
}

// Event Listeners for Modal
if (openLoginBtn) {
    openLoginBtn.addEventListener('click', () => {
        loginModal.classList.remove('hidden');
        authErrorMsg.classList.add('hidden');
        loginForm.reset();
        setAuthMode(false); // default to login
    });
}

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        loginModal.classList.add('hidden');
    });
}

// Close modal on background click
if (loginModal) {
    loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.classList.add('hidden');
        }
    });
}

if (toggleAuthModeBtn) {
    toggleAuthModeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        setAuthMode(!isSignUpMode);
    });
}

function setAuthMode(signUp) {
    isSignUpMode = signUp;
    if (isSignUpMode) {
        modalTitle.textContent = 'アカウント新規登録';
        authSubmitBtn.textContent = '新規登録';
        toggleAuthModeText.textContent = 'すでにアカウントをお持ちですか？';
        toggleAuthModeBtn.textContent = 'ログイン';
    } else {
        modalTitle.textContent = 'ログイン';
        authSubmitBtn.textContent = 'ログイン';
        toggleAuthModeText.textContent = 'アカウントをお持ちでないですか？';
        toggleAuthModeBtn.textContent = '新規登録';
    }
}

// Login/Signup Submit
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authErrorMsg.classList.add('hidden');
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!isFirebaseInitialized) {
            authErrorMsg.textContent = 'Firebaseが正しく初期化されていないため、現在ログイン機能は利用できません。';
            authErrorMsg.classList.remove('hidden');
            return;
        }

        try {
            authSubmitBtn.disabled = true;
            authSubmitBtn.textContent = isSignUpMode ? '登録中...' : 'ログイン中...';
            
            if (isSignUpMode) {
                await auth.createUserWithEmailAndPassword(email, password);
            } else {
                await auth.signInWithEmailAndPassword(email, password);
            }
            loginModal.classList.add('hidden');
        } catch (error) {
            console.error("Auth action failed:", error);
            let errorText = '認証に失敗しました。';
            if (error.code === 'auth/invalid-credential') {
                errorText = 'メールアドレスまたはパスワードが正しくありません。';
            } else if (error.code === 'auth/email-already-in-use') {
                errorText = 'このメールアドレスは既に登録されています。';
            } else if (error.code === 'auth/weak-password') {
                errorText = 'パスワードは6文字以上で設定してください。';
            } else if (error.code === 'auth/invalid-email') {
                errorText = '無効なメールアドレスです。';
            }
            authErrorMsg.textContent = errorText;
            authErrorMsg.classList.remove('hidden');
        } finally {
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = isSignUpMode ? '新規登録' : 'ログイン';
        }
    });
}

// Logout Action
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        if (!isFirebaseInitialized) return;
        try {
            await auth.signOut();
        } catch (e) {
            console.error("Logout failed:", e);
        }
    });
}

// ---- 位置情報から天気・気温を自動取得する機能 ----
async function reverseGeocodeCity(lat, lon) {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ja`,
            { headers: { 'User-Agent': 'style-weather-app' } }
        );
        const data = await res.json();
        const addr = data.address || {};
        // 都市名の優先順位: city > town > village > county > state > 不明
        return addr.city || addr.town || addr.village || addr.county || addr.state_district || addr.state || '不明';
    } catch (e) {
        return null;
    }
}

async function fetchWeatherByCoords(lat, lon) {
    const statusEl = document.getElementById('weather-status');
    const extremesEl = document.getElementById('weather-extremes');
    const tempInput = document.getElementById('temp-input');
    const weatherSelect = document.getElementById('weather-select');

    try {
        // 天気取得と逆ジオコーディングを並列実行
        const [weatherRes, cityName] = await Promise.all([
            fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
                `&current=temperature_2m,weather_code` +
                `&daily=temperature_2m_max,temperature_2m_min` +
                `&timezone=auto`
            ),
            reverseGeocodeCity(lat, lon)
        ]);

        const weatherData = await weatherRes.json();
        const current = weatherData.current;
        const daily = weatherData.daily;
        if (!current) throw new Error('no data');

        const currentTemp = Math.round(current.temperature_2m);
        const weatherCode = current.weather_code;
        const dailyMax = Math.round(daily.temperature_2m_max[0]);
        const dailyMin = Math.round(daily.temperature_2m_min[0]);

        let weatherVal = 'sunny', weatherLabel = '晴れ';
        if (weatherCode === 0 || weatherCode === 1) { weatherVal = 'sunny'; weatherLabel = '晴れ'; }
        else if (weatherCode === 2 || weatherCode === 3 || weatherCode === 45 || weatherCode === 48) { weatherVal = 'cloudy'; weatherLabel = 'くもり'; }
        else { weatherVal = 'rainy'; weatherLabel = '雨'; }

        if (tempInput) tempInput.value = currentTemp;
        if (weatherSelect) weatherSelect.value = weatherVal;

        if (extremesEl) {
            extremesEl.innerHTML = `本日 最高: <strong>${dailyMax}℃</strong> / 最低: <strong>${dailyMin}℃</strong>`;
            extremesEl.classList.remove('hidden');
        }
        if (statusEl) {
            const locationLabel = cityName ? cityName : '現在地';
            statusEl.className = 'weather-status success';
            statusEl.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${locationLabel} — ${currentTemp}℃ / ${weatherLabel}`;
            statusEl.classList.remove('hidden');
        }
    } catch (e) {
        console.error('天気データの取得に失敗:', e);
        if (statusEl) {
            statusEl.className = 'weather-status error';
            statusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> 天気データの取得に失敗しました';
            statusEl.classList.remove('hidden');
        }
    }
}

function detectAndFetchWeather() {
    const statusEl = document.getElementById('weather-status');
    if (statusEl) {
        statusEl.className = 'weather-status loading';
        statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 現在地を取得中...';
        statusEl.classList.remove('hidden');
    }
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
            (err) => {
                console.warn('位置情報取得失敗:', err);
                // 東京をデフォルトに
                fetchWeatherByCoords(35.6895, 139.6917);
                if (statusEl) {
                    statusEl.className = 'weather-status';
                    statusEl.innerHTML = '<i class="fa-solid fa-circle-info"></i> 位置情報が取得できないため、東京の天気を表示しています';
                }
            },
            { timeout: 8000 }
        );
    } else {
        fetchWeatherByCoords(35.6895, 139.6917);
    }
}

// 「現在地」ボタン
const gpsSyncBtn = document.getElementById('gps-sync-btn');
if (gpsSyncBtn) {
    gpsSyncBtn.addEventListener('click', detectAndFetchWeather);
}

// ページ読み込み時に自動取得
detectAndFetchWeather();


// ---- Schedule Management Logic ----
let scheduleData = [];
let isScheduleMode = false;


const tabSimple = document.getElementById('tab-simple');
const tabSchedule = document.getElementById('tab-schedule');
const viewSimple = document.getElementById('simple-location-view');
const viewSchedule = document.getElementById('schedule-location-view');

if (tabSimple && tabSchedule) {
    tabSimple.addEventListener('click', () => {
        isScheduleMode = false;
        tabSimple.classList.add('active');
        tabSchedule.classList.remove('active');
        viewSimple.classList.remove('hidden');
        viewSchedule.classList.add('hidden');
        document.getElementById('weather-extremes').classList.add('hidden');
    });

    tabSchedule.addEventListener('click', () => {
        isScheduleMode = true;
        tabSchedule.classList.add('active');
        tabSimple.classList.remove('active');
        viewSchedule.classList.remove('hidden');
        viewSimple.classList.add('hidden');
        renderScheduleList();
    });
}

// ---- スケジュール：場所検索（ステップ1: 検索→候補表示）----
let selectedPlaceData = null; // 選択した場所データを一時保存

const searchSchedBtn = document.getElementById('search-sched-btn');
const schedPlaceInput = document.getElementById('sched-place');
const candidatesBox = document.getElementById('sched-candidates');
const candidateList = document.getElementById('candidate-list');
const schedSelectedBox = document.getElementById('sched-selected');
const selectedPlaceName = document.getElementById('selected-place-name');
const clearSelectionBtn = document.getElementById('clear-selection-btn');
const addSchedBtn = document.getElementById('add-sched-btn');

function resetPlaceSelection() {
    selectedPlaceData = null;
    if (candidatesBox) candidatesBox.classList.add('hidden');
    if (schedSelectedBox) schedSelectedBox.classList.add('hidden');
    if (addSchedBtn) addSchedBtn.disabled = true;
}

if (clearSelectionBtn) {
    clearSelectionBtn.addEventListener('click', () => {
        resetPlaceSelection();
        if (schedPlaceInput) schedPlaceInput.value = '';
    });
}

async function searchSchedPlace() {
    if (!schedPlaceInput) return;
    const query = schedPlaceInput.value.trim();
    if (!query) {
        alert('場所を入力してください');
        return;
    }

    const btn = searchSchedBtn;
    const origText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled = true;
    resetPlaceSelection();

    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?` +
            `q=${encodeURIComponent(query)}&countrycodes=jp&format=json&limit=8&addressdetails=1&namedetails=1`,
            { headers: { 'Accept-Language': 'ja', 'User-Agent': 'style-weather-app' } }
        );
        const data = await res.json();

        if (!data || data.length === 0) {
            alert('場所が見つかりませんでした。\n別のキーワードをお試しください。例: 「東京ディズニーランド」「よみうりランド」');
            btn.innerHTML = origText;
            btn.disabled = false;
            return;
        }

        // 候補リストを表示
        candidateList.innerHTML = '';
        data.forEach(place => {
            const name = place.namedetails?.name || place.display_name.split(',')[0];
            // 住所の整形（都道府県+市区町村のみ表示）
            const addr = place.address;
            const addrParts = [addr?.state, addr?.city || addr?.town || addr?.village, addr?.suburb].filter(Boolean);
            const addrStr = addrParts.join(' ') || place.display_name.split(',').slice(1, 3).join(',').trim();

            const li = document.createElement('li');
            li.className = 'candidate-item';
            li.innerHTML = `
                <div class="cand-name">${name}</div>
                <div class="cand-addr">${addrStr}</div>
            `;
            li.addEventListener('click', () => {
                // 選択確定
                selectedPlaceData = {
                    lat: parseFloat(place.lat),
                    lon: parseFloat(place.lon),
                    title: name
                };
                candidatesBox.classList.add('hidden');
                selectedPlaceName.textContent = `✓ ${name}（${addrStr}）`;
                schedSelectedBox.classList.remove('hidden');
                addSchedBtn.disabled = false;
            });
            candidateList.appendChild(li);
        });

        candidatesBox.classList.remove('hidden');
    } catch (e) {
        console.error(e);
        alert('検索に失敗しました');
    }

    btn.innerHTML = origText;
    btn.disabled = false;
}

if (searchSchedBtn) {
    searchSchedBtn.addEventListener('click', searchSchedPlace);
}
if (schedPlaceInput) {
    schedPlaceInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') searchSchedPlace();
    });
}

// ---- スケジュール：追加（ステップ2: 選択済みデータで天気取得→追加）----
if (addSchedBtn) {
    addSchedBtn.addEventListener('click', async () => {
        if (!selectedPlaceData) {
            alert('場所を検索して選択してください');
            return;
        }
        if (scheduleData.length >= 5) {
            alert('スケジュールは最大5件まで登録できます');
            return;
        }

        const timeSelect = document.getElementById('sched-time');
        const sceneSelect = document.getElementById('sched-scene');

        const origBtnText = addSchedBtn.innerHTML;
        addSchedBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 追加中...';
        addSchedBtn.disabled = true;

        try {
            const { lat, lon, title } = selectedPlaceData;

            // Open-Meteo APIで時間帯別天気・気温取得
            const weatherRes = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
                `&hourly=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
            );
            const weatherData = await weatherRes.json();

            const timeVal = timeSelect.value;
            let targetHour = '15', timeLabel = '昼';
            if (timeVal === 'morning') { targetHour = '09'; timeLabel = '朝'; }
            if (timeVal === 'evening') { targetHour = '20'; timeLabel = '夜'; }

            const todayStr = new Date().toISOString().split('T')[0];
            const targetTimeStr = `${todayStr}T${targetHour}:00`;
            const hourlyIndex = weatherData.hourly.time.findIndex(t => t.startsWith(targetTimeStr));

            let temp = 20, weatherCode = 0;
            if (hourlyIndex !== -1) {
                temp = Math.round(weatherData.hourly.temperature_2m[hourlyIndex]);
                weatherCode = weatherData.hourly.weather_code[hourlyIndex];
            } else {
                temp = Math.round(weatherData.hourly.temperature_2m[0]);
                weatherCode = weatherData.hourly.weather_code[0];
            }

            const dailyMax = Math.round(weatherData.daily.temperature_2m_max[0]);
            const dailyMin = Math.round(weatherData.daily.temperature_2m_min[0]);

            let weatherVal = 'sunny', weatherLabel = '晴れ';
            if (weatherCode === 0 || weatherCode === 1) { weatherVal = 'sunny'; weatherLabel = '晴れ'; }
            else if (weatherCode === 2 || weatherCode === 3 || weatherCode === 45 || weatherCode === 48) { weatherVal = 'cloudy'; weatherLabel = 'くもり'; }
            else { weatherVal = 'rainy'; weatherLabel = '雨'; }

            const sceneLabel = sceneSelect.options[sceneSelect.selectedIndex].text;
            let sceneFormality = 1;
            if (sceneSelect.value === 'formal') sceneFormality = 3;
            if (sceneSelect.value === 'office') sceneFormality = 2;

            scheduleData.push({ id: Date.now(), place: title, timeVal, timeLabel, scene: sceneSelect.value, sceneLabel, sceneFormality, temp, dailyMax, dailyMin, weatherVal, weatherLabel });

            const timeOrder = { morning: 1, afternoon: 2, evening: 3 };
            scheduleData.sort((a, b) => timeOrder[a.timeVal] - timeOrder[b.timeVal]);

            // リセット
            if (schedPlaceInput) schedPlaceInput.value = '';
            resetPlaceSelection();
            renderScheduleList();

        } catch (e) {
            console.error(e);
            alert('データの取得に失敗しました');
        }

        addSchedBtn.innerHTML = origBtnText;
        addSchedBtn.disabled = true; // 追加後は再び選択が必要
    });
}

window.deleteSchedule = function(id) {
    scheduleData = scheduleData.filter(item => item.id !== id);
    renderScheduleList();
};

function renderScheduleList() {
    const list = document.getElementById('schedule-list');
    const extremesEl = document.getElementById('weather-extremes');
    if (!list) return;

    list.innerHTML = '';
    
    if (scheduleData.length === 0) {
        list.innerHTML = '<li class="empty-msg">スケジュールが登録されていません</li>';
        if(extremesEl) extremesEl.classList.add('hidden');
        return;
    }

    let globalMax = -99;
    let globalMin = 99;

    scheduleData.forEach(item => {
        if (item.dailyMax > globalMax) globalMax = item.dailyMax;
        if (item.dailyMin < globalMin) globalMin = item.dailyMin;

        let icon = 'fa-sun';
        if (item.weatherVal === 'cloudy') icon = 'fa-cloud';
        if (item.weatherVal === 'rainy') icon = 'fa-umbrella';

        const li = document.createElement('li');
        li.className = 'schedule-item';
        li.innerHTML = `
            <div class="schedule-item-info">
                <div class="schedule-item-title">[${item.timeLabel}] ${item.place}</div>
                <div class="schedule-item-meta">
                    <span>${item.sceneLabel}</span>
                    <span class="schedule-item-weather"><i class="fa-solid ${icon}"></i> ${item.temp}℃ / ${item.weatherLabel}</span>
                </div>
            </div>
            <button class="secondary-btn btn-sm" onclick="deleteSchedule(${item.id})"><i class="fa-solid fa-xmark"></i></button>
        `;
        list.appendChild(li);
    });

    if (extremesEl) {
        extremesEl.innerHTML = `本日の最高: ${globalMax}℃ / 最低: ${globalMin}℃`;
        extremesEl.classList.remove('hidden');
    }
}


