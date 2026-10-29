# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-12-21

### Added
- **Cursor IDE Support** - Full support for Cursor IDE alongside Claude Code
  - Custom hook implementation for Cursor's `beforeSubmitPrompt` event
  - Cursor Rule system for enforcing training mode
  - Cross-platform installers for Windows, macOS, and Linux
  - Uninstall scripts with data preservation options
- **Shared Data System** - Claude Code and Cursor share the same `~/.gitgud/` directory
  - Synchronized streaks and achievements between IDEs
  - Unified configuration management
  - Cross-platform compatibility

### Changed
- **Major Architecture Refactoring**
  - Extracted core logic into modular `scripts/core/` directory:
    - `task-manager.js` - Task processing and assignment logic
    - `achievements.js` - Achievement and streak management
    - `config-manager.js` - Configuration validation and management
  - Refactored all existing scripts to use core modules
  - Improved code reusability and maintainability
- **Enhanced Installation Process**
  - Automated installers for Cursor with hook merging
  - Rule installation options (global vs project-specific)
  - Shell command alias setup
  - Comprehensive installation testing

### Technical Details
- **Platform-Specific Implementations**
  - Claude Code: Direct context injection via `hookSpecificOutput`
  - Cursor: state management with Rule enforcement
- **Core Module Benefits**
  - Single source of truth for business logic
  - Easier testing and maintenance
  - Platform-agnostic core functionality
  - Clean separation of concerns

### Developer Notes
- Repository now supports cross-platform development
- Backward compatible with existing Claude Code installations
- Data format remains unchanged for seamless migration
- Test coverage improved through modularization

## [1.0.0] - 2025-12-19

### Added
- Initial release of GitGud
- UserPromptSubmit hook for task assignment
- 9 task categories with smart matching (security, api, database, debug, test, architecture, frontend, function, general)
- Gamification system:
  - Daily streaks with personal records
  - 10 unlockable achievements
  - Skip system with daily limits
- Configurable settings:
  - Task frequency
  - Daily skip limit
  - Difficulty level (easy/medium/hard/adaptive)
  - Enable/disable toggle
- Slash commands:
  - `/gg-complete` - Mark task as completed
  - `/gg-stats` - View statistics dashboard
  - `/gg-reset` - Reset counter/stats/all
  - `/gg-config` - View/change configuration
- Full statistics dashboard with history
