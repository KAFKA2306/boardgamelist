# Agent Usage Guide

## Quick Start

### 1. Initialize Project with Manager Agent
```yaml
agent: manager
task: "Initialize BoardGameList project foundation"
context: "Starting with 6 core games requirement"
priority: "high"
timeline: "immediate"
```

**System Prompt for Manager**:
```markdown
Manager Agent, initializing BoardGameList project foundation.

Project Requirements:
- 6 core games documentation (BOHNANZA, HackClad, イスタンブール選択と集中, FORT, Fixer, National Economy Mesena)
- Beautiful, scalable architecture
- Support for humans, AI, LLM, Serena-MCP, developers, players
- Zero junk files tolerance
- MkDocs with Material theme

Initial Tasks:
1. Set up project structure through Architect Agent
2. Begin first game documentation through Writer Agent
3. Establish cleanup and research workflows

Timeline: Foundation phase completion within 2 weeks
Success Criteria: Clean architecture with first game documented

Call Architect Agent within 30 minutes for initial structure setup.
```

### 2. Essential Workflow Patterns

#### New Game Documentation Workflow
```yaml
sequence:
  1. "Manager → Researcher: Gather game data"
  2. "Researcher → Writer: Deliver research package"  
  3. "Writer → Cleaner: Clean up drafts and organize"
  4. "Cleaner → Manager: Report completion"

timing_requirements:
  manager_to_researcher: "within_20_minutes"
  researcher_to_writer: "within_30_minutes_of_completion"
  writer_to_cleaner: "within_5_minutes_of_content_final"
  cleaner_to_manager: "within_15_minutes_of_cleanup"
```

#### Architecture Change Workflow  
```yaml
sequence:
  1. "Manager → Architect: Define structural changes"
  2. "Architect → Cleaner: MANDATORY structure validation"
  3. "Cleaner → Architect: Report validation results"
  4. "Architect → Manager: Confirm completion"

critical_timing:
  architect_to_cleaner: "WITHIN_5_MINUTES (MANDATORY)"
  cleaner_response: "within_10_minutes_maximum"
```

## Detailed Usage Examples

### Example 1: Adding BOHNANZA Game Documentation

#### Step 1: Manager Initiates Process
```markdown
Manager Agent initiating BOHNANZA documentation.

Game Details:
- Name: BOHNANZA (ボーナンザ)
- Priority: HIGH (Core 6 games requirement)
- Target Users: All user types (humans, players, developers)
- Content Type: Complete game documentation

Research Requirements:
- BGG data and ratings
- Official rule summaries
- Component lists and setup
- Strategy guides and tips
- Community feedback

Timeline: Documentation complete within 1 week
Standards: Mobile-responsive, bilingual Japanese/English support

MANDATORY NEXT: Call Researcher Agent within 20 minutes for data collection.
```

#### Step 2: Manager → Researcher Call (Within 20 minutes)
```markdown
Researcher Agent, HIGH priority research request for BOHNANZA documentation.

Research Mission:
- Target: BOHNANZA (BGG ID: 11)
- Scope: Complete data package for content creation
- Priority: HIGH - Core game requirement

Information Requirements:
MANDATORY DATA:
- BGG ID: 11, current ratings and rankings
- Official player count: 2-7, age: 13+, time: 45 minutes
- Complete component lists (154 bean cards, types, values)
- Official rule summaries and setup instructions

ADDITIONAL RESEARCH:
- Designer: Uwe Rosenberg, Publisher: AMIGO
- Community reviews and strategy guides
- Related games and mechanisms
- Rule clarifications and FAQ

Validation Requirements:
- Cross-reference multiple sources
- Verify current BGG data (within 48 hours)
- Confirm official publisher information

Timeline: Complete research package needed within 2 hours
Deliverable Format: Structured JSON with confidence levels

MANDATORY: Call Writer Agent within 30 minutes of research completion.
```

