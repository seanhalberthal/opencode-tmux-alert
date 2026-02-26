---
description: Commit staged changes and create a PR, push on top if PR already exists.
---

# Commit and Push Changes

## Pre-Commit Validation

1. **Git Status Check**:
    - Run `git status` to see all staged, unstaged, and untracked changes
    - If there are no changes at all, stop and inform the user
    - Review untracked files — stage any that are part of this change

2. **Quality Checks**:
    - Run `make check` to execute all quality gates (build + test)
    - **CRITICAL**: If any check fails, stop immediately. Do NOT proceed to commit
    - Fix the failing check, then re-run `make check` before continuing

3. **Change Review**:
    - Run `git diff --staged` to review what will be committed
    - If nothing is staged, ask the user what to stage
    - Key directories:
      - `src/` — plugin source code and tests
      - `scripts/` — shell scripts bundled with the package
      - `.github/workflows/` — CI/CD configuration

4. **README Update Check** (MANDATORY):
    - **STOP**: You MUST complete this step before proceeding to commit
    - **Read the README** to understand current documentation
    - **Compare changes against README content** — for each changed file, check if:
      - New commands, features, or functionality were added
      - Installation steps or prerequisites changed
      - Directory structure or file locations changed
      - Events, configuration options, or environment variables changed
      - Scripts in `scripts/` were added, removed, or modified
    - **If ANY documentation updates are needed**:
      - Update the README BEFORE creating the commit
      - Stage the README changes along with the other changes
    - **If unsure**: Ask the user whether README updates are needed
    - **Do NOT skip this step** — documentation drift causes confusion

5. **CHANGELOG Update** (MANDATORY):
    - **STOP**: You MUST complete this step before proceeding to commit
    - **Read CHANGELOG.md** (create it if it doesn't exist)
    - **Add an entry** under the `## [Unreleased]` section describing the change:
      ```
      ## [Unreleased]
      - Brief description of change
      ```
    - Stage `CHANGELOG.md` along with the other changes
    - **Do NOT skip this step** — every commit must have a CHANGELOG entry

## Commit Process

### Analyse Changes
- Run `git diff --staged` to understand all changes
- Categorise the change: new feature, enhancement, bug fix, refactor, docs, chore, etc.

### Generate Commit Message
- **Format**: `prefix: description` — sentence case, imperative mood, under 72 characters
- **Prefixes** (these drive automatic semantic versioning):
  - `breaking:` — breaking changes (major bump)
  - `feat:` / `add:` — new features (minor bump)
  - `update:` — enhancements to existing features (minor bump)
  - `fix:` — bug fixes (patch bump)
  - `docs:` — documentation only (no release)
  - `chore:` — maintenance, deps, config (no release)
  - `refactor:` — code restructuring (no release)
  - `test:` — test changes (no release)
- **Examples**:
  - `feat: add custom event support`
  - `fix: alert not clearing on user reply`
  - `docs: update README with new configuration options`
  - `chore: update dependencies`
- **CRITICAL**: NEVER include `Co-Authored-By:` lines or mention Claude/AI in commit messages

### Execute Commit and Push
1. Stage relevant files: `git add <specific files>`
2. Commit: `git commit -m "<message>"`
3. Push: `git push origin <branch>` (use `-u` flag if pushing a new branch)

## Pull Request Creation

### Branch Check
- If on `main`, create a new branch first: `git checkout -b <descriptive-branch-name>`
- Branch naming: use lowercase kebab-case (e.g., `add-custom-events`, `fix-alert-timing`)

### Create Pull Request
- Use `gh pr create` with a short, focused title and description
- PR description format:
  ```
  ## Summary
  - Brief bullet points describing the changes

  ## Test plan
  - [ ] How to verify the changes work
  ```
- **CRITICAL**: NEVER include AI attribution or "Generated with Claude Code" in PR descriptions

## Post-PR Actions

### Verification
- Check CI status: `gh pr checks` or `gh run list`
- CI runs: `bun test` and `bun run build` on Ubuntu with latest Bun
- If CI fails, investigate and fix before requesting review

## Notes
- This project uses **Bun** as runtime, package manager, and test runner
- TypeScript source lives in `src/`, compiled output in `dist/`
- Tests use Bun's built-in test runner (`bun test`)
- Build is just `tsc` (TypeScript compiler)
- The `scripts/` directory contains shell scripts bundled with the npm package
