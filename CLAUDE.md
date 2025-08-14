# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **board game rule book documentation system** built with MkDocs. It provides comprehensive rulebook documentation for board games, targeting easy discovery and reading. The project emphasizes beautiful, scalable architecture that serves multiple user types (humans, AI, LLM, Serena-MCP, developers, players).

## Development Commands

### MkDocs Operations
```bash
# Start development server (auto-reload on changes)
mkdocs serve

# Build static site for production
mkdocs build

# Deploy to GitHub Pages
mkdocs gh-deploy

# Show required packages for current configuration
mkdocs get-deps
```

### Content Validation
```bash
# Validate BGG integration and metadata
python scripts/bgg_updater.py

# Validate content completeness and format
python scripts/content_validator.py

# Build and validate search index
python scripts/build_search_index.py
```

## Project Architecture

### Core Requirements
- **6 Mandatory Games**: BOHNANZA, HackClad, イスタンブール選択と集中, FORT, Fixer, National Economy Mesena
- **Beautiful Architecture**: Zero tolerance for junk files (test_*, *_temp, *_updated, etc.)
- **Multi-User Support**: Architecture scales for humans, AI, LLM, Serena-MCP, developers, players
- **All-in-One Documentation**: Each game's complete rulebook on a single MKDocs page

### Content Organization
```
docs/
├── games/                       # Individual game documentation
│   ├── bohnanza.md             # Bean trading card game
│   ├── hackclad.md             # Witch-themed deck building
│   ├── istanbul-choose-write.md # Strategic merchant variant
│   ├── fort.md                 # Kids fort-building deck-builder
│   ├── fixer.md                # Political trick-taking
│   └── national-economy-mesena.md # Cultural economy worker placement
├── categories/                  # Genre-based organization
├── resources/                   # BGG integration, glossary, quick reference
├── javascripts/                 # BGG integration and custom interactions
└── stylesheets/                 # Board game specific styling
```

### Agent-Based Development System
Located in `.claude/agents/`, this project uses a sophisticated multi-agent architecture:

#### Core Agents
1. **Manager Agent** (`manager.md`) - Central orchestrator, handles all coordination
2. **Architect Agent** (`architector.md`) - System design, MkDocs structure, scalability
3. **Writer Agent** (`writer.md`) - Content creation, game documentation
4. **Cleaner Agent** (`cleaner.md`) - File organization, prevents junk file accumulation
5. **Researcher Agent** (`researcher.md`) - BGG integration, fact checking, data collection

#### Agent Communication Requirements
**Critical Timing Conditions** (must be followed exactly):
- **Architect → Cleaner**: WITHIN 5 minutes of any directory structure changes (MANDATORY)
- **Writer → Researcher**: WITHIN 10 minutes of new game assignment (MANDATORY before writing)
- **Researcher → Writer**: WITHIN 30 minutes of research completion (MANDATORY delivery)
- **All cleanup calls**: Within 15 minutes of file accumulation

#### Agent Configuration
- **`agent_config.yaml`**: Complete agent definitions and communication matrix
- **`orchestrator.md`**: Detailed workflow orchestration patterns
- **`communication_protocols.md`**: Exact timing requirements and system prompts

### Game Documentation Template
Each game follows standardized structure with YAML frontmatter:
```yaml
---
title: "Game Name"
japanese_title: "日本語タイトル"
players: "2-4"
playtime: "30-45 min"
complexity: 2.5
bgg_id: 123456
bgg_rating: 7.2
tags: [card-game, deck-building]
ownership: true
bga_available: true
---
```

Required sections: Quick Reference, Game Overview, Setup, How to Play, Components, Winning, Quick Reference Sheet, External Links.

## Architecture Principles

### Beautiful Architecture Requirements
- **Zero Junk Files**: Never create test_*, *_temp, *_updated, scriptA_updated files
- **Clean Organization**: All files follow naming conventions (kebab-case for docs)
- **Scalable Structure**: Support growth from 6 games to 100+ games
- **Agent Coordination**: All major changes must follow agent communication protocols

### Quality Standards
- **BGG Integration**: All games include current BoardGameGeek ratings and metadata
- **Mobile-First**: Responsive design optimized for reading during gameplay
- **Comprehensive Content**: Each game includes complete rules, setup, components, and strategy
- **Cross-References**: Games link to related mechanics, categories, and similar games

### Development Workflow
1. **Always start with Manager Agent** for project coordination
2. **Follow mandatory timing requirements** for agent communication
3. **Use proper system prompts** with complete context for all agent calls
4. **Maintain beautiful architecture** through coordinated cleanup operations
5. **Validate content completeness** before considering tasks complete

## Technical Details

### MkDocs Configuration
- **Theme**: Material theme with board game specific customizations
- **Language**: Bilingual Japanese/English support
- **Plugins**: Search optimization, git revision dates, Japanese language support
- **Extensions**: Admonition, tabbed content, task lists for interactive checklists

### BGG Integration
- Automated pulling of game ratings, player counts, complexity scores
- Daily cache updates to respect API limits
- Fallback system for manual data entry when API unavailable

### Content Management
This is a **documentation-only project** with no executable code. Changes to `.md` files in `docs/` are immediately reflected via `mkdocs serve`. The agent architecture ensures coordinated content creation and maintenance while preserving beautiful architecture standards.

### File Organization Standards
- **Game files**: `kebab-case.md` format (e.g., `national-economy-mesena.md`)
- **Directory names**: `kebab-case` format
- **Asset files**: Organized in `docs/images/`, `docs/javascripts/`, `docs/stylesheets/`
- **Agent files**: Located in `.claude/agents/` with complete communication protocols