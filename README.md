# StmtIQ - Expense Management & Bank Statement Parser

<div align="center">
  <h3>📊 Smart Expense Tracking from Your Bank Statements</h3>
  <p>Upload bank statements → Auto-parse transactions → AI categorization → Monthly reports to your CA</p>
</div>

---

## ✨ Features

### Phase 1: MVP (Current)
- **📤 Statement Upload**: Support for CSV, Excel (XLSX/XLS), and PDF formats
- **🔄 Auto Parsing**: Intelligent transaction extraction from statements
- **🤖 AI Categorization**: Rule-based + OpenAI-powered expense categorization
- **📈 Dashboard**: Visual overview of expenses and income
- **🔍 Transaction Search**: Filter and search transactions
- **📦 Export**: Download categorized transactions as CSV

### Phase 2: Coming Soon
- **📱 WhatsApp Integration**: Auto-send monthly summaries to your CA
- **🔗 Bank Aggregation**: Connect via Account Aggregator (Finvu)
- **📧 Email Ingestion**: Forward statement emails for auto-processing
- **📊 Advanced Reports**: CA-friendly summary PDFs

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Rails 8, Grape API, PostgreSQL |
| **Frontend** | React 19, TypeScript, TailwindCSS |
| **Background Jobs** | Sidekiq, Redis |
| **AI** | OpenAI GPT-3.5 (optional) |
| **Auth** | Auth0 |
| **Storage** | ActiveStorage (S3 or local) |

---

## 🚀 Quick Start

### Prerequisites

- Ruby 3.3.4+
- PostgreSQL 12+
- Node.js 16+ (18+ recommended)
- Bun (package manager)
- Redis (for background jobs)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd StmtIQ

# Install Ruby dependencies
bundle install

# Install JavaScript dependencies
bun install

# Setup database
rails db:create db:migrate db:seed

# Copy environment file
cp .env.example .env.development.local
# Edit .env.development.local with your values

# Build assets
bun run build
bun run build:css

# Start the server
bin/dev
```

The app will be available at `http://localhost:3000`

### Development Commands

```bash
# Start development server (Rails + JS + CSS watchers)
bin/dev

# Run Rails server only
rails s

# Watch JavaScript changes
bun run watch

# Watch CSS changes
bun run watch:css

# Build for production
bun run build
bun run build:css

# Start Sidekiq (for background jobs)
bundle exec sidekiq

# Rails console
rails c

# Run database migrations
rails db:migrate

# Seed the database
rails db:seed
```

---

## 📁 Project Structure

```
StmtIQ/
├── app/
│   ├── api/                    # Grape API endpoints
│   │   ├── base_api.rb         # Base API with auth helpers
│   │   └── v1/                 # API version 1
│   │       ├── accounts.rb
│   │       ├── categories.rb
│   │       ├── statements.rb
│   │       ├── transactions.rb
│   │       └── entities/       # API serializers
│   ├── javascript/             # React frontend
│   │   ├── application.tsx     # Entry point
│   │   ├── components/         # Shared components
│   │   └── pages/              # Page components
│   ├── jobs/                   # Background jobs
│   │   ├── statement_parser_job.rb
│   │   └── ai_categorize_job.rb
│   ├── models/                 # ActiveRecord models
│   │   ├── user.rb
│   │   ├── account.rb
│   │   ├── statement.rb
│   │   ├── transaction.rb
│   │   └── category.rb
│   └── services/               # Business logic
│       ├── statement_parser.rb
│       └── ai_categorizer.rb
├── config/
│   └── routes.rb
├── db/
│   ├── migrate/
│   └── seeds.rb
└── public/
    └── api-spec-generated.json
```

---

## 🔌 API Endpoints

### Authentication
All API endpoints (except `/health`) require a Bearer token in the Authorization header.

For development, use `Bearer dev_<any_string>` to auto-create a dev user.

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/health` | Health check |
| `GET` | `/api/v1/users/me` | Get current user |
| `GET` | `/api/v1/accounts` | List accounts |
| `POST` | `/api/v1/accounts` | Create account |
| `GET` | `/api/v1/statements` | List statements |
| `POST` | `/api/v1/statements` | Upload statement |
| `GET` | `/api/v1/transactions` | List transactions |
| `PATCH` | `/api/v1/transactions/:id` | Update transaction |
| `GET` | `/api/v1/transactions/stats` | Get statistics |
| `GET` | `/api/v1/categories` | List categories |

### Example: Upload Statement

```bash
curl -X POST http://localhost:3000/api/v1/statements \
  -H "Authorization: Bearer dev_user" \
  -F "file=@bank_statement.csv"
```

---

## 🧠 AI Categorization

The categorizer uses a two-step approach:

1. **Rule-based** (fast, free): Keyword matching for common merchants
   - Zomato, Swiggy → Food
   - Uber, Ola → Transport
   - Amazon, Flipkart → Shopping
   - etc.

2. **AI-based** (for unknowns): OpenAI GPT-3.5 for uncertain transactions
   - Only used when keyword confidence is low
   - Requires `OPENAI_API_KEY` environment variable

---

## 📱 WhatsApp Integration (Future)

To enable auto-sending monthly summaries to your CA:

1. Set up WhatsApp Business Platform account
2. Get approved message templates
3. Configure in Settings → CA Integration
4. Summaries sent automatically on the 1st of each month

---

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH0_DOMAIN` | Yes | Auth0 tenant domain |
| `AUTH0_CLIENT_ID` | Yes | Auth0 client ID |
| `AUTH0_CLIENT_SECRET` | Yes | Auth0 client secret |
| `REDIS_URL` | For jobs | Redis connection string |
| `OPENAI_API_KEY` | Optional | For AI categorization |
| `AWS_ACCESS_KEY_ID` | Optional | For S3 storage |
| `AWS_SECRET_ACCESS_KEY` | Optional | For S3 storage |

---

## 📝 Supported Statement Formats

| Format | Support Level | Notes |
|--------|---------------|-------|
| CSV | ⭐⭐⭐ Excellent | Best for accuracy |
| XLSX | ⭐⭐⭐ Excellent | Excel 2007+ |
| XLS | ⭐⭐ Good | Legacy Excel |
| PDF | ⭐ Basic | Text-based PDFs only |

**Pro Tip**: Download your statements as CSV from your bank's netbanking for best results.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">
  <p>Built with ❤️ for simpler expense management</p>
</div>
