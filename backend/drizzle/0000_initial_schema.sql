-- SalesOS Initial Database Schema
-- Generated from Drizzle ORM schema definitions
-- Date: January 4, 2026

-- ============================================
-- CUSTOMERS (Tenants)
-- ============================================

CREATE TABLE IF NOT EXISTS "customers" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "name" varchar(255) NOT NULL,
  "slug" varchar(100) UNIQUE NOT NULL,
  "domain" varchar(255),
  "plan" varchar(50) DEFAULT 'free' NOT NULL,
  "status" varchar(20) DEFAULT 'active' NOT NULL,
  "settings" jsonb DEFAULT '{}',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

-- ============================================
-- USERS & AUTH
-- ============================================

CREATE TABLE IF NOT EXISTS "users" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "customer_id" varchar(36) NOT NULL REFERENCES "customers"("id"),
  "email" varchar(255) NOT NULL,
  "password_hash" text,
  "first_name" varchar(100),
  "last_name" varchar(100),
  "avatar_url" text,
  "status" varchar(20) DEFAULT 'active' NOT NULL,
  "email_verified" boolean DEFAULT false NOT NULL,
  "preferences" jsonb DEFAULT '{}',
  "last_login_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_customer_email_idx" ON "users" ("customer_id", "email");
CREATE INDEX IF NOT EXISTS "users_customer_id_idx" ON "users" ("customer_id");

CREATE TABLE IF NOT EXISTS "user_roles" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "user_id" varchar(36) NOT NULL REFERENCES "users"("id"),
  "role" varchar(50) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_roles_user_role_idx" ON "user_roles" ("user_id", "role");
CREATE INDEX IF NOT EXISTS "user_roles_user_id_idx" ON "user_roles" ("user_id");

CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "customer_id" varchar(36) NOT NULL REFERENCES "customers"("id"),
  "user_id" varchar(36) REFERENCES "users"("id"),
  "name" varchar(100) NOT NULL,
  "key_hash" text NOT NULL,
  "key_prefix" varchar(12) NOT NULL,
  "scopes" jsonb DEFAULT '[]',
  "last_used_at" timestamp with time zone,
  "expires_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "api_keys_customer_id_idx" ON "api_keys" ("customer_id");
CREATE INDEX IF NOT EXISTS "api_keys_key_prefix_idx" ON "api_keys" ("key_prefix");

CREATE TABLE IF NOT EXISTS "refresh_tokens" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "user_id" varchar(36) NOT NULL REFERENCES "users"("id"),
  "token_hash" text NOT NULL,
  "user_agent" text,
  "ip_address" varchar(45),
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_idx" ON "refresh_tokens" ("user_id");
CREATE INDEX IF NOT EXISTS "refresh_tokens_token_hash_idx" ON "refresh_tokens" ("token_hash");

-- ============================================
-- CRM: ACCOUNTS
-- ============================================

CREATE TABLE IF NOT EXISTS "accounts" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "customer_id" varchar(36) NOT NULL REFERENCES "customers"("id"),
  "name" varchar(255) NOT NULL,
  "domain" varchar(255),
  "website" text,
  "industry" varchar(100),
  "employee_count" integer,
  "annual_revenue" integer,
  "address" text,
  "city" varchar(100),
  "state" varchar(100),
  "country" varchar(100),
  "postal_code" varchar(20),
  "owner_id" varchar(36) REFERENCES "users"("id"),
  "status" varchar(50) DEFAULT 'prospect' NOT NULL,
  "linkedin_url" text,
  "twitter_url" text,
  "custom_fields" jsonb DEFAULT '{}',
  "external_ids" jsonb DEFAULT '{}',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "accounts_customer_id_idx" ON "accounts" ("customer_id");
CREATE INDEX IF NOT EXISTS "accounts_owner_id_idx" ON "accounts" ("owner_id");
CREATE INDEX IF NOT EXISTS "accounts_domain_idx" ON "accounts" ("domain");
CREATE INDEX IF NOT EXISTS "accounts_customer_name_idx" ON "accounts" ("customer_id", "name");

