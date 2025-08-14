# Inter-Agent Communication Protocols

## Overview
This document defines the precise communication protocols for the BoardGameList agent system, ensuring clear timing conditions and specific system prompts for each agent-to-agent interaction as required by the project specifications.

## Communication Protocol Standards

### Message Format Specification
```yaml
standard_agent_call:
  timestamp: "ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)"
  calling_agent: "agent_identifier"
  called_agent: "target_agent_identifier"
  trigger_condition: "specific_condition_that_initiated_call"
  timing_requirement: "exactly_when_call_must_be_made"
  priority_level: "emergency|urgent|high|medium|low"
  context_data: "current_project_state_information"
  specific_request: "exact_deliverable_or_action_needed"
  success_criteria: "measurable_outcomes_for_success"
  timeout_duration: "maximum_time_before_escalation"
  callback_required: "yes|no"
  system_prompt: "exact_text_to_send_to_called_agent"
```

### Response Format Specification
```yaml
standard_agent_response:
  timestamp: "ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)"
  responding_agent: "agent_identifier"
  request_reference: "original_request_timestamp_and_id"
  response_status: "acknowledged|in_progress|completed|blocked|failed"
  completion_percentage: "0-100_if_in_progress"
  deliverables_completed: "list_of_finished_work"
  issues_encountered: "problems_or_limitations_found"
  estimated_completion: "time_remaining_if_not_complete"
  escalation_needed: "yes|no_with_reason_if_yes"
  next_agent_recommendation: "agent_to_call_next_if_any"
  callback_system_prompt: "exact_text_for_next_agent_call"
```

## Specific Agent Communication Protocols

### Manager Agent Communication Matrix

#### Manager → Architect Agent
```yaml
trigger_1_project_structure_change:
  timing: "IMMEDIATELY when structural changes needed"
  max_delay: "30 minutes from identification"
  system_prompt: |
    "Architect Agent, you are being called by Manager for structural architecture decisions.
    
    Current Project State: [PROJECT_STATUS]
    Structural Need: [SPECIFIC_REQUIREMENT]
    Impact Scope: [AFFECTED_COMPONENTS]
    Timeline: [PROJECT_TIMELINE]
    
    Your Task: Design architectural solution for [SPECIFIC_ISSUE]
    
    Constraints:
    - Must maintain MkDocs compatibility
    - Preserve existing content integrity
    - Support scalability to 100+ games
    - Maintain beautiful architecture standards
    
    Success Criteria:
    - [MEASURABLE_OUTCOME_1]
    - [MEASURABLE_OUTCOME_2]
    
    MANDATORY: After completion, call 片付けする人 Agent within 5 minutes for structure validation, then call Manager back with results and next step recommendations."

trigger_2_performance_issues:
  timing: "WITHIN 1 hour of performance problem identification"
  system_prompt: |
    "Architect Agent, URGENT performance issue requires your immediate attention.
    
    Performance Problem: [SPECIFIC_ISSUE]
    Current Metrics: [PERFORMANCE_DATA]
    Acceptable Standards: [TARGET_METRICS]
    
    Your Task: Diagnose and propose architectural solution
    
    Timeline: Solution proposal needed within 4 hours
    
    MANDATORY: Before implementing changes, call Manager back for approval. After implementation, IMMEDIATELY call 片付けする人 Agent for cleanup."
```

#### Manager → Writer Agent
```yaml
trigger_1_content_creation_needed:
  timing: "WITHIN 30 minutes of content assignment"
  system_prompt: |
    "Writer Agent, you are being assigned new content creation work.
    
    Content Assignment: [GAME_NAME] documentation
    Priority Level: [HIGH|MEDIUM|LOW]
    Deadline: [SPECIFIC_DATE_TIME]
    Target Audience: [PRIMARY_USER_TYPES]
    
    Required Sections:
    - Game overview with BGG integration
    - Complete setup instructions
    - Detailed gameplay rules
    - Strategy tips and quick reference
    
    Standards Required:
    - Mobile-responsive formatting
    - Japanese/English bilingual support
    - Cross-references to related games
    - Component lists and visual aids
    
    MANDATORY SEQUENCE:
    1. WITHIN 10 MINUTES: Call 探す人 Agent for comprehensive research
    2. After research received: Begin content creation
    3. WITHIN 30 minutes of draft completion: Call 探す人 Agent for fact-checking
    4. WITHIN 5 minutes of final content: Call 片付けする人 Agent for cleanup
    5. WITHIN 30 minutes of cleanup: Call Manager back with completion report"
```

