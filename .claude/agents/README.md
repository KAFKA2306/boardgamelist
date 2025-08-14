# BoardGameList Claude Agents System

## Overview

The BoardGameList project uses a sophisticated multi-agent system to maintain beautiful, scalable architecture while serving multiple user types (humans, AI, LLM, Serena-MCP, developers, players). Each agent has specific responsibilities and clear timing conditions for calling other agents.

## Agent Architecture

### Core Design Principles
- **Beautiful Architecture**: All agents work together to maintain clean, organized code structure
- **Clear Communication**: Each agent must call other agents at clearly described timing conditions
- **No Junk Files**: Zero tolerance for test files, duplicates, or organizational mess
- **Scalable Design**: Architecture supports growth from 6 games to 100+ games
- **Multi-User Support**: Serves humans, AI, LLM, Serena-MCP, developers, players effectively

### Agent Network Structure
```
Manager Agent (Central Orchestrator)
├── Architect Agent (System Design & Structure)
├── Writer Agent (Content Creation & Documentation)  
├── Cleaner Agent (File Organization & Cleanup)
└── Researcher Agent (Information Search & Discovery)
```

## Agent Descriptions

### 🎯 Manager Agent (`manager.md`)
**Role**: Central orchestrator and project coordinator
**Primary Responsibility**: Project coordination, task delegation, quality assurance
**Key Features**:
- Coordinates all other agents with specific timing requirements
- Maintains project timeline and quality standards
- Interfaces with all user types (humans, AI, LLM, Serena-MCP, developers, players)
- Has final decision authority for conflict resolution

**When Manager Calls Other Agents**:
- **Architect**: Within 30 minutes of structural needs identification
- **Writer**: Within 30 minutes of content assignment
- **Cleaner**: Within 15 minutes of cleanup triggers
- **Researcher**: Within 20 minutes of information needs

### 🏗️ Architect Agent (`architector.md`)  
**Role**: System architecture and technical design specialist
**Primary Responsibility**: Project structure, technical standards, scalability
**Key Features**:
- Designs and maintains MkDocs configuration and structure
- Ensures beautiful, scalable architecture
- Makes technical decisions affecting project structure
- Plans for scalability to support 100+ games

**When Architect Calls Other Agents**:
- **Cleaner**: WITHIN 5 minutes of directory structure changes (MANDATORY)
- **Writer**: Within 30 minutes of new template creation
- **Manager**: Within 1 hour for major decisions, immediately for completions
- **Researcher**: Before implementation decisions requiring external information

### ✍️ Writer Agent (`writer.md`)
**Role**: Content creation and documentation specialist  
**Primary Responsibility**: Game documentation, rule summaries, content quality
**Key Features**:
- Creates comprehensive board game documentation
- Maintains writing standards and style guidelines
- Produces mobile-responsive, accessible content
- Ensures consistency across all documentation

**When Writer Calls Other Agents**:
- **Researcher**: WITHIN 10 minutes of new assignment (MANDATORY before writing)
- **Cleaner**: Within 15 minutes of creating 3+ drafts, within 5 minutes of completion
- **Architect**: Immediately when template limitations block writing
- **Manager**: Within 1 hour of scope changes, within 30 minutes of completion

### 🧹 Cleaner Agent (`cleaner.md`)
**Role**: File organization and cleanup specialist
**Primary Responsibility**: Clean file organization, junk file removal, naming conventions
**Key Features**:
- Removes junk files (test_*, *_temp, *_updated, draft_*, etc.)
- Enforces naming conventions and directory structure
- Maintains zero tolerance for file organization issues
- Preserves content integrity during cleanup operations

**When Cleaner Calls Other Agents**:
- **Architect**: IMMEDIATELY when structural issues found (pause cleanup)
- **Writer**: Within 10 minutes when content reorganization needed
- **Manager**: Within 30 minutes of systemic issues, within 15 minutes of major cleanups
- **Researcher**: Within 5 minutes when orphaned files need verification

### 🔍 Researcher Agent (`researcher.md`)
**Role**: Information research and discovery specialist
**Primary Responsibility**: Data collection, fact verification, resource discovery
**Key Features**:
- Comprehensive board game research including BGG integration
- Multi-source information validation and fact-checking
- Resource discovery from official and community sources
- Structured data packaging for content creation

**When Researcher Calls Other Agents**:
- **Writer**: WITHIN 30 minutes of research completion (MANDATORY delivery)
- **Manager**: Within 2 hours of scope expansion, within 15 minutes of urgent completion
- **Cleaner**: Within 20 minutes of multiple file creation
- **Architect**: Within 1 hour when architectural information needs identified

## Agent Communication Requirements

### Mandatory Timing Conditions
Each agent MUST call other agents at specific times as defined in their individual documentation:

