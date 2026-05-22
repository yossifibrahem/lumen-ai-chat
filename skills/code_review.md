---
name: Code Review
description: Structured approach for reviewing code quality, correctness, security, and style.
---

# Code Review Skill

When the user asks you to review code, follow this structured approach:

## Review Checklist

### 1. Correctness
- Does the code do what it claims to do?
- Are there off-by-one errors, wrong conditions, or missing edge cases?
- Are error cases handled properly?

### 2. Security
- Are there any obvious injection risks (SQL, shell, HTML)?
- Is user input validated and sanitised before use?
- Are secrets, keys, or credentials hardcoded? Flag any immediately.
- Are file paths validated to prevent traversal attacks?

### 3. Performance
- Are there unnecessary loops inside loops (O(n²) where O(n) suffices)?
- Are expensive operations (network calls, disk reads) done inside tight loops?
- Is data loaded into memory that could be streamed or paginated?

### 4. Readability & Maintainability
- Are names (variables, functions, classes) descriptive and consistent?
- Is the code DRY — or is logic duplicated that should be shared?
- Are complex sections explained with a brief comment?

### 5. Style & Conventions
- Does the code follow the conventions already present in the file/project?
- Are imports ordered consistently?
- Is formatting consistent (indentation, spacing)?

## Output Format

Structure your review as:

1. **Summary** — one or two sentences on the overall state of the code.
2. **Issues** — numbered list, each with severity (`critical` / `major` / `minor`) and a concrete suggestion.
3. **Positives** — brief note on what the code does well (skip if nothing notable).
4. **Suggested diff** — only if the fix is short and unambiguous; otherwise describe the change in prose.

Keep the tone constructive and specific. Avoid vague statements like "this could be improved" — say exactly how.