#### Manager → 片付けする人 Agent
```yaml
trigger_1_scheduled_maintenance:
  timing: "Every Sunday at 02:00 UTC"
  system_prompt: |
    "片付けする人 Agent, initiating weekly maintenance cleanup.
    
    Maintenance Scope: Project-wide cleanup and organization
    Focus Areas:
    - Remove all junk files (test_*, *_temp, *_backup, draft_*)
    - Validate naming conventions
    - Organize file structure
    - Clean up empty directories
    
    Protection Rules:
    - NEVER delete files with valid frontmatter
    - Preserve content files in /docs/games/
    - Backup before bulk operations
    
    Expected Results:
    - Zero junk files remaining
    - 100% naming convention compliance
    - Clean directory structure
    
    MANDATORY: If structural issues discovered, IMMEDIATELY call Architect Agent. After cleanup completion, call Manager back within 15 minutes with summary report."

trigger_2_junk_files_detected:
  timing: "WITHIN 15 minutes of junk file detection"
  system_prompt: |
    "片付けする人 Agent, URGENT junk file cleanup needed.
    
    Junk Files Detected: [FILE_LIST]
    Detection Location: [DIRECTORY_PATH]
    Estimated Count: [NUMBER_OF_FILES]
    
    Immediate Action Required:
    - Assess cleanup scope
    - Remove junk files safely
    - Validate no content loss
    
    EMERGENCY PROTOCOL: If 50+ junk files found, IMMEDIATELY call Manager back before proceeding."
```

### Architect Agent Communication Matrix

#### Architect → 片付けする人 Agent
```yaml
trigger_1_directory_structure_modified:
  timing: "WITHIN 5 minutes of any directory changes"
  mandatory: true
  system_prompt: |
    "片付けする人 Agent, IMMEDIATE action required following directory structure changes.
    
    Changes Made:
    - Directories created: [NEW_DIRECTORIES]
    - Directories modified: [MODIFIED_DIRECTORIES]
    - Files affected: [FILE_COUNT]
    
    Validation Needed:
    - Verify all files in correct locations
    - Check naming convention compliance
    - Remove any temporary directories created
    - Validate navigation structure integrity
    
    CRITICAL: This is an MANDATORY call - structure changes CANNOT proceed without cleanup validation.
    
    Report back within 10 minutes with validation status."

trigger_2_major_architectural_changes:
  timing: "IMMEDIATELY after completing architectural changes"
  system_prompt: |
    "片付けする人 Agent, major architectural changes completed - cleanup and organization needed.
    
    Architectural Changes:
    - [CHANGE_SUMMARY]
    - Files affected: [FILE_LIST]
    - Configuration updates: [CONFIG_CHANGES]
    
    Cleanup Requirements:
    - Remove build artifacts and temporary files
    - Organize any scattered files from restructuring
    - Validate all files follow new structure
    - Clean up any orphaned references
    
    Quality Gate: This cleanup MUST be completed before architecture changes are considered final."
```

#### Architect → Writer Agent
```yaml
trigger_1_new_templates_created:
  timing: "WITHIN 30 minutes of template completion"
  system_prompt: |
    "Writer Agent, new content template ready for validation and example creation.
    
    Template Details:
    - Template Name: [TEMPLATE_NAME]
    - Location: [TEMPLATE_PATH]
    - Purpose: [TEMPLATE_USE_CASE]
    - Sections: [SECTION_LIST]
    
    Your Task:
    - Review template for usability
    - Create example content using template
    - Identify any template limitations or improvements needed
    - Validate mobile-responsive formatting
    
    Test Game: Use [SPECIFIC_GAME] as template test case
    
    Timeline: Template validation needed within 2 hours
    
    Report back with template assessment and any improvement suggestions."
```

### Writer Agent Communication Matrix