#### Step 3: Researcher → Writer Call (Within 30 minutes of completion)
```markdown
Writer Agent, BOHNANZA research package completed and ready for content creation.

Research Summary:
- BGG ID: 11, Rating: 6.9/10, Rank: #400
- Players: 2-7 (best 3-5), Age: 13+, Time: 45 minutes
- Complexity: 1.9/5 (Light-Medium)
- Designer: Uwe Rosenberg, Publisher: AMIGO, Year: 1997

Research Package Contents:
- BGG Data: Complete with current ratings and statistics
- Official Rules: Publisher PDF and community summaries
- Component Information: 154 cards, 8 bean types, values
- Community Feedback: Strategy guides and player tips

Data Confidence: HIGH (verified from multiple official sources)
Research Location: /research/bohnanza_data_package.json

Content Requirements:
- Use standard game template
- Include all sections: overview, setup, gameplay, strategy
- Add Japanese translations for key terms
- Cross-reference related trading games
- Mobile-responsive formatting required

MANDATORY SEQUENCE:
1. Begin content creation immediately
2. Within 30 minutes of draft: Call Researcher for fact-checking
3. Within 5 minutes of final content: Call Cleaner for organization

Timeline: Content creation complete within 6 hours maximum.
```

#### Step 4: Writer → Researcher Fact-Check Call (Within 30 minutes of draft)
```markdown
Researcher Agent, fact-checking required for BOHNANZA draft content.

Content Status: First draft completed
Location: /docs/games/bohnanza_draft.md
Word Count: ~3,500 words

Fact-Check Requirements:
- Verify all BGG data is current (ratings, rankings, statistics)
- Confirm rule accuracy against official sources
- Validate component lists and setup instructions
- Check player count and time estimates are correct
- Verify all external links work correctly

Special Attention Areas:
- Bean card values and quantities
- Trading rules and restrictions
- Victory conditions and scoring
- Hand management constraints

Timeline: Fact-check verification needed within 1 hour
Priority: HIGH - must be accurate before finalization

Report back with verification status and any corrections needed.
```

#### Step 5: Writer → Cleaner Call (Within 5 minutes of content final)
```markdown
Cleaner Agent, BOHNANZA documentation completed - immediate cleanup required.

Content Completion Status:
- Final File: /docs/games/bohnanza.md
- Draft Files: bohnanza_draft.md, bohnanza_v1.md, bohnanza_temp.md
- Working Assets: component_images/, rule_summaries/
- Research Files: bohnanza_research.json, bgg_data.json

Cleanup Tasks Required:
- Remove ALL draft and temporary files
- Organize final content in proper /docs/games/ directory
- Validate file naming convention (kebab-case)
- Clean up research workspace
- Verify proper frontmatter format

File Protection:
- Preserve: /docs/games/bohnanza.md (final content)
- Remove: All files with _draft, _temp, _v1 suffixes
- Archive: Research data to /research/completed/

MANDATORY: Cleanup must complete before content is considered final.
Timeline: Complete cleanup within 20 minutes maximum.

Call Manager Agent within 15 minutes of cleanup completion.
```

#### Step 6: Cleaner → Manager Call (Within 15 minutes of cleanup)
```markdown
Manager Agent, BOHNANZA documentation cleanup completed successfully.

Cleanup Results:
- Files Removed: 5 draft files, 3 temporary files, 2 research backups
- Files Organized: Final content in /docs/games/bohnanza.md
- Directory Structure: Validated and compliant
- Naming Conventions: 100% compliant (kebab-case confirmed)

Content Status:
- Final Documentation: /docs/games/bohnanza.md (4,200 words)
- Quality Validation: All sections complete, mobile-responsive
- Cross-References: Links to related trading games added
- Frontmatter: Complete with BGG data and metadata

Archive Status:
- Research Materials: Archived to /research/completed/bohnanza/
- Working Files: All temporary files removed
- Asset Organization: Images organized in /docs/images/games/

Project Status: 1/6 core games completed
Next Recommendation: Begin HackClad documentation
Estimated Timeline: 5 games remaining, 1 week per game

Ready for next game assignment or project milestone review.
```

### Example 2: Emergency Cleanup Scenario

