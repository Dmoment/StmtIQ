# ICICI Bank Statement Test Fixtures

Place your sample ICICI bank statement files in this folder for testing.

## Required Files

### Savings Account
| Filename | Format | Description |
|----------|--------|-------------|
| `icici_savings_sample.xlsx` | XLSX | Savings account detailed statement (primary format) |
| `icici_savings_sample.xls` | XLS | Savings account statement (legacy format) |
| `icici_savings_sample.csv` | CSV | Savings account statement (optional) |

### Current Account
| Filename | Format | Description |
|----------|--------|-------------|
| `icici_current_sample.xls` | XLS | Current account statement (primary format) |
| `icici_current_sample.xlsx` | XLSX | Current account statement (optional) |

### Credit Card
| Filename | Format | Description |
|----------|--------|-------------|
| `icici_credit_card_sample.csv` | CSV | Credit card statement (primary format) |
| `icici_credit_card_sample.xls` | XLS | Credit card statement (optional) |

## Expected Column Format

### Savings Account (Separate Withdrawal/Deposit columns)
```
| S No. | Value Date | Transaction Date | Cheque Number | Transaction Remarks | Withdrawal Amount(INR) | Deposit Amount(INR) | Balance(INR) |
|-------|------------|------------------|---------------|---------------------|------------------------|---------------------|--------------|
| 1     | 01/11/2025 | 01/11/2025       |               | UPI/Swiggy/...      | 388.00                 | 0.00                | 25379.16     |
```

### Current Account (Single Amount + Cr/Dr indicator)
```
| Transaction ID | Value Date | Description | Transaction Amount(INR) | Cr/Dr | Available Balance(INR) |
|----------------|------------|-------------|-------------------------|-------|------------------------|
| TXN123456      | 01/11/2025 | Payment...  | 5000.00                 | DR    | 125000.00              |
```

### Credit Card (CSV with BillingAmountSign)
```
Accountno:,0000000017275343
Customer Name:,MR DEEPAK CHAUHAN
Address:,...

Transaction Details:
Date,Sr.No.,Transaction Details,Reward Point Header,Intl.Amount,Amount(in Rs),BillingAmountSign
01/11/2025,12261482250,RENDER.COM RENDER.COM US*,70,39.87,3688.00,
05/11/2025,12276601525,INFINITY PAYMENT RECEIVED THANK YOU,0,0,7347.15,CR
```

**BillingAmountSign values:**
- Empty/blank = Debit (purchase, charge)
- `CR` = Credit (payment received, refund)

## Data Privacy

⚠️ **IMPORTANT**: 
- These files are in `.gitignore` and will NOT be committed
- Remove or anonymize any sensitive personal information
- Consider using sample/test data rather than real statements

## Running Tests

```bash
# Run all parser tests
bundle exec rspec spec/services/bank_parsers/icici/

# Run only savings parser tests
bundle exec rspec spec/services/bank_parsers/icici/savings_parser_spec.rb

# Run only current parser tests
bundle exec rspec spec/services/bank_parsers/icici/current_parser_spec.rb

# Run only credit card parser tests
bundle exec rspec spec/services/bank_parsers/icici/credit_card_parser_spec.rb

# Run with verbose output
bundle exec rspec spec/services/bank_parsers/icici/ --format documentation
```

## Adding New Test Cases

1. Add your statement file to this folder
2. Update the spec file to include tests for specific transactions
3. Run tests to verify parsing works correctly

