# Researcher Agent Coordination - Batch 1 (Priority Games)

**Timestamp**: 2025-08-15T15:00:00Z
**Calling Agent**: Workflow Orchestrator
**Called Agent**: 探す人 (Researcher Agent)
**Trigger Condition**: BGG data collection required for first priority batch of 5 games
**Timing Requirement**: Research completion and delivery to Writer within 30 minutes (MANDATORY)
**Priority Level**: HIGH

## System Prompt for Researcher Agent

探す人 Agent, URGENT research request for new game documentation batch.

**Research Assignment**: First priority batch of 5 Board Game Arena games requiring comprehensive BGG integration and documentation research.

**Game Batch 1 (Family/Accessible Games)**:
1. **スシゴー (Sushi Go!)** - Fast sushi drafting card game
2. **スシゴーパーティー (Sushi Go Party!)** - Enhanced sushi drafting with multiple cards
3. **コンセプト (Concept)** - Communication game using icons and symbols
4. **バンディド (Bandido)** - Cooperative escape prevention game
5. **パンデミック (Pandemic)** - Disease control cooperative strategy game

**Research Requirements Per Game**:

### MANDATORY BGG DATA:
- **BGG ID verification**: Confirm correct BoardGameGeek ID numbers
- **Current ratings**: Average rating, number of ratings, BGG rank
- **Player information**: Accurate player count, age recommendations, play time
- **Complexity rating**: BGG weight score (complexity level)
- **Game mechanics**: Primary and secondary mechanisms
- **Designer/Publisher**: Original designers, publishers, publication years

### COMPREHENSIVE GAME INFORMATION:
- **Component lists**: Complete component inventory for each game
- **Setup instructions**: Basic setup overview (not full rules)
- **Victory conditions**: How players win the game
- **Game overview**: 2-3 sentence description of core gameplay
- **Strategic elements**: Key strategic considerations

### OFFICIAL RESOURCES:
- **Rule sources**: Official rulebook PDFs or reliable rule links
- **Publisher information**: Official publisher websites and resources
- **Community resources**: High-quality strategy guides or references
- **Board Game Arena availability**: Confirm online play availability

**Research Methodology**:
1. **BGG API Research**: Use BGG XML API for accurate current data
2. **Source Verification**: Cross-reference 2+ reliable sources for each data point
3. **Official Validation**: Prioritize publisher websites and official materials
4. **Community Verification**: Use BGG forums and community for additional insights

**Data Quality Standards**:
- **High Confidence**: Required for BGG ratings, player counts, official information
- **Medium Confidence**: Acceptable for strategy notes and community insights
- **Low Confidence**: Flag for additional research or exclusion from content

**Research Timeline**:
- **Start immediately**: Begin BGG data collection for all 5 games
- **Progress check**: 15 minutes - confirm BGG IDs and basic data acquired
- **Deep research**: 30 minutes - component lists and detailed information
- **Validation phase**: 45 minutes - cross-reference and verify all data
- **Package delivery**: 60 minutes - complete research package ready
- **MANDATORY DEADLINE**: Within 30 minutes of completion, deliver to Writer Agent

**Expected Deliverables**:

### Research Package Format (Per Game):
```yaml
game_name: "[Japanese Name] ([English Name])"
bgg_id: [verified_number]
bgg_rating: [current_average]
bgg_rank: [current_overall_rank]
players: "[min-max] players"
age: "[minimum_age]+"
playtime: "[duration] minutes"
complexity: [weight_score_out_of_5]
mechanics: ["mechanism1", "mechanism2", "mechanism3"]
designers: ["Designer Name"]
publishers: ["Publisher Name"]
year: [publication_year]
components: "Complete component list"
overview: "2-3 sentence game description"
victory: "Victory condition summary"
strategy: "Key strategic elements"
official_links:
  - rulebook: "URL to official rules"
  - publisher: "Publisher website"
  - bgg: "BGG game page"
bga_available: true/false
confidence_level: "High/Medium"
research_notes: "Any important notes or limitations"
```

**Coordination Context**:
This is the first batch of our 35-game expansion. Research quality for this batch sets the standard for all subsequent batches. All 5 games are family/accessible level, making them ideal for demonstrating research methodology.

**Success Criteria**:
- All 5 games have complete BGG data with high confidence
- Component lists and gameplay overviews are comprehensive
- Official rule sources identified and verified
- Research package formatted for immediate content creation use
- Zero conflicting or uncertain information without clear notation

**MANDATORY TIMING COMPLIANCE**:
- **Research scope assessment**: Complete within 15 minutes
- **IF scope expansion needed**: CALL Manager Agent within 2 hours
- **Research completion**: Within 4 hours maximum
- **File organization**: CALL 片付けする人 Agent if 5+ files created
- **Delivery to Writer**: WITHIN 30 minutes of research completion (MANDATORY)

**Special Instructions for Batch 1**:
- **Sushi Go vs Sushi Go Party**: Clearly distinguish between the base game and party edition
- **Pandemic editions**: Focus on base game; note if multiple editions exist
- **Japanese names**: Ensure accurate Japanese title transcription
- **BGG ID accuracy**: Critical - verify BGG IDs are correct (learned from previous link issues)

**Next Steps After Delivery**:
After delivering research package to Writer Agent:
1. Prepare for Batch 2 research (5 strategy games)
2. Monitor Writer Agent for any immediate clarification needs
3. Begin preliminary BGG lookups for Batch 2 while Writer creates content

**Timeline Expectation**: Complete research for all 5 games and deliver to Writer Agent by 16:00:00Z (within 60 minutes), with mandatory delivery within 30 minutes of completion.

Report research progress at 15-minute intervals and deliver complete research package to Writer Agent immediately upon completion.