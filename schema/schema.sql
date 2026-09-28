-- ClipForge Production Schema (Postgres 16)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  brand_kit JSONB NOT NULL DEFAULT '{}',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE organization_members (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  source_type TEXT NOT NULL,
  source_url TEXT,
  source_duration_seconds NUMERIC(10,3),
  original_key TEXT,
  proxy_key TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  analysis JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  priority INTEGER NOT NULL DEFAULT 50,
  progress NUMERIC(5,4) NOT NULL DEFAULT 0,
  stage TEXT,
  message TEXT,
  attempt INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error TEXT,
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  index INTEGER NOT NULL,
  title TEXT,
  score NUMERIC(5,2),
  start_seconds NUMERIC(10,3) NOT NULL,
  end_seconds NUMERIC(10,3) NOT NULL,
  duration_seconds NUMERIC(10,3) NOT NULL,
  aspect_ratio TEXT NOT NULL DEFAULT '9:16',
  video_key TEXT,
  thumbnail_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  published_to JSONB NOT NULL DEFAULT '[]',
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  quantity NUMERIC(12,4) NOT NULL,
  unit TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  minutes_included INTEGER NOT NULL DEFAULT 0,
  minutes_used NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
