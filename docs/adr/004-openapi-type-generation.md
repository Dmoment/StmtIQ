# ADR-004: OpenAPI TypeScript Type Generation

## Status
Accepted

## Date
2024-12-28

## Context

The frontend (React + TypeScript) consumes the Rails/Grape API. We needed:

1. Type-safe API calls in the frontend
2. Automatic sync between backend and frontend types
3. Catch API contract violations at compile time
4. Reduce manual type definitions

## Decision

We implemented **automatic TypeScript generation from OpenAPI spec**:

1. **grape-swagger** generates OpenAPI spec from Grape API
2. **swagger2openapi** converts Swagger 2.0 → OpenAPI 3.0
3. **openapi-typescript** generates TypeScript types
4. **openapi-fetch** provides typed fetch client

### Generation Pipeline

```
Grape API Definitions
        │
        ▼ (rails api:generate_spec)
┌─────────────────────────────┐
│  public/api-spec-generated  │  ← Swagger 2.0
│          .json              │
└─────────────┬───────────────┘
              │
              ▼ (swagger2openapi)
┌─────────────────────────────┐
│  public/api-spec-v3.json    │  ← OpenAPI 3.0
└─────────────┬───────────────┘
              │
              ▼ (openapi-typescript)
┌─────────────────────────────┐
│  app/javascript/types/      │
│    generated/api.d.ts       │  ← TypeScript types
└─────────────────────────────┘
```

### Usage

```typescript
import { api } from '../lib/api';

// Fully typed - autocomplete works!
const { data, error } = await api.GET('/v1/transactions', {
  params: {
    query: { category_id: 5, per_page: 50 }
  }
});

// data is typed as Transaction[]
```

## Implementation

```bash
# Generate types after API changes
bun run generate:api-types

# This runs:
# 1. rails api:generate_spec
# 2. swagger2openapi conversion
# 3. openapi-typescript generation
```

### Package.json Scripts

```json
{
  "scripts": {
    "generate:api-types": "rails api:generate_spec && bun run convert:openapi && bunx openapi-typescript ./public/api-spec-v3.json -o ./app/javascript/types/generated/api.d.ts",
    "generate:api-types:remote": "bunx swagger2openapi http://localhost:3000/api/v1/swagger_doc.json -o ./public/api-spec-v3.json && bunx openapi-typescript ./public/api-spec-v3.json -o ./app/javascript/types/generated/api.d.ts"
  }
}
```

## Consequences

### Positive
- **Type safety**: Catch API mismatches at compile time
- **Autocomplete**: Full IDE support for API calls
- **Single source of truth**: Types derived from actual API
- **Maintainability**: No manual type sync needed
- **Documentation**: Generated types serve as API reference

### Negative
- Build step required after API changes
- Generated types can be verbose
- Swagger 2.0 → 3.0 conversion adds complexity
- Response types not fully typed (grape-swagger limitation)

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| Manual types | Full control | Out of sync, tedious |
| GraphQL | Introspection | Complete rewrite |
| tRPC | Best type safety | Requires compatible backend |

## Related Files
- `lib/tasks/api.rake` - Rake task for spec generation
- `app/javascript/types/generated/api.d.ts` - Generated types
- `app/javascript/lib/api.ts` - Typed API client
- `app/javascript/types/api.ts` - Manual response types

