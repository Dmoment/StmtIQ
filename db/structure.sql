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
    updated_at timestamp(6) without time zone NOT NULL,
    workspace_id bigint
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
-- Name: business_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_profiles (
    id bigint NOT NULL,
    workspace_id bigint NOT NULL,
    business_name character varying NOT NULL,
    legal_name character varying,
    gstin character varying,
    pan_number character varying,
    address_line1 character varying,
    address_line2 character varying,
    city character varying,
    state character varying,
    state_code character varying(2),
    pincode character varying(10),
    country character varying DEFAULT 'India'::character varying,
    email character varying,
    phone character varying,
    bank_name character varying,
    account_number character varying,
    ifsc_code character varying,
    upi_id character varying,
    primary_color character varying DEFAULT '#f59e0b'::character varying,
    secondary_color character varying DEFAULT '#1e293b'::character varying,
    invoice_prefix character varying DEFAULT 'INV-'::character varying,
    invoice_next_number integer DEFAULT 1,
    default_payment_terms_days integer DEFAULT 30,
    default_notes text,
    default_terms text,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: business_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.business_profiles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: business_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.business_profiles_id_seq OWNED BY public.business_profiles.id;


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
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id bigint NOT NULL,
    workspace_id bigint NOT NULL,
    user_id bigint NOT NULL,
    name character varying NOT NULL,
    email character varying,
    phone character varying,
    company_name character varying,
    gstin character varying,
    billing_address_line1 character varying,
    billing_address_line2 character varying,
    billing_city character varying,
    billing_state character varying,
    billing_state_code character varying(2),
    billing_pincode character varying(10),
    billing_country character varying DEFAULT 'India'::character varying,
    shipping_address_line1 character varying,
    shipping_address_line2 character varying,
    shipping_city character varying,
    shipping_state character varying,
    shipping_state_code character varying(2),
    shipping_pincode character varying(10),
    shipping_country character varying,
    default_currency character varying DEFAULT 'INR'::character varying,
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clients_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


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
-- Name: gmail_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gmail_connections (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    email character varying NOT NULL,
    access_token text,
    refresh_token text,
    token_expires_at timestamp(6) without time zone,
    last_sync_at timestamp(6) without time zone,
    last_history_id character varying,
    sync_enabled boolean DEFAULT true NOT NULL,
    status character varying DEFAULT 'pending'::character varying NOT NULL,
    error_message text,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    workspace_id bigint
);


--
-- Name: gmail_connections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gmail_connections_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gmail_connections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gmail_connections_id_seq OWNED BY public.gmail_connections.id;


--
-- Name: invoice_line_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_line_items (
    id bigint NOT NULL,
    sales_invoice_id bigint NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    description character varying NOT NULL,
    hsn_sac_code character varying,
    quantity numeric(10,2) DEFAULT 1.0 NOT NULL,
    unit character varying DEFAULT 'units'::character varying,
    rate numeric(15,2) DEFAULT 0.0 NOT NULL,
    amount numeric(15,2) DEFAULT 0.0 NOT NULL,
    tax_rate numeric(5,2),
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: invoice_line_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoice_line_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoice_line_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invoice_line_items_id_seq OWNED BY public.invoice_line_items.id;


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
    updated_at timestamp(6) without time zone NOT NULL,
    workspace_id bigint
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
    subcategory_id bigint,
    workspace_id bigint
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
-- Name: recurring_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recurring_invoices (
    id bigint NOT NULL,
    workspace_id bigint NOT NULL,
    user_id bigint NOT NULL,
    client_id bigint NOT NULL,
    business_profile_id bigint NOT NULL,
    name character varying NOT NULL,
    frequency character varying NOT NULL,
    start_date date NOT NULL,
    end_date date,
    next_run_date date,
    status character varying DEFAULT 'active'::character varying NOT NULL,
    auto_send boolean DEFAULT false,
    send_days_before_due integer DEFAULT 0,
    template_data jsonb DEFAULT '{}'::jsonb,
    currency character varying DEFAULT 'INR'::character varying,
    payment_terms_days integer DEFAULT 30,
    tax_rate numeric(5,2),
    last_invoice_id bigint,
    invoice_count integer DEFAULT 0,
    last_run_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: recurring_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.recurring_invoices_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: recurring_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.recurring_invoices_id_seq OWNED BY public.recurring_invoices.id;


--
-- Name: sales_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_invoices (
    id bigint NOT NULL,
    workspace_id bigint NOT NULL,
    user_id bigint NOT NULL,
    client_id bigint NOT NULL,
    business_profile_id bigint NOT NULL,
    invoice_number character varying NOT NULL,
    status character varying DEFAULT 'draft'::character varying NOT NULL,
    invoice_date date NOT NULL,
    due_date date NOT NULL,
    currency character varying DEFAULT 'INR'::character varying NOT NULL,
    exchange_rate numeric(10,4) DEFAULT 1.0,
    exchange_rate_date date,
    subtotal numeric(15,2) DEFAULT 0.0,
    discount_amount numeric(15,2) DEFAULT 0.0,
    discount_type character varying DEFAULT 'fixed'::character varying,
    tax_type character varying,
    cgst_rate numeric(5,2),
    cgst_amount numeric(15,2) DEFAULT 0.0,
    sgst_rate numeric(5,2),
    sgst_amount numeric(15,2) DEFAULT 0.0,
    igst_rate numeric(5,2),
    igst_amount numeric(15,2) DEFAULT 0.0,
    total_amount numeric(15,2) DEFAULT 0.0,
    amount_paid numeric(15,2) DEFAULT 0.0,
    balance_due numeric(15,2) DEFAULT 0.0,
    notes text,
    terms text,
    primary_color character varying,
    secondary_color character varying,
    sent_at timestamp(6) without time zone,
    viewed_at timestamp(6) without time zone,
    paid_at timestamp(6) without time zone,
    pdf_generated_at timestamp(6) without time zone,
    recurring_invoice_id bigint,
    matched_transaction_id bigint,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: sales_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_invoices_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_invoices_id_seq OWNED BY public.sales_invoices.id;


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
    bank_template_id bigint,
    workspace_id bigint
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
    invoice_id bigint,
    workspace_id bigint
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
    subcategory_id bigint,
    workspace_id bigint
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
    last_login_at timestamp(6) without time zone,
    current_workspace_id bigint,
    clerk_id character varying,
    auth_provider character varying DEFAULT 'clerk'::character varying,
    onboarded_at timestamp(6) without time zone
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
-- Name: workspace_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_invitations (
    id bigint NOT NULL,
    workspace_id bigint NOT NULL,
    invited_by_id bigint NOT NULL,
    email character varying,
    phone_number character varying,
    role character varying NOT NULL,
    token character varying NOT NULL,
    status character varying DEFAULT 'pending'::character varying,
    expires_at timestamp(6) without time zone NOT NULL,
    accepted_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: workspace_invitations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workspace_invitations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workspace_invitations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workspace_invitations_id_seq OWNED BY public.workspace_invitations.id;


--
-- Name: workspace_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_memberships (
    id bigint NOT NULL,
    workspace_id bigint NOT NULL,
    user_id bigint NOT NULL,
    role character varying NOT NULL,
    status character varying DEFAULT 'active'::character varying,
    permissions jsonb DEFAULT '{}'::jsonb,
    joined_at timestamp(6) without time zone,
    last_accessed_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: workspace_memberships_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workspace_memberships_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workspace_memberships_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workspace_memberships_id_seq OWNED BY public.workspace_memberships.id;


--
-- Name: workspaces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspaces (
    id bigint NOT NULL,
    name character varying NOT NULL,
    slug character varying NOT NULL,
    workspace_type character varying NOT NULL,
    owner_id bigint NOT NULL,
    plan character varying DEFAULT 'free'::character varying,
    settings jsonb DEFAULT '{}'::jsonb,
    logo_url character varying,
    description text,
    is_active boolean DEFAULT true,
    deleted_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: workspaces_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workspaces_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workspaces_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workspaces_id_seq OWNED BY public.workspaces.id;


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
-- Name: business_profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_profiles ALTER COLUMN id SET DEFAULT nextval('public.business_profiles_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- Name: global_patterns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_patterns ALTER COLUMN id SET DEFAULT nextval('public.global_patterns_id_seq'::regclass);


--
-- Name: gmail_connections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmail_connections ALTER COLUMN id SET DEFAULT nextval('public.gmail_connections_id_seq'::regclass);


--
-- Name: invoice_line_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line_items ALTER COLUMN id SET DEFAULT nextval('public.invoice_line_items_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: labeled_examples id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labeled_examples ALTER COLUMN id SET DEFAULT nextval('public.labeled_examples_id_seq'::regclass);


--
-- Name: recurring_invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_invoices ALTER COLUMN id SET DEFAULT nextval('public.recurring_invoices_id_seq'::regclass);


--
-- Name: sales_invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices ALTER COLUMN id SET DEFAULT nextval('public.sales_invoices_id_seq'::regclass);


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
-- Name: workspace_invitations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_invitations ALTER COLUMN id SET DEFAULT nextval('public.workspace_invitations_id_seq'::regclass);


--
-- Name: workspace_memberships id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_memberships ALTER COLUMN id SET DEFAULT nextval('public.workspace_memberships_id_seq'::regclass);


--
-- Name: workspaces id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspaces ALTER COLUMN id SET DEFAULT nextval('public.workspaces_id_seq'::regclass);


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
-- Name: business_profiles business_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_profiles
    ADD CONSTRAINT business_profiles_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: global_patterns global_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_patterns
    ADD CONSTRAINT global_patterns_pkey PRIMARY KEY (id);


--
-- Name: gmail_connections gmail_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmail_connections
    ADD CONSTRAINT gmail_connections_pkey PRIMARY KEY (id);


--
-- Name: invoice_line_items invoice_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line_items
    ADD CONSTRAINT invoice_line_items_pkey PRIMARY KEY (id);


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
-- Name: recurring_invoices recurring_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_invoices
    ADD CONSTRAINT recurring_invoices_pkey PRIMARY KEY (id);


--
-- Name: sales_invoices sales_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_pkey PRIMARY KEY (id);


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
-- Name: workspace_invitations workspace_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_invitations
    ADD CONSTRAINT workspace_invitations_pkey PRIMARY KEY (id);


--
-- Name: workspace_memberships workspace_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_memberships
    ADD CONSTRAINT workspace_memberships_pkey PRIMARY KEY (id);


--
-- Name: workspaces workspaces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_pkey PRIMARY KEY (id);


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
-- Name: index_accounts_on_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_accounts_on_workspace_id ON public.accounts USING btree (workspace_id);


--
-- Name: index_accounts_on_workspace_id_and_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_accounts_on_workspace_id_and_user_id ON public.accounts USING btree (workspace_id, user_id);


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
-- Name: index_business_profiles_on_gstin; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_business_profiles_on_gstin ON public.business_profiles USING btree (gstin) WHERE (gstin IS NOT NULL);


--
-- Name: index_business_profiles_on_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_business_profiles_on_workspace_id ON public.business_profiles USING btree (workspace_id);


--
-- Name: index_clients_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_clients_on_user_id ON public.clients USING btree (user_id);


--
-- Name: index_clients_on_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_clients_on_workspace_id ON public.clients USING btree (workspace_id);


--
-- Name: index_clients_on_workspace_id_and_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_clients_on_workspace_id_and_email ON public.clients USING btree (workspace_id, email) WHERE (email IS NOT NULL);


--
-- Name: index_clients_on_workspace_id_and_gstin; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_clients_on_workspace_id_and_gstin ON public.clients USING btree (workspace_id, gstin) WHERE (gstin IS NOT NULL);


--
-- Name: index_clients_on_workspace_id_and_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_clients_on_workspace_id_and_is_active ON public.clients USING btree (workspace_id, is_active);


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
-- Name: index_gmail_connections_on_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_gmail_connections_on_email ON public.gmail_connections USING btree (email);


--
-- Name: index_gmail_connections_on_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_gmail_connections_on_status ON public.gmail_connections USING btree (status);


--
-- Name: index_gmail_connections_on_sync_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_gmail_connections_on_sync_enabled ON public.gmail_connections USING btree (sync_enabled);


--
-- Name: index_gmail_connections_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_gmail_connections_on_user_id ON public.gmail_connections USING btree (user_id);


--
-- Name: index_gmail_connections_on_user_id_and_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_gmail_connections_on_user_id_and_email ON public.gmail_connections USING btree (user_id, email);


--
-- Name: index_gmail_connections_on_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_gmail_connections_on_workspace_id ON public.gmail_connections USING btree (workspace_id);


--
-- Name: index_invoice_line_items_on_sales_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoice_line_items_on_sales_invoice_id ON public.invoice_line_items USING btree (sales_invoice_id);


--
-- Name: index_invoice_line_items_on_sales_invoice_id_and_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoice_line_items_on_sales_invoice_id_and_position ON public.invoice_line_items USING btree (sales_invoice_id, "position");


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
-- Name: index_invoices_on_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoices_on_workspace_id ON public.invoices USING btree (workspace_id);


--
-- Name: index_invoices_on_workspace_id_and_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoices_on_workspace_id_and_status ON public.invoices USING btree (workspace_id, status);


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
-- Name: index_labeled_examples_on_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_labeled_examples_on_workspace_id ON public.labeled_examples USING btree (workspace_id);


--
-- Name: index_recurring_invoices_on_business_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_recurring_invoices_on_business_profile_id ON public.recurring_invoices USING btree (business_profile_id);


--
-- Name: index_recurring_invoices_on_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_recurring_invoices_on_client_id ON public.recurring_invoices USING btree (client_id);


--
-- Name: index_recurring_invoices_on_last_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_recurring_invoices_on_last_invoice_id ON public.recurring_invoices USING btree (last_invoice_id);


--
-- Name: index_recurring_invoices_on_status_and_next_run_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_recurring_invoices_on_status_and_next_run_date ON public.recurring_invoices USING btree (status, next_run_date);


--
-- Name: index_recurring_invoices_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_recurring_invoices_on_user_id ON public.recurring_invoices USING btree (user_id);


--
-- Name: index_recurring_invoices_on_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_recurring_invoices_on_workspace_id ON public.recurring_invoices USING btree (workspace_id);


--
-- Name: index_recurring_invoices_on_workspace_id_and_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_recurring_invoices_on_workspace_id_and_status ON public.recurring_invoices USING btree (workspace_id, status);


--
-- Name: index_sales_invoices_on_business_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_sales_invoices_on_business_profile_id ON public.sales_invoices USING btree (business_profile_id);


--
-- Name: index_sales_invoices_on_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_sales_invoices_on_client_id ON public.sales_invoices USING btree (client_id);


--
-- Name: index_sales_invoices_on_client_id_and_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_sales_invoices_on_client_id_and_status ON public.sales_invoices USING btree (client_id, status);


--
-- Name: index_sales_invoices_on_matched_transaction_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_sales_invoices_on_matched_transaction_id ON public.sales_invoices USING btree (matched_transaction_id);


--
-- Name: index_sales_invoices_on_recurring_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_sales_invoices_on_recurring_invoice_id ON public.sales_invoices USING btree (recurring_invoice_id);


--
-- Name: index_sales_invoices_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_sales_invoices_on_user_id ON public.sales_invoices USING btree (user_id);


--
-- Name: index_sales_invoices_on_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_sales_invoices_on_workspace_id ON public.sales_invoices USING btree (workspace_id);


--
-- Name: index_sales_invoices_on_workspace_id_and_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_sales_invoices_on_workspace_id_and_due_date ON public.sales_invoices USING btree (workspace_id, due_date);


--
-- Name: index_sales_invoices_on_workspace_id_and_invoice_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_sales_invoices_on_workspace_id_and_invoice_date ON public.sales_invoices USING btree (workspace_id, invoice_date);


--
-- Name: index_sales_invoices_on_workspace_id_and_invoice_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_sales_invoices_on_workspace_id_and_invoice_number ON public.sales_invoices USING btree (workspace_id, invoice_number);


--
-- Name: index_sales_invoices_on_workspace_id_and_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_sales_invoices_on_workspace_id_and_status ON public.sales_invoices USING btree (workspace_id, status);


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
-- Name: index_statements_on_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_statements_on_workspace_id ON public.statements USING btree (workspace_id);


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
-- Name: index_transactions_on_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_transactions_on_workspace_id ON public.transactions USING btree (workspace_id);


--
-- Name: index_transactions_on_workspace_id_and_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_transactions_on_workspace_id_and_category_id ON public.transactions USING btree (workspace_id, category_id);


--
-- Name: index_transactions_on_workspace_id_and_transaction_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_transactions_on_workspace_id_and_transaction_date ON public.transactions USING btree (workspace_id, transaction_date);


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
-- Name: index_user_rules_on_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_user_rules_on_workspace_id ON public.user_rules USING btree (workspace_id);


--
-- Name: index_users_on_clerk_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_clerk_id ON public.users USING btree (clerk_id) WHERE (clerk_id IS NOT NULL);


--
-- Name: index_users_on_current_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_users_on_current_workspace_id ON public.users USING btree (current_workspace_id);


--
-- Name: index_users_on_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_email ON public.users USING btree (email) WHERE (email IS NOT NULL);


--
-- Name: index_users_on_phone_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_phone_number ON public.users USING btree (phone_number) WHERE (phone_number IS NOT NULL);


--
-- Name: index_users_on_session_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_session_token ON public.users USING btree (session_token);


--
-- Name: index_workspace_invitations_on_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_workspace_invitations_on_email ON public.workspace_invitations USING btree (email);


--
-- Name: index_workspace_invitations_on_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_workspace_invitations_on_expires_at ON public.workspace_invitations USING btree (expires_at);


--
-- Name: index_workspace_invitations_on_phone_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_workspace_invitations_on_phone_number ON public.workspace_invitations USING btree (phone_number);


--
-- Name: index_workspace_invitations_on_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_workspace_invitations_on_status ON public.workspace_invitations USING btree (status);


--
-- Name: index_workspace_invitations_on_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_workspace_invitations_on_token ON public.workspace_invitations USING btree (token);


--
-- Name: index_workspace_invitations_on_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_workspace_invitations_on_workspace_id ON public.workspace_invitations USING btree (workspace_id);


--
-- Name: index_workspace_memberships_on_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_workspace_memberships_on_role ON public.workspace_memberships USING btree (role);


--
-- Name: index_workspace_memberships_on_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_workspace_memberships_on_status ON public.workspace_memberships USING btree (status);


--
-- Name: index_workspace_memberships_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_workspace_memberships_on_user_id ON public.workspace_memberships USING btree (user_id);


--
-- Name: index_workspace_memberships_on_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_workspace_memberships_on_workspace_id ON public.workspace_memberships USING btree (workspace_id);


--
-- Name: index_workspace_memberships_on_workspace_id_and_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_workspace_memberships_on_workspace_id_and_user_id ON public.workspace_memberships USING btree (workspace_id, user_id);


--
-- Name: index_workspaces_on_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_workspaces_on_deleted_at ON public.workspaces USING btree (deleted_at);


--
-- Name: index_workspaces_on_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_workspaces_on_owner_id ON public.workspaces USING btree (owner_id);


--
-- Name: index_workspaces_on_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_workspaces_on_slug ON public.workspaces USING btree (slug);


--
-- Name: index_workspaces_on_workspace_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_workspaces_on_workspace_type ON public.workspaces USING btree (workspace_type);


--
-- Name: transactions fk_rails_01f020e267; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT fk_rails_01f020e267 FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: recurring_invoices fk_rails_0dfff2eedb; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_invoices
    ADD CONSTRAINT fk_rails_0dfff2eedb FOREIGN KEY (business_profile_id) REFERENCES public.business_profiles(id);


--
-- Name: transactions fk_rails_0ea2ad3927; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT fk_rails_0ea2ad3927 FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: recurring_invoices fk_rails_0ead1458fc; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_invoices
    ADD CONSTRAINT fk_rails_0ead1458fc FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: gmail_connections fk_rails_178f034934; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmail_connections
    ADD CONSTRAINT fk_rails_178f034934 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: statements fk_rails_1e0d2f384b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statements
    ADD CONSTRAINT fk_rails_1e0d2f384b FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: invoices fk_rails_2013e671f4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT fk_rails_2013e671f4 FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);


--
-- Name: sales_invoices fk_rails_208ee73ab2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT fk_rails_208ee73ab2 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: clients fk_rails_21c421fd41; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT fk_rails_21c421fd41 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: users fk_rails_22595f83be; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_rails_22595f83be FOREIGN KEY (current_workspace_id) REFERENCES public.workspaces(id);


--
-- Name: workspace_memberships fk_rails_26c4c0bd41; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_memberships
    ADD CONSTRAINT fk_rails_26c4c0bd41 FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);


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
-- Name: workspaces fk_rails_5506b4b37e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT fk_rails_5506b4b37e FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: statements fk_rails_5bcb3b85af; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statements
    ADD CONSTRAINT fk_rails_5bcb3b85af FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);


--
-- Name: workspace_invitations fk_rails_627a78e220; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_invitations
    ADD CONSTRAINT fk_rails_627a78e220 FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);


--
-- Name: global_patterns fk_rails_64078cc42b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_patterns
    ADD CONSTRAINT fk_rails_64078cc42b FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: business_profiles fk_rails_68038daaed; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_profiles
    ADD CONSTRAINT fk_rails_68038daaed FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);


--
-- Name: invoice_line_items fk_rails_6a77d01fed; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line_items
    ADD CONSTRAINT fk_rails_6a77d01fed FOREIGN KEY (sales_invoice_id) REFERENCES public.sales_invoices(id);


--
-- Name: transactions fk_rails_6b611ee905; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT fk_rails_6b611ee905 FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;


--
-- Name: labeled_examples fk_rails_6c3f84f3f1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labeled_examples
    ADD CONSTRAINT fk_rails_6c3f84f3f1 FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);


--
-- Name: workspace_invitations fk_rails_759aefbfd2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_invitations
    ADD CONSTRAINT fk_rails_759aefbfd2 FOREIGN KEY (invited_by_id) REFERENCES public.users(id);


--
-- Name: transactions fk_rails_77364e6416; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT fk_rails_77364e6416 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: sales_invoices fk_rails_81a032c669; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT fk_rails_81a032c669 FOREIGN KEY (business_profile_id) REFERENCES public.business_profiles(id);


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
-- Name: recurring_invoices fk_rails_8730c409b9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_invoices
    ADD CONSTRAINT fk_rails_8730c409b9 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: sales_invoices fk_rails_879f994157; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT fk_rails_879f994157 FOREIGN KEY (recurring_invoice_id) REFERENCES public.recurring_invoices(id);


--
-- Name: sales_invoices fk_rails_8f263b7cb5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT fk_rails_8f263b7cb5 FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);


--
-- Name: recurring_invoices fk_rails_971e52b369; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_invoices
    ADD CONSTRAINT fk_rails_971e52b369 FOREIGN KEY (last_invoice_id) REFERENCES public.sales_invoices(id);


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
-- Name: gmail_connections fk_rails_a343a4adb5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmail_connections
    ADD CONSTRAINT fk_rails_a343a4adb5 FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);


--
-- Name: recurring_invoices fk_rails_a59bf6fb50; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_invoices
    ADD CONSTRAINT fk_rails_a59bf6fb50 FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);


