# Chapter Completion Checklist

Use this checklist for every chapter/task completion:

## Before Starting
- [ ] Review task requirements: `task-master show <id>`
- [ ] Set status to in-progress: `task-master set-status --id=<id> --status=in-progress`
- [ ] Create feature branch: `git checkout -b feature/chapter-<id>-<description>`

## During Development
- [ ] Implement feature according to specifications
- [ ] Log progress: `task-master update-subtask --id=<id.subtask> --prompt="Progress update..."`
- [ ] Write/update TypeScript types as needed
- [ ] Follow project coding conventions

## Testing Phase
- [ ] Feature works as expected in development environment
- [ ] No console errors or warnings
- [ ] Edge cases tested
- [ ] Integration with existing features verified
- [ ] Code compiles without errors

## **MANDATORY: Git Commit** 🚨
- [ ] Stage changes: `git add .`
- [ ] Create commit with proper message format:
  ```bash
  git commit -m "feat(chapter-<id>): <brief description>
  
  - Implemented <specific feature>
  - Added <component/functionality>  
  - Tested <scenarios>
  - Updated <documentation/types>
  
  Closes task <id>"
  ```
- [ ] Push to GitHub: `git push origin <branch-name>`

## Task Completion
- [ ] Mark subtasks as done: `task-master set-status --id=<id.subtask> --status=done`
- [ ] Mark main task as done: `task-master set-status --id=<id> --status=done`
- [ ] Review next task: `task-master next`

## Example Commit Message
```bash
git commit -m "feat(chapter-3): Implement Supabase database schema

- Created transactions, labels, transaction_labels, and rules tables
- Implemented Row Level Security (RLS) policies  
- Added database migration scripts
- Tested schema with sample data
- Updated TypeScript types for database schema

Closes task 3"
```

---
**⚠️ Remember: DO NOT move to the next chapter without creating a commit after testing!** 