# ADR-002: Bank Parser Architecture

## Status
Accepted

## Date
2024-12-26

## Context

StmtIQ needs to parse bank statements from multiple banks, each with:
- Different file formats (CSV, XLS, XLSX, PDF)
- Different column layouts and naming conventions
- Different date formats
- Different transaction type indicators (Cr/Dr, separate columns, etc.)

We needed an extensible architecture that:
1. Easily supports new banks
2. Handles format variations within the same bank
3. Separates configuration from parsing logic
4. Follows SOLID principles

## Decision

We implemented a **Template-based Parser Hierarchy** with:

1. **YAML Configuration** - Bank-specific column mappings and settings
2. **Abstract Base Parser** - Common utilities (amount parsing, date handling)
3. **Bank-specific Base** - Shared logic per bank (e.g., ICICI date formats)
4. **Account-type Parsers** - Specific logic (Savings vs Credit Card)

### Architecture Diagram

```
                    BaseParser (Abstract)
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    BaseIciciParser  BaseHdfcParser  BaseSbiParser
          │               │               │
    ┌─────┼─────┐         │               │
    ▼     ▼     ▼         ▼               ▼
Savings Current CC    HdfcParser     SbiParser
Parser  Parser  Parser
```

### Configuration-Driven

```yaml
# config/bank_templates/icici.yml
column_mappings:
  date: "Value Date"
  withdrawal: "Withdrawal Amount(INR)"
  deposit: "Deposit Amount(INR)"

parser_config:
  date_formats: ["%d/%m/%Y", "%d-%m-%Y"]
  header_indicators: ["S No.", "Value Date"]
```

## Implementation

```ruby
# Base parser with common utilities
class BaseParser
  def parse_amount(value)
  def clean_description(text)
  def valid_transaction_row?(data)
end

# Bank-specific base with shared logic
class BaseIciciParser < BaseParser
  def find_icici_header_row(sheet)
  def get_mapped_value(row, key)
  def parse_icici_date(value)
end

# Account-type specific logic
class SavingsParser < BaseIciciParser
  def extract_amount_from_separate_columns(row)
end
```

## Consequences

### Positive
- **Open/Closed**: Add new banks without modifying existing code
- **Single Responsibility**: Each parser handles one account type
- **DRY**: Common logic in base classes
- **Configurable**: Non-dev can update column mappings via YAML
- **Testable**: Each parser can be unit tested independently

### Negative
- More files to navigate
- Deep inheritance hierarchy (3-4 levels)
- Need to understand both code AND config

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| Single Parser | Simple | Massive switch statements |
| Plugin System | Very flexible | Over-engineered |
| AI-only Parsing | No templates needed | Expensive, unreliable |

## Related
- `app/services/bank_parsers/` - Parser implementations
- `config/bank_templates/*.yml` - Bank configurations
- `app/models/bank_template.rb` - Template model

