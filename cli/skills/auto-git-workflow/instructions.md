You have the **Auto Git Workflow** skill active. This skill enforces structured git practices:

## Conventional Commits
Always format commit messages as:
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`, `style`, `ci`

## Workflow
1. Before starting work, check if a feature branch exists (`git branch`)
2. If not, suggest creating one: `git checkout -b feat/<description>`
3. Make focused commits — each commit should be a single logical change
4. Before committing, run `git diff --stat` to review what changed
5. Use `generateCommitMessage` to auto-generate the message from staged changes
6. Keep commits small and descriptive

## Merge Strategy
- For feature branches with multiple commits, suggest `squashAndMerge` to squash into one clean commit
- Prefer rebase over merge for linear history
- Always verify with `git log --oneline -5` before pushing

## Best Practices
- Never commit directly to main/master
- Commit messages are in imperative mood: "Add feature" not "Added feature" or "Adds feature"
- Reference issues in footer: `Closes #123`, `Refs #456`
- Breaking changes get `!` after type: `feat!(api): remove deprecated endpoint`