-- ============================================
-- CRM: CONTACTS
-- ============================================

CREATE TABLE IF NOT EXISTS "contacts" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "customer_id" varchar(36) NOT NULL REFERENCES "customers"("id"),
  "account_id" varchar(36) REFERENCES "accounts"("id"),
  "email" varchar(255) NOT NULL,
  "first_name" varchar(100),
  "last_name" varchar(100),
  "title" varchar(150),
  "department" varchar(100),
  "phone" varchar(50),
  "mobile_phone" varchar(50),
  "city" varchar(100),
  "state" varchar(100),
  "country" varchar(100),
  "timezone" varchar(50),
  "linkedin_url" text,
  "twitter_url" text,
  "owner_id" varchar(36) REFERENCES "users"("id"),
  "status" varchar(50) DEFAULT 'active' NOT NULL,
  "source" varchar(100),
  "unsubscribed_at" timestamp with time zone,
  "bounced_at" timestamp with time zone,
  "custom_fields" jsonb DEFAULT '{}',
  "external_ids" jsonb DEFAULT '{}',
  "last_activity_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "contacts_customer_id_idx" ON "contacts" ("customer_id");
CREATE INDEX IF NOT EXISTS "contacts_account_id_idx" ON "contacts" ("account_id");
CREATE INDEX IF NOT EXISTS "contacts_owner_id_idx" ON "contacts" ("owner_id");
CREATE INDEX IF NOT EXISTS "contacts_email_idx" ON "contacts" ("email");
CREATE INDEX IF NOT EXISTS "contacts_customer_email_idx" ON "contacts" ("customer_id", "email");

-- ============================================
-- CRM: OPPORTUNITIES
-- ============================================

CREATE TABLE IF NOT EXISTS "opportunities" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "customer_id" varchar(36) NOT NULL REFERENCES "customers"("id"),
  "account_id" varchar(36) NOT NULL REFERENCES "accounts"("id"),
  "primary_contact_id" varchar(36) REFERENCES "contacts"("id"),
  "name" varchar(255) NOT NULL,
  "description" text,
  "stage" varchar(50) DEFAULT 'prospecting' NOT NULL,
  "probability" integer DEFAULT 0,
  "amount" integer,
  "currency" varchar(3) DEFAULT 'USD',
  "close_date" date,
  "won_at" timestamp with time zone,
  "lost_at" timestamp with time zone,
  "lost_reason" varchar(100),
  "lost_reason_detail" text,
  "owner_id" varchar(36) REFERENCES "users"("id"),
  "source" varchar(100),
  "campaign_id" varchar(36),
  "custom_fields" jsonb DEFAULT '{}',
  "external_ids" jsonb DEFAULT '{}',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "opportunities_customer_id_idx" ON "opportunities" ("customer_id");
CREATE INDEX IF NOT EXISTS "opportunities_account_id_idx" ON "opportunities" ("account_id");
CREATE INDEX IF NOT EXISTS "opportunities_owner_id_idx" ON "opportunities" ("owner_id");
CREATE INDEX IF NOT EXISTS "opportunities_stage_idx" ON "opportunities" ("stage");
CREATE INDEX IF NOT EXISTS "opportunities_close_date_idx" ON "opportunities" ("close_date");

CREATE TABLE IF NOT EXISTS "opportunity_contacts" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "opportunity_id" varchar(36) NOT NULL REFERENCES "opportunities"("id"),
  "contact_id" varchar(36) NOT NULL REFERENCES "contacts"("id"),
  "role" varchar(50),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "opportunity_contacts_opportunity_id_idx" ON "opportunity_contacts" ("opportunity_id");
CREATE INDEX IF NOT EXISTS "opportunity_contacts_contact_id_idx" ON "opportunity_contacts" ("contact_id");

