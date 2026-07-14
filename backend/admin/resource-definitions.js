window.CMS_RESOURCES = {
  settings: {
    label: '網站設定', description: '品牌、聯絡、SEO 與頁尾設定', supportsPublish: false, hasVersion: false,
    columns: [['setting_key', '設定鍵'], ['setting_value', '內容'], ['group_name', '分組']],
    fields: [
      { name: 'setting_key', label: '設定鍵', required: true },
      { name: 'setting_value', label: '設定內容', type: 'setting', required: true, full: true, help: '文字可直接輸入；布林、數字或物件可使用 JSON。' },
      { name: 'group_name', label: '分組', required: true, default: 'general' },
      { name: 'description', label: '說明', type: 'textarea', full: true },
      { name: 'is_public', label: '允許公開 API 讀取', type: 'checkbox', default: true }
    ]
  },
  navigation: {
    label: '導覽與頁尾', description: '管理主導覽、品牌切換、頁尾與法律連結', supportsPublish: true, hasVersion: false,
    columns: [['label', '標籤'], ['location', '位置'], ['url', '連結'], ['status', '狀態']],
    fields: [
      { name: 'item_key', label: '唯一鍵', required: true },
      { name: 'label', label: '顯示文字', required: true },
      { name: 'url', label: '連結', required: true, full: true },
      { name: 'location', label: '位置', type: 'select', options: [['switcher', '品牌切換'], ['primary', '主導覽'], ['footer', '頁尾'], ['legal', '法律連結']], default: 'primary' },
      { name: 'parent_id', label: '上層項目 ID', type: 'number' },
      { name: 'sort_order', label: '排序', type: 'number', default: 0 },
      { name: 'is_external', label: '外部連結', type: 'checkbox' },
      { name: 'status', label: '工作狀態', type: 'status' }
    ]
  },
  pages: {
    label: '公司與頁面', description: '公司簡介、Hero、一般內文及 SEO', supportsPublish: true, hasVersion: true,
    columns: [['title', '頁面'], ['slug', 'Slug'], ['status', '狀態'], ['updated_at', '更新']],
    fields: [
      { name: 'slug', label: 'Slug', required: true }, { name: 'title', label: '頁面名稱', required: true },
      { name: 'eyebrow', label: '頁首分類文字' }, { name: 'hero_title', label: 'Hero 標題', type: 'textarea' },
      { name: 'hero_subtitle', label: 'Hero 副標題', type: 'textarea', full: true },
      { name: 'hero_image_url', label: 'Hero 圖片 URL', type: 'url', full: true },
      { name: 'hero_image_position', label: '圖片位置', default: 'center center' },
      { name: 'summary', label: '摘要', type: 'textarea', full: true },
      { name: 'content_html', label: '頁面內文 HTML', type: 'textarea', full: true, tall: true },
      { name: 'seo_title', label: 'SEO 標題' }, { name: 'seo_description', label: 'SEO 描述', type: 'textarea', full: true },
      { name: 'sort_order', label: '排序', type: 'number', default: 0 }, { name: 'status', label: '工作狀態', type: 'status' }
    ]
  },
  contacts: {
    label: '聯絡資料', description: '地址、電話、傳真、聯絡人與電郵', supportsPublish: true, hasVersion: true,
    columns: [['title', '聯絡單位'], ['phone', '電話'], ['email', '電郵'], ['status', '狀態']],
    fields: [
      { name: 'unit_key', label: '唯一鍵', required: true }, { name: 'unit_type', label: '類型', required: true, default: 'general' },
      { name: 'title', label: '標題', required: true, full: true }, { name: 'phone', label: '電話' }, { name: 'fax', label: '傳真' },
      { name: 'contact_person', label: '聯絡人' }, { name: 'email', label: '電郵', type: 'email' },
      { name: 'address', label: '地址', type: 'textarea', full: true }, { name: 'map_url', label: '地圖 URL', type: 'url', full: true },
      { name: 'sort_order', label: '排序', type: 'number', default: 0 }, { name: 'status', label: '工作狀態', type: 'status' }
    ]
  },
  milestones: {
    label: '里程碑', description: '公司歷史事件及顯示次序', supportsPublish: true, hasVersion: true,
    columns: [['year', '年份'], ['month', '月份'], ['event', '事件'], ['status', '狀態']],
    fields: [
      { name: 'source_key', label: '唯一鍵', required: true }, { name: 'year', label: '年份', type: 'number', required: true },
      { name: 'month', label: '月份' }, { name: 'event', label: '事件', type: 'textarea', required: true, full: true },
      { name: 'sort_order', label: '排序', type: 'number', default: 0 }, { name: 'status', label: '工作狀態', type: 'status' }
    ]
  },
  people: {
    label: '董事局及管理層', description: '成員職銜、履歷與排序', supportsPublish: true, hasVersion: true,
    columns: [['name', '姓名'], ['person_group', '組別'], ['role', '職銜'], ['status', '狀態']],
    fields: [
      { name: 'person_key', label: '唯一鍵', required: true },
      { name: 'person_group', label: '組別', type: 'select', options: [['board', '董事局'], ['management', '管理層']], required: true },
      { name: 'name', label: '姓名', required: true }, { name: 'role', label: '職銜', required: true },
      { name: 'biography', label: '履歷第一段', type: 'textarea', full: true },
      { name: 'secondary_biography', label: '履歷第二段', type: 'textarea', full: true },
      { name: 'image_url', label: '圖片 URL', type: 'url', full: true },
      { name: 'sort_order', label: '排序', type: 'number', default: 0 }, { name: 'status', label: '工作狀態', type: 'status' }
    ]
  },
  services: {
    label: '業務與服務', description: '核心業務、附屬業務與服務項目', supportsPublish: true, hasVersion: true,
    columns: [['name', '服務'], ['service_group', '分組'], ['status', '狀態'], ['sort_order', '排序']],
    fields: [
      { name: 'slug', label: 'Slug', required: true }, { name: 'service_group', label: '服務分組', required: true, default: 'core' },
      { name: 'name', label: '服務名稱', required: true }, { name: 'icon_name', label: '圖示名稱' },
      { name: 'description', label: '描述', type: 'textarea', full: true }, { name: 'image_url', label: '圖片 URL', type: 'url', full: true },
      { name: 'features', label: '功能列表', type: 'list', full: true, help: '每行一項。' },
      { name: 'sort_order', label: '排序', type: 'number', default: 0 }, { name: 'status', label: '工作狀態', type: 'status' }
    ]
  },
  cases: {
    label: '案例', description: '客戶案例、挑戰、方案與成果', supportsPublish: true, hasVersion: true,
    columns: [['title', '案例'], ['industry', '行業'], ['featured', '精選'], ['status', '狀態']],
    fields: [
      { name: 'slug', label: 'Slug', required: true }, { name: 'title', label: '案例標題', required: true },
      { name: 'client_name', label: '客戶名稱' }, { name: 'industry', label: '行業' },
      { name: 'description', label: '摘要', type: 'textarea', full: true }, { name: 'challenge', label: '挑戰', type: 'textarea', full: true },
      { name: 'solution', label: '方案', type: 'textarea', full: true }, { name: 'result', label: '成果', type: 'textarea', full: true },
      { name: 'image_url', label: '圖片 URL', type: 'url', full: true }, { name: 'featured', label: '精選案例', type: 'checkbox' },
      { name: 'sort_order', label: '排序', type: 'number', default: 0 }, { name: 'status', label: '工作狀態', type: 'status' }
    ]
  },
  news: {
    label: '最新消息', description: '新聞、公司消息與發布日期', supportsPublish: true, hasVersion: true,
    columns: [['title', '標題'], ['category', '分類'], ['published_at', '發布日期'], ['status', '狀態']],
    fields: [
      { name: 'slug', label: 'Slug', required: true }, { name: 'title', label: '標題', required: true },
      { name: 'category', label: '分類' }, { name: 'published_at', label: '預定發布時間', type: 'datetime-local' },
      { name: 'excerpt', label: '摘要', type: 'textarea', full: true },
      { name: 'content_html', label: '內文 HTML', type: 'textarea', full: true, tall: true },
      { name: 'featured_image_url', label: '封面圖片 URL', type: 'url', full: true },
      { name: 'sort_order', label: '排序', type: 'number', default: 0 }, { name: 'status', label: '工作狀態', type: 'status' }
    ]
  },
  'investor-documents': {
    label: '投資者文件', description: '財務報告、公告、通函及月報表', supportsPublish: true, hasVersion: true,
    columns: [['title', '文件'], ['category', '分類'], ['published_on', '日期'], ['status', '狀態']],
    fields: [
      { name: 'document_key', label: '唯一鍵', required: true }, { name: 'category', label: '分類', required: true },
      { name: 'title', label: '文件名稱', required: true, full: true }, { name: 'fiscal_year', label: '財政年度' },
      { name: 'published_on', label: '文件日期', type: 'date' }, { name: 'document_url', label: '文件 URL', type: 'url', full: true },
      { name: 'media_id', label: '媒體庫檔案 ID', type: 'number' },
      { name: 'sort_order', label: '排序', type: 'number', default: 0 }, { name: 'status', label: '工作狀態', type: 'status' }
    ]
  }
};