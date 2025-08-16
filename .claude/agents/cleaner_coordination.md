# Cleaner Agent Coordination Call - MANDATORY

**Timestamp**: 2025-08-15T14:47:00Z
**Calling Agent**: Workflow Orchestrator (via Architecture Assessment)
**Called Agent**: File Cleaner (片付けする人)
**Trigger Condition**: Directory structure modifications planned for 35-game scaling
**Timing Requirement**: WITHIN 5 MINUTES of architectural assessment (MANDATORY)
**Priority Level**: URGENT

## System Prompt for File Cleaner Agent

File Cleaner Agent, IMMEDIATE action required following directory structure assessment for large-scale expansion.

**Situation**: Architecture assessment completed for scaling from 6 to 41 games. Major navigation and category structure changes planned requiring immediate cleanup validation and preparation.

**Changes Assessed**:
- Navigation restructuring in mkdocs.yml from 3 to 8+ categories
- New category directory structure required: docs/categories/ with 10+ new files
- Game reorganization across enhanced category system
- Existing 6 games will be recategorized into new structure

**Current File Inventory Check Required**:
1. **Existing Game Files**: 6 files in docs/games/ (all must be preserved)
2. **Category Files**: Current docs/categories/ has 4 files (expansion to 10+ planned)
3. **Resource Files**: docs/resources/ structure (maintain current organization)
4. **Agent Files**: .claude/agents/ directory (validate organization of coordination files)

**Immediate Cleanup Tasks**:

### Priority 1: Junk File Scan
- Scan entire project for junk files (test_*, *_temp, *_updated patterns)
- Identify any temporary coordination files that can be cleaned
- Remove any stale backup files or development artifacts
- Verify no build artifacts are cluttering the workspace

### Priority 2: Structure Validation
- Confirm docs/games/ directory is clean and ready for 35 new files
- Validate docs/categories/ is prepared for new category structure
- Check docs/resources/ organization remains optimal
- Ensure .claude/agents/ coordination files are properly organized

### Priority 3: Naming Convention Audit
- Verify all existing files follow kebab-case convention
- Confirm directory structure supports planned expansion
- Validate no files will conflict with new 35-game additions
- Check for any orphaned files that need proper organization

### Priority 4: Architecture Preparation
- Prepare file structure for batched addition of 35 games
- Ensure category directory is ready for 10+ new category files
- Validate mkdocs.yml structure supports planned navigation changes
- Confirm BGG integration assets are properly organized

**Protection Requirements**:
- **NEVER delete**: Any files in docs/games/ (existing 6 games)
- **PRESERVE**: All content with valid YAML frontmatter
- **MAINTAIN**: Existing docs/resources/ and docs/javascripts/ structure
- **BACKUP**: Before any bulk operations affecting multiple files

**Success Criteria**:
- Zero junk files remaining in project
- 100% naming convention compliance
- Clean directory structure ready for 35-game addition
- All coordination files properly organized
- No conflicts with planned expansion

**Expected Results**:
- Clean workspace ready for large-scale content addition
- Optimized directory structure supporting 41 total games
- No temporary or test files cluttering the project
- Beautiful architecture standards maintained and enhanced

**Coordination Context**:
This cleanup is MANDATORY preparation for the largest content expansion in project history. Your cleanup validates the foundation before we begin adding 35 new board games in 7 batches of 5 games each.

**Timeline**: Complete cleanup assessment and action within 10 minutes maximum.

**Next Steps After Completion**:
1. Report cleanup results to Workflow Orchestrator
2. Confirm structure ready for Researcher Agent BGG data collection
3. Validate foundation for Writer Agent content creation workflow
4. Prepare for continuous cleanup during 7-batch implementation

**Critical**: This is the MANDATORY Architect → Cleaner call required within 5 minutes of structural assessment. Project timeline depends on this cleanup validation.

Report back immediately with cleanup status and readiness confirmation for 35-game expansion workflow.