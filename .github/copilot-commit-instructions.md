# Commit Message Guidelines

When writing commit messages for this Car Wars 6e Builder project, please follow the Conventional Commits specification. This helps maintain a clear and readable git history, making it easier to generate changelogs and understand what changes were made.

## Format

```
<type>(<optional scope>): <description>

[optional body]

[optional footer(s)]
```

## Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools and libraries
- **ui**: UI/UX improvements or updates

## Scope

Specify the scope of the change, which could be:
- **components**: For changes to React components
- **store**: For state management changes
- **api**: For API-related changes
- **utils**: For utility functions
- **styles**: For styling changes
- **types**: For TypeScript type changes

## Examples

```
feat(components): add card name and cost filter on same line
```

```
fix(store): resolve issue with card collection not updating
```

```
style(ui): improve responsive layout for filter controls
```

```
refactor(utils): simplify card validation logic
```

```
perf(components): optimize card rendering for large collections
```

```
docs: update README with new build instructions
```

```
test(components): add tests for Card component
```

```
chore: update dependencies to latest versions
```

## Additional Guidelines

1. Use the imperative, present tense: "add" not "added"
2. Don't capitalize the first letter of the description
3. No dot (.) at the end of the description
4. Reference issue numbers at the end of the commit message when applicable:
   ```
   fix(components): resolve card duplication issue (#123)
   ```
5. When breaking changes are introduced, start the body with BREAKING CHANGE:
   ```
   feat(api): change card upload API format

   BREAKING CHANGE: The card upload API now requires a different format for metadata
   ```

Following these conventions will make the project history more valuable and easier to navigate.
