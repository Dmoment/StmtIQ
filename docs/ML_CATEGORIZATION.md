# ML Categorization System

## Architecture Overview

The ML categorization system follows a **triage approach**:
1. **Rules** (fast, free) → 40-70% of transactions
2. **Embeddings** (similarity search) → 20-30% of transactions  
3. **LLM** (fallback) → <10% of transactions

## Components

### 1. Normalization Service (`ML::NormalizationService`)
**Purpose**: Clean and standardize transaction descriptions before ML processing.

**What it does**:
- Removes UPI patterns, reference numbers, dates, times, amounts
- Extracts merchant names
- Normalizes whitespace and special characters
- Returns clean, consistent text for ML processing

**Example**:
```ruby
ML::NormalizationService.normalize('UPI/8291932/Swiggy*Bangalore/food')
# => "swiggy food"
```

### 2. Rule Engine (`ML::RuleEngine`)
**Purpose**: Fast keyword-based categorization using regex/pattern matching.

**What it does**:
- Matches normalized descriptions against keyword rules
- Returns category with confidence (70-95%)
- Supports user-defined rules (future)
- Handles 40-70% of transactions instantly

**Example**:
```ruby
engine = ML::RuleEngine.new(transaction, user: user)
result = engine.categorize
# => { category: <Category>, confidence: 0.90, method: 'rule', explanation: '...' }
```

### 3. Embedding Service (`ML::EmbeddingService`)
**Purpose**: Vector similarity search for similar transactions.

**Status**: Placeholder (requires pgvector setup)

**What it will do**:
- Generate embeddings for normalized descriptions
- Store in `transaction_embeddings` table with pgvector
- Find nearest neighbors using cosine similarity
- Return category from most similar labeled transactions

### 4. LLM Service (`ML::LLMService`)
**Purpose**: Fallback for hard-to-categorize transactions.

**Status**: Placeholder (requires OpenAI API key)

**What it will do**:
- Call OpenAI API with structured prompt
- Force JSON output
- Batch similar transactions for efficiency
- Only used when rules + embeddings fail

### 5. Categorization Service (`ML::CategorizationService`)
**Purpose**: Main orchestrator that runs the triage pipeline.

**Flow**:
1. Normalize description
2. Try rules → if confidence >= 0.7, use it
3. Try embeddings → if confidence >= 0.75, use it
4. Try LLM → if confidence >= 0.5, use it
5. Update transaction with result

**Example**:
```ruby
service = ML::CategorizationService.new(transaction, user: user)
result = service.categorize!
# Updates transaction.ai_category, confidence, ai_explanation
```

## Jobs

### `ML::CategorizeTransactionJob`
Categorizes a single transaction.

### `ML::CategorizeBatchJob`
Categorizes a batch of transactions in chunks (100 per batch).

## Integration

The categorization is automatically triggered after parsing completes:

```ruby
# In StreamingParser
def parse!
  # ... parse transactions ...
  enqueue_categorization_jobs  # Enqueues ML::CategorizeBatchJob
end
```

## Next Steps

1. **Set up pgvector**:
   - Add `pgvector` gem
   - Create migration for `transaction_embeddings` table
   - Implement embedding generation

2. **Complete LLM Service**:
   - Implement OpenAI API calls
   - Add batching logic
   - Handle rate limiting

3. **Feedback Loop**:
   - Create `UserRule` model for user-defined rules
   - Store user corrections as labeled examples
   - Update embeddings with new examples

4. **UI Updates**:
   - Show categorization method (rule/embedding/llm)
   - Display confidence scores
   - Allow users to correct categories

## Database Schema

### Existing Columns (in `transactions` table):
- `ai_category_id` - Category assigned by ML
- `confidence` - Confidence score (0.0 to 1.0)
- `ai_explanation` - Explanation of categorization
- `metadata` - Stores `categorization_method` and `normalized_description`

### Future Tables:
- `transaction_embeddings` - Vector storage for similarity search
- `user_rules` - User-defined categorization rules
- `labeled_examples` - User corrections for training

## Performance

- **Rules**: ~1-2ms per transaction (instant)
- **Embeddings**: ~10-50ms per transaction (with pgvector index)
- **LLM**: ~500-2000ms per transaction (API call)

**Target**: 90%+ of transactions categorized via rules/embeddings, <10% via LLM.

## Phase 2: Batch Optimizations

### BatchRuleEngine (`ML::BatchRuleEngine`)
Optimized rule matching using an inverted keyword index.

**How it works**:
1. Builds keyword → category index once
2. Processes all transactions against the index
3. O(n × k) complexity instead of O(n × m) where k=avg words, m=total keywords

**When to use**: Automatically used for batches >= 20 transactions.

### BatchEmbeddingService (`ML::BatchEmbeddingService`)
Batch similarity search for multiple transactions.

**How it works**:
1. Batch fetches embeddings from database
2. Runs similarity search for each transaction
3. Reduces database roundtrips by batching the embedding fetch

### Smart Batch Threshold
The `CategorizationService.categorize_batch` method automatically chooses:
- **Individual processing** for < 20 transactions (less overhead)
- **Batch processing** for >= 20 transactions (amortizes setup cost)

```ruby
# Force batch mode for testing
ML::CategorizationService.categorize_batch(
  transactions,
  options: { force_batch: true }
)
```

## Normalization Improvements

The `NormalizationService` now handles:
- **Concatenated company names**: "asianpaintsintdiv" → "asian paints interim dividend"
- **Financial abbreviations**: "intdiv" → "interim dividend", "div" → "dividend"
- **Brand name splitting**: Recognizes 40+ Indian company names

Example:
```ruby
ML::NormalizationService.normalize("ACH/ASIANPAINTSINTDIV/373954")
# => "asian paints interim dividend 373954"
```

