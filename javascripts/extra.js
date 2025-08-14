/**
 * BoardGameList Extra JavaScript
 * Enhanced functionality for the board game documentation site
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // Initialize complexity indicators
    initComplexityIndicators();
    
    // Initialize game card enhancements
    initGameCardEnhancements();
    
    // Initialize search enhancements
    initSearchEnhancements();
    
    // Initialize responsive tables
    initResponsiveTables();
    
});

/**
 * Initialize complexity dot indicators
 */
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

/**
 * Initialize game card enhancements
 */
function initGameCardEnhancements() {
    // Add hover effects and interactive elements
    const gameCards = document.querySelectorAll('.game-card');
    
    gameCards.forEach(card => {
        // Add click-to-expand functionality for descriptions
        const description = card.querySelector('.game-description');
        if (description && description.textContent.length > 200) {
            const fullText = description.textContent;
            const shortText = fullText.substring(0, 200) + '...';
            
            description.textContent = shortText;
            
            const expandButton = document.createElement('button');
            expandButton.textContent = 'Read more';
            expandButton.className = 'expand-button';
            expandButton.style.cssText = `
                background: none;
                border: none;
                color: var(--md-accent-fg-color);
                cursor: pointer;
                font-size: 0.8em;
                margin-left: 0.5rem;
                text-decoration: underline;
            `;
            
            let expanded = false;
            expandButton.addEventListener('click', () => {
                if (expanded) {
                    description.textContent = shortText;
                    expandButton.textContent = 'Read more';
                } else {
                    description.textContent = fullText;
                    expandButton.textContent = 'Read less';
                }
                expanded = !expanded;
            });
            
            description.appendChild(expandButton);
        }
    });
}

/**
 * Initialize search enhancements
 */
function initSearchEnhancements() {
    // Add game filtering functionality
    const searchInput = document.querySelector('input[type="search"]');
    if (!searchInput) return;
    
    // Create filter buttons
    const filterContainer = document.createElement('div');
    filterContainer.className = 'filter-container';
    filterContainer.style.cssText = `
        margin: 1rem 0;
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
    `;
    
    const filters = [
        { label: 'All', filter: '' },
        { label: 'Card Games', filter: 'card-game' },
        { label: 'Strategy', filter: 'strategy' },
        { label: 'Family', filter: 'family' },
        { label: 'Deck Building', filter: 'deck-building' }
    ];
    
    filters.forEach(({ label, filter }) => {
        const button = document.createElement('button');
        button.textContent = label;
        button.className = 'filter-button';
        button.style.cssText = `
            padding: 0.25rem 0.75rem;
            border: 1px solid var(--md-default-fg-color--lighter);
            background: var(--md-default-bg-color);
            color: var(--md-default-fg-color);
            border-radius: 16px;
            cursor: pointer;
            font-size: 0.8em;
            transition: all 0.2s ease;
        `;
        
        button.addEventListener('click', () => {
            // Toggle active state
            document.querySelectorAll('.filter-button').forEach(btn => {
                btn.style.background = 'var(--md-default-bg-color)';
                btn.style.color = 'var(--md-default-fg-color)';
            });
            
            button.style.background = 'var(--md-accent-fg-color)';
            button.style.color = 'var(--md-default-bg-color)';
            
            // Filter games
            filterGames(filter);
        });
        
        filterContainer.appendChild(button);
    });
    
    // Insert filter container after search
    const contentArea = document.querySelector('.md-content__inner');
    if (contentArea) {
        contentArea.insertBefore(filterContainer, contentArea.firstChild);
    }
}

/**
 * Filter games by tag
 */
function filterGames(filterTag) {
    const gameCards = document.querySelectorAll('.game-card, [data-tags]');
    
    gameCards.forEach(card => {
        if (!filterTag) {
            card.style.display = '';
            return;
        }
        
        const tags = card.getAttribute('data-tags') || '';
        const tagsInCard = card.querySelector('.game-tags');
        
        let hasTag = tags.includes(filterTag);
        
        if (tagsInCard) {
            const tagElements = tagsInCard.querySelectorAll('.game-tag');
            hasTag = Array.from(tagElements).some(tag => 
                tag.textContent.toLowerCase().replace(/\s+/g, '-') === filterTag
            );
        }
        
        card.style.display = hasTag ? '' : 'none';
    });
}

/**
 * Initialize responsive tables
 */
function initResponsiveTables() {
    const tables = document.querySelectorAll('table');
    
    tables.forEach(table => {
        // Wrap tables in responsive container
        const wrapper = document.createElement('div');
        wrapper.className = 'table-wrapper';
        wrapper.style.cssText = `
            overflow-x: auto;
            margin: 1rem 0;
            border-radius: 4px;
            border: 1px solid var(--md-default-fg-color--lightest);
        `;
        
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
        
        // Add mobile-friendly headers
        const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent);
        const rows = table.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            cells.forEach((cell, index) => {
                if (headers[index]) {
                    cell.setAttribute('data-label', headers[index]);
                }
            });
        });
    });
    
    // Add mobile table styles
    const mobileStyles = `
        @media screen and (max-width: 600px) {
            .table-wrapper table,
            .table-wrapper thead,
            .table-wrapper tbody,
            .table-wrapper th,
            .table-wrapper td,
            .table-wrapper tr {
                display: block;
            }
            
            .table-wrapper thead tr {
                position: absolute;
                top: -9999px;
                left: -9999px;
            }
            
            .table-wrapper tr {
                border: 1px solid var(--md-default-fg-color--lightest);
                margin-bottom: 0.5rem;
                padding: 0.5rem;
                border-radius: 4px;
            }
            
            .table-wrapper td {
                border: none;
                border-bottom: 1px solid var(--md-default-fg-color--lightest);
                position: relative;
                padding-left: 50% !important;
                white-space: nowrap;
            }
            
            .table-wrapper td:before {
                content: attr(data-label) ": ";
                position: absolute;
                left: 6px;
                width: 45%;
                padding-right: 10px;
                white-space: nowrap;
                font-weight: bold;
                color: var(--md-primary-fg-color);
            }
        }
    `;
    
    if (!document.querySelector('#mobile-table-styles')) {
        const style = document.createElement('style');
        style.id = 'mobile-table-styles';
        style.textContent = mobileStyles;
        document.head.appendChild(style);
    }
}

/**
 * Utility function to create status indicators
 */
function createStatusIndicator(status) {
    const indicator = document.createElement('span');
    indicator.className = 'status-indicator';
    
    const dot = document.createElement('span');
    dot.className = `status-dot status-${status}`;
    
    const labels = {
        'complete': 'Complete',
        'progress': 'In Progress',
        'planned': 'Planned'
    };
    
    const label = document.createElement('span');
    label.textContent = labels[status] || status;
    
    indicator.appendChild(dot);
    indicator.appendChild(label);
    
    return indicator;
}

// Export utilities for use in other scripts
window.BoardGameListUtils = {
    createStatusIndicator,
    filterGames,
    initComplexityIndicators
};