#### Critical Timing Requirements (MANDATORY)
- **Architect → Cleaner**: Within 5 minutes of structure changes
- **Writer → Researcher**: Within 10 minutes of new assignment  
- **Researcher → Writer**: Within 30 minutes of research completion
- **Cleaner → Architect**: IMMEDIATELY when structural issues found

#### Standard Timing Requirements
- **Manager responses**: Within 30 minutes for high priority
- **Cleanup triggers**: Within 15 minutes of accumulation
- **Content completion**: Within 5 minutes of finalization
- **Research requests**: Within 2 hours maximum

### System Prompt Requirements
Every agent call must include:
1. **Clear Context**: Current project state and specific situation
2. **Specific Task**: Exact deliverable or action needed
3. **Success Criteria**: Measurable outcomes for completion
4. **Timeline**: When response/completion is needed
5. **Next Steps**: What should happen after task completion

## Usage Guidelines

### Getting Started
1. **Initialize Manager Agent**: Start with Manager for all project coordination
2. **Follow Timing Requirements**: Each agent must respect mandatory timing conditions
3. **Use Proper System Prompts**: Include all required context and success criteria
4. **Monitor Communication**: Ensure all agent calls receive proper responses

### Best Practices
```yaml
always_do:
  - Start workflows through Manager Agent
  - Follow mandatory timing requirements exactly
  - Include complete system prompts with context
  - Monitor for escalation conditions
  - Document all agent interactions

never_do:
  - Skip mandatory agent calls (especially Architect → Cleaner)
  - Create junk files (test_*, *_temp, *_updated, etc.)
  - Break naming conventions or directory structure
  - Bypass Manager for major decisions
  - Ignore timeout and escalation rules
```

### Quality Standards
All agents must maintain:
- **File Organization**: Zero junk files, consistent naming
- **Response Times**: Within defined timing requirements  
- **Communication Quality**: Clear, complete system prompts
- **Architecture Beauty**: Clean, scalable project structure
- **Content Quality**: High standards for all deliverables

## Emergency Protocols

### Critical Situations
```yaml
build_failures:
  first_responder: "architect"
  escalation_time: "15_minutes"
  escalate_to: "manager"

junk_file_explosion:
  first_responder: "cleaner"  
  escalation_time: "5_minutes"
  escalate_to: "manager"

content_corruption:
  first_responder: "writer"
  escalation_time: "10_minutes"
  escalate_to: "manager"

research_unavailable:
  first_responder: "researcher"
  escalation_time: "4_hours"
  escalate_to: "manager"
```

### Emergency Communication
- **Bypass Normal Timing**: Emergency situations override standard timing
- **Immediate Manager Notification**: All emergencies escalate to Manager
- **Broadcast Mode**: Manager can send urgent messages to all agents
- **Status Reporting**: Every 15 minutes until crisis resolved

## Configuration Files

### Core Configuration
- **`agent_config.yaml`**: Complete agent definitions and communication matrix
- **`orchestrator.md`**: Detailed orchestration system documentation
- **Communication protocols defined in each agent's markdown file

### Monitoring and Quality Assurance
- **Response Time Tracking**: Monitor all agent communication timing
- **Quality Gates**: Validate all deliverables meet standards
- **Escalation Monitoring**: Track when Manager intervention needed
- **Success Metrics**: Measure agent coordination effectiveness

## Success Metrics

### Agent Performance Indicators
```yaml
communication_effectiveness:
  - successful_handoff_rate: "95%+ target"
  - response_time_compliance: "90%+ within SLA"
  - escalation_frequency: "minimal Manager interventions"

project_health:
  - junk_file_count: "zero tolerance"
  - naming_compliance: "100% adherence"
  - build_performance: "under 2 seconds"
  - content_quality: "95%+ standards met"

coordination_quality:
  - timing_compliance: "mandatory calls never missed"
  - workflow_efficiency: "smooth multi-agent coordination"  
  - conflict_resolution: "minimal Manager arbitration needed"
```

## Getting Help

### Documentation References
- Individual agent files (manager.md, architector.md, writer.md, cleaner.md, researcher.md)
- `agent_config.yaml` for complete configuration details
- `orchestrator.md` for workflow and coordination patterns
- `communication_protocols.md` for detailed timing and prompt specifications

### Troubleshooting
1. **Agent Not Responding**: Check timing requirements and escalation rules
2. **Communication Issues**: Verify system prompt format and required fields
3. **Quality Problems**: Review standards and check for mandatory calls missed
4. **Performance Issues**: Monitor response times and resource conflicts

### Support Escalation
- **Technical Issues**: Start with Architect Agent
- **Content Problems**: Start with Writer Agent  
- **Organization Issues**: Start with Cleaner Agent
- **Information Needs**: Start with Researcher Agent
- **Coordination Problems**: Always escalate to Manager Agent

---

**Agent System Status**: Fully operational with complete documentation
**Success Criteria**: Beautiful architecture maintained through coordinated agent work
**Next Phase**: Begin foundation phase with core game documentation