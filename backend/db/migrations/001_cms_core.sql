CREATE TABLE cms_sites (
  id BIGSERIAL PRIMARY KEY,
  site_key VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  default_locale VARCHAR(16) NOT NULL DEFAULT 'zh-HK',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cms_admin_users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(320) NOT NULL,
  display_name VARCHAR(160) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'editor'
    CHECK (role IN ('admin', 'editor', 'publisher', 'viewer')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  password_changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX cms_admin_users_email_unique
  ON cms_admin_users (LOWER(email));

CREATE TABLE cms_admin_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES cms_admin_users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  csrf_hash CHAR(64) NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX cms_admin_sessions_user_idx ON cms_admin_sessions (user_id);
CREATE INDEX cms_admin_sessions_expiry_idx ON cms_admin_sessions (expires_at);

CREATE TABLE cms_settings (
  id BIGSERIAL PRIMARY KEY,
  site_id BIGINT NOT NULL REFERENCES cms_sites(id) ON DELETE CASCADE,
  locale VARCHAR(16) NOT NULL DEFAULT 'zh-HK',
  setting_key VARCHAR(160) NOT NULL,
  setting_value JSONB NOT NULL DEFAULT 'null'::jsonb,
  group_name VARCHAR(80) NOT NULL DEFAULT 'general',
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (site_id, locale, setting_key)
);

CREATE TABLE cms_navigation_items (
  id BIGSERIAL PRIMARY KEY,
  site_id BIGINT NOT NULL REFERENCES cms_sites(id) ON DELETE CASCADE,
  locale VARCHAR(16) NOT NULL DEFAULT 'zh-HK',
  item_key VARCHAR(120) NOT NULL,
  label VARCHAR(160) NOT NULL,
  url TEXT NOT NULL,
  parent_id BIGINT REFERENCES cms_navigation_items(id) ON DELETE SET NULL,
  location VARCHAR(32) NOT NULL DEFAULT 'primary'
    CHECK (location IN ('switcher', 'primary', 'footer', 'legal')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_external BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(24) NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'review', 'published', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (site_id, locale, item_key)
);

CREATE TABLE cms_pages (
  id BIGSERIAL PRIMARY KEY,
  site_id BIGINT NOT NULL REFERENCES cms_sites(id) ON DELETE CASCADE,
  locale VARCHAR(16) NOT NULL DEFAULT 'zh-HK',
  slug VARCHAR(180) NOT NULL,
  title VARCHAR(255) NOT NULL,
  eyebrow VARCHAR(160),
  hero_title TEXT,
  hero_subtitle TEXT,
  hero_image_url TEXT,
  hero_image_position VARCHAR(40) DEFAULT 'center center',
  summary TEXT,
  content_html TEXT,
  seo_title VARCHAR(255),
  seo_description TEXT,
  status VARCHAR(24) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'published', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  published_at TIMESTAMPTZ,
  created_by BIGINT REFERENCES cms_admin_users(id) ON DELETE SET NULL,
  updated_by BIGINT REFERENCES cms_admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (site_id, locale, slug)
);

CREATE TABLE cms_contact_units (
  id BIGSERIAL PRIMARY KEY,
  site_id BIGINT NOT NULL REFERENCES cms_sites(id) ON DELETE CASCADE,
  locale VARCHAR(16) NOT NULL DEFAULT 'zh-HK',
  unit_key VARCHAR(120) NOT NULL,
  unit_type VARCHAR(48) NOT NULL DEFAULT 'general',
  title VARCHAR(255) NOT NULL,
  phone VARCHAR(80),
  fax VARCHAR(80),
  contact_person VARCHAR(160),
  email VARCHAR(320),
  address TEXT,
  map_url TEXT,
  status VARCHAR(24) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'published', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  published_at TIMESTAMPTZ,
  created_by BIGINT REFERENCES cms_admin_users(id) ON DELETE SET NULL,
  updated_by BIGINT REFERENCES cms_admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (site_id, locale, unit_key)
);

CREATE TABLE cms_milestones (
  id BIGSERIAL PRIMARY KEY,
  site_id BIGINT NOT NULL REFERENCES cms_sites(id) ON DELETE CASCADE,
  locale VARCHAR(16) NOT NULL DEFAULT 'zh-HK',
  source_key VARCHAR(160) NOT NULL,
  year INTEGER NOT NULL CHECK (year BETWEEN 1800 AND 2200),
  month VARCHAR(32),
  event TEXT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'published', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  published_at TIMESTAMPTZ,
  created_by BIGINT REFERENCES cms_admin_users(id) ON DELETE SET NULL,
  updated_by BIGINT REFERENCES cms_admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (site_id, locale, source_key)
);

CREATE TABLE cms_people (
  id BIGSERIAL PRIMARY KEY,
  site_id BIGINT NOT NULL REFERENCES cms_sites(id) ON DELETE CASCADE,
  locale VARCHAR(16) NOT NULL DEFAULT 'zh-HK',
  person_key VARCHAR(160) NOT NULL,
  person_group VARCHAR(32) NOT NULL CHECK (person_group IN ('board', 'management')),
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL,
  biography TEXT,
  secondary_biography TEXT,
  image_url TEXT,
  status VARCHAR(24) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'published', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  published_at TIMESTAMPTZ,
  created_by BIGINT REFERENCES cms_admin_users(id) ON DELETE SET NULL,
  updated_by BIGINT REFERENCES cms_admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (site_id, locale, person_key)
);

CREATE TABLE cms_services (
  id BIGSERIAL PRIMARY KEY,
  site_id BIGINT NOT NULL REFERENCES cms_sites(id) ON DELETE CASCADE,
  locale VARCHAR(16) NOT NULL DEFAULT 'zh-HK',
  slug VARCHAR(180) NOT NULL,
  service_group VARCHAR(80) NOT NULL DEFAULT 'core',
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  icon_name VARCHAR(120),
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(24) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'published', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  published_at TIMESTAMPTZ,
  created_by BIGINT REFERENCES cms_admin_users(id) ON DELETE SET NULL,
  updated_by BIGINT REFERENCES cms_admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (site_id, locale, slug)
);

CREATE TABLE cms_case_studies (
  id BIGSERIAL PRIMARY KEY,
  site_id BIGINT NOT NULL REFERENCES cms_sites(id) ON DELETE CASCADE,
  locale VARCHAR(16) NOT NULL DEFAULT 'zh-HK',
  slug VARCHAR(180) NOT NULL,
  title VARCHAR(255) NOT NULL,
  client_name VARCHAR(255),
  industry VARCHAR(160),
  description TEXT,
  challenge TEXT,
  solution TEXT,
  result TEXT,
  image_url TEXT,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(24) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'published', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  published_at TIMESTAMPTZ,
  created_by BIGINT REFERENCES cms_admin_users(id) ON DELETE SET NULL,
  updated_by BIGINT REFERENCES cms_admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (site_id, locale, slug)
);

CREATE TABLE cms_news_posts (
  id BIGSERIAL PRIMARY KEY,
  site_id BIGINT NOT NULL REFERENCES cms_sites(id) ON DELETE CASCADE,
  locale VARCHAR(16) NOT NULL DEFAULT 'zh-HK',
  slug VARCHAR(180) NOT NULL,
  title VARCHAR(255) NOT NULL,
  excerpt TEXT,
  content_html TEXT,
  featured_image_url TEXT,
  category VARCHAR(120),
  status VARCHAR(24) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'published', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  published_at TIMESTAMPTZ,
  created_by BIGINT REFERENCES cms_admin_users(id) ON DELETE SET NULL,
  updated_by BIGINT REFERENCES cms_admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (site_id, locale, slug)
);

CREATE TABLE cms_media_assets (
  id BIGSERIAL PRIMARY KEY,
  site_id BIGINT REFERENCES cms_sites(id) ON DELETE SET NULL,
  storage_provider VARCHAR(32) NOT NULL CHECK (storage_provider IN ('local', 's3', 'external')),
  storage_key TEXT,
  original_name VARCHAR(500) NOT NULL,
  mime_type VARCHAR(160) NOT NULL,
  byte_size BIGINT NOT NULL DEFAULT 0 CHECK (byte_size >= 0),
  public_url TEXT NOT NULL,
  alt_text TEXT,
  uploaded_by BIGINT REFERENCES cms_admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cms_investor_documents (
  id BIGSERIAL PRIMARY KEY,
  site_id BIGINT NOT NULL REFERENCES cms_sites(id) ON DELETE CASCADE,
  locale VARCHAR(16) NOT NULL DEFAULT 'zh-HK',
  document_key VARCHAR(180) NOT NULL,
  category VARCHAR(80) NOT NULL,
  title VARCHAR(500) NOT NULL,
  fiscal_year VARCHAR(32),
  document_url TEXT,
  media_id BIGINT REFERENCES cms_media_assets(id) ON DELETE SET NULL,
  published_on DATE,
  status VARCHAR(24) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'published', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  published_at TIMESTAMPTZ,
  created_by BIGINT REFERENCES cms_admin_users(id) ON DELETE SET NULL,
  updated_by BIGINT REFERENCES cms_admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (site_id, locale, document_key)
);

CREATE TABLE cms_content_revisions (
  id BIGSERIAL PRIMARY KEY,
  resource_type VARCHAR(80) NOT NULL,
  resource_id BIGINT NOT NULL,
  version INTEGER NOT NULL,
  action VARCHAR(32) NOT NULL,
  snapshot JSONB NOT NULL,
  created_by BIGINT REFERENCES cms_admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (resource_type, resource_id, version)
);

CREATE INDEX cms_content_revisions_resource_idx
  ON cms_content_revisions (resource_type, resource_id, version DESC);

CREATE TABLE cms_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES cms_admin_users(id) ON DELETE SET NULL,
  action VARCHAR(80) NOT NULL,
  resource_type VARCHAR(80),
  resource_id BIGINT,
  before_data JSONB,
  after_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX cms_audit_logs_created_idx ON cms_audit_logs (created_at DESC);
CREATE INDEX cms_audit_logs_resource_idx ON cms_audit_logs (resource_type, resource_id);

CREATE INDEX cms_navigation_public_idx ON cms_navigation_items (site_id, locale, location, status, sort_order);
CREATE INDEX cms_pages_public_idx ON cms_pages (site_id, locale, status, sort_order);
CREATE INDEX cms_contacts_public_idx ON cms_contact_units (site_id, locale, status, sort_order);
CREATE INDEX cms_milestones_public_idx ON cms_milestones (site_id, locale, status, year DESC, sort_order);
CREATE INDEX cms_people_public_idx ON cms_people (site_id, locale, person_group, status, sort_order);
CREATE INDEX cms_services_public_idx ON cms_services (site_id, locale, service_group, status, sort_order);
CREATE INDEX cms_cases_public_idx ON cms_case_studies (site_id, locale, status, sort_order);
CREATE INDEX cms_news_public_idx ON cms_news_posts (site_id, locale, status, published_at DESC);
CREATE INDEX cms_investor_public_idx ON cms_investor_documents (site_id, locale, category, status, published_on DESC);

CREATE OR REPLACE FUNCTION cms_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'cms_sites', 'cms_admin_users', 'cms_settings', 'cms_navigation_items',
    'cms_pages', 'cms_contact_units', 'cms_milestones', 'cms_people',
    'cms_services', 'cms_case_studies', 'cms_news_posts', 'cms_investor_documents'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER %I_touch_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION cms_touch_updated_at()',
      table_name,
      table_name
    );
  END LOOP;
END $$;