SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    name character varying,
    bank_name character varying,
    account_number_last4 character varying,
    account_type character varying,
    currency character varying,
    is_active boolean,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.accounts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.accounts_id_seq OWNED BY public.accounts.id;


--
-- Name: active_storage_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.active_storage_attachments (
    id bigint NOT NULL,
    name character varying NOT NULL,
    record_type character varying NOT NULL,
    record_id bigint NOT NULL,
    blob_id bigint NOT NULL,
    created_at timestamp(6) without time zone NOT NULL
);


--
-- Name: active_storage_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.active_storage_attachments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: active_storage_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.active_storage_attachments_id_seq OWNED BY public.active_storage_attachments.id;


--
-- Name: active_storage_blobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.active_storage_blobs (
    id bigint NOT NULL,
    key character varying NOT NULL,
    filename character varying NOT NULL,
    content_type character varying,
    metadata text,
    service_name character varying NOT NULL,
    byte_size bigint NOT NULL,
    checksum character varying,
    created_at timestamp(6) without time zone NOT NULL
);


--
-- Name: active_storage_blobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.active_storage_blobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: active_storage_blobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.active_storage_blobs_id_seq OWNED BY public.active_storage_blobs.id;


--
-- Name: active_storage_variant_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.active_storage_variant_records (
    id bigint NOT NULL,
    blob_id bigint NOT NULL,
    variation_digest character varying NOT NULL
);


--
-- Name: active_storage_variant_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.active_storage_variant_records_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: active_storage_variant_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.active_storage_variant_records_id_seq OWNED BY public.active_storage_variant_records.id;