#### Writer → 探す人 Agent
```yaml
trigger_1_new_game_assignment:
  timing: "WITHIN 10 minutes of receiving assignment (MANDATORY)"
  system_prompt: |
    "探す人 Agent, URGENT research request for new game documentation.
    
    Game: [GAME_NAME]
    Priority: HIGH - Content creation blocked until research complete
    Deadline: Research needed within 2 hours to maintain writing schedule
    
    Research Requirements:
    MANDATORY DATA:
    - BGG ID and current ratings
    - Official player count and age recommendations
    - Accurate play time estimates
    - Complete component lists
    - Official rule summaries
    
    ADDITIONAL RESEARCH:
    - Designer and publisher information
    - Community reviews and feedback
    - Strategy guides and tips
    - Related games and mechanics
    - Official errata or rule updates
    
    CRITICAL: Content creation cannot begin without this research. Deliver complete research package within 2 hours maximum."

trigger_2_information_gap_discovered:
  timing: "IMMEDIATELY when gap identified (pause writing)"
  system_prompt: |
    "探す人 Agent, EMERGENCY research request - writing paused due to information gap.
    
    Current Game: [GAME_NAME]
    Writing Status: PAUSED at section [SECTION_NAME]
    
    Missing Information: [SPECIFIC_GAP]
    Current Sources: [EXISTING_SOURCES]
    Conflict/Issue: [PROBLEM_DESCRIPTION]
    
    URGENT ACTION NEEDED:
    - Verify missing information
    - Resolve conflicting sources
    - Provide definitive accurate data
    
    Timeline: URGENT - need resolution within 1 hour to resume writing"

trigger_3_fact_checking_needed:
  timing: "WITHIN 30 minutes of draft completion"
  system_prompt: |
    "探す人 Agent, fact-checking required for completed draft content.
    
    Content: [GAME_NAME] documentation draft
    Location: [FILE_PATH]
    Word Count: [COUNT]
    
    Fact-Check Requirements:
    - Verify all BGG data is current (within 48 hours)
    - Confirm rule accuracy against official sources
    - Validate component lists and setup instructions
    - Check player count and time estimates
    - Verify all external links work
    
    MANDATORY: All facts must be verified before content finalization. Report back within 1 hour with verification status."
```

#### Writer → 片付けする人 Agent
```yaml
trigger_1_multiple_drafts_created:
  timing: "WITHIN 15 minutes of creating 3+ draft files"
  system_prompt: |
    "片付けする人 Agent, draft file cleanup needed urgently.
    
    Situation: Multiple draft files created for [GAME_NAME] documentation
    Files: [DRAFT_FILE_LIST]
    Working Directory: [PATH]
    
    Cleanup Needed:
    - Consolidate to single working draft
    - Remove outdated draft versions
    - Keep only the latest complete version
    - Organize supporting files
    
    PROTECTION: Preserve the most recent complete draft with all sections filled.
    
    Timeline: Cleanup within 20 minutes to prevent junk file accumulation."

trigger_2_content_completion:
  timing: "WITHIN 5 minutes of marking content final"
  system_prompt: |
    "片付けする人 Agent, content completion cleanup required IMMEDIATELY.
    
    Completed Content: [GAME_NAME] documentation
    Final File: [FINAL_FILE_PATH]
    Working Files: [WORKING_FILE_LIST]
    
    Final Cleanup Tasks:
    - Remove ALL draft and working files
    - Organize final content in proper directory
    - Validate file naming convention
    - Clean up any temporary assets
    - Verify proper frontmatter format
    
    MANDATORY: Content is not considered complete until cleanup finished and validated."
```

### Cleanup Agent Communication Matrix

#### 片付けする人 → Architect Agent
```yaml
trigger_1_structural_issues_discovered:
  timing: "IMMEDIATELY when problem identified (pause cleanup)"
  system_prompt: |
    "Architect Agent, URGENT structural issue discovered during cleanup - cleanup PAUSED.
    
    Problem Identified: [SPECIFIC_STRUCTURAL_ISSUE]
    Location: [AFFECTED_PATH]
    Impact Scope: [AFFECTED_AREAS]
    Current Cleanup Status: PAUSED
    
    Structural Issue Details:
    [DETAILED_PROBLEM_DESCRIPTION]
    
    URGENT DECISION NEEDED:
    - How should files be properly organized?
    - What is the correct directory structure?
    - Are there configuration files that need updating?
    
    Cleanup cannot proceed until architectural guidance received. Need response within 30 minutes."

trigger_2_major_reorganization_completed:
  timing: "WITHIN 15 minutes of completing major reorganization"
  system_prompt: |
    "Architect Agent, major directory reorganization completed - validation needed.
    
    Reorganization Summary:
    - Files moved: [MOVED_FILE_COUNT]
    - Directories restructured: [DIRECTORY_CHANGES]
    - Configuration affected: [CONFIG_IMPACT]
    
    Changes Made: [DETAILED_CHANGE_LIST]
    
    Validation Needed:
    - Confirm new structure meets architectural standards
    - Verify mkdocs.yml reflects structure changes
    - Check that navigation still works correctly
    - Update any hardcoded paths in configuration
    
    Please validate within 30 minutes and report any needed adjustments."
```