--
-- Name: labeled_examples fk_rails_a66953f4e1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labeled_examples
    ADD CONSTRAINT fk_rails_a66953f4e1 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: workspace_memberships fk_rails_aca847b4f5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_memberships
    ADD CONSTRAINT fk_rails_aca847b4f5 FOREIGN KEY (user_id) REFERENCES public.users(id);


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
-- Name: sales_invoices fk_rails_b48f1cb104; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT fk_rails_b48f1cb104 FOREIGN KEY (matched_transaction_id) REFERENCES public.transactions(id);


--
-- Name: accounts fk_rails_bac5365c2c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT fk_rails_bac5365c2c FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);


--
-- Name: user_rules fk_rails_bdc8651a4e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_rules
    ADD CONSTRAINT fk_rails_bdc8651a4e FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_rules fk_rails_beae143186; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_rules
    ADD CONSTRAINT fk_rails_beae143186 FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);


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
-- Name: sales_invoices fk_rails_e7f8b5574e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT fk_rails_e7f8b5574e FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: clients fk_rails_e83b0e502d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT fk_rails_e83b0e502d FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);


--
-- Name: transactions fk_rails_f9235709da; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT fk_rails_f9235709da FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);


--
-- PostgreSQL database dump complete
--

SET search_path TO "$user", public;

INSERT INTO "schema_migrations" (version) VALUES
('20260113100006'),
('20260113100005'),
('20260113100004'),
('20260113100003'),
('20260113100002'),
('20260113100001'),
('20260109110758'),
('20260109100636'),
('20260109081541'),
('20260109081516'),
('20260109081453'),
('20260109081430'),
('20260107190617'),
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

