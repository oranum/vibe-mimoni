# Development Workflow - Vibe Mimoni

## Overview
This document outlines the development workflow for Vibe Mimoni, emphasizing incremental development with proper version control practices.

## Chapter-Based Development Flow

### 1. Chapter Planning
- Review the current task/chapter requirements using `task-master show <id>`
- Break down complex tasks into subtasks using `task-master expand --id=<id>`
- Ensure all dependencies are satisfied before starting

### 2. Development Phase
- Set task status to in-progress: `task-master set-status --id=<id> --status=in-progress`
- Implement the feature/chapter according to specifications
- Log progress regularly using `task-master update-subtask --id=<id.subtask> --prompt="Progress update..."`

### 3. Testing Phase
- Thoroughly test the implemented feature
- Verify all acceptance criteria are met
- Test edge cases and error scenarios
- Ensure integration with existing features works properly

### 4. **MANDATORY: Commit to GitHub** 🚨
**Before moving to the next chapter, ALWAYS create a commit:**

```bash
# Stage all changes
git add .

# Create a meaningful commit message following this format:
git commit -m "feat(chapter-<id>): <brief description>

- Implemented <specific feature>
- Added <component/functionality>
- Tested <scenarios>
- Updated <documentation/types>

Closes task <id>"

# Push to GitHub
git push origin <branch-name>
```

#### Commit Message Guidelines:
- **Type**: `feat` (new feature), `fix` (bug fix), `docs` (documentation), `test` (adding tests)
- **Scope**: `chapter-<id>` or specific component name
- **Description**: Brief summary of what was accomplished
- **Body**: Detailed list of changes made
- **Footer**: Reference to the task/issue being closed

### 5. Task Completion
- Mark subtasks as done: `task-master set-status --id=<id.subtask> --status=done`
- Mark main task as done: `task-master set-status --id=<id> --status=done`
- Update any dependent tasks if implementation differs from original plan

### 6. Chapter Transition
- Review next task using `task-master next`
- Ensure all dependencies for the next chapter are satisfied
- Document any learnings or deviations in the task notes

## Git Branch Strategy

### For Feature Development:
1. Create feature branch: `git checkout -b feature/chapter-<id>-<description>`
2. Work on the chapter in this branch
3. Commit regularly during development
4. Create final commit after testing is complete
5. Merge to main after chapter completion

### For Hotfixes:
1. Create hotfix branch: `git checkout -b hotfix/<description>`
2. Apply fix and test
3. Commit and merge immediately

## Quality Gates

Before each commit, ensure:
- [ ] Code compiles without errors
- [ ] All tests pass (when tests exist)
- [ ] Feature works as expected in development environment
- [ ] No console errors or warnings
- [ ] Code follows project conventions
- [ ] Types are properly defined (TypeScript)

## Rollback Strategy

If a chapter needs to be rolled back:
1. Identify the last good commit: `git log --oneline`
2. Create rollback branch: `git checkout -b rollback/chapter-<id>`
3. Reset or revert problematic changes
4. Update task status to reflect current state
5. Document reasons for rollback in task notes

## Integration Points

### With Taskmaster:
- Always update task status to reflect current development state
- Use `task-master update-subtask` to log findings and decisions
- Create new tasks for unexpected requirements discovered during development

### With GitHub:
- Use meaningful commit messages that reference task IDs
- Tag major milestones for easy reference
- Create releases for major feature completions

## Example Chapter Flow

```bash
# Start new chapter
task-master show 3  # Review requirements
task-master set-status --id=3 --status=in-progress

# Create feature branch
git checkout -b feature/chapter-3-database-schema

# Develop and test
# ... implement features ...
# ... test thoroughly ...

# Log progress
task-master update-subtask --id=3.1 --prompt="Completed database schema setup. All tables created successfully with proper RLS policies."

# MANDATORY: Commit after testing
git add .
git commit -m "feat(chapter-3): Implement Supabase database schema

- Created transactions, labels, transaction_labels, and rules tables
- Implemented Row Level Security (RLS) policies
- Added database migration scripts
- Tested schema with sample data
- Updated TypeScript types for database schema

Closes task 3"

git push origin feature/chapter-3-database-schema

# Complete task
task-master set-status --id=3 --status=done

# Move to next chapter
task-master next
```

## Best Practices

1. **Never skip the commit step** - Each completed and tested chapter should have its own commit
2. **Test before committing** - Always verify functionality works as expected
3. **Write descriptive commit messages** - Future you will thank present you
4. **Keep commits atomic** - One chapter = one commit (after testing)
5. **Update task status regularly** - Keep Taskmaster in sync with actual progress
6. **Document decisions** - Use `update-subtask` to record important implementation choices

## Troubleshooting

### If you forgot to commit after testing:
```bash
# Create the commit immediately
git add .
git commit -m "feat(chapter-<id>): <description> (completed and tested)"
git push origin <branch-name>
```

### If you need to fix a commit message:
```bash
# If not yet pushed
git commit --amend -m "corrected message"

# If already pushed (use carefully)
git commit --amend -m "corrected message"
git push --force-with-lease origin <branch-name>
```

---

**Remember: The commit after testing is not optional - it's a crucial part of maintaining a clean, traceable development history.** 