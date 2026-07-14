(() => {
  'use strict';

  const ROLE_LEVEL = { viewer: 1, editor: 2, publisher: 3, admin: 4 };
  const STATUS_LABELS = { draft: '草稿', review: '待審批', published: '已發布', archived: '已封存' };
  const state = { user: null, sites: [], siteId: null, view: 'dashboard', resource: null, editor: null, renderVersion: 0 };
  const loginView = document.getElementById('login-view');
  const adminView = document.getElementById('admin-view');
  const workspace = document.getElementById('workspace');
  const siteSelect = document.getElementById('site-select');
  const editorDialog = document.getElementById('editor-dialog');
  const historyDialog = document.getElementById('history-dialog');
  const editorFields = document.getElementById('editor-fields');
  const toast = document.getElementById('toast');

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  };

  const csrfToken = () => {
    const name = 'epro_admin_csrf=';
    const cookie = document.cookie.split('; ').find((item) => item.startsWith(name));
    return cookie ? decodeURIComponent(cookie.slice(name.length)) : '';
  };

  const api = async (path, options = {}) => {
    const requestOptions = { credentials: 'same-origin', ...options, headers: { Accept: 'application/json', ...(options.headers || {}) } };
    const method = (requestOptions.method || 'GET').toUpperCase();
    if (!['GET', 'HEAD'].includes(method)) requestOptions.headers['X-CSRF-Token'] = csrfToken();
    if (requestOptions.body && !(requestOptions.body instanceof FormData)) requestOptions.headers['Content-Type'] = 'application/json';
    const response = await fetch(`/api/v1${path}`, requestOptions);
    if (response.status === 204) return null;
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) showLogin();
    if (!response.ok) {
      const error = new Error(data.error || 'Request failed');
      error.details = data.details;
      throw error;
    }
    return data;
  };

  const notify = (message, isError = false) => {
    toast.textContent = message;
    toast.className = `toast show${isError ? ' error' : ''}`;
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => { toast.className = 'toast'; }, 3200);
  };

  const can = (role) => ROLE_LEVEL[state.user?.role] >= ROLE_LEVEL[role];
  const currentSite = () => state.sites.find((site) => String(site.id) === String(state.siteId));
  const clearWorkspace = () => { workspace.replaceChildren(element('div', 'loading', '載入中…')); };
  const showLogin = () => { loginView.hidden = false; adminView.hidden = true; };

  const showAdmin = () => {
    loginView.hidden = true;
    adminView.hidden = false;
    document.getElementById('account-name').textContent = state.user.displayName;
    document.querySelectorAll('[data-role]').forEach((button) => { button.hidden = !can(button.dataset.role); });
  };

  const setViewTitle = (title, eyebrow = '內容管理') => {
    document.getElementById('view-title').textContent = title;
    document.getElementById('view-eyebrow').textContent = eyebrow;
  };

  const markActiveNavigation = () => {
    document.querySelectorAll('#sidebar-nav button').forEach((button) => {
      button.classList.toggle('active', button.dataset.view === state.view || button.dataset.resource === state.resource);
    });
  };

  const statusBadge = (status) => {
    const badge = element('span', `status status-${status}`, STATUS_LABELS[status] || status);
    return badge;
  };

  const formatDate = (value) => value ? new Intl.DateTimeFormat('zh-HK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
  const formatCell = (field, value) => {
    if (field === 'status') return statusBadge(value);
    if (field === 'updated_at' || field === 'published_at' || field === 'created_at') return document.createTextNode(formatDate(value));
    if (typeof value === 'boolean') return document.createTextNode(value ? '是' : '否');
    if (value === null || value === undefined || value === '') return document.createTextNode('—');
    if (typeof value === 'object') return document.createTextNode(JSON.stringify(value));
    return document.createTextNode(String(value).length > 120 ? `${String(value).slice(0, 117)}…` : String(value));
  };

  const viewHeader = (title, description, action) => {
    const header = element('header', 'view-header');
    const copy = element('div');
    copy.append(element('h2', '', title), element('p', '', description));
    header.append(copy);
    if (action) header.append(action);
    return header;
  };

  const renderDashboard = async () => {
    const renderVersion = ++state.renderVersion;
    state.view = 'dashboard'; state.resource = null; markActiveNavigation(); setViewTitle('總覽', currentSite()?.name || '內容管理'); clearWorkspace();
    try {
      const data = await api(`/admin/dashboard?site_id=${state.siteId}`);
      if (renderVersion !== state.renderVersion) return;
      workspace.replaceChildren();
      const siteName = currentSite()?.name || '網站';
      workspace.append(viewHeader('內容總覽', `${siteName} 的發布與審批狀態`));
      const totals = Object.values(data.counts).reduce((summary, counts) => {
        Object.entries(counts).forEach(([key, count]) => { summary[key] = (summary[key] || 0) + count; });
        return summary;
      }, {});
      const stats = element('section', 'stats-grid');
      [['published', '已發布'], ['draft', '草稿'], ['review', '待審批'], ['archived', '已封存']].forEach(([key, label]) => {
        const tile = element('div', 'stat-tile'); tile.append(element('span', '', label), element('strong', '', totals[key] || 0)); stats.append(tile);
      });
      workspace.append(stats);
      const panel = element('section', 'panel');
      const panelHeader = element('div', 'panel-header'); panelHeader.append(element('h3', '', '最近活動'), element('p', '', '最新 12 筆系統紀錄')); panel.append(panelHeader);
      const list = element('ul', 'activity-list');
      data.recentAudit.forEach((item) => {
        const row = element('li'); row.append(element('time', '', formatDate(item.created_at)), element('span', '', `${item.user_name || '系統'} · ${item.action}`), element('span', '', item.resource_type || '—')); list.append(row);
      });
      if (!data.recentAudit.length) list.append(element('li', '', '尚未有活動紀錄'));
      panel.append(list); workspace.append(panel);
    } catch (error) { if (renderVersion === state.renderVersion) workspace.replaceChildren(element('div', 'empty-state', error.message)); }
  };

  const renderResource = async (resourceName, query = {}) => {
    const renderVersion = ++state.renderVersion;
    const definition = window.CMS_RESOURCES[resourceName];
    state.view = 'resource'; state.resource = resourceName; markActiveNavigation(); setViewTitle(definition.label, currentSite()?.name || '內容管理'); clearWorkspace();
    try {
      const params = new URLSearchParams({ site_id: state.siteId, limit: '100', ...query });
      const response = await api(`/admin/resources/${resourceName}?${params}`);
      if (renderVersion !== state.renderVersion) return;
      workspace.replaceChildren();
      const addButton = element('button', 'button button-primary', '新增');
      addButton.type = 'button'; addButton.disabled = !can('editor'); addButton.addEventListener('click', () => openEditor(resourceName));
      workspace.append(viewHeader(definition.label, definition.description, addButton));
      const filters = element('form', 'filters');
      const search = element('input'); search.type = 'search'; search.name = 'q'; search.placeholder = '搜尋內容'; search.value = query.q || '';
      const status = element('select'); status.name = 'status';
      [['', '所有狀態'], ['published', '已發布'], ['draft', '草稿'], ['review', '待審批'], ['archived', '已封存']].forEach(([value, label]) => { const option = element('option', '', label); option.value = value; option.selected = query.status === value; status.append(option); });
      const submit = element('button', 'button button-secondary', '篩選'); submit.type = 'submit';
      filters.append(search, status, submit);
      filters.addEventListener('submit', (event) => { event.preventDefault(); renderResource(resourceName, { q: search.value.trim(), status: status.value }); });
      workspace.append(filters);
      const panel = element('section', 'panel table-wrap');
      if (!response.data.length) {
        panel.append(element('div', 'empty-state', '沒有符合條件的內容')); workspace.append(panel); return;
      }
      const table = element('table', 'data-table'); const head = element('thead'); const headRow = element('tr');
      definition.columns.forEach(([, label]) => headRow.append(element('th', '', label))); headRow.append(element('th', '', '操作')); head.append(headRow); table.append(head);
      const body = element('tbody');
      response.data.forEach((record) => {
        const row = element('tr');
        definition.columns.forEach(([field]) => { const cell = element('td', ['title', 'event', 'description', 'setting_value'].includes(field) ? 'cell-wrap' : ''); cell.append(formatCell(field, record[field])); row.append(cell); });
        const actions = element('td'); const actionGroup = element('div', 'row-actions');
        const edit = element('button', 'button button-secondary button-small', '編輯'); edit.type = 'button'; edit.disabled = !can('editor'); edit.addEventListener('click', () => openEditor(resourceName, record.id)); actionGroup.append(edit);
        if (definition.supportsPublish && record.status !== 'published' && record.status !== 'archived' && can('publisher')) {
          const publish = element('button', 'button button-primary button-small', '發布'); publish.type = 'button'; publish.addEventListener('click', () => publishRecord(resourceName, record)); actionGroup.append(publish);
        }
        if (definition.hasVersion) {
          const history = element('button', 'button button-secondary button-small', '版本'); history.type = 'button'; history.addEventListener('click', () => openHistory(resourceName, record)); actionGroup.append(history);
        }
        if (record.status !== 'archived' && can('publisher')) {
          const archive = element('button', 'button button-danger button-small', '封存'); archive.type = 'button'; archive.addEventListener('click', () => archiveRecord(resourceName, record)); actionGroup.append(archive);
        }
        actions.append(actionGroup); row.append(actions); body.append(row);
      });
      table.append(body); panel.append(table); workspace.append(panel);
    } catch (error) { if (renderVersion === state.renderVersion) workspace.replaceChildren(element('div', 'empty-state', error.message)); }
  };

  const fieldControl = (field, value) => {
    const wrapper = element('div', `form-field${field.full ? ' form-field-full' : ''}${field.type === 'checkbox' ? ' checkbox-field' : ''}`);
    const id = `field-${field.name}`;
    let input;
    if (field.type === 'textarea' || field.type === 'list' || field.type === 'setting') {
      input = element('textarea'); if (field.tall) input.rows = 12;
    } else if (field.type === 'select' || field.type === 'status') {
      input = element('select');
      const options = field.type === 'status' ? [['draft', '草稿'], ['review', '待審批']] : field.options;
      options.forEach(([optionValue, label]) => { const option = element('option', '', label); option.value = optionValue; input.append(option); });
    } else {
      input = element('input'); input.type = field.type === 'checkbox' ? 'checkbox' : field.type || 'text';
    }
    input.id = id; input.name = field.name; input.required = Boolean(field.required);
    const actualValue = value ?? field.default ?? '';
    if (field.type === 'checkbox') input.checked = Boolean(actualValue);
    else if (field.type === 'list') input.value = Array.isArray(actualValue) ? actualValue.join('\n') : actualValue;
    else if (field.type === 'setting') input.value = typeof actualValue === 'string' ? actualValue : JSON.stringify(actualValue, null, 2);
    else if (field.type === 'datetime-local' && actualValue) input.value = new Date(actualValue).toISOString().slice(0, 16);
    else input.value = actualValue;
    const label = element('label', '', field.label); label.htmlFor = id;
    if (field.type === 'checkbox') wrapper.append(input, label); else wrapper.append(label, input);
    if (field.help) wrapper.append(element('small', '', field.help));
    return wrapper;
  };

  const openEditor = async (resourceName, id = null) => {
    const definition = window.CMS_RESOURCES[resourceName];
    try {
      const record = id ? await api(`/admin/resources/${resourceName}/${id}`) : null;
      state.editor = { resourceName, record };
      document.getElementById('editor-eyebrow').textContent = definition.label;
      document.getElementById('editor-title').textContent = record ? '編輯內容' : '新增內容';
      editorFields.replaceChildren(); definition.fields.forEach((field) => editorFields.append(fieldControl(field, record?.[field.name])));
      editorDialog.showModal();
    } catch (error) { notify(error.message, true); }
  };

  const editorPayload = () => {
    const { resourceName, record } = state.editor;
    const definition = window.CMS_RESOURCES[resourceName];
    const formData = new FormData(document.getElementById('editor-form'));
    const payload = { site_id: Number(record?.site_id || state.siteId), locale: record?.locale || 'zh-HK' };
    definition.fields.forEach((field) => {
      const control = document.getElementById(`field-${field.name}`);
      if (field.type === 'checkbox') payload[field.name] = control.checked;
      else if (field.type === 'number') payload[field.name] = control.value === '' ? null : Number(control.value);
      else if (field.type === 'list') payload[field.name] = control.value.split('\n').map((item) => item.trim()).filter(Boolean);
      else if (field.type === 'setting') { try { payload[field.name] = JSON.parse(control.value); } catch { payload[field.name] = control.value; } }
      else if (field.type === 'datetime-local') payload[field.name] = control.value ? new Date(control.value).toISOString() : null;
      else payload[field.name] = formData.get(field.name) === '' ? null : formData.get(field.name);
    });
    if (!record) delete payload.status;
    if (record && definition.hasVersion) payload.expected_version = record.version;
    return payload;
  };

  const saveEditor = async (event) => {
    event.preventDefault();
    const { resourceName, record } = state.editor;
    try {
      const payload = editorPayload();
      await api(record ? `/admin/resources/${resourceName}/${record.id}` : `/admin/resources/${resourceName}`, { method: record ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      editorDialog.close(); notify('內容已儲存'); await renderResource(resourceName);
    } catch (error) { notify(error.details?.[0]?.message || error.message, true); }
  };

  const publishRecord = async (resourceName, record) => {
    if (!window.confirm(`發布「${record.title || record.name || record.event || record.label}」？`)) return;
    try { await api(`/admin/resources/${resourceName}/${record.id}/publish`, { method: 'POST' }); notify('內容已發布'); renderResource(resourceName); } catch (error) { notify(error.message, true); }
  };

  const archiveRecord = async (resourceName, record) => {
    if (!window.confirm('封存後將停止在公開網站顯示，確定繼續？')) return;
    try { await api(`/admin/resources/${resourceName}/${record.id}`, { method: 'DELETE' }); notify('內容已封存'); renderResource(resourceName); } catch (error) { notify(error.message, true); }
  };

  const openHistory = async (resourceName, record) => {
    try {
      const response = await api(`/admin/resources/${resourceName}/${record.id}/revisions`);
      const content = document.getElementById('history-content'); content.replaceChildren(); const list = element('ul', 'history-list');
      response.data.forEach((revision) => {
        const row = element('li'); row.append(element('strong', '', `v${revision.version}`));
        const copy = element('div'); copy.append(element('span', '', revision.action), element('small', '', `${revision.user_name || '系統'} · ${formatDate(revision.created_at)}`)); row.append(copy);
        const restore = element('button', 'button button-secondary button-small', '還原為草稿'); restore.type = 'button'; restore.disabled = !can('publisher'); restore.addEventListener('click', async () => {
          if (!window.confirm(`還原版本 v${revision.version}？`)) return;
          try { await api(`/admin/resources/${resourceName}/${record.id}/restore/${revision.version}`, { method: 'POST' }); historyDialog.close(); notify('版本已還原為草稿'); renderResource(resourceName); } catch (error) { notify(error.message, true); }
        }); row.append(restore); list.append(row);
      });
      if (!response.data.length) list.append(element('li', '', '尚未有版本紀錄'));
      content.append(list); historyDialog.showModal();
    } catch (error) { notify(error.message, true); }
  };

  const renderMedia = async () => {
    const renderVersion = ++state.renderVersion;
    state.view = 'media'; state.resource = null; markActiveNavigation(); setViewTitle('媒體庫', currentSite()?.name || '內容管理'); clearWorkspace();
    try {
      const response = await api(`/admin/media?site_id=${state.siteId}&limit=100`);
      if (renderVersion !== state.renderVersion) return;
      workspace.replaceChildren();
      workspace.append(viewHeader('媒體庫', response.storage === 's3' ? 'S3 物件儲存' : '本機開發儲存'));
      const panel = element('section', 'panel'); const form = element('form', 'media-upload');
      const fileField = element('div', 'form-field'); const fileLabel = element('label', '', '圖片或 PDF'); const file = element('input'); file.type = 'file'; file.accept = 'image/jpeg,image/png,image/webp,image/gif,application/pdf'; file.required = true; fileField.append(fileLabel, file);
      const altField = element('div', 'form-field'); const altLabel = element('label', '', '替代文字'); const alt = element('input'); alt.type = 'text'; altField.append(altLabel, alt);
      const uploadButton = element('button', 'button button-primary', '上載'); uploadButton.type = 'submit'; uploadButton.disabled = !can('editor'); form.append(fileField, altField, uploadButton);
      form.addEventListener('submit', async (event) => { event.preventDefault(); const body = new FormData(); body.append('site_id', state.siteId); body.append('alt_text', alt.value); body.append('file', file.files[0]); try { await api('/admin/media', { method: 'POST', body }); notify('檔案已上載'); renderMedia(); } catch (error) { notify(error.message, true); } });
      panel.append(form); const grid = element('div', 'media-grid');
      response.data.forEach((asset) => {
        const item = element('article', 'media-item'); const preview = element('div', 'media-preview');
        if (asset.mime_type.startsWith('image/')) { const image = element('img'); image.src = asset.public_url; image.alt = asset.alt_text || ''; preview.append(image); } else preview.append(element('span', '', 'PDF'));
        item.append(preview, element('strong', '', asset.original_name), element('small', '', `ID ${asset.id} · ${Math.ceil(asset.byte_size / 1024)} KB`));
        const actions = element('div', 'row-actions'); const open = element('a', 'button button-secondary button-small', '開啟'); open.href = asset.public_url; open.target = '_blank'; open.rel = 'noopener'; actions.append(open);
        if (can('publisher')) { const remove = element('button', 'button button-danger button-small', '刪除'); remove.type = 'button'; remove.addEventListener('click', async () => { if (!window.confirm('永久刪除這個媒體檔案？')) return; try { await api(`/admin/media/${asset.id}`, { method: 'DELETE' }); notify('媒體已刪除'); renderMedia(); } catch (error) { notify(error.message, true); } }); actions.append(remove); }
        item.append(actions); grid.append(item);
      });
      if (!response.data.length) grid.append(element('div', 'empty-state', '尚未上載媒體')); panel.append(grid); workspace.append(panel);
    } catch (error) { if (renderVersion === state.renderVersion) workspace.replaceChildren(element('div', 'empty-state', error.message)); }
  };

  const renderUsers = async () => {
    const renderVersion = ++state.renderVersion;
    state.view = 'users'; state.resource = null; markActiveNavigation(); setViewTitle('管理員', '系統管理'); clearWorkspace();
    try {
      const response = await api('/admin/users');
      if (renderVersion !== state.renderVersion) return;
      workspace.replaceChildren();
      const add = element('button', 'button button-primary', '新增管理員'); add.type = 'button'; add.addEventListener('click', () => openUserEditor()); workspace.append(viewHeader('管理員', '帳戶、角色與存取狀態', add));
      const panel = element('section', 'panel table-wrap'); const table = element('table', 'data-table'); const head = element('thead'); const row = element('tr'); ['姓名', '電郵', '角色', '狀態', '最近登入', '操作'].forEach((label) => row.append(element('th', '', label))); head.append(row); table.append(head); const body = element('tbody');
      response.data.forEach((user) => { const tr = element('tr'); [user.display_name, user.email, user.role, user.is_active ? '啟用' : '停用', formatDate(user.last_login_at)].forEach((value) => tr.append(element('td', '', value))); const actions = element('td'); const edit = element('button', 'button button-secondary button-small', '編輯'); edit.type = 'button'; edit.addEventListener('click', () => openUserEditor(user)); actions.append(edit); tr.append(actions); body.append(tr); });
      table.append(body); panel.append(table); workspace.append(panel);
    } catch (error) { if (renderVersion === state.renderVersion) workspace.replaceChildren(element('div', 'empty-state', error.message)); }
  };

  const openUserEditor = (user = null) => {
    state.editor = { user };
    document.getElementById('editor-eyebrow').textContent = '管理員'; document.getElementById('editor-title').textContent = user ? '編輯管理員' : '新增管理員'; editorFields.replaceChildren();
    const fields = [
      { name: 'display_name', label: '顯示名稱', required: true },
      ...(!user ? [{ name: 'email', label: '電郵', type: 'email', required: true }] : []),
      { name: 'role', label: '角色', type: 'select', options: [['viewer', '檢視者'], ['editor', '編輯'], ['publisher', '發布者'], ['admin', '管理員']], required: true },
      { name: 'password', label: user ? '重設密碼（留空不變）' : '初始密碼', type: 'password', required: !user, full: true },
      ...(user ? [{ name: 'is_active', label: '帳戶啟用', type: 'checkbox', default: true }] : [])
    ];
    fields.forEach((field) => editorFields.append(fieldControl(field, user?.[field.name]))); state.editor.userFields = fields; editorDialog.showModal();
  };

  const saveUser = async () => {
    const { user, userFields } = state.editor; const values = {};
    userFields.forEach((field) => { const control = document.getElementById(`field-${field.name}`); values[field.name] = field.type === 'checkbox' ? control.checked : control.value; });
    if (!user) await api('/admin/users', { method: 'POST', body: JSON.stringify(values) });
    else { const password = values.password; delete values.password; await api(`/admin/users/${user.id}`, { method: 'PATCH', body: JSON.stringify(values) }); if (password) await api(`/admin/users/${user.id}/password`, { method: 'POST', body: JSON.stringify({ password }) }); }
    editorDialog.close(); notify('管理員資料已儲存'); renderUsers();
  };

  const renderAudit = async () => {
    const renderVersion = ++state.renderVersion;
    state.view = 'audit'; state.resource = null; markActiveNavigation(); setViewTitle('審計紀錄', '系統管理'); clearWorkspace();
    try {
      const response = await api('/admin/audit?limit=100');
      if (renderVersion !== state.renderVersion) return;
      workspace.replaceChildren(); workspace.append(viewHeader('審計紀錄', '登入、修改、發布、還原與刪除操作'));
      const panel = element('section', 'panel table-wrap'); const table = element('table', 'data-table'); const head = element('thead'); const row = element('tr'); ['時間', '管理員', '操作', '資源', 'ID', '來源 IP'].forEach((label) => row.append(element('th', '', label))); head.append(row); table.append(head); const body = element('tbody');
      response.data.forEach((entry) => { const tr = element('tr'); [formatDate(entry.created_at), entry.user_name || '系統', entry.action, entry.resource_type || '—', entry.resource_id || '—', entry.ip_address || '—'].forEach((value) => tr.append(element('td', '', value))); body.append(tr); }); table.append(body); panel.append(table); workspace.append(panel);
    } catch (error) { if (renderVersion === state.renderVersion) workspace.replaceChildren(element('div', 'empty-state', error.message)); }
  };

  const renderCurrentView = () => {
    if (state.resource) return renderResource(state.resource);
    if (state.view === 'media') return renderMedia();
    if (state.view === 'users') return renderUsers();
    if (state.view === 'audit') return renderAudit();
    return renderDashboard();
  };

  const loadSites = async () => {
    const response = await api('/admin/sites'); state.sites = response.data.filter((site) => site.is_active); siteSelect.replaceChildren();
    state.sites.forEach((site) => { const option = element('option', '', site.name); option.value = site.id; siteSelect.append(option); });
    state.siteId = localStorage.getItem('epro-cms-site') || state.sites[0]?.id; siteSelect.value = state.siteId;
  };

  const bootstrap = async () => {
    try {
      const session = await api('/auth/status');
      if (!session.user) return showLogin();
      state.user = session.user; await loadSites(); showAdmin(); renderDashboard();
    } catch { showLogin(); }
  };

  document.getElementById('login-form').addEventListener('submit', async (event) => {
    event.preventDefault(); const errorNode = document.getElementById('login-error'); errorNode.textContent = '';
    const body = Object.fromEntries(new FormData(event.currentTarget));
    try { const response = await api('/auth/login', { method: 'POST', body: JSON.stringify(body) }); state.user = response.user; await loadSites(); showAdmin(); renderDashboard(); event.currentTarget.reset(); } catch (error) { errorNode.textContent = error.message; }
  });

  document.getElementById('logout-button').addEventListener('click', async () => { try { await api('/auth/logout', { method: 'POST' }); } finally { state.user = null; showLogin(); } });
  siteSelect.addEventListener('change', () => { state.siteId = siteSelect.value; localStorage.setItem('epro-cms-site', state.siteId); renderCurrentView(); });
  document.getElementById('sidebar-nav').addEventListener('click', (event) => { const button = event.target.closest('button'); if (!button) return; document.getElementById('sidebar').classList.remove('open'); if (button.dataset.resource) renderResource(button.dataset.resource); else if (button.dataset.view === 'dashboard') renderDashboard(); else if (button.dataset.view === 'media') renderMedia(); else if (button.dataset.view === 'users') renderUsers(); else if (button.dataset.view === 'audit') renderAudit(); });
  document.getElementById('menu-button').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
  document.querySelectorAll('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => document.getElementById(button.dataset.closeDialog).close()));
  document.getElementById('editor-form').addEventListener('submit', async (event) => { try { if (state.editor?.userFields) { event.preventDefault(); await saveUser(); } else await saveEditor(event); } catch (error) { notify(error.details?.[0]?.message || error.message, true); } });

  bootstrap();
})();