-- ============================================
-- EMAILS
-- ============================================

CREATE TABLE IF NOT EXISTS "emails" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "customer_id" varchar(36) NOT NULL REFERENCES "customers"("id"),
  "sender_id" varchar(36) NOT NULL REFERENCES "users"("id"),
  "from_email" varchar(255) NOT NULL,
  "from_name" varchar(255),
  "contact_id" varchar(36) REFERENCES "contacts"("id"),
  "account_id" varchar(36) REFERENCES "accounts"("id"),
  "to_email" varchar(255) NOT NULL,
  "to_name" varchar(255),
  "cc_emails" jsonb DEFAULT '[]',
  "bcc_emails" jsonb DEFAULT '[]',
  "subject" text NOT NULL,
  "body_html" text,
  "body_text" text,
  "status" varchar(20) DEFAULT 'draft' NOT NULL,
  "scheduled_at" timestamp with time zone,
  "sent_at" timestamp with time zone,
  "tracking_pixel_id" varchar(36),
  "open_count" integer DEFAULT 0,
  "click_count" integer DEFAULT 0,
  "first_opened_at" timestamp with time zone,
  "last_opened_at" timestamp with time zone,
  "first_clicked_at" timestamp with time zone,
  "replied_at" timestamp with time zone,
  "bounced_at" timestamp with time zone,
  "bounce_type" varchar(50),
  "error_message" text,
  "sequence_id" varchar(36),
  "sequence_step_number" integer,
  "provider" varchar(50),
  "provider_message_id" varchar(255),
  "thread_id" varchar(255),
  "idempotency_key" varchar(64),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "emails_customer_id_idx" ON "emails" ("customer_id");
CREATE INDEX IF NOT EXISTS "emails_sender_id_idx" ON "emails" ("sender_id");
CREATE INDEX IF NOT EXISTS "emails_contact_id_idx" ON "emails" ("contact_id");
CREATE INDEX IF NOT EXISTS "emails_account_id_idx" ON "emails" ("account_id");
CREATE INDEX IF NOT EXISTS "emails_status_idx" ON "emails" ("status");
CREATE INDEX IF NOT EXISTS "emails_tracking_pixel_id_idx" ON "emails" ("tracking_pixel_id");
CREATE INDEX IF NOT EXISTS "emails_idempotency_key_idx" ON "emails" ("idempotency_key");
CREATE INDEX IF NOT EXISTS "emails_sequence_id_idx" ON "emails" ("sequence_id");

CREATE TABLE IF NOT EXISTS "email_clicks" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "email_id" varchar(36) NOT NULL REFERENCES "emails"("id"),
  "tracking_id" varchar(36) NOT NULL,
  "original_url" text NOT NULL,
  "clicked_at" timestamp with time zone DEFAULT now() NOT NULL,
  "user_agent" text,
  "ip_address" varchar(45)
);

CREATE INDEX IF NOT EXISTS "email_clicks_email_id_idx" ON "email_clicks" ("email_id");
CREATE INDEX IF NOT EXISTS "email_clicks_tracking_id_idx" ON "email_clicks" ("tracking_id");

-- ============================================
-- MEETINGS
-- ============================================

CREATE TABLE IF NOT EXISTS "meetings" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "customer_id" varchar(36) NOT NULL REFERENCES "customers"("id"),
  "organizer_id" varchar(36) NOT NULL REFERENCES "users"("id"),
  "contact_id" varchar(36) REFERENCES "contacts"("id"),
  "account_id" varchar(36) REFERENCES "accounts"("id"),
  "opportunity_id" varchar(36),
  "title" varchar(255) NOT NULL,
  "description" text,
  "location" text,
  "type" varchar(50) DEFAULT 'call' NOT NULL,
  "status" varchar(20) DEFAULT 'proposed' NOT NULL,
  "start_time" timestamp with time zone NOT NULL,
  "end_time" timestamp with time zone NOT NULL,
  "duration_minutes" integer NOT NULL,
  "timezone" varchar(50),
  "video_provider" varchar(50),
  "video_link" text,
  "reminder_minutes_before" integer DEFAULT 15,
  "reminder_sent_at" timestamp with time zone,
  "outcome" varchar(50),
  "notes" text,
  "provider" varchar(50),
  "provider_event_id" varchar(255),
  "idempotency_key" varchar(64),
  "confirmed_at" timestamp with time zone,
  "cancelled_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "meetings_customer_id_idx" ON "meetings" ("customer_id");
