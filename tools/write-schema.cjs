var fs = require("fs");
var s = `-- ClipForge Production Schema (PostgreSQL 15+)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash TEXT UNIQUE NOT NULL,
  name TEXT,
  project_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  config JSONB DEFAULT '{}',
  stats JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE source_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  original_name TEXT,
  storage_key TEXT NOT NULL,
  duration_seconds DOUBLE PRECISION,
  width INTEGER, height INTEGER, fps DOUBLE PRECISION,
  video_codec TEXT, audio_codec TEXT, size_bytes BIGINT,
  status TEXT DEFAULT 'uploaded',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER DEFAULT 0,
  message TEXT DEFAULT '',
  input JSONB DEFAULT '{}',
  output JSONB DEFAULT '{}',
  error JSONB,
  artifacts TEXT[] DEFAULT '{}',
  retries INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 2,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  locked_by TEXT,
  locked_at TIMESTAMPTZ
);

CREATE TABLE clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  rank INTEGER,
  source_start DOUBLE PRECISION NOT NULL,
  source_end DOUBLE PRECISION NOT NULL,
  duration_seconds DOUBLE PRECISION NOT NULL,
  score DOUBLE PRECISION, percentile INTEGER,
  status TEXT DEFAULT 'pending',
  title TEXT, hook TEXT,
  director_plan JSONB DEFAULT '{}',
  edit_plan JSONB DEFAULT '{}',
  evaluation JSONB DEFAULT '{}',
  profile_name TEXT DEFAULT 'podcast',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id UUID REFERENCES clips(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  size_bytes BIGINT,
  content_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] DEFAULT '{}',
  secret TEXT, active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL, payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0, max_attempts INTEGER DEFAULT 5,
  next_attempt_at TIMESTAMPTZ DEFAULT now(),
  response_code INTEGER, error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_jobs_project ON jobs(project_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_queue ON jobs(status, created_at) WHERE status IN ('queued', 'running');
CREATE INDEX idx_clips_project ON clips(project_id);
CREATE INDEX idx_artifacts_clip ON artifacts(clip_id);
CREATE INDEX idx_webhook_deliveries_queue ON webhook_deliveries(status, next_attempt_at) WHERE status IN ('pending', 'retrying');
`;
fs.writeFileSync("e:/video/docker/schema.sql", s, "utf-8");
console.log("schema.sql:", s.length, "bytes");
