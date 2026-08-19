document.addEventListener('DOMContentLoaded', function() {
    initProgressCheckboxes();
    improveSearch();
    addTargetBlankToExternalLinks();
    initGameInfoDisplays();
    initComplexityIndicators();
});
function initProgressCheckboxes() {
    const checkboxes = document.querySelectorAll('.progress-checklist input[type="checkbox"]');
    checkboxes.forEach(function(checkbox, index) {
        const pageUrl = window.location.pathname;
        const checkboxId = `${pageUrl}_checkbox_${index}`;
        const savedState = localStorage.getItem(checkboxId);
        if (savedState === 'true') {
            checkbox.checked = true;
        }
        checkbox.addEventListener('change', function() {
            localStorage.setItem(checkboxId, checkbox.checked);
        });
    });
}
function improveSearch() {
    const searchInput = document.querySelector('[data-md-component="search-query"]');
    if (searchInput) {
        searchInput.setAttribute('placeholder', 'ゲームを検索...');
    }
    document.querySelectorAll('[data-md-component="search"] [role="dialog"], [data-md-component="search"][role="dialog"]').forEach(function(dialog) {
        if (!dialog.hasAttribute('aria-label') && !dialog.hasAttribute('aria-labelledby')) {
            dialog.setAttribute('aria-label', 'サイト内検索');
        }
    });
}
function addTargetBlankToExternalLinks() {
    const links = document.querySelectorAll('a[href^="http"]:not([href*="' + window.location.hostname + '"])');
    links.forEach(function(link) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
    });
}
function initGameInfoDisplays() {
    const gameElements = document.querySelectorAll('[data-bgg-id]');
    gameElements.forEach(function(element) {
        const rating = element.getAttribute('data-bgg-rating');
        if (rating) {
            updateGameRatingDisplay(element, rating);
        }
    });
}
function updateGameRatingDisplay(element, rating) {
    const ratingElement = element.querySelector('.bgg-rating');
    if (ratingElement) {
        ratingElement.textContent = `BGG: ${rating}`;
        ratingElement.setAttribute('title', `BoardGameGeek評価: ${rating}/10`);
    }
}
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
function updateGameInfo() {
    const gameElements = document.querySelectorAll('.bgg-rating');
    const lastUpdated = new Date().toLocaleDateString('ja-JP');
    gameElements.forEach(function(element) {
        element.setAttribute('title', `最終更新: ${lastUpdated}`);
    });
}
function enhanceGameNavigation() {
    const gameCards = document.querySelectorAll('.game-card');
    gameCards.forEach(function(card, index) {
        card.setAttribute('id', `game-${index + 1}`);
    });
}
window.addEventListener('load', function() {
    updateGameInfo();
    enhanceGameNavigation();
});
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
window.BoardGameListUtils = {
    createDifficultyIndicator,
    initComplexityIndicators,
    updateGameRatingDisplay
};