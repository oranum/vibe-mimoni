# Git Workflow - Team Onboarding Guide

## 🚀 Welcome to Vibe Mimoni Development!

This guide will help new team members get set up with our Git workflow and understand our chapter-based development process.

## 📋 Prerequisites

Before starting, ensure you have:
- Git installed on your machine (`git --version`)
- GitHub account with access to the repository
- SSH key configured with GitHub (recommended) or Personal Access Token

## 🔧 Initial Setup

### 1. Clone the Repository

```bash
# Using SSH (recommended)
git clone git@github.com:your-username/vibe-mimoni.git
cd vibe-mimoni

# Or using HTTPS
git clone https://github.com/your-username/vibe-mimoni.git
cd vibe-mimoni
```

### 2. Set Up Remote Repository (if not already configured)

If you're setting up the repository for the first time:

```bash
# Add GitHub remote (replace with your actual repository URL)
git remote add origin git@github.com:your-username/vibe-mimoni.git

# Verify remote is added
git remote -v

# Push initial code to GitHub
git push -u origin master

# Push development branch
git checkout development
git push -u origin development
git checkout master
```

### 3. Configure Git Settings

```bash
# Set your name and email for commits
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Optional: Set default editor
git config core.editor "code --wait"  # For VS Code
```

### 4. Install Project Dependencies

```bash
npm install
```

### 5. Set Up Environment Variables

