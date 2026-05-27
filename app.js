// Mock initial inventory data
let inventory = [
    { id: 1, name: '白のTシャツ', category: 'tops', formality: 1, warmth: 1, icon: 'fa-shirt' },
    { id: 2, name: 'オックスフォードシャツ', category: 'tops', formality: 2, warmth: 2, icon: 'fa-user-tie' },
    { id: 3, name: '黒のスラックス', category: 'bottoms', formality: 3, warmth: 2, icon: 'fa-person' },
    { id: 4, name: 'デニムパンツ', category: 'bottoms', formality: 1, warmth: 2, icon: 'fa-person' },
    { id: 5, name: 'テーラードジャケット', category: 'outer', formality: 3, warmth: 2, icon: 'fa-user-tie' },
    { id: 6, name: 'ダウンジャケット', category: 'outer', formality: 1, warmth: 3, icon: 'fa-temperature-arrow-up' },
    { id: 7, name: 'スニーカー', category: 'shoes', formality: 1, warmth: 2, icon: 'fa-shoe-prints' },
    { id: 8, name: '革靴', category: 'shoes', formality: 3, warmth: 2, icon: 'fa-shoe-prints' }
];

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

        // If target is closet, render it. If shopping, analyze.
        if(target === 'closet') renderCloset();
        if(target === 'shopping') analyzeShopping();
    });
});

// Closet Logic
function renderCloset() {
    const grid = document.getElementById('closet-grid');
    grid.innerHTML = '';

    inventory.forEach(item => {
        const div = document.createElement('div');
        div.className = 'cloth-card';
        div.innerHTML = `
            <i class="fa-solid ${item.icon} icon"></i>
            <h4>${item.name}</h4>
            <div class="tags">
                <span class="tag">${getCategoryName(item.category)}</span>
                <span class="tag">フォーマル度: ${item.formality}</span>
                <span class="tag">暖かさ: ${item.warmth}</span>
            </div>
        `;
        grid.appendChild(div);
    });
}

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
        icon: getCategoryIcon(category)
    };

    inventory.push(newItem);
    
    // Reset form
    e.target.reset();
    renderCloset();
    
    // Add brief animation or feedback
    const btn = e.target.querySelector('button');
    btn.textContent = '追加完了!';
    setTimeout(() => btn.textContent = '追加', 2000);
});


// Generate Outfit Logic
document.getElementById('generate-btn').addEventListener('click', () => {
    const temp = parseInt(document.getElementById('temp-input').value);
    const place = document.getElementById('location-select').value;
    const companion = document.getElementById('companion-select').value;

    // Determine Required Warmth
    let reqWarmth = 2; // default
    if (temp >= 25) reqWarmth = 1; // Summer
    if (temp <= 12) reqWarmth = 3; // Winter

    // Determine Required Formality (1: Casual, 2: Smart Casual, 3: Formal)
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

    // Simple matching algorithm
    const filterAndPick = (category) => {
        let candidates = inventory.filter(item => item.category === category);
        if(candidates.length === 0) return null;

        // Try to match both
        let exact = candidates.find(item => item.warmth === reqWarmth && item.formality === reqFormality);
        if (exact) return exact;

        // Fallback: match formality first
        let formMatch = candidates.find(item => item.formality === reqFormality);
        if (formMatch) return formMatch;

        // Fallback: match warmth
        let warmthMatch = candidates.find(item => item.warmth === reqWarmth);
        if (warmthMatch) return warmthMatch;

        // Fallback: just return first
        return candidates[0];
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
        resultGrid.innerHTML = '<p>手持ちの服がありません。クローゼットに服を追加してください。</p>';
    } else {
        outfit.forEach(item => {
            const div = document.createElement('div');
            div.className = 'outfit-item';
            div.innerHTML = `
                <span class="category-label">${getCategoryName(item.category)}</span>
                <i class="fa-solid ${item.icon} icon"></i>
                <h4>${item.name}</h4>
            `;
            resultGrid.appendChild(div);
        });
    }

    resultCard.classList.remove('hidden');
    
    // Scroll to result
    resultCard.scrollIntoView({ behavior: 'smooth' });
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