CREATE INDEX IF NOT EXISTS "meetings_organizer_id_idx" ON "meetings" ("organizer_id");
CREATE INDEX IF NOT EXISTS "meetings_contact_id_idx" ON "meetings" ("contact_id");
CREATE INDEX IF NOT EXISTS "meetings_account_id_idx" ON "meetings" ("account_id");
CREATE INDEX IF NOT EXISTS "meetings_status_idx" ON "meetings" ("status");
CREATE INDEX IF NOT EXISTS "meetings_start_time_idx" ON "meetings" ("start_time");
CREATE INDEX IF NOT EXISTS "meetings_idempotency_key_idx" ON "meetings" ("idempotency_key");

CREATE TABLE IF NOT EXISTS "meeting_attendees" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "meeting_id" varchar(36) NOT NULL REFERENCES "meetings"("id"),
  "user_id" varchar(36) NOT NULL REFERENCES "users"("id"),
  "response" varchar(20) DEFAULT 'pending',
  "responded_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "meeting_attendees_meeting_id_idx" ON "meeting_attendees" ("meeting_id");
CREATE INDEX IF NOT EXISTS "meeting_attendees_user_id_idx" ON "meeting_attendees" ("user_id");

CREATE TABLE IF NOT EXISTS "meeting_external_attendees" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "meeting_id" varchar(36) NOT NULL REFERENCES "meetings"("id"),
  "contact_id" varchar(36) REFERENCES "contacts"("id"),
  "email" varchar(255) NOT NULL,
  "name" varchar(255),
  "response" varchar(20) DEFAULT 'pending',
  "responded_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "meeting_external_attendees_meeting_id_idx" ON "meeting_external_attendees" ("meeting_id");
CREATE INDEX IF NOT EXISTS "meeting_external_attendees_contact_id_idx" ON "meeting_external_attendees" ("contact_id");

-- ============================================
-- SEQUENCES
-- ============================================

CREATE TABLE IF NOT EXISTS "sequences" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "customer_id" varchar(36) NOT NULL REFERENCES "customers"("id"),
  "name" varchar(255) NOT NULL,
  "description" text,
  "status" varchar(20) DEFAULT 'draft' NOT NULL,
  "owner_id" varchar(36) REFERENCES "users"("id"),
  "settings" jsonb DEFAULT '{}',
  "total_enrolled" integer DEFAULT 0,
  "active_enrolled" integer DEFAULT 0,
  "completed_count" integer DEFAULT 0,
  "replied_count" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "archived_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "sequences_customer_id_idx" ON "sequences" ("customer_id");
CREATE INDEX IF NOT EXISTS "sequences_owner_id_idx" ON "sequences" ("owner_id");
CREATE INDEX IF NOT EXISTS "sequences_status_idx" ON "sequences" ("status");

CREATE TABLE IF NOT EXISTS "sequence_steps" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "sequence_id" varchar(36) NOT NULL REFERENCES "sequences"("id"),
  "step_number" integer NOT NULL,
  "type" varchar(20) DEFAULT 'email' NOT NULL,
  "wait_days" integer DEFAULT 0,
  "wait_hours" integer DEFAULT 0,
  "subject" text,
  "body_html" text,
  "body_text" text,
  "variables" jsonb DEFAULT '[]',
  "task_description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "sequence_steps_sequence_id_idx" ON "sequence_steps" ("sequence_id");