--
-- Name: ar_internal_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ar_internal_metadata (
    key character varying NOT NULL,
    value character varying,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: bank_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_templates (
    id bigint NOT NULL,
    bank_name character varying NOT NULL,
    bank_code character varying NOT NULL,
    account_type character varying NOT NULL,
    file_format character varying NOT NULL,
    logo_url character varying,
    description text,
    column_mappings jsonb DEFAULT '{}'::jsonb,
    parser_config jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: bank_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bank_templates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bank_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bank_templates_id_seq OWNED BY public.bank_templates.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id bigint NOT NULL,
    name character varying,
    slug character varying,
    icon character varying,
    color character varying,
    parent_id integer,
    is_system boolean,
    description text,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: global_patterns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_patterns (
    id bigint NOT NULL,
    pattern character varying NOT NULL,
    pattern_type character varying DEFAULT 'keyword'::character varying,
    category_id bigint NOT NULL,
    occurrence_count integer DEFAULT 1,
    user_count integer DEFAULT 1,
    agreement_count integer DEFAULT 1,
    is_verified boolean DEFAULT false,
    verified_at timestamp(6) without time zone,
    match_count integer DEFAULT 0,
    last_matched_at timestamp(6) without time zone,
    source character varying DEFAULT 'llm_auto'::character varying,
    user_ids jsonb DEFAULT '[]'::jsonb,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: global_patterns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.global_patterns_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: global_patterns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.global_patterns_id_seq OWNED BY public.global_patterns.id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    account_id bigint,
    source character varying DEFAULT 'upload'::character varying NOT NULL,
    gmail_message_id character varying,
    vendor_name character varying,
    vendor_gstin character varying(20),
    invoice_number character varying(100),
    invoice_date date,
    total_amount numeric(15,2),
    currency character varying(3) DEFAULT 'INR'::character varying,
    extracted_data jsonb DEFAULT '{}'::jsonb,
    extraction_method character varying(20),
    extraction_confidence numeric(3,2),
    status character varying DEFAULT 'pending'::character varying NOT NULL,
    matched_transaction_id bigint,
    match_confidence numeric(3,2),
    matched_at timestamp(6) without time zone,
    matched_by character varying(20),
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoices_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: labeled_examples; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.labeled_examples (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    category_id bigint NOT NULL,
    transaction_id bigint,
    description text NOT NULL,
    normalized_description character varying,
    source character varying DEFAULT 'user_feedback'::character varying,
    amount numeric,
    transaction_type character varying,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    embedding public.vector,
    subcategory_id bigint
);


--
-- Name: labeled_examples_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.labeled_examples_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: labeled_examples_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.labeled_examples_id_seq OWNED BY public.labeled_examples.id;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: statement_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.statement_analytics (
    id bigint NOT NULL,
    statement_id bigint NOT NULL,
    computed_at timestamp(6) without time zone,
    monthly_spend jsonb DEFAULT '{}'::jsonb,
    category_breakdown jsonb DEFAULT '{}'::jsonb,
    merchant_breakdown jsonb DEFAULT '{}'::jsonb,
    recurring_expenses jsonb DEFAULT '{}'::jsonb,
    silent_drains jsonb DEFAULT '{}'::jsonb,
    weekend_weekday jsonb DEFAULT '{}'::jsonb,
    largest_expense jsonb DEFAULT '{}'::jsonb,
    income_expense_ratio jsonb DEFAULT '{}'::jsonb,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    status integer DEFAULT 0 NOT NULL,
    error_message text,
    started_at timestamp(6) without time zone
);


--
-- Name: statement_analytics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.statement_analytics_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: statement_analytics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.statement_analytics_id_seq OWNED BY public.statement_analytics.id;


--
-- Name: statements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.statements (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    account_id bigint,
    file_name character varying,
    file_type character varying,
    status character varying,
    parsed_at timestamp(6) without time zone,
    error_message text,
    metadata jsonb,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    bank_template_id bigint
);


--
-- Name: statements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.statements_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: statements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.statements_id_seq OWNED BY public.statements.id;


--
-- Name: subcategories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subcategories (
    id bigint NOT NULL,
    name character varying NOT NULL,
    slug character varying NOT NULL,
    description character varying,
    icon character varying,
    category_id bigint NOT NULL,
    keywords text[] DEFAULT '{}'::text[],
    display_order integer DEFAULT 0,
    is_default boolean DEFAULT false,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: subcategories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subcategories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subcategories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subcategories_id_seq OWNED BY public.subcategories.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id bigint NOT NULL,
    statement_id bigint,
    account_id bigint,
    user_id bigint NOT NULL,
    category_id bigint,
    transaction_date date,
    description text,
    original_description text,
    amount numeric,
    transaction_type character varying,
    balance numeric,
    reference character varying,
    ai_category_id integer,
    confidence numeric,
    ai_explanation text,
    is_reviewed boolean,
    metadata jsonb,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    embedding public.vector,
    categorization_status character varying DEFAULT 'pending'::character varying,
    embedding_generated_at timestamp(6) without time zone,
    subcategory_id bigint,
    counterparty_name character varying,
    tx_kind character varying,
    invoice_id bigint
);


--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: user_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_rules (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    category_id bigint NOT NULL,
    pattern character varying NOT NULL,
    pattern_type character varying DEFAULT 'keyword'::character varying,
    match_field character varying DEFAULT 'description'::character varying,
    amount_min numeric,
    amount_max numeric,
    is_active boolean DEFAULT true,
    priority integer DEFAULT 0,
    match_count integer DEFAULT 0,
    last_matched_at timestamp(6) without time zone,
    source_transaction_id bigint,
    source character varying DEFAULT 'manual'::character varying,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    subcategory_id bigint
);


--
-- Name: user_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_rules_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_rules_id_seq OWNED BY public.user_rules.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    email character varying,
    name character varying,
    avatar_url character varying,
    settings jsonb,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    phone_number character varying,
    phone_verified boolean DEFAULT false,
    otp_code character varying,
    otp_expires_at timestamp(6) without time zone,
    session_token character varying,
    session_expires_at timestamp(6) without time zone,
    last_login_at timestamp(6) without time zone
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: accounts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts ALTER COLUMN id SET DEFAULT nextval('public.accounts_id_seq'::regclass);


--
-- Name: active_storage_attachments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_storage_attachments ALTER COLUMN id SET DEFAULT nextval('public.active_storage_attachments_id_seq'::regclass);


--
-- Name: active_storage_blobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_storage_blobs ALTER COLUMN id SET DEFAULT nextval('public.active_storage_blobs_id_seq'::regclass);


--
-- Name: active_storage_variant_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_storage_variant_records ALTER COLUMN id SET DEFAULT nextval('public.active_storage_variant_records_id_seq'::regclass);


--
-- Name: bank_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_templates ALTER COLUMN id SET DEFAULT nextval('public.bank_templates_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: global_patterns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_patterns ALTER COLUMN id SET DEFAULT nextval('public.global_patterns_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: labeled_examples id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labeled_examples ALTER COLUMN id SET DEFAULT nextval('public.labeled_examples_id_seq'::regclass);


--
-- Name: statement_analytics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statement_analytics ALTER COLUMN id SET DEFAULT nextval('public.statement_analytics_id_seq'::regclass);


--
-- Name: statements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statements ALTER COLUMN id SET DEFAULT nextval('public.statements_id_seq'::regclass);


--
-- Name: subcategories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcategories ALTER COLUMN id SET DEFAULT nextval('public.subcategories_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Name: user_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_rules ALTER COLUMN id SET DEFAULT nextval('public.user_rules_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: active_storage_attachments active_storage_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_storage_attachments
    ADD CONSTRAINT active_storage_attachments_pkey PRIMARY KEY (id);


--
-- Name: active_storage_blobs active_storage_blobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_storage_blobs
    ADD CONSTRAINT active_storage_blobs_pkey PRIMARY KEY (id);


--
-- Name: active_storage_variant_records active_storage_variant_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_storage_variant_records
    ADD CONSTRAINT active_storage_variant_records_pkey PRIMARY KEY (id);


--
-- Name: ar_internal_metadata ar_internal_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ar_internal_metadata
    ADD CONSTRAINT ar_internal_metadata_pkey PRIMARY KEY (key);


--
-- Name: bank_templates bank_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_templates
    ADD CONSTRAINT bank_templates_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: global_patterns global_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_patterns
    ADD CONSTRAINT global_patterns_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: labeled_examples labeled_examples_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labeled_examples
    ADD CONSTRAINT labeled_examples_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: statement_analytics statement_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statement_analytics
    ADD CONSTRAINT statement_analytics_pkey PRIMARY KEY (id);


--
-- Name: statements statements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statements
    ADD CONSTRAINT statements_pkey PRIMARY KEY (id);


--
-- Name: subcategories subcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: user_rules user_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_rules
    ADD CONSTRAINT user_rules_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_bank_templates_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_bank_templates_unique ON public.bank_templates USING btree (bank_code, account_type, file_format);


--
-- Name: idx_labeled_examples_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_labeled_examples_unique ON public.labeled_examples USING btree (user_id, normalized_description);


--
-- Name: idx_labeled_examples_user_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_labeled_examples_user_category ON public.labeled_examples USING btree (user_id, category_id);


--
-- Name: idx_transactions_needs_embedding; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_needs_embedding ON public.transactions USING btree (embedding_generated_at) WHERE (embedding_generated_at IS NULL);


--
-- Name: idx_transactions_user_embedding_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_user_embedding_status ON public.transactions USING btree (user_id, embedding_generated_at);


--
-- Name: idx_user_rules_category_subcategory; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_rules_category_subcategory ON public.user_rules USING btree (category_id, subcategory_id);


--
-- Name: idx_user_rules_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_rules_lookup ON public.user_rules USING btree (user_id, is_active, priority);


--
-- Name: idx_user_rules_unique_pattern; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_user_rules_unique_pattern ON public.user_rules USING btree (user_id, pattern);


--
-- Name: index_accounts_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_accounts_on_user_id ON public.accounts USING btree (user_id);


--
-- Name: index_active_storage_attachments_on_blob_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_active_storage_attachments_on_blob_id ON public.active_storage_attachments USING btree (blob_id);


--
-- Name: index_active_storage_attachments_uniqueness; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_active_storage_attachments_uniqueness ON public.active_storage_attachments USING btree (record_type, record_id, name, blob_id);


--
-- Name: index_active_storage_blobs_on_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_active_storage_blobs_on_key ON public.active_storage_blobs USING btree (key);


--
-- Name: index_active_storage_variant_records_uniqueness; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_active_storage_variant_records_uniqueness ON public.active_storage_variant_records USING btree (blob_id, variation_digest);


--
-- Name: index_bank_templates_on_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_bank_templates_on_is_active ON public.bank_templates USING btree (is_active);


--
-- Name: index_global_patterns_on_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_global_patterns_on_category_id ON public.global_patterns USING btree (category_id);


--
-- Name: index_global_patterns_on_is_verified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_global_patterns_on_is_verified ON public.global_patterns USING btree (is_verified);


--
-- Name: index_global_patterns_on_is_verified_and_pattern; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_global_patterns_on_is_verified_and_pattern ON public.global_patterns USING btree (is_verified, pattern);


--
-- Name: index_global_patterns_on_pattern; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_global_patterns_on_pattern ON public.global_patterns USING btree (pattern);


--
-- Name: index_global_patterns_on_pattern_and_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_global_patterns_on_pattern_and_category_id ON public.global_patterns USING btree (pattern, category_id);


--
-- Name: index_invoices_on_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoices_on_account_id ON public.invoices USING btree (account_id);


--
-- Name: index_invoices_on_gmail_message_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoices_on_gmail_message_id ON public.invoices USING btree (gmail_message_id) WHERE (gmail_message_id IS NOT NULL);


--
-- Name: index_invoices_on_matched_transaction_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_invoices_on_matched_transaction_id ON public.invoices USING btree (matched_transaction_id) WHERE (matched_transaction_id IS NOT NULL);


--
-- Name: index_invoices_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoices_on_user_id ON public.invoices USING btree (user_id);


--
-- Name: index_invoices_on_user_id_and_invoice_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoices_on_user_id_and_invoice_date ON public.invoices USING btree (user_id, invoice_date);


--
-- Name: index_invoices_on_user_id_and_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoices_on_user_id_and_status ON public.invoices USING btree (user_id, status);


--
-- Name: index_invoices_on_user_id_and_total_amount; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoices_on_user_id_and_total_amount ON public.invoices USING btree (user_id, total_amount);


--
-- Name: index_labeled_examples_on_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_labeled_examples_on_category_id ON public.labeled_examples USING btree (category_id);


--
-- Name: index_labeled_examples_on_subcategory_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_labeled_examples_on_subcategory_id ON public.labeled_examples USING btree (subcategory_id);


--
-- Name: index_labeled_examples_on_transaction_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_labeled_examples_on_transaction_id ON public.labeled_examples USING btree (transaction_id);


--
-- Name: index_labeled_examples_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_labeled_examples_on_user_id ON public.labeled_examples USING btree (user_id);


--
-- Name: index_statement_analytics_on_computed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_statement_analytics_on_computed_at ON public.statement_analytics USING btree (computed_at);


--
-- Name: index_statement_analytics_on_statement_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_statement_analytics_on_statement_id ON public.statement_analytics USING btree (statement_id);


--
-- Name: index_statement_analytics_on_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_statement_analytics_on_status ON public.statement_analytics USING btree (status);


--
-- Name: index_statements_on_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_statements_on_account_id ON public.statements USING btree (account_id);


--
-- Name: index_statements_on_bank_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_statements_on_bank_template_id ON public.statements USING btree (bank_template_id);


--
-- Name: index_statements_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_statements_on_user_id ON public.statements USING btree (user_id);


--
-- Name: index_subcategories_on_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_subcategories_on_category_id ON public.subcategories USING btree (category_id);


--
-- Name: index_subcategories_on_category_id_and_is_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_subcategories_on_category_id_and_is_default ON public.subcategories USING btree (category_id, is_default);


--
-- Name: index_subcategories_on_category_id_and_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_subcategories_on_category_id_and_slug ON public.subcategories USING btree (category_id, slug);


--
-- Name: index_subcategories_on_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_subcategories_on_slug ON public.subcategories USING btree (slug);


--
-- Name: index_transactions_on_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_transactions_on_account_id ON public.transactions USING btree (account_id);


--
-- Name: index_transactions_on_categorization_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_transactions_on_categorization_status ON public.transactions USING btree (categorization_status);


--
-- Name: index_transactions_on_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_transactions_on_category_id ON public.transactions USING btree (category_id);


--
-- Name: index_transactions_on_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_transactions_on_invoice_id ON public.transactions USING btree (invoice_id);


--
-- Name: index_transactions_on_statement_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_transactions_on_statement_id ON public.transactions USING btree (statement_id);


--
-- Name: index_transactions_on_subcategory_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_transactions_on_subcategory_id ON public.transactions USING btree (subcategory_id);


--
-- Name: index_transactions_on_transaction_type_and_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_transactions_on_transaction_type_and_category_id ON public.transactions USING btree (transaction_type, category_id);


--
-- Name: index_transactions_on_tx_kind; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_transactions_on_tx_kind ON public.transactions USING btree (tx_kind);


--
-- Name: index_transactions_on_user_and_ai_category_with_embedding; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_transactions_on_user_and_ai_category_with_embedding ON public.transactions USING btree (user_id, ai_category_id) WHERE (embedding IS NOT NULL);


--
-- Name: index_transactions_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_transactions_on_user_id ON public.transactions USING btree (user_id);


--
-- Name: index_transactions_on_user_id_and_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_transactions_on_user_id_and_category_id ON public.transactions USING btree (user_id, category_id);


--
-- Name: index_transactions_on_user_id_and_transaction_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_transactions_on_user_id_and_transaction_date ON public.transactions USING btree (user_id, transaction_date);


--
-- Name: index_transactions_on_user_id_and_transaction_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_transactions_on_user_id_and_transaction_type ON public.transactions USING btree (user_id, transaction_type);


--
-- Name: index_user_rules_on_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_user_rules_on_category_id ON public.user_rules USING btree (category_id);


--
-- Name: index_user_rules_on_subcategory_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_user_rules_on_subcategory_id ON public.user_rules USING btree (subcategory_id);


--
-- Name: index_user_rules_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_user_rules_on_user_id ON public.user_rules USING btree (user_id);


--
-- Name: index_users_on_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_email ON public.users USING btree (email) WHERE (email IS NOT NULL);


--
-- Name: index_users_on_phone_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_phone_number ON public.users USING btree (phone_number);


--
-- Name: index_users_on_session_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_session_token ON public.users USING btree (session_token);


--
-- Name: transactions fk_rails_01f020e267; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT fk_rails_01f020e267 FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: transactions fk_rails_0ea2ad3927; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT fk_rails_0ea2ad3927 FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: statements fk_rails_1e0d2f384b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statements
    ADD CONSTRAINT fk_rails_1e0d2f384b FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: transactions fk_rails_2eace94480; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT fk_rails_2eace94480 FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id);


--
-- Name: user_rules fk_rails_35d10e41ba; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_rules
    ADD CONSTRAINT fk_rails_35d10e41ba FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: labeled_examples fk_rails_381194130c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labeled_examples
    ADD CONSTRAINT fk_rails_381194130c FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: subcategories fk_rails_3937626525; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT fk_rails_3937626525 FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: invoices fk_rails_3d1522a0d8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT fk_rails_3d1522a0d8 FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: transactions fk_rails_498dcead48; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT fk_rails_498dcead48 FOREIGN KEY (statement_id) REFERENCES public.statements(id);


--
-- Name: labeled_examples fk_rails_4b97493024; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labeled_examples
    ADD CONSTRAINT fk_rails_4b97493024 FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;


--
-- Name: global_patterns fk_rails_64078cc42b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_patterns
    ADD CONSTRAINT fk_rails_64078cc42b FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: transactions fk_rails_6b611ee905; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT fk_rails_6b611ee905 FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;


--
-- Name: transactions fk_rails_77364e6416; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT fk_rails_77364e6416 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: statements fk_rails_820ad8a5f2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statements
    ADD CONSTRAINT fk_rails_820ad8a5f2 FOREIGN KEY (bank_template_id) REFERENCES public.bank_templates(id);


--
-- Name: labeled_examples fk_rails_828bad4e4d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labeled_examples
    ADD CONSTRAINT fk_rails_828bad4e4d FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id);


--
-- Name: statements fk_rails_85c9cf238e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statements
    ADD CONSTRAINT fk_rails_85c9cf238e FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: active_storage_variant_records fk_rails_993965df05; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_storage_variant_records
    ADD CONSTRAINT fk_rails_993965df05 FOREIGN KEY (blob_id) REFERENCES public.active_storage_blobs(id);


--
-- Name: invoices fk_rails_a142a0908a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT fk_rails_a142a0908a FOREIGN KEY (matched_transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;


--
-- Name: labeled_examples fk_rails_a66953f4e1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labeled_examples
    ADD CONSTRAINT fk_rails_a66953f4e1 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: invoices fk_rails_afb4b1e584; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT fk_rails_afb4b1e584 FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: accounts fk_rails_b1e30bebc8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT fk_rails_b1e30bebc8 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_rules fk_rails_bdc8651a4e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_rules
    ADD CONSTRAINT fk_rails_bdc8651a4e FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: statement_analytics fk_rails_bf562900fb; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statement_analytics
    ADD CONSTRAINT fk_rails_bf562900fb FOREIGN KEY (statement_id) REFERENCES public.statements(id);


--
-- Name: active_storage_attachments fk_rails_c3b3935057; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_storage_attachments
    ADD CONSTRAINT fk_rails_c3b3935057 FOREIGN KEY (blob_id) REFERENCES public.active_storage_blobs(id);


--
-- Name: user_rules fk_rails_d25e6ddd6c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_rules
    ADD CONSTRAINT fk_rails_d25e6ddd6c FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id);


--
-- PostgreSQL database dump complete
--

SET search_path TO "$user", public;

INSERT INTO "schema_migrations" (version) VALUES
('20260107103522'),
('20260106180000'),
('20260105165646'),
('20260105160036'),
('20260105135242'),
('20260105104535'),
('20260103150000'),
('20260103100001'),
('20260103100000'),
('20260102173203'),
('20260101200433'),
('20260101195130'),
('20260101194935'),
('20260101130300'),
('20251227130925'),
('20251227130327'),
('20251227085447'),
('20251227070051'),
('20251227065952'),
('20251227065814'),
('20251227065729'),
('20251226192215'),
('20251226191431'),
('20251226191413'),
('20251226191358'),
('20251226191331'),
('20251226190222');

