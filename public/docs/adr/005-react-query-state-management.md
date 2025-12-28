# ADR-005: React Query for Server State Management

## Status
Accepted

## Date
2024-12-28

## Context

The React frontend needs to:
1. Fetch data from the API (transactions, categories, etc.)
2. Cache responses to avoid redundant requests
3. Handle loading and error states
4. Invalidate cache after mutations
5. Support optimistic updates

We needed a state management strategy that handles **server state** (data from API) effectively.

## Decision

We chose **TanStack Query (React Query)** for server state management:

1. **Queries** - For fetching data (GET requests)
2. **Mutations** - For modifying data (POST/PATCH/DELETE)
3. **Query Keys** - For cache management
4. **Automatic refetching** - Stale-while-revalidate pattern

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Components                          │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Custom Query Hooks                          │
│  useTransactions, useCategories, useUpdateTransaction, etc. │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  TanStack Query                              │
│  • Cache management                                          │
│  • Background refetching                                     │
│  • Optimistic updates                                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  openapi-fetch Client                        │
│  api.GET, api.POST, api.PATCH, api.DELETE                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Rails/Grape API                             │
└─────────────────────────────────────────────────────────────┘
```

## Implementation

### Query Key Factory Pattern

```typescript
// queries/keys.ts
export const transactionKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionKeys.all, "list"] as const,
  list: (filters) => [...transactionKeys.lists(), filters] as const,
  detail: (id: number) => [...transactionKeys.all, "detail", id] as const,
};
```

### Query Hook Example

```typescript
// queries/useTransactions.ts
export const useTransactions = (filters?: TransactionFilters) => {
  return useQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/transactions", {
        params: { query: filters },
      });
      if (error) throw new Error("Failed to fetch");
      return data as Transaction[];
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};
```

### Mutation with Cache Invalidation

```typescript
// queries/useTransactions.ts
export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const { data: response } = await api.PATCH("/v1/transactions/{id}", {
        params: { path: { id } },
        body: data,
      });
      return response;
    },
    onSuccess: (updatedTransaction) => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      // Update single item in cache
      queryClient.setQueryData(
        transactionKeys.detail(updatedTransaction.id),
        updatedTransaction
      );
    },
  });
};
```

### Usage in Components

```typescript
function TransactionList() {
  const { data, isLoading, error } = useTransactions({ per_page: 100 });
  const updateMutation = useUpdateTransaction();

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <ul>
      {data.map(tx => (
        <TransactionRow 
          key={tx.id} 
          transaction={tx}
          onCategoryChange={(categoryId) => {
            updateMutation.mutate({ id: tx.id, data: { category_id: categoryId } });
          }}
        />
      ))}
    </ul>
  );
}
```

## Consequences

### Positive
- **Automatic caching** - No manual cache management
- **Deduplication** - Same query only fetches once
- **Background updates** - Fresh data without blocking UI
- **DevTools** - React Query DevTools for debugging
- **Optimistic updates** - Instant UI feedback
- **Separation** - Clean separation from UI state

### Negative
- Learning curve for query/mutation patterns
- Query key management can get complex
- Need to think about cache invalidation strategy
- Additional bundle size (~12KB gzipped)

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| Redux + RTK Query | Full state solution | Overkill, boilerplate |
| SWR | Simpler API | Less features |
| Zustand | Lightweight | Manual server state |
| Raw fetch + useState | No dependencies | No caching, loading states |

## Related Files
- `app/javascript/queries/` - All query hooks
- `app/javascript/queries/keys.ts` - Query key factories
- `app/javascript/lib/api.ts` - API client setup