#### Junk File Explosion Detected
```markdown
EMERGENCY: Cleaner Agent detecting critical junk file accumulation.

Crisis Details:
- Junk Files Found: 73 files (test_*, *_temp, *_updated, draft_*)
- Location: Throughout project directory structure  
- Risk Level: HIGH - threatens beautiful architecture requirement
- Detection Time: 2025-08-14T15:30:00Z

Immediate Actions Taken:
- Halted all other operations
- Isolated affected directories
- Prevented further file creation

EMERGENCY ESCALATION: Calling Manager Agent immediately.

Manager Agent, EMERGENCY cleanup required for junk file explosion.

Crisis Summary: 73 junk files threaten project architecture
Locations Affected: /docs/, /scripts/, /research/, /temp/
File Types: test_gwrw, test_frwekagjraji, scriptA_updated, etc.

Immediate Manager Decision Required:
1. Authorization for bulk file removal
2. Priority override for emergency cleanup
3. Post-crisis process improvements

Timeline: Emergency cleanup needs immediate authorization
Risk: Project architecture integrity at stake without immediate action

Recommend immediate cleanup authorization with full audit trail.
```

## Advanced Usage Patterns

### Parallel Agent Coordination
```yaml
concurrent_workflows:
  research_and_architecture:
    - "Researcher gathers data for Game A"
    - "Architect designs structure for new game category"
    - "Sync point: Both complete before Writer begins"
    
  content_and_organization:
    - "Writer creates content for Game B"
    - "Cleaner organizes completed Game A files"
    - "Sync point: Cleaner validates Writer's new content"
```

### Quality Gate Enforcement
```yaml
quality_checkpoints:
  pre_content_creation:
    - "Research must be HIGH confidence before writing begins"
    - "Architecture must validate structure before content placement"
    
  pre_finalization:
    - "All facts must be verified before content marked final"
    - "All junk files must be removed before content considered complete"
    
  pre_project_milestone:
    - "All games must pass quality review"
    - "Architecture must confirm scalability standards met"
```

## Troubleshooting Common Issues

### Communication Failures
```yaml
symptoms:
  - "Agent not responding within timing requirements"
  - "System prompts not including required context"
  - "Mandatory calls being skipped"

solutions:
  response_timeout:
    - "Check agent availability and resource conflicts"
    - "Escalate to Manager if timeout exceeds SLA"
    - "Use emergency protocols for critical path blocking"
    
  missing_context:
    - "Verify all system prompt requirements included"
    - "Check message format compliance"
    - "Ensure success criteria are measurable"
    
  skipped_calls:
    - "Review mandatory timing requirements"
    - "Check for blocking dependencies"
    - "Escalate to Manager for protocol violation"
```

### Quality Issues
```yaml
architectural_problems:
  junk_files_accumulating:
    solution: "Immediate Cleaner Agent activation with emergency priority"
    
  naming_inconsistencies:
    solution: "Cleaner validation followed by Architect standards review"
    
  structure_violations:
    solution: "Architect assessment with mandatory Cleaner follow-up"

content_problems:
  factual_inaccuracies:
    solution: "Researcher verification followed by Writer correction"
    
  template_inconsistencies:
    solution: "Architect template review followed by Writer updates"
    
  missing_cross_references:
    solution: "Writer content audit with Researcher support"
```

## Performance Optimization

### Agent Response Time Optimization
```yaml
response_time_targets:
  emergency_response: "1_minute_maximum"
  urgent_response: "15_minutes_maximum"
  standard_response: "1_hour_maximum"
  research_response: "4_hours_maximum"

optimization_strategies:
  parallel_processing: "Use concurrent workflows where possible"
  resource_pre_allocation: "Pre-stage common resources"
  communication_batching: "Group related requests efficiently"
  priority_queuing: "Process high-priority requests first"
```

### Quality Assurance Optimization
```yaml
quality_gates:
  automated_checks:
    - "File naming validation"
    - "Directory structure compliance"
    - "Template format verification"
    - "Link integrity checking"
    
  manual_validation:
    - "Content accuracy verification"
    - "Architecture beauty assessment"
    - "User experience evaluation"
    - "Scalability testing"
```

---

**Usage Status**: Complete guide with examples and troubleshooting
**Success Criteria**: All users can successfully coordinate agents for beautiful architecture
**Support**: Refer to individual agent documentation for detailed specifications