### Search Agent Communication Matrix

#### 探す人 → Writer Agent
```yaml
trigger_1_research_completed:
  timing: "WITHIN 30 minutes of research completion"
  system_prompt: |
    "Writer Agent, research package completed and ready for content creation.
    
    Research Target: [GAME_NAME]
    Research Duration: [TIME_SPENT]
    Confidence Level: [HIGH|MEDIUM|LOW]
    
    Research Package Contents:
    - BGG Data: [SUMMARY]
    - Official Rules: [RULE_SOURCES]
    - Component Information: [COMPONENT_DETAILS]
    - Community Feedback: [REVIEW_SUMMARY]
    
    Data Location: [RESEARCH_FILE_PATH]
    
    IMPORTANT NOTES:
    - [ANY_LIMITATIONS_OR_GAPS]
    - [CONFLICTING_INFORMATION_ALERTS]
    - [SPECIAL_CONSIDERATIONS]
    
    Ready for content creation. All research validated and organized for immediate use."

trigger_2_content_gaps_discovered:
  timing: "WITHIN 1 hour of discovering gaps"
  system_prompt: |
    "Writer Agent, research reveals gaps in existing content requiring updates.
    
    Affected Game: [GAME_NAME]
    Content Location: [EXISTING_CONTENT_PATH]
    
    Discovered Gaps:
    - [MISSING_INFORMATION_1]
    - [MISSING_INFORMATION_2]
    - [OUTDATED_INFORMATION]
    
    Updated Information Available:
    [NEW_RESEARCH_DATA]
    
    Recommendation: Update existing content to include new information and correct any outdated details.
    
    Priority: [HIGH|MEDIUM] based on information importance"
```

## Timing Enforcement and Escalation

### Automatic Escalation Rules
```yaml
response_timeout_escalation:
  15_minute_timeout:
    agents: ["cleanup", "search"]
    escalate_to: "manager"
    action: "automatic_priority_increase"

  30_minute_timeout:
    agents: ["writer", "architect"]
    escalate_to: "manager"
    action: "resource_conflict_check"

  1_hour_timeout:
    agents: ["all"]
    escalate_to: "manager"
    action: "emergency_intervention"

dependency_blocking_escalation:
  immediate_escalation:
    trigger: "critical_path_blocked"
    escalate_to: "manager"
    action: "priority_override_consideration"

  resource_conflict:
    trigger: "multiple_agents_need_same_resource"
    escalate_to: "manager"
    action: "resource_allocation_arbitration"
```

### Emergency Communication Protocols
```yaml
emergency_override:
  all_agents_can_trigger: true
  bypass_normal_timing: true
  immediate_manager_notification: true
  priority_preemption: "all_other_tasks_paused"

crisis_communication:
  broadcast_mode: "manager_sends_to_all_agents"
  acknowledgment_required: "all_agents_must_confirm_receipt"
  coordination_mode: "centralized_through_manager"
  status_reporting: "every_15_minutes_until_resolved"
```

## Communication Quality Assurance

### Message Validation Rules
```yaml
required_fields_validation:
  - timestamp: "must_be_iso_8601_format"
  - agent_identification: "valid_agent_names_only"
  - trigger_condition: "must_match_defined_triggers"
  - timing_requirement: "must_specify_exact_timing"
  - system_prompt: "must_include_complete_prompt_text"

format_compliance:
  - yaml_structure: "messages_must_parse_correctly"
  - field_completeness: "all_required_fields_present"
  - prompt_specificity: "system_prompts_include_all_context"
  - success_criteria: "measurable_outcomes_defined"
```

### Communication Monitoring
```yaml
message_tracking:
  - log_all_agent_communications: true
  - track_response_times: true
  - monitor_escalation_frequency: true
  - quality_score_communications: true

performance_metrics:
  - average_response_time: "per_agent_and_overall"
  - escalation_rate: "percentage_requiring_manager_intervention"
  - communication_clarity: "successful_handoff_rate"
  - timing_compliance: "adherence_to_specified_timing"
```

---

**Communication Protocol Status**: Fully defined with specific timing and system prompts
**Next Phase**: Deploy agents with communication monitoring active
**Success Criteria**: 95%+ successful agent communications with proper timing compliance