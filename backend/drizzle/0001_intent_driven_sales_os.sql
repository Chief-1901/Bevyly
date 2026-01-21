-- Intent-Driven Sales OS Schema Migration
-- Adds: leads, signals, patterns, recommendations, recommendation_feedback tables
-- Date: January 16, 2026

-- ============================================
-- LEADS
-- ============================================

CREATE TABLE IF NOT EXISTS "leads" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "customer_id" varchar(36) NOT NULL REFERENCES "customers"("id"),
  
  -- Company info
  "company_name" varchar(255) NOT NULL,
  "domain" varchar(255),
  "industry" varchar(100),
  "employee_count" integer,
  "revenue" bigint,
  
  -- Contact info
  "contact_first_name" varchar(100),
  "contact_last_name" varchar(100),
  "contact_email" varchar(255),
  "contact_title" varchar(150),
  "contact_phone" varchar(50),
  
  -- Location
  "city" varchar(100),
  "state" varchar(100),
  "country" varchar(100),
  
  -- Source tracking
  "source" varchar(100) DEFAULT 'manual' NOT NULL,
  "campaign_id" varchar(36),
  "generation_job_id" varchar(36),
  "source_url" text,
  
  -- Scoring
  "fit_score" integer,
  "intent_score" integer,
  
  -- Status workflow
  "status" varchar(50) DEFAULT 'new' NOT NULL,
  
  -- Assignment
  "owner_id" varchar(36),
  
  -- Conversion tracking
  "converted_account_id" varchar(36) REFERENCES "accounts"("id"),
  "converted_contact_id" varchar(36) REFERENCES "contacts"("id"),
  "converted_at" timestamp with time zone,
  
  -- Rejection tracking
  "rejected_reason" varchar(100),
  "rejected_at" timestamp with time zone,
  
  -- Notes
  "notes" text,
  
  -- Custom fields
  "custom_fields" jsonb DEFAULT '{}',
  
  -- Timestamps
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "leads_customer_id_idx" ON "leads" ("customer_id");
CREATE INDEX IF NOT EXISTS "leads_status_idx" ON "leads" ("status");
CREATE INDEX IF NOT EXISTS "leads_source_idx" ON "leads" ("source");
CREATE INDEX IF NOT EXISTS "leads_campaign_id_idx" ON "leads" ("campaign_id");
CREATE INDEX IF NOT EXISTS "leads_owner_id_idx" ON "leads" ("owner_id");
CREATE INDEX IF NOT EXISTS "leads_fit_score_idx" ON "leads" ("fit_score");
CREATE INDEX IF NOT EXISTS "leads_customer_status_idx" ON "leads" ("customer_id", "status");
CREATE INDEX IF NOT EXISTS "leads_domain_idx" ON "leads" ("domain");

-- ============================================
-- SIGNALS
-- ============================================

CREATE TABLE IF NOT EXISTS "signals" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "customer_id" varchar(36) NOT NULL REFERENCES "customers"("id"),
  
  -- What entity this signal is about
  "entity_type" varchar(50) NOT NULL,
  "entity_id" varchar(36) NOT NULL,
  
  -- Signal classification
  "signal_type" varchar(50) NOT NULL,
  "severity" varchar(20) NOT NULL,
  
  -- Human-readable title and description
  "title" varchar(255) NOT NULL,
  "description" text,
  
  -- Structured data specific to signal type
  "data" jsonb DEFAULT '{}',
  
  -- Status
  "status" varchar(20) DEFAULT 'active' NOT NULL,
  "resolved_at" timestamp with time zone,
  
  -- Timestamps
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "signals_customer_id_idx" ON "signals" ("customer_id");
CREATE INDEX IF NOT EXISTS "signals_entity_idx" ON "signals" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "signals_signal_type_idx" ON "signals" ("signal_type");
CREATE INDEX IF NOT EXISTS "signals_severity_idx" ON "signals" ("severity");
CREATE INDEX IF NOT EXISTS "signals_status_idx" ON "signals" ("status");
CREATE INDEX IF NOT EXISTS "signals_customer_active_idx" ON "signals" ("customer_id", "status");

-- ============================================
-- PATTERNS
-- ============================================

