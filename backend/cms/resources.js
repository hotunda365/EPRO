const sanitizeHtml = require('sanitize-html');
const { z } = require('zod');

const status = z.enum(['draft', 'review', 'published', 'archived']);
const locale = z.string().trim().min(2).max(16).default('zh-HK');
const siteId = z.coerce.number().int().positive();
const sortOrder = z.coerce.number().int().min(-100000).max(100000).default(0);
const nullableText = (max = 10000) => z.string().trim().max(max).nullable().optional();
const nullableUrl = z.string().trim().max(2048).refine(
  (value) => value === '' || value.startsWith('/') || /^https?:\/\//i.test(value),
  'URL must be relative or use HTTP(S)'
).transform((value) => value || null).nullable().optional();
const nullableDate = z.string().trim().refine(
  (value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value),
  'Date must use YYYY-MM-DD'
).transform((value) => value || null).nullable().optional();
const nullableDateTime = z.string().trim().refine(
  (value) => value === '' || !Number.isNaN(Date.parse(value)),
  'Invalid date and time'
).transform((value) => value || null).nullable().optional();

const commonContentFields = {
  site_id: siteId,
  locale,
  status: status.default('draft'),
  sort_order: sortOrder
};

const resources = {
  settings: {
    table: 'cms_settings',
    label: '網站設定',
    columns: ['site_id', 'locale', 'setting_key', 'setting_value', 'group_name', 'description', 'is_public'],
    createSchema: z.object({
      site_id: siteId,
      locale,
      setting_key: z.string().trim().min(2).max(160),
      setting_value: z.unknown(),
      group_name: z.string().trim().min(2).max(80).default('general'),
      description: nullableText(1000),
      is_public: z.boolean().default(true)
    }),
    searchFields: ['setting_key', 'group_name', 'description'],
    orderBy: 'group_name ASC, setting_key ASC',
    hasVersion: false,
    hasAuthors: false,
    supportsPublish: false,
    softDelete: false
  },
  navigation: {
    table: 'cms_navigation_items',
    label: '導覽與頁尾',
    columns: ['site_id', 'locale', 'item_key', 'label', 'url', 'parent_id', 'location', 'sort_order', 'is_external', 'status'],
    createSchema: z.object({
      site_id: siteId,
      locale,
      item_key: z.string().trim().min(2).max(120),
      label: z.string().trim().min(1).max(160),
      url: z.string().trim().min(1).max(2048),
      parent_id: z.coerce.number().int().positive().nullable().optional(),
      location: z.enum(['switcher', 'primary', 'footer', 'legal']).default('primary'),
      sort_order: sortOrder,
      is_external: z.boolean().default(false),
      status: status.default('draft')
    }),
    searchFields: ['item_key', 'label', 'url'],
    orderBy: 'location ASC, sort_order ASC, id ASC',
    hasVersion: false,
    hasAuthors: false,
    supportsPublish: true,
    softDelete: true
  },
  pages: {
    table: 'cms_pages',
    label: '公司與一般頁面',
    columns: ['site_id', 'locale', 'slug', 'title', 'eyebrow', 'hero_title', 'hero_subtitle', 'hero_image_url', 'hero_image_position', 'summary', 'content_html', 'seo_title', 'seo_description', 'status', 'sort_order'],
    createSchema: z.object({
      ...commonContentFields,
      slug: z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      title: z.string().trim().min(1).max(255),
      eyebrow: nullableText(160),
      hero_title: nullableText(1000),
      hero_subtitle: nullableText(2000),
      hero_image_url: nullableUrl,
      hero_image_position: z.string().trim().max(40).default('center center'),
      summary: nullableText(5000),
      content_html: nullableText(1000000),
      seo_title: nullableText(255),
      seo_description: nullableText(5000)
    }),
    htmlFields: ['content_html'],
    searchFields: ['slug', 'title', 'summary'],
    orderBy: 'sort_order ASC, title ASC',
    hasVersion: true,
    hasAuthors: true,
    supportsPublish: true,
    softDelete: true
  },
  contacts: {
    table: 'cms_contact_units',
    label: '聯絡資料',
    columns: ['site_id', 'locale', 'unit_key', 'unit_type', 'title', 'phone', 'fax', 'contact_person', 'email', 'address', 'map_url', 'status', 'sort_order'],
    createSchema: z.object({
      ...commonContentFields,
      unit_key: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      unit_type: z.string().trim().min(2).max(48).default('general'),
      title: z.string().trim().min(1).max(255),
      phone: nullableText(80),
      fax: nullableText(80),
      contact_person: nullableText(160),
      email: z.string().trim().email().max(320).nullable().optional(),
      address: nullableText(5000),
      map_url: nullableUrl
    }),
    searchFields: ['unit_key', 'title', 'phone', 'contact_person', 'email', 'address'],
    orderBy: 'sort_order ASC, id ASC',
    hasVersion: true,
    hasAuthors: true,
    supportsPublish: true,
    softDelete: true
  },
  milestones: {
    table: 'cms_milestones',
    label: '里程碑',
    columns: ['site_id', 'locale', 'source_key', 'year', 'month', 'event', 'status', 'sort_order'],
    createSchema: z.object({
      ...commonContentFields,
      source_key: z.string().trim().min(2).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      year: z.coerce.number().int().min(1800).max(2200),
      month: nullableText(32),
      event: z.string().trim().min(2).max(10000)
    }),
    searchFields: ['source_key', 'month', 'event'],
    orderBy: 'year DESC, sort_order ASC, id ASC',
    hasVersion: true,
    hasAuthors: true,
    supportsPublish: true,
    softDelete: true
  },
  people: {
    table: 'cms_people',
    label: '董事局及管理層',
    columns: ['site_id', 'locale', 'person_key', 'person_group', 'name', 'role', 'biography', 'secondary_biography', 'image_url', 'status', 'sort_order'],
    createSchema: z.object({
      ...commonContentFields,
      person_key: z.string().trim().min(2).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      person_group: z.enum(['board', 'management']),
      name: z.string().trim().min(1).max(255),
      role: z.string().trim().min(1).max(255),
      biography: nullableText(30000),
      secondary_biography: nullableText(30000),
      image_url: nullableUrl
    }),
    searchFields: ['person_key', 'name', 'role', 'biography'],
    orderBy: 'person_group ASC, sort_order ASC, id ASC',
    hasVersion: true,
    hasAuthors: true,
    supportsPublish: true,
    softDelete: true
  },
  services: {
    table: 'cms_services',
    label: '業務與服務',
    columns: ['site_id', 'locale', 'slug', 'service_group', 'name', 'description', 'image_url', 'icon_name', 'features', 'status', 'sort_order'],
    createSchema: z.object({
      ...commonContentFields,
      slug: z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      service_group: z.string().trim().min(1).max(80).default('core'),
      name: z.string().trim().min(1).max(255),
      description: nullableText(30000),
      image_url: nullableUrl,
      icon_name: nullableText(120),
      features: z.array(z.string().trim().min(1).max(1000)).max(100).default([])
    }),
    searchFields: ['slug', 'service_group', 'name', 'description'],
    orderBy: 'service_group ASC, sort_order ASC, id ASC',
    hasVersion: true,
    hasAuthors: true,
    supportsPublish: true,
    softDelete: true
  },
  cases: {
    table: 'cms_case_studies',
    label: '案例',
    columns: ['site_id', 'locale', 'slug', 'title', 'client_name', 'industry', 'description', 'challenge', 'solution', 'result', 'image_url', 'featured', 'status', 'sort_order'],
    createSchema: z.object({
      ...commonContentFields,
      slug: z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      title: z.string().trim().min(1).max(255),
      client_name: nullableText(255),
      industry: nullableText(160),
      description: nullableText(30000),
      challenge: nullableText(100000),
      solution: nullableText(100000),
      result: nullableText(100000),
      image_url: nullableUrl,
      featured: z.boolean().default(false)
    }),
    searchFields: ['slug', 'title', 'client_name', 'industry', 'description'],
    orderBy: 'sort_order ASC, created_at DESC',
    hasVersion: true,
    hasAuthors: true,
    supportsPublish: true,
    softDelete: true
  },
  news: {
    table: 'cms_news_posts',
    label: '最新消息',
    columns: ['site_id', 'locale', 'slug', 'title', 'excerpt', 'content_html', 'featured_image_url', 'category', 'status', 'sort_order', 'published_at'],
    createSchema: z.object({
      ...commonContentFields,
      slug: z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      title: z.string().trim().min(1).max(255),
      excerpt: nullableText(5000),
      content_html: nullableText(1000000),
      featured_image_url: nullableUrl,
      category: nullableText(120),
      published_at: nullableDateTime
    }),
    htmlFields: ['content_html'],
    searchFields: ['slug', 'title', 'excerpt', 'category'],
    orderBy: 'published_at DESC NULLS LAST, sort_order ASC, id DESC',
    hasVersion: true,
    hasAuthors: true,
    supportsPublish: true,
    softDelete: true
  },
  'investor-documents': {
    table: 'cms_investor_documents',
    label: '投資者文件',
    columns: ['site_id', 'locale', 'document_key', 'category', 'title', 'fiscal_year', 'document_url', 'media_id', 'published_on', 'status', 'sort_order'],
    createSchema: z.object({
      ...commonContentFields,
      document_key: z.string().trim().min(2).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      category: z.string().trim().min(2).max(80),
      title: z.string().trim().min(1).max(500),
      fiscal_year: nullableText(32),
      document_url: nullableUrl,
      media_id: z.coerce.number().int().positive().nullable().optional(),
      published_on: nullableDate
    }),
    searchFields: ['document_key', 'category', 'title', 'fiscal_year'],
    orderBy: 'published_on DESC NULLS LAST, sort_order ASC, id DESC',
    hasVersion: true,
    hasAuthors: true,
    supportsPublish: true,
    softDelete: true,
    validatePublish(record) {
      return record.document_url || record.media_id ? null : 'A document URL or uploaded media file is required before publishing';
    }
  }
};

const sanitizeOptions = {
  allowedTags: [
    'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'ul', 'ol', 'li', 'blockquote',
    'h2', 'h3', 'h4', 'h5', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    th: ['scope'],
    td: ['colspan', 'rowspan']
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true)
  }
};

const sanitizeResourceData = (config, data) => {
  const sanitized = { ...data };
  for (const field of config.htmlFields || []) {
    if (typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeHtml(sanitized[field], sanitizeOptions);
    }
  }
  return sanitized;
};

const getResource = (resourceName) => resources[resourceName] || null;

module.exports = { resources, getResource, sanitizeResourceData };