CREATE INDEX IF NOT EXISTS "sequence_steps_step_number_idx" ON "sequence_steps" ("sequence_id", "step_number");

CREATE TABLE IF NOT EXISTS "contact_sequences" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "customer_id" varchar(36) NOT NULL REFERENCES "customers"("id"),
  "sequence_id" varchar(36) NOT NULL REFERENCES "sequences"("id"),
  "contact_id" varchar(36) NOT NULL REFERENCES "contacts"("id"),
  "enrolled_by" varchar(36) REFERENCES "users"("id"),
  "status" varchar(20) DEFAULT 'active' NOT NULL,
  "current_step_number" integer DEFAULT 1,
  "next_step_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "exit_reason" varchar(50),
  "emails_sent" integer DEFAULT 0,
  "emails_opened" integer DEFAULT 0,
  "emails_clicked" integer DEFAULT 0,
  "enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
  "paused_at" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "contact_sequences_customer_id_idx" ON "contact_sequences" ("customer_id");
CREATE INDEX IF NOT EXISTS "contact_sequences_sequence_id_idx" ON "contact_sequences" ("sequence_id");
CREATE INDEX IF NOT EXISTS "contact_sequences_contact_id_idx" ON "contact_sequences" ("contact_id");
CREATE INDEX IF NOT EXISTS "contact_sequences_status_idx" ON "contact_sequences" ("status");
CREATE INDEX IF NOT EXISTS "contact_sequences_next_step_at_idx" ON "contact_sequences" ("next_step_at");

-- ============================================
-- ACTIVITIES
-- ============================================

CREATE TABLE IF NOT EXISTS "activities" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "customer_id" varchar(36) NOT NULL REFERENCES "customers"("id"),
  "contact_id" varchar(36) REFERENCES "contacts"("id"),
  "account_id" varchar(36) REFERENCES "accounts"("id"),
  "opportunity_id" varchar(36),
  "user_id" varchar(36) REFERENCES "users"("id"),
  "type" varchar(50) NOT NULL,
  "source_type" varchar(50),
  "source_id" varchar(36),
  "title" text NOT NULL,
  "description" text,
  "metadata" jsonb DEFAULT '{}',
  "occurred_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "activities_customer_id_idx" ON "activities" ("customer_id");
CREATE INDEX IF NOT EXISTS "activities_contact_id_idx" ON "activities" ("contact_id");
CREATE INDEX IF NOT EXISTS "activities_account_id_idx" ON "activities" ("account_id");
CREATE INDEX IF NOT EXISTS "activities_user_id_idx" ON "activities" ("user_id");
CREATE INDEX IF NOT EXISTS "activities_type_idx" ON "activities" ("type");
CREATE INDEX IF NOT EXISTS "activities_occurred_at_idx" ON "activities" ("occurred_at");
CREATE INDEX IF NOT EXISTS "activities_source_idx" ON "activities" ("source_type", "source_id");

CREATE TABLE IF NOT EXISTS "notes" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "customer_id" varchar(36) NOT NULL REFERENCES "customers"("id"),
  "contact_id" varchar(36) REFERENCES "contacts"("id"),
  "account_id" varchar(36) REFERENCES "accounts"("id"),
  "opportunity_id" varchar(36),
  "author_id" varchar(36) NOT NULL REFERENCES "users"("id"),
  "content" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "notes_customer_id_idx" ON "notes" ("customer_id");
CREATE INDEX IF NOT EXISTS "notes_contact_id_idx" ON "notes" ("contact_id");
CREATE INDEX IF NOT EXISTS "notes_account_id_idx" ON "notes" ("account_id");
CREATE INDEX IF NOT EXISTS "notes_author_id_idx" ON "notes" ("author_id");

