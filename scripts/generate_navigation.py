"""
Dynamic Navigation Generator for BoardGameList
Automatically generates MkDocs navigation from game metadata
"""
import os
import yaml
import re
from pathlib import Path
from typing import Dict, List, Any
from collections import defaultdict
def extract_frontmatter(file_path: str) -> Dict[str, Any]:
    """Extract YAML frontmatter from markdown file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if match:
        try:
            return yaml.safe_load(match.group(1))
        except yaml.YAMLError:
            return {}
    return {}
def categorize_games(games_data: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """Categorize games by complexity and type"""
    categories = {
        'card_games': [],
        'deck_building': [],
        'strategy_light': [],
        'strategy_medium': [],
        'strategy_heavy': [],
        'cooperative': [],
        'area_control': [],
        'special_mechanics': []
    }
    for game in games_data:
        complexity = float(game.get('complexity', 2.5))
        tags = game.get('tags', [])
        mechanics = game.get('mechanics', [])
        if 'card-game' in tags and 'deck-building' not in tags:
            categories['card_games'].append(game)
        elif 'deck-building' in tags or 'deck_building' in mechanics:
            categories['deck_building'].append(game)
        elif 'cooperative' in tags or 'cooperative' in mechanics:
            categories['cooperative'].append(game)
        elif 'area-control' in tags or 'area_control' in mechanics:
            categories['area_control'].append(game)
        elif complexity <= 2.0:
            categories['strategy_light'].append(game)
        elif complexity <= 3.5:
            categories['strategy_medium'].append(game)
        elif complexity > 3.5:
            categories['strategy_heavy'].append(game)
        else:
            categories['special_mechanics'].append(game)
    return {k: v for k, v in categories.items() if v}
def generate_navigation_yaml(games_data: List[Dict[str, Any]]) -> str:
    """Generate navigation YAML structure"""
    categorized = categorize_games(games_data)
    nav_structure = [
        "
        "
        "",
        "nav:",
        "  - ホーム: index.md",
        "  - ゲーム詳細:"
    ]
    category_labels = {
        'card_games': 'カードゲーム',
        'deck_building': 'デッキ構築',
        'strategy_light': '戦略・経済 - 軽量級',
        'strategy_medium': '戦略・経済 - 中量級', 
        'strategy_heavy': '戦略・経済 - 重量級',
        'cooperative': '協力ゲーム',
        'area_control': 'エリア制圧・冒険',
        'special_mechanics': '特殊メカニクス'
    }
    for category, games in categorized.items():
        if not games:
            continue
        label = category_labels.get(category, category)
        nav_structure.append(f"    - {label}:")
        sorted_games = sorted(games, key=lambda x: x.get('title', ''))
        for game in sorted_games:
            title = game.get('title', 'Unknown')
            japanese_title = game.get('japanese_title', '')
            file_path = game.get('file_path', '')
            if japanese_title and japanese_title != title:
                display_name = f"{title} ({japanese_title})"
            else:
                display_name = title
            nav_structure.append(f"      - {display_name}: {file_path}")
    nav_structure.extend([
        "  - ゲーム一覧（アルファベット順）: games/index.md",
        "  - ゲーム分類:",
        "    - カードゲーム: categories/card-games.md",
        "    - デッキビルディング: categories/deck-building.md", 
        "    - 戦略ゲーム: categories/strategy.md",
        "    - ファミリーゲーム: categories/family.md",
        "    - 協力ゲーム: categories/cooperative.md",
        "    - エリア制圧: categories/area-control.md",
        "    - 特殊メカニクス: categories/special-mechanics.md",
        "  - 参考資料・リソース:",
        "    - ゲーム用語集: resources/glossary.md",
        "    - BGG統合機能: resources/bgg-integration.md",
        "    - クイックリファレンス: resources/quick-reference.md"
    ])
    return '\n'.join(nav_structure)
def main():
    """Main execution function"""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    games_dir = project_root / 'docs' / 'games'
    if not games_dir.exists():
        print(f"Error: Games directory not found at {games_dir}")
        return 1
    games_data = []
    for md_file in games_dir.glob('*.md'):
        if md_file.name == 'index.md':
            continue
        frontmatter = extract_frontmatter(str(md_file))
        if frontmatter:
            frontmatter['file_path'] = f"games/{md_file.name}"
            games_data.append(frontmatter)
    if not games_data:
        print("No game files with frontmatter found")
        return 1
    nav_yaml = generate_navigation_yaml(games_data)
    nav_file = project_root / 'nav' / 'games-navigation.yml'
    nav_file.parent.mkdir(exist_ok=True)
    with open(nav_file, 'w', encoding='utf-8') as f:
        f.write(nav_yaml)
    print(f"✅ Generated navigation for {len(games_data)} games")
    print(f"📁 Navigation file: {nav_file}")
    print("🔄 Run 'mkdocs serve' to test the new navigation structure")
    return 0
if __name__ == "__main__":
    exit(main())