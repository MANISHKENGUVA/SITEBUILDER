const { query } = require("./pool");

async function initSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS workflow_configurations (
      id TEXT PRIMARY KEY,
      workflow_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      current_version TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'VALIDATED', 'PUBLISHED')),
      definition JSONB NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      published_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS ix_wfc_workflow_id ON workflow_configurations (workflow_id);
    CREATE INDEX IF NOT EXISTS ix_wfc_status ON workflow_configurations (status);

    CREATE TABLE IF NOT EXISTS workflow_configuration_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      configuration_id TEXT NOT NULL REFERENCES workflow_configurations(id) ON DELETE CASCADE,
      workflow_id TEXT NOT NULL,
      version TEXT NOT NULL,
      status TEXT NOT NULL,
      definition JSONB NOT NULL,
      change_summary TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_by TEXT DEFAULT 'system'
    );

    CREATE INDEX IF NOT EXISTS ix_wfc_versions_config_id ON workflow_configuration_versions (configuration_id);

    CREATE TABLE IF NOT EXISTS workflow_actors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      is_system BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS workflow_modules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      default_version TEXT DEFAULT 'V1',
      versions JSONB DEFAULT '["V1"]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS workflow_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      definition JSONB NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

module.exports = { initSchema };

