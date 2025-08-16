// ボードゲームガイド - 追加JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // 進捗チェックリストの機能
    initProgressCheckboxes();
    
    // ページ内検索の改善
    improveSearch();
    
    // 外部リンクに新しいタブで開く属性を追加
    addTargetBlankToExternalLinks();
    
    // ゲーム情報表示の初期化
    initGameInfoDisplays();
    
    // 複雑度インジケーターの初期化
    initComplexityIndicators();
});

// 進捗チェックボックスの状態をローカルストレージに保存
function initProgressCheckboxes() {
    const checkboxes = document.querySelectorAll('.progress-checklist input[type="checkbox"]');
    
    checkboxes.forEach(function(checkbox, index) {
        const pageUrl = window.location.pathname;
        const checkboxId = `${pageUrl}_checkbox_${index}`;
        
        // 保存された状態を読み込み
        const savedState = localStorage.getItem(checkboxId);
        if (savedState === 'true') {
            checkbox.checked = true;
        }
        
        // チェック状態の変更を保存
        checkbox.addEventListener('change', function() {
            localStorage.setItem(checkboxId, checkbox.checked);
        });
    });
}

// 検索機能の改善（日本語検索対応）
function improveSearch() {
    const searchInput = document.querySelector('[data-md-component="search-query"]');
    if (searchInput) {
        searchInput.setAttribute('placeholder', 'ゲームを検索...');
    }
}

// 外部リンクを新しいタブで開く
function addTargetBlankToExternalLinks() {
    const links = document.querySelectorAll('a[href^="http"]:not([href*="' + window.location.hostname + '"])');
    links.forEach(function(link) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
    });
}

// ゲーム情報表示の初期化
function initGameInfoDisplays() {
    const gameElements = document.querySelectorAll('[data-bgg-id]');
    gameElements.forEach(function(element) {
        const rating = element.getAttribute('data-bgg-rating');
        if (rating) {
            updateGameRatingDisplay(element, rating);
        }
    });
}

// ゲーム評価表示の更新
function updateGameRatingDisplay(element, rating) {
    const ratingElement = element.querySelector('.bgg-rating');
    if (ratingElement) {
        ratingElement.textContent = `BGG: ${rating}`;
        ratingElement.setAttribute('title', `BoardGameGeek評価: ${rating}/10`);
    }
}

// 複雑度インジケーターの初期化
function initComplexityIndicators() {
    const complexityElements = document.querySelectorAll('[data-complexity]');
    
    complexityElements.forEach(element => {
        const complexity = parseFloat(element.getAttribute('data-complexity'));
        const maxDots = 5;
        const filledDots = Math.round(complexity);
        
        const container = document.createElement('div');
        container.className = 'complexity-indicator';
        
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'complexity-dots';
        
        for (let i = 1; i <= maxDots; i++) {
            const dot = document.createElement('span');
            dot.className = `complexity-dot${i <= filledDots ? ' filled' : ''}`;
            dotsContainer.appendChild(dot);
        }
        
        container.appendChild(dotsContainer);
        
        const label = document.createElement('span');
        label.textContent = `${complexity}/5`;
        label.style.fontSize = '0.8em';
        label.style.marginLeft = '0.5rem';
        container.appendChild(label);
        
        element.appendChild(container);
    });
}

// ゲーム情報の更新日時を表示
function updateGameInfo() {
    const gameElements = document.querySelectorAll('.bgg-rating');
    const lastUpdated = new Date().toLocaleDateString('ja-JP');
    
    gameElements.forEach(function(element) {
        element.setAttribute('title', `最終更新: ${lastUpdated}`);
    });
}

// ステップガイドのナビゲーション改善
function enhanceGameNavigation() {
    const gameCards = document.querySelectorAll('.game-card');
    gameCards.forEach(function(card, index) {
        card.setAttribute('id', `game-${index + 1}`);
    });
}

// ページ読み込み完了時の追加処理
window.addEventListener('load', function() {
    updateGameInfo();
    enhanceGameNavigation();
});

// ユーティリティ関数
function createDifficultyIndicator(level) {
    const indicator = document.createElement('span');
    let className = '';
    let text = '';
    
    if (level <= 1.5) {
        className = 'difficulty-beginner';
        text = '初級';
    } else if (level <= 2.5) {
        className = 'difficulty-intermediate';
        text = '中級';
    } else {
        className = 'difficulty-advanced';
        text = '上級';
    }
    
    indicator.className = className;
    indicator.textContent = text;
    
    return indicator;
}

// エクスポート関数
window.BoardGameListUtils = {
    createDifficultyIndicator,
    initComplexityIndicators,
    updateGameRatingDisplay
};