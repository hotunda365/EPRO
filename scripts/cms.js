(() => {
  'use strict';

  const body = document.body;
  const site = body.dataset.cmsSite || 'eprotel';
  const navigationSite = body.dataset.cmsNavSite || site;
  const pageKey = body.dataset.cmsPage || '';
  const localHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const configuredBase = document.querySelector('meta[name="epro-api-base"]')?.content || window.EPRO_CMS_API;
  const apiBase = (configuredBase || (localHost ? 'http://localhost:3000/api/v1' : 'https://api.epro.zeabur.app/api/v1')).replace(/\/$/, '');
  const apiOrigin = new URL(apiBase, window.location.origin).origin;

  const create = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  };

  const fetchJson = async (path) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4500);
    try {
      const response = await fetch(`${apiBase}/public${path}`, {
        headers: { Accept: 'application/json' },
        mode: 'cors',
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`CMS request failed (${response.status})`);
      return await response.json();
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const queryForSite = (path, siteKey, extra = {}) => {
    const params = new URLSearchParams({ site: siteKey, locale: document.documentElement.lang || 'zh-HK', ...extra });
    return fetchJson(`${path}?${params}`);
  };
  const query = (path, extra = {}) => queryForSite(path, site, extra);

  const setMultilineText = (node, value) => {
    if (!node || !value) return;
    const lines = String(value).split('\n');
    node.replaceChildren();
    lines.forEach((line, index) => {
      if (index) node.append(document.createElement('br'));
      node.append(document.createTextNode(line));
    });
  };

  const appendLabelValue = (container, label, value, href) => {
    if (!value) return;
    if (container.childNodes.length) container.append(document.createElement('br'));
    container.append(create('strong', '', `${label}：`));
    if (href) {
      const link = create('a', '', value); link.href = href; container.append(link);
    } else container.append(document.createTextNode(value));
  };

  const safeTel = (value) => {
    const digits = String(value).replace(/\D/g, '');
    return `tel:${digits.startsWith('852') ? '+' : ''}${digits}`;
  };

  const updateAdminLinks = () => {
    const loginUrl = `${apiOrigin}/admin/`;
    document.querySelectorAll('.cta-login').forEach((link) => {
      link.href = loginUrl;
      link.setAttribute('aria-label', '登入網站內容管理平台');
    });
  };

  const applyBootstrap = (data) => {
    const email = data.settings['contact.email'];
    if (email) {
      document.querySelectorAll('.site-footer a[href^="mailto:"]').forEach((link) => {
        link.href = `mailto:${email}`;
        link.textContent = email;
      });
    }
    const stockCode = data.settings['stock.code'];
    if (stockCode) document.querySelectorAll('.stock-code').forEach((node) => { node.textContent = `Stock Code: ${stockCode}`; });
    const copyright = data.settings['footer.copyright'];
    if (copyright) {
      document.querySelectorAll('.footer-copyright').forEach((node) => {
        const lineBreak = node.querySelector('br');
        const secondLine = lineBreak?.nextSibling?.textContent;
        node.replaceChildren(document.createTextNode(copyright));
        if (secondLine) node.append(document.createElement('br'), document.createTextNode(secondLine));
      });
    }
    const statNodes = document.querySelectorAll('.sam-stat-n[data-count]');
    const statSettings = [
      ['company.years_experience', '+'],
      ['company.service_seats', '+'],
      ['company.professional_agents', '+'],
      ['company.operating_area', '']
    ];
    statSettings.forEach(([key, suffix], index) => {
      if (!statNodes[index] || data.settings[key] === undefined) return;
      const value = Number(data.settings[key]);
      if (!Number.isFinite(value)) return;
      statNodes[index].dataset.count = String(value);
      statNodes[index].dataset.suffix = suffix;
      statNodes[index].textContent = `${value.toLocaleString('en-US')}${suffix}`;
    });
    const certifications = data.settings['company.certifications'];
    const certificationLabel = document.querySelector('.sam-stat:nth-child(5) .sam-stat-l');
    if (certifications && certificationLabel) certificationLabel.textContent = certifications;
  };

  const applyNavigation = (items) => {
    const locationSelectors = {
      primary: '.main-nav a',
      switcher: '.switch-links a',
      footer: '.footer-panel-links a',
      legal: '.footer-legal-links a'
    };
    items.forEach((item) => {
      const selector = locationSelectors[item.location];
      if (!selector) return;
      let targetPath;
      try { targetPath = new URL(item.url, window.location.origin).pathname; } catch { return; }
      document.querySelectorAll(selector).forEach((link) => {
        let linkPath;
        try { linkPath = new URL(link.href, window.location.href).pathname; } catch { return; }
        if (linkPath !== targetPath) return;
        link.textContent = item.label;
        link.href = item.url;
        if (item.is_external) { link.target = '_blank'; link.rel = 'noopener'; }
      });
    });
  };

  const applyPage = (page) => {
    const eyebrow = document.querySelector('.sam-hero-eyebrow, .hero-eyebrow');
    const title = document.querySelector('.sam-hero-title, .page-hero h1, .hero-text h1');
    const subtitle = document.querySelector('.sam-hero-lead, .page-hero p, .hero-text > p');
    if (page.eyebrow && eyebrow) eyebrow.textContent = page.eyebrow;
    setMultilineText(title, page.hero_title || page.title);
    setMultilineText(subtitle, page.hero_subtitle || page.summary);
    const heroImage = document.querySelector('.sam-hero-img');
    if (heroImage && page.hero_image_url) {
      heroImage.src = page.hero_image_url;
      heroImage.style.objectPosition = page.hero_image_position || 'center center';
    }
    if (page.seo_title) document.title = page.seo_title;
    const description = document.querySelector('meta[name="description"]');
    if (description && page.seo_description) description.content = page.seo_description;
    if (pageKey === 'about' && page.content_html) {
      const target = document.querySelector('.sam-intro-body');
      if (target) {
        const parsed = new DOMParser().parseFromString(page.content_html, 'text/html');
        target.replaceChildren(...parsed.body.childNodes);
      }
    }
  };

  const renderContacts = (records) => {
    const grid = document.querySelector('.contact-grid');
    if (!grid || !records.length) return;
    grid.replaceChildren();
    records.forEach((record) => {
      const card = create('div', 'contact-info'); card.append(create('h3', '', record.title));
      const details = create('p');
      if (record.address) {
        record.address.split('\n').forEach((line, index) => { if (index) details.append(document.createElement('br')); details.append(document.createTextNode(line)); });
      }
      appendLabelValue(details, '電話', record.phone, record.phone ? safeTel(record.phone) : null);
      appendLabelValue(details, '傳真', record.fax);
      appendLabelValue(details, '聯絡人', record.contact_person);
      appendLabelValue(details, '電子郵件', record.email, record.email ? `mailto:${record.email}` : null);
      card.append(details); grid.append(card);
    });
    const primaryEmail = records.find((record) => record.email)?.email;
    document.querySelectorAll('.contact-form-section a[href^="mailto:"]').forEach((link) => { if (primaryEmail) { link.href = `mailto:${primaryEmail}`; link.textContent = primaryEmail; } });
  };

  const renderPeople = (records, group) => {
    const grid = document.querySelector(group === 'board' ? '.board-grid' : '.management-grid');
    if (!grid || !records.length) return;
    const memberClass = group === 'board' ? 'board-member' : 'management-member';
    const roleClass = group === 'board' ? 'board-role' : 'management-role';
    grid.replaceChildren();
    records.forEach((record) => {
      const article = create('article', memberClass); article.append(create('p', roleClass, record.role), create('h3', '', record.name));
      if (record.biography) article.append(create('p', '', record.biography));
      if (record.secondary_biography) article.append(create('p', '', record.secondary_biography));
      grid.append(article);
    });
  };

  const renderMilestones = (records) => {
    const timeline = document.querySelector('.sam-timeline');
    if (!timeline || !records.length) return;
    const grouped = new Map();
    records.forEach((record) => { if (!grouped.has(record.year)) grouped.set(record.year, []); grouped.get(record.year).push(record); });
    timeline.replaceChildren();
    grouped.forEach((events, year) => {
      const item = create('div', 'sam-tl-item is-visible'); const yearNode = create('div', 'sam-tl-year'); yearNode.append(create('span', '', year));
      const bodyNode = create('div', 'sam-tl-body'); const list = create('ul', 'sam-tl-events');
      events.forEach((event) => { const row = create('li'); row.append(create('span', 'tl-month', event.month || ''), create('span', '', event.event)); list.append(row); });
      bodyNode.append(list); item.append(yearNode, bodyNode); timeline.append(item);
    });
  };

  const serviceCard = (record, className = 'card') => {
    const article = create('article', className);
    if (record.image_url && className === 'card') { const image = create('img'); image.src = record.image_url; image.alt = record.name; article.append(image); }
    article.append(create('h3', '', record.name));
    if (record.description) article.append(create('p', '', record.description));
    if (Array.isArray(record.features) && record.features.length) { const list = create('ul'); record.features.forEach((feature) => list.append(create('li', '', feature))); article.append(list); }
    return article;
  };

  const renderServices = (records) => {
    if (!records.length) return;
    if (pageKey === 'business') {
      const grids = document.querySelectorAll('.content .grid.grid-3');
      [['core', grids[0]], ['subsidiary', grids[1]]].forEach(([group, grid]) => { if (!grid) return; const items = records.filter((record) => record.service_group === group); if (items.length) grid.replaceChildren(...items.map((record) => serviceCard(record))); });
    } else if (pageKey === 'services') {
      const grid = document.querySelector('.services-list .grid');
      if (grid) grid.replaceChildren(...records.map((record) => serviceCard(record, 'service-card')));
      const pricing = document.querySelector('.pricing'); if (pricing) pricing.hidden = true;
    } else if (pageKey === 'home') {
      const grid = document.querySelector('.features .grid'); const core = records.filter((record) => record.service_group === 'core').slice(0, 3);
      if (grid && core.length) grid.replaceChildren(...core.map((record) => serviceCard(record)));
    } else if (pageKey === 'about') {
      const labels = document.querySelectorAll('.sam-services-grid .sam-svc-label span');
      records.slice(0, labels.length).forEach((record, index) => { labels[index].textContent = record.name; });
    }
  };

  const caseDetail = (record) => {
    const article = create('article', 'case-detail');
    if (record.image_url) { const image = create('img'); image.src = record.image_url; image.alt = record.title; article.append(image); }
    const content = create('div', 'case-content'); content.append(create('h3', '', record.title));
    if (record.industry || record.client_name) content.append(create('p', 'industry', [record.industry, record.client_name].filter(Boolean).join(' · ')));
    [['挑戰', record.challenge], ['方案', record.solution], ['成果', record.result]].forEach(([label, value]) => { if (!value) return; const paragraph = create('p'); paragraph.append(create('strong', '', `${label}：`), document.createTextNode(value)); content.append(paragraph); });
    if (!record.challenge && record.description) content.append(create('p', '', record.description));
    article.append(content); return article;
  };

  const renderCases = (records) => {
    if (!records.length) return;
    if (pageKey === 'cases') {
      const grid = document.querySelector('.cases-grid .grid'); if (grid) grid.replaceChildren(...records.map(caseDetail));
    } else if (pageKey === 'home') {
      const grid = document.querySelector('.cases .grid');
      if (grid) grid.replaceChildren(...records.slice(0, 3).map((record) => { const card = create('div', 'case-card'); if (record.image_url) { const image = create('img'); image.src = record.image_url; image.alt = record.title; card.append(image); } const copy = create('div', 'case-body'); copy.append(create('h4', '', record.title), create('p', '', record.description || '')); card.append(copy); return card; }));
    }
  };

  const renderInvestorDocuments = (records) => {
    const financial = document.querySelector('[data-cms-investor="financial-report"]');
    const announcements = document.querySelector('[data-cms-investor="announcements"]');
    const fill = (list, items) => {
      if (!list) return; list.replaceChildren();
      if (!items.length) { list.append(create('li', 'cms-empty', '暫未有已發布文件')); return; }
      items.forEach((record) => { const row = create('li'); const link = create('a', '', record.title); link.href = new URL(record.document_url, apiOrigin).href; link.target = '_blank'; link.rel = 'noopener'; row.append(link); if (record.published_on) row.append(create('time', '', record.published_on)); list.append(row); });
    };
    fill(financial, records.filter((record) => record.category === 'financial-report'));
    fill(announcements, records.filter((record) => record.category !== 'financial-report'));
  };

  const renderNews = (records) => {
    const list = document.querySelector('[data-cms-news-list]');
    if (!list) return; list.replaceChildren();
    if (!records.length) { list.append(create('p', 'cms-empty', '暫未有已發布消息')); return; }
    records.forEach((record) => {
      const article = create('article', 'cms-news-item');
      if (record.featured_image_url) { const image = create('img'); image.src = record.featured_image_url; image.alt = record.title; article.append(image); }
      const copy = create('div', 'cms-news-copy');
      const meta = [record.category, record.published_at ? new Intl.DateTimeFormat('zh-HK', { dateStyle: 'medium' }).format(new Date(record.published_at)) : null].filter(Boolean).join(' · ');
      if (meta) copy.append(create('p', 'cms-news-meta', meta)); copy.append(create('h2', '', record.title)); if (record.excerpt) copy.append(create('p', '', record.excerpt)); article.append(copy); list.append(article);
    });
  };

  const loadPageResources = async () => {
    const jobs = [];
    if (pageKey) jobs.push(query(`/pages/${encodeURIComponent(pageKey)}`).then(applyPage));
    if (pageKey === 'contact') jobs.push(query('/contacts').then((response) => renderContacts(response.data)));
    if (pageKey === 'board' || pageKey === 'management') jobs.push(query('/people', { group: pageKey }).then((response) => renderPeople(response.data, pageKey)));
    if (pageKey === 'milestones') jobs.push(query('/milestones').then((response) => renderMilestones(response.data)));
    if (['home', 'about', 'business', 'services'].includes(pageKey)) jobs.push(query('/services').then((response) => renderServices(response.data)));
    if (pageKey === 'home' || pageKey === 'cases') jobs.push(query('/case-studies', { featured: pageKey === 'home' ? 'true' : 'false' }).then((response) => renderCases(response.data)));
    if (pageKey === 'investor') jobs.push(query('/investor-documents').then((response) => renderInvestorDocuments(response.data)));
    if (pageKey === 'news') jobs.push(query('/news', { limit: '100' }).then((response) => renderNews(response.data)));
    const results = await Promise.allSettled(jobs);
    if (results.some((result) => result.status === 'fulfilled')) body.classList.add('cms-synced');
  };

  const initialize = async () => {
    updateAdminLinks();
    const bootstrap = query('/bootstrap').then((data) => {
      applyBootstrap(data);
      if (navigationSite === site) applyNavigation(data.navigation);
    });
    const navigation = navigationSite === site
      ? Promise.resolve()
      : queryForSite('/bootstrap', navigationSite).then((data) => applyNavigation(data.navigation));
    await Promise.allSettled([bootstrap, navigation, loadPageResources()]);
  };

  initialize();
})();