CREATE TABLE IF NOT EXISTS "patterns" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "customer_id" varchar(36) NOT NULL REFERENCES "customers"("id"),
  
  -- Pattern classification
  "pattern_type" varchar(50) NOT NULL,
  
  -- Component signals
  "signal_ids" jsonb DEFAULT '[]' NOT NULL,
  "signal_count" real DEFAULT 0,
  
  -- Confidence and scoring
  "confidence" real NOT NULL,
  
  -- Human-readable description
  "title" varchar(255) NOT NULL,
  "description" text,
  
  -- Structured data specific to pattern type
  "data" jsonb DEFAULT '{}',
  
  -- Status
  "status" varchar(20) DEFAULT 'active' NOT NULL,
  
  -- Timestamps
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "patterns_customer_id_idx" ON "patterns" ("customer_id");
CREATE INDEX IF NOT EXISTS "patterns_pattern_type_idx" ON "patterns" ("pattern_type");
CREATE INDEX IF NOT EXISTS "patterns_status_idx" ON "patterns" ("status");
CREATE INDEX IF NOT EXISTS "patterns_confidence_idx" ON "patterns" ("confidence");

-- ============================================
-- RECOMMENDATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS "recommendations" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "customer_id" varchar(36) NOT NULL REFERENCES "customers"("id"),
  
  -- Who this recommendation is for
  "user_id" varchar(36) REFERENCES "users"("id"),
  
  -- Source pattern/signal
  "pattern_id" varchar(36) REFERENCES "patterns"("id"),
  "signal_id" varchar(36) REFERENCES "signals"("id"),
  
  -- Action type
  "action_type" varchar(50) NOT NULL,
  
  -- Priority and ordering
  "priority" varchar(20) NOT NULL,
  "score" real DEFAULT 0,
  
  -- Human-readable content
  "title" varchar(255) NOT NULL,
  "rationale" text,
  
  -- CTA configuration
  "cta_label" varchar(100),
  "cta_route" varchar(255),
  "cta_params" jsonb DEFAULT '{}',
  "secondary_cta_label" varchar(100),
  "secondary_cta_route" varchar(255),
  
  -- Structured data specific to action type
  "data" jsonb DEFAULT '{}',
  
  -- Card type for frontend rendering
  "card_type" varchar(50) NOT NULL,
  "card_props" jsonb DEFAULT '{}',
  
  -- Status lifecycle
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "acted_at" timestamp with time zone,
  "dismissed_at" timestamp with time zone,
  "snoozed_until" timestamp with time zone,
  
  -- Timestamps
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "recommendations_customer_id_idx" ON "recommendations" ("customer_id");
CREATE INDEX IF NOT EXISTS "recommendations_user_id_idx" ON "recommendations" ("user_id");
CREATE INDEX IF NOT EXISTS "recommendations_pattern_id_idx" ON "recommendations" ("pattern_id");
CREATE INDEX IF NOT EXISTS "recommendations_action_type_idx" ON "recommendations" ("action_type");
CREATE INDEX IF NOT EXISTS "recommendations_priority_idx" ON "recommendations" ("priority");
CREATE INDEX IF NOT EXISTS "recommendations_status_idx" ON "recommendations" ("status");
CREATE INDEX IF NOT EXISTS "recommendations_customer_pending_idx" ON "recommendations" ("customer_id", "status");

-- ============================================
-- RECOMMENDATION FEEDBACK
-- ============================================

CREATE TABLE IF NOT EXISTS "recommendation_feedback" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "recommendation_id" varchar(36) NOT NULL REFERENCES "recommendations"("id"),
  "user_id" varchar(36) NOT NULL REFERENCES "users"("id"),
  
  -- User action
  "action" varchar(20) NOT NULL,
  
  -- Optional feedback data
  "feedback_data" jsonb DEFAULT '{}',
  
  -- Timestamps
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "recommendation_feedback_recommendation_id_idx" ON "recommendation_feedback" ("recommendation_id");
CREATE INDEX IF NOT EXISTS "recommendation_feedback_user_id_idx" ON "recommendation_feedback" ("user_id");
CREATE INDEX IF NOT EXISTS "recommendation_feedback_action_idx" ON "recommendation_feedback" ("action");
