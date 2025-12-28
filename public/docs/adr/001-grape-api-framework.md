# ADR-001: Use Grape for API Framework

## Status
Accepted

## Date
2024-12-26

## Context

StmtIQ needs a robust API layer to:
- Handle file uploads for bank statements
- Provide CRUD operations for transactions, categories, and accounts
- Support mobile clients in the future
- Generate automatic API documentation (OpenAPI/Swagger)

Rails provides built-in API mode, but we needed to evaluate the best approach for a dedicated API.

## Decision

We chose **Grape** as the API framework instead of Rails API-only controllers.

### Key Factors:

1. **DSL-based routing** - More declarative and readable API definitions
2. **Built-in parameter validation** - Strong typing with `params do ... end` blocks
3. **grape-swagger integration** - Auto-generates OpenAPI specs from code
4. **grape-entity** - Clean response serialization with entities
5. **Versioning** - Native support for API versioning (`/api/v1/`)
6. **Mounting flexibility** - Can be mounted alongside Rails controllers

## Implementation

```ruby
# app/api/base_api.rb
class BaseAPI < Grape::API
  format :json
  mount V1::Root
end

# config/routes.rb
mount BaseAPI => '/api'
```

## Consequences

### Positive
- Clean separation between API and web controllers
- Automatic OpenAPI documentation generation
- Strong parameter validation prevents invalid data
- Entities provide consistent response formatting
- Easy to add API versions

### Negative
- Learning curve for developers unfamiliar with Grape DSL
- Two routing systems (Rails + Grape) to maintain
- Some Rails helpers not directly available in Grape

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| Rails API Mode | Native Rails, familiar | No auto-docs, manual validation |
| GraphQL | Flexible queries | Overkill for CRUD, complexity |
| Sinatra | Lightweight | Too minimal, no Rails integration |

## References
- [Grape GitHub](https://github.com/ruby-grape/grape)
- [grape-swagger](https://github.com/ruby-grape/grape-swagger)