CREATE TABLE IF NOT EXISTS "calls" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "customer_id" varchar(36) NOT NULL REFERENCES "customers"("id"),
  "contact_id" varchar(36) REFERENCES "contacts"("id"),
  "account_id" varchar(36) REFERENCES "accounts"("id"),
  "opportunity_id" varchar(36),
  "user_id" varchar(36) NOT NULL REFERENCES "users"("id"),
  "direction" varchar(10) NOT NULL,
  "status" varchar(20) NOT NULL,
  "phone_number" varchar(50),
  "duration_seconds" integer,
  "outcome" varchar(50),
  "notes" text,
  "recording_url" text,
  "started_at" timestamp with time zone NOT NULL,
  "ended_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "calls_customer_id_idx" ON "calls" ("customer_id");
CREATE INDEX IF NOT EXISTS "calls_contact_id_idx" ON "calls" ("contact_id");
CREATE INDEX IF NOT EXISTS "calls_account_id_idx" ON "calls" ("account_id");
CREATE INDEX IF NOT EXISTS "calls_user_id_idx" ON "calls" ("user_id");
CREATE INDEX IF NOT EXISTS "calls_started_at_idx" ON "calls" ("started_at");

-- ============================================
-- ENGAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS "engagement_scores" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "customer_id" varchar(36) NOT NULL REFERENCES "customers"("id"),
  "contact_id" varchar(36) NOT NULL REFERENCES "contacts"("id"),
  "score" integer DEFAULT 0 NOT NULL,
  "email_score" integer DEFAULT 0,
  "meeting_score" integer DEFAULT 0,
  "recency_score" integer DEFAULT 0,
  "frequency_score" integer DEFAULT 0,
  "trend" varchar(20) DEFAULT 'stable',
  "previous_score" integer,
  "emails_sent" integer DEFAULT 0,
  "emails_opened" integer DEFAULT 0,
  "emails_clicked" integer DEFAULT 0,
  "emails_replied" integer DEFAULT 0,
  "meetings_scheduled" integer DEFAULT 0,
  "meetings_completed" integer DEFAULT 0,
  "last_activity_at" timestamp with time zone,
  "last_calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "engagement_scores_customer_id_idx" ON "engagement_scores" ("customer_id");
CREATE INDEX IF NOT EXISTS "engagement_scores_contact_id_idx" ON "engagement_scores" ("contact_id");
CREATE INDEX IF NOT EXISTS "engagement_scores_score_idx" ON "engagement_scores" ("score");

CREATE TABLE IF NOT EXISTS "account_engagement" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "customer_id" varchar(36) NOT NULL REFERENCES "customers"("id"),
  "account_id" varchar(36) NOT NULL REFERENCES "accounts"("id"),
  "avg_contact_score" real DEFAULT 0,
  "max_contact_score" integer DEFAULT 0,
  "active_contact_count" integer DEFAULT 0,
  "health_score" integer DEFAULT 0,
  "health_status" varchar(20) DEFAULT 'unknown',
  "total_emails_sent" integer DEFAULT 0,
  "total_meetings" integer DEFAULT 0,
  "last_activity_at" timestamp with time zone,
  "last_calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "account_engagement_customer_id_idx" ON "account_engagement" ("customer_id");
CREATE INDEX IF NOT EXISTS "account_engagement_account_id_idx" ON "account_engagement" ("account_id");
CREATE INDEX IF NOT EXISTS "account_engagement_health_score_idx" ON "account_engagement" ("health_score");

CREATE TABLE IF NOT EXISTS "intent_signals" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "customer_id" varchar(36) NOT NULL REFERENCES "customers"("id"),
  "contact_id" varchar(36) REFERENCES "contacts"("id"),
  "account_id" varchar(36) REFERENCES "accounts"("id"),
  "signal_type" varchar(50) NOT NULL,
  "strength" varchar(20) DEFAULT 'medium',
  "source_type" varchar(50),
  "source_id" varchar(36),
  "details" jsonb DEFAULT '{}',
  "detected_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone,
  "processed_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "intent_signals_customer_id_idx" ON "intent_signals" ("customer_id");
