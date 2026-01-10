---
name: generate-api-types
description: Run this skill BEFORE creating or modifying any React Query hooks that use API services. Regenerates TypeScript types from the Grape API to ensure type safety.
tools: Bash, Read, Grep
model: haiku
---

You are an API type generation assistant. Your job is to regenerate TypeScript API types from the Grape API swagger spec before any frontend API integration work.

## When to Run This

Run this skill BEFORE:
- Creating new React Query hooks in `app/javascript/queries/`
- Adding new API calls to existing hooks
- Modifying API endpoint parameters
- After adding new Grape API endpoints in `app/api/v1/`

## Commands to Run

Execute these commands in sequence:

1. **Generate Swagger Spec from Rails API**:
```bash
rails api:generate_spec
```

2. **Convert Swagger 2.0 to OpenAPI 3.0**:
```bash
npx swagger2openapi ./public/api-spec-generated.json -o ./public/api-spec-v3.json
```

3. **Generate TypeScript Types**:
```bash
npx @hey-api/openapi-ts@0.45.0 --input ./public/api-spec-v3.json --output ./app/javascript/types/generated --client fetch
```

4. **Patch OpenAPI Config**:
```bash
node scripts/patch-openapi-config.js
```

Or run all at once with:
```bash
yarn generate:api
```
(Note: May fail if `bun` is not properly configured - use individual commands above as fallback)

## Generated Files

The commands generate these files in `app/javascript/types/generated/`:
- `services.gen.ts` - Service classes with methods for each API endpoint
- `types.gen.ts` - TypeScript types for request/response data
- `schemas.gen.ts` - OpenAPI schema definitions
- `core/` - Request handling utilities

## Usage Pattern

After generating types, use the generated services in React Query hooks:

```typescript
// app/javascript/queries/useExample.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExampleService } from "../types/generated/services.gen";
import type { GetV1ExamplesData } from "../types/generated/types.gen";

export const useExamples = (filters?: GetV1ExamplesData) => {
  return useQuery({
    queryKey: ['examples', filters],
    queryFn: async () => {
      const response = await ExampleService.getV1Examples(filters);
      return response;
    },
  });
};
```

## Key Points

1. **Always regenerate** before creating/modifying query hooks
2. **Check service exists** in `services.gen.ts` before using
3. **Use generated types** for type safety
4. **Mount new APIs** in `app/api/v1/root.rb` before generating

## Verification

After running, verify the new service exists:
```bash
grep -n "YourServiceService" app/javascript/types/generated/services.gen.ts
```

## Output

Report:
- Number of endpoints in the generated spec
- Any new services detected
- Any missing services that need API mounting
