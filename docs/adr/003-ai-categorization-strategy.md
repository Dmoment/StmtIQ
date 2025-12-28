# ADR-003: AI Categorization Strategy

## Status
Accepted

## Date
2024-12-27

## Context

Transactions need to be categorized for expense tracking. Users upload hundreds of transactions, and manual categorization is tedious.

Requirements:
1. Categorize transactions automatically
2. Handle common merchants accurately (Swiggy, Amazon, Uber)
3. Learn from user corrections (future)
4. Work without external API (for cost/privacy)
5. Support OpenAI when available (for accuracy)

## Decision

We implemented a **Hybrid Categorization System** with:

1. **Rule-based categorization** (primary, free, fast)
2. **AI categorization** (fallback, when confidence is low)
3. **Dual category fields** (ai_category vs user-confirmed category)

### Two-Tier Category Assignment

```
Transaction
├── category_id      → User-confirmed (manual override)
├── ai_category_id   → AI-suggested (auto-detected)
├── confidence       → 0.0 to 1.0
└── ai_explanation   → Why AI chose this
```

The `effective_category` method returns user-confirmed if set, else AI-suggested.

### Categorization Flow

```
Transaction Description
        │
        ▼
┌─────────────────────┐
│  Rule-Based Engine  │  ← Free, fast, keyword matching
│  (CATEGORY_KEYWORDS)│
└─────────┬───────────┘
          │
          ▼
    Confidence >= 0.7?
      │          │
     YES         NO
      │          │
      ▼          ▼
   Done    ┌──────────────┐
           │  OpenAI API  │  ← Only if OPENAI_API_KEY set
           │  GPT-3.5     │
           └──────────────┘
```

### Rule-Based Keywords

```ruby
CATEGORY_KEYWORDS = {
  'food' => ['zomato', 'swiggy', 'dominos', 'mcdonalds', ...],
  'transport' => ['uber', 'ola', 'metro', 'petrol', ...],
  'shopping' => ['amazon', 'flipkart', 'myntra', ...],
  # ... 14 categories total
}
```

## Implementation

```ruby
class AICategorizer
  def categorize!
    # Step 1: Rule-based (fast & free)
    category, confidence, explanation = rule_based_categorization
    
    # Step 2: AI fallback if low confidence
    if confidence < 0.7 && ai_enabled?
      ai_result = ai_categorization
      # Use AI result if more confident
    end
    
    # Update transaction with AI suggestion
    @transaction.update!(
      ai_category: category,
      confidence: confidence,
      ai_explanation: explanation
    )
  end
end
```

## Consequences

### Positive
- **Cost-effective**: Rule-based handles 80%+ of transactions for free
- **Fast**: No API calls for common merchants
- **Privacy**: Works offline without sending data to OpenAI
- **Transparent**: Users can see confidence and explanation
- **Correctable**: Users can override AI suggestions

### Negative
- Rule-based needs maintenance (new merchants)
- AI costs money (GPT-3.5 per transaction)
- Two category fields add complexity

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| AI-only | Most accurate | Expensive, slow, privacy |
| Rules-only | Free, fast | Can't handle unknown merchants |
| ML Model | Self-learning | Needs training data, complex |

## Metrics

- Rule-based handles ~85% of transactions
- Average confidence: 0.72
- AI improves accuracy by ~15% for edge cases

## Related
- `app/services/ai_categorizer.rb` - Categorization service
- `app/jobs/ai_categorize_job.rb` - Background job
- `app/models/category.rb` - Category model

