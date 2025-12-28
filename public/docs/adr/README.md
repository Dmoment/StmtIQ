# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) for the StmtIQ project.

## What is an ADR?

An Architecture Decision Record (ADR) is a document that captures an important architectural decision made along with its context and consequences.

## ADR Template

Each ADR follows this structure:

```markdown
# ADR-XXX: Title

## Status
[Proposed | Accepted | Deprecated | Superseded by ADR-XXX]

## Context
What is the issue that we're seeing that is motivating this decision or change?

## Decision
What is the change that we're proposing and/or doing?

## Consequences
What becomes easier or more difficult to do because of this change?

## Alternatives Considered
What other options were evaluated?
```

## Index of ADRs

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-001](./001-grape-api-framework.md) | Use Grape for API Framework | Accepted | 2024-12-26 |
| [ADR-002](./002-bank-parser-architecture.md) | Bank Parser Architecture | Accepted | 2024-12-26 |
| [ADR-003](./003-ai-categorization-strategy.md) | AI Categorization Strategy | Accepted | 2024-12-27 |
| [ADR-004](./004-openapi-type-generation.md) | OpenAPI TypeScript Generation | Accepted | 2024-12-28 |
| [ADR-005](./005-react-query-state-management.md) | React Query for Server State | Accepted | 2024-12-28 |

## Creating a New ADR

1. Copy the template below
2. Create a new file: `XXX-short-title.md`
3. Fill in the details
4. Update this README index
5. Submit for review

## References

- [ADR GitHub Organization](https://adr.github.io/)
- [Michael Nygard's ADR article](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)