Copy `.env.example` to `.env.local` and configure with your values:
```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

## 🌟 Daily Workflow

### Starting a New Chapter/Task

1. **Check out the latest development branch**
   ```bash
   git checkout development
   git pull origin development
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/chapter-X-task-description
   ```
   
   **Naming Convention:**
   - `feature/chapter-4-transaction-inbox`
   - `feature/chapter-5-labels-management`
   - `hotfix/fix-auth-redirect-issue`

3. **Start development**
   ```bash
   # Get task details
   npx task-master-ai show <task-id>
   
   # Set task to in-progress
   npx task-master-ai set-status --id=<task-id> --status=in-progress
   ```

### During Development

1. **Log progress regularly**
   ```bash
   npx task-master-ai update-subtask --id=<task.subtask> --prompt="Progress update..."
   ```

2. **Commit changes frequently (but push only after testing)**
   ```bash
   git add .
   git commit -m "wip: Working on authentication logic"
   ```

### Completing a Chapter

1. **Test thoroughly**
   - Verify all functionality works as expected
   - Test edge cases and error scenarios
   - Check that existing features still work

2. **Create final commit (MANDATORY)**
   ```bash
   git add .
   git commit -m "feat(chapter-X): Brief description

   - Implemented specific feature A
   - Added component/functionality B  
   - Tested scenarios C
   - Updated documentation/types D

   Closes task X"
   ```

3. **Push to GitHub**
   ```bash
   git push origin feature/chapter-X-task-description
   ```

4. **Update task status**
   ```bash
   npx task-master-ai set-status --id=<task-id> --status=done
   ```

5. **Create Pull Request**
   - Go to GitHub repository
   - Create PR from your feature branch to `development`
   - Add descriptive title and comments
   - Request review from team members

## 🔍 Common Git Commands

### Checking Status
```bash
git status                    # See current changes
git log --oneline -10        # View recent commits
git branch -a                # List all branches
```

### Working with Changes
```bash
git add .                    # Stage all changes
git add <filename>           # Stage specific file
git commit -m "message"      # Commit with message
git push origin <branch>     # Push to remote branch
```

### Branch Management
```bash
git checkout <branch>        # Switch to branch
git checkout -b <new-branch> # Create and switch to new branch
git branch -d <branch>       # Delete local branch
git push origin --delete <branch>  # Delete remote branch
```

### Getting Latest Changes
```bash
git pull origin development  # Pull latest development changes
git fetch origin            # Fetch without merging
git merge origin/development # Merge development into current branch
```

### Undoing Changes
```bash
git checkout -- <filename>  # Discard changes to file
git reset HEAD <filename>    # Unstage file
git reset --soft HEAD~1     # Undo last commit (keep changes)
git reset --hard HEAD~1     # Undo last commit (discard changes)
```

## 🚨 Troubleshooting

### Common Issues and Solutions

#### 1. Merge Conflicts
```bash
# When you see merge conflicts
git status                   # See conflicted files
# Edit files to resolve conflicts
git add <resolved-files>
git commit -m "resolve: Fix merge conflicts"
```

#### 2. Forgot to Pull Before Starting Work
```bash
git stash                    # Save current changes
git pull origin development  # Get latest changes
git stash pop               # Restore your changes
# Resolve any conflicts if they occur
```

#### 3. Need to Switch Branches with Uncommitted Changes
```bash
git stash                    # Save changes temporarily
git checkout <other-branch>  # Switch branches
# Do your work on other branch
git checkout <original-branch>
git stash pop               # Restore your changes
```

#### 4. Committed to Wrong Branch
```bash
git reset --soft HEAD~1     # Undo commit but keep changes
git checkout <correct-branch>
git add .
git commit -m "correct commit message"
```

#### 5. Remote Repository Not Set Up
```bash
git remote add origin <repository-url>
git push -u origin master
```

#### 6. Authentication Issues (HTTPS)
If using HTTPS and getting authentication errors:
```bash
# Use personal access token instead of password
git config --global credential.helper store
# Next push/pull will prompt for credentials - use token as password
```

#### 7. Large File Issues
```bash
# If you accidentally committed large files
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch <large-file>' --prune-empty --tag-name-filter cat -- --all
```

## 🔒 Security Best Practices

### Environment Variables
- **Never commit** `.env`, `.env.local`, or `.env.production` files
- Store sensitive data in environment variables only
- Use `.env.example` to document required variables

### Branch Protection
- Master branch should be protected (no direct pushes)
- All changes must go through pull requests
- Require at least one reviewer approval

### Access Control
- Use SSH keys for authentication (more secure than HTTPS)
- Set up two-factor authentication on GitHub
- Regularly rotate access tokens

## 📚 Resources and References

### Internal Documentation
- [Development Workflow](development-workflow.md) - Detailed development process
- [Component Guide](../docs/components.md) - UI component documentation
- [API Documentation](../docs/api.md) - Database schema and operations

### External Resources
- [Pro Git Book](https://git-scm.com/book) - Comprehensive Git reference
- [GitHub Docs](https://docs.github.com/) - GitHub-specific features
- [Conventional Commits](https://www.conventionalcommits.org/) - Commit message standards

### Task Management
- [Taskmaster Documentation](https://github.com/taskmaster-ai/taskmaster) - Task management system
- [Taskmaster CLI Reference](taskmaster.mdc) - Command reference guide

## 🤝 Getting Help

### When Stuck on Git Issues:
1. Check this troubleshooting section first
2. Search GitHub Issues for similar problems
3. Ask team members in development chat
4. Create a GitHub Issue with detailed error information

### For Development Questions:
1. Review task requirements using `task-master show <id>`
2. Check existing code for similar patterns
3. Consult team documentation
4. Ask for pair programming session

### Emergency Procedures:
If you've made a serious mistake (like deleting important code):
1. **Don't panic** - Git keeps history of everything
2. **Stop making changes** immediately
3. **Contact team lead** or experienced team member
4. **Document what happened** for learning

## ✅ Quick Checklist

Before starting each development session:
- [ ] Latest development branch pulled: `git pull origin development`
- [ ] Environment variables configured
- [ ] Dependencies installed: `npm install`
- [ ] Task requirements understood: `task-master show <id>`
- [ ] Feature branch created with proper naming

Before pushing each chapter completion:
- [ ] All functionality tested thoroughly
- [ ] No console errors or warnings
- [ ] Code follows project conventions
- [ ] Meaningful commit message written
- [ ] Task status updated in Taskmaster

---

**Remember: When in doubt, ask for help! The team is here to support each other.** 🤝 