CREATE INDEX IF NOT EXISTS "intent_signals_contact_id_idx" ON "intent_signals" ("contact_id");
CREATE INDEX IF NOT EXISTS "intent_signals_account_id_idx" ON "intent_signals" ("account_id");
CREATE INDEX IF NOT EXISTS "intent_signals_detected_at_idx" ON "intent_signals" ("detected_at");

-- ============================================
-- OUTBOX & EVENT PROCESSING
-- ============================================

CREATE TABLE IF NOT EXISTS "outbox" (
  "id" serial PRIMARY KEY,
  "event_id" varchar(36) NOT NULL UNIQUE,
  "event_type" varchar(100) NOT NULL,
  "aggregate_type" varchar(50) NOT NULL,
  "aggregate_id" varchar(36) NOT NULL,
  "customer_id" varchar(36) NOT NULL,
  "payload" jsonb NOT NULL,
  "metadata" jsonb DEFAULT '{}',
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "retry_count" integer DEFAULT 0,
  "error_message" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "processed_at" timestamp with time zone,
  "sequence_number" serial
);

CREATE INDEX IF NOT EXISTS "outbox_status_idx" ON "outbox" ("status");
CREATE INDEX IF NOT EXISTS "outbox_aggregate_idx" ON "outbox" ("aggregate_type", "aggregate_id");
CREATE INDEX IF NOT EXISTS "outbox_customer_id_idx" ON "outbox" ("customer_id");
CREATE INDEX IF NOT EXISTS "outbox_created_at_idx" ON "outbox" ("created_at");
CREATE INDEX IF NOT EXISTS "outbox_pending_idx" ON "outbox" ("status", "created_at");

CREATE TABLE IF NOT EXISTS "processed_events" (
  "event_id" varchar(36) PRIMARY KEY,
  "event_type" varchar(100) NOT NULL,
  "processed_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "processed_events_event_type_idx" ON "processed_events" ("event_type");

-- ============================================
-- AUDIT & IDEMPOTENCY
-- ============================================

CREATE TABLE IF NOT EXISTS "audit_log" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "customer_id" varchar(36) NOT NULL REFERENCES "customers"("id"),
  "user_id" varchar(36) REFERENCES "users"("id"),
  "user_email" varchar(255),
  "api_key_id" varchar(36),
  "action" varchar(100) NOT NULL,
  "resource_type" varchar(50),
  "resource_id" varchar(36),
  "description" text,
  "previous_value" jsonb,
  "new_value" jsonb,
  "request_id" varchar(36),
  "ip_address" inet,
  "user_agent" text,
  "status" varchar(20) DEFAULT 'success' NOT NULL,
  "error_message" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "audit_log_customer_id_idx" ON "audit_log" ("customer_id");
CREATE INDEX IF NOT EXISTS "audit_log_user_id_idx" ON "audit_log" ("user_id");
CREATE INDEX IF NOT EXISTS "audit_log_action_idx" ON "audit_log" ("action");
CREATE INDEX IF NOT EXISTS "audit_log_resource_idx" ON "audit_log" ("resource_type", "resource_id");
CREATE INDEX IF NOT EXISTS "audit_log_created_at_idx" ON "audit_log" ("created_at");

CREATE TABLE IF NOT EXISTS "idempotency_keys" (
  "key" varchar(64) PRIMARY KEY,
  "customer_id" varchar(36) NOT NULL REFERENCES "customers"("id"),
  "request_path" varchar(255) NOT NULL,
  "request_method" varchar(10) NOT NULL,
  "response_status" integer,
  "response_body" jsonb,
  "status" varchar(20) DEFAULT 'processing' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL
);

CREATE INDEX IF NOT EXISTS "idempotency_keys_customer_id_idx" ON "idempotency_keys" ("customer_id");
CREATE INDEX IF NOT EXISTS "idempotency_keys_expires_at_idx" ON "idempotency_keys" ("expires_at");

