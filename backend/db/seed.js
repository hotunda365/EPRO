const pool = require('./connection');
const runMigrations = require('./migrations');

const insertRows = async (client, table, conflictColumns, rows) => {
  for (const row of rows) {
    const columns = Object.keys(row);
    const values = Object.values(row);
    const placeholders = values.map((_, index) => `$${index + 1}`);
    const conflict = conflictColumns.join(', ');

    await client.query(
      `INSERT INTO ${table} (${columns.join(', ')})
       VALUES (${placeholders.join(', ')})
       ON CONFLICT (${conflict}) DO NOTHING`,
      values
    );
  }
};

const getSiteIds = async (client) => {
  const result = await client.query('SELECT id, site_key FROM cms_sites');
  return Object.fromEntries(result.rows.map((site) => [site.site_key, site.id]));
};

const runSeed = async () => {
  await runMigrations();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await insertRows(client, 'cms_sites', ['site_key'], [
      { site_key: 'ets-group', name: '易通訊集團', default_locale: 'zh-HK' },
      { site_key: 'eprotel', name: '易寶通訊', default_locale: 'zh-HK' },
      { site_key: 'epro-talent', name: '易寶人才', default_locale: 'zh-HK' }
    ]);

    const sites = await getSiteIds(client);
    const json = (value) => JSON.stringify(value);
    const shortAboutContent = '<p>易寶通訊成立於1990年，致力提供客戶聯絡服務中心外判服務，透過逾三十年的營運經驗，服務來自多個行業的企業客戶。</p><p>易寶於香港提供24x7x365多媒體外判客戶聯絡中心服務，並考獲ISO 9001及ISO 27001認證。</p>';
    const fullAboutContent = '<p>易寶通訊成立於1990年，致力提供客戶聯絡服務中心外判服務，透過逾三十年的營運經驗，服務來自多個行業的企業客戶，現已成為業內具實力的客戶聯絡服務供應商之一。易寶的控股公司易通訊集團有限公司為香港上市公司（股份代號：8031）。</p><p>易寶於香港提供24x7x365多媒體外判客戶聯絡中心服務，並考獲ISO 9001及ISO 27001認證，設有超過850個服務座席及逾1,000名話務員，提供外呼、內呼客戶聯絡中心外判、人員派遣、設備管理及託管，以及客戶聯絡中心系統解決方案。</p>';

    await insertRows(client, 'cms_settings', ['site_id', 'locale', 'setting_key'], [
      { site_id: sites['ets-group'], locale: 'zh-HK', setting_key: 'brand.name', setting_value: json('易通訊集團'), group_name: 'brand', description: '網站品牌名稱' },
      { site_id: sites['ets-group'], locale: 'zh-HK', setting_key: 'stock.code', setting_value: json('8031.HK'), group_name: 'investor', description: '港交所股份代號' },
      { site_id: sites['ets-group'], locale: 'zh-HK', setting_key: 'contact.email', setting_value: json('info@eprotel.com.hk'), group_name: 'contact', description: '頁尾聯絡電郵' },
      { site_id: sites['ets-group'], locale: 'zh-HK', setting_key: 'footer.copyright', setting_value: json('© 2026 ETS Group. All rights reserved.'), group_name: 'footer', description: '頁尾版權文字' },
      { site_id: sites.eprotel, locale: 'zh-HK', setting_key: 'brand.name', setting_value: json('易寶通訊'), group_name: 'brand', description: '網站品牌名稱' },
      { site_id: sites.eprotel, locale: 'zh-HK', setting_key: 'contact.email', setting_value: json('info@eprotel.com.hk'), group_name: 'contact', description: '主要聯絡電郵' },
      { site_id: sites.eprotel, locale: 'zh-HK', setting_key: 'footer.copyright', setting_value: json('© 2026 EproTel. All rights reserved.'), group_name: 'footer', description: '頁尾版權文字' },
      { site_id: sites.eprotel, locale: 'zh-HK', setting_key: 'company.years_experience', setting_value: json(30), group_name: 'company', description: '行業經驗年數' },
      { site_id: sites.eprotel, locale: 'zh-HK', setting_key: 'company.service_seats', setting_value: json(850), group_name: 'company', description: '服務座席數目' },
      { site_id: sites.eprotel, locale: 'zh-HK', setting_key: 'company.professional_agents', setting_value: json(1000), group_name: 'company', description: '專業話務員數目' },
      { site_id: sites.eprotel, locale: 'zh-HK', setting_key: 'company.operating_area', setting_value: json(43000), group_name: 'company', description: '營運面積（平方呎）' },
      { site_id: sites.eprotel, locale: 'zh-HK', setting_key: 'company.certifications', setting_value: json('9001 & 27001 認證'), group_name: 'company', description: 'ISO認證顯示文字' },
      { site_id: sites.eprotel, locale: 'zh-HK', setting_key: 'api.content_fallback', setting_value: json(true), group_name: 'system', description: 'API 無法使用時保留靜態內容' }
    ]);

    await insertRows(client, 'cms_navigation_items', ['site_id', 'locale', 'item_key'], [
      { site_id: sites['ets-group'], locale: 'zh-HK', item_key: 'home', label: '主頁', url: '/index.html', location: 'primary', sort_order: 10, status: 'published' },
      { site_id: sites['ets-group'], locale: 'zh-HK', item_key: 'about', label: '公司簡介', url: '/pages/about.html', location: 'primary', sort_order: 20, status: 'published' },
      { site_id: sites['ets-group'], locale: 'zh-HK', item_key: 'business', label: '業務', url: '/pages/business.html', location: 'primary', sort_order: 30, status: 'published' },
      { site_id: sites['ets-group'], locale: 'zh-HK', item_key: 'investor', label: '投資者關係', url: '/pages/investor.html', location: 'primary', sort_order: 40, status: 'published' },
      { site_id: sites['ets-group'], locale: 'zh-HK', item_key: 'news', label: '最新消息', url: '/pages/news.html', location: 'primary', sort_order: 45, status: 'published' },
      { site_id: sites['ets-group'], locale: 'zh-HK', item_key: 'contact', label: '聯絡我們', url: '/pages/contact.html', location: 'primary', sort_order: 50, status: 'published' },
      { site_id: sites.eprotel, locale: 'zh-HK', item_key: 'home', label: '首頁', url: '/index.html', location: 'primary', sort_order: 10, status: 'published' },
      { site_id: sites.eprotel, locale: 'zh-HK', item_key: 'services', label: '產品與服務', url: '/pages/services.html', location: 'primary', sort_order: 20, status: 'published' },
      { site_id: sites.eprotel, locale: 'zh-HK', item_key: 'cases', label: '案例', url: '/pages/cases.html', location: 'primary', sort_order: 30, status: 'published' },
      { site_id: sites.eprotel, locale: 'zh-HK', item_key: 'contact', label: '聯絡我們', url: '/pages/contact.html', location: 'primary', sort_order: 40, status: 'published' }
    ]);

    await insertRows(client, 'cms_pages', ['site_id', 'locale', 'slug'], [
      {
        site_id: sites['ets-group'], locale: 'zh-HK', slug: 'home', title: '易通訊集團',
        eyebrow: 'EPRO TELECOM', hero_title: '專業通訊與企業解決方案，驅動業務持續成長',
        hero_subtitle: '整合通訊服務、雲端解決方案與企業網絡，為香港與亞洲市場提供穩定、安全的 ICT 支援。',
        summary: '香港企業通訊、雲端及系統整合服務供應商', status: 'published', published_at: new Date()
      },
      {
        site_id: sites.eprotel, locale: 'zh-HK', slug: 'about', title: '關於易寶',
        eyebrow: '關於我們', hero_title: '易寶通訊\n專業聯絡中心服務',
        hero_subtitle: '連繫企業與客戶，締造每一次優質對話',
        summary: '易寶通訊成立於1990年，致力提供客戶聯絡服務中心外判服務。',
        content_html: fullAboutContent,
        status: 'published', published_at: new Date()
      },
      {
        site_id: sites['ets-group'], locale: 'zh-HK', slug: 'business', title: '業務範疇',
        hero_title: '業務範疇', hero_subtitle: 'ETS Group 多元化業務，服務香港及亞太區企業客戶',
        status: 'published', published_at: new Date()
      },
      {
        site_id: sites['ets-group'], locale: 'zh-HK', slug: 'investor', title: '投資者關係',
        hero_title: '投資者關係', hero_subtitle: 'ETS Group Holdings Limited（股份代號：8031.HK）',
        status: 'published', published_at: new Date()
      },
      {
        site_id: sites.eprotel, locale: 'zh-HK', slug: 'contact', title: '聯絡我們',
        hero_title: '聯絡我們', hero_subtitle: '請透過以下適當服務團隊與我們聯絡',
        status: 'published', published_at: new Date()
      },
      {
        site_id: sites['ets-group'], locale: 'zh-HK', slug: 'board', title: '董事局',
        eyebrow: '公司簡介', hero_title: '董事局', hero_subtitle: 'ETS Group董事局成員，帶領集團穩健發展',
        status: 'published', published_at: new Date()
      },
      {
        site_id: sites['ets-group'], locale: 'zh-HK', slug: 'management', title: '管理層',
        eyebrow: '公司簡介', hero_title: '管理層', hero_subtitle: '專業團隊帶領集團日常營運及策略發展',
        status: 'published', published_at: new Date()
      },
      {
        site_id: sites.eprotel, locale: 'zh-HK', slug: 'milestones', title: '里程碑',
        eyebrow: '公司簡介', hero_title: '里程碑', hero_subtitle: '超過三十年，見證每一個重要時刻',
        hero_image_url: 'https://images.pexels.com/photos/2535406/pexels-photo-2535406.jpeg?auto=compress&cs=tinysrgb&w=2000',
        hero_image_position: 'center 75%', status: 'published', published_at: new Date()
      },
      {
        site_id: sites.eprotel, locale: 'zh-HK', slug: 'services', title: '產品與服務',
        hero_title: '完整的通訊與IT解決方案', hero_subtitle: '從企業電話系統到雲端平台，我們提供端到端的通訊與IT支援',
        status: 'published', published_at: new Date()
      },
      {
        site_id: sites['ets-group'], locale: 'zh-HK', slug: 'cases', title: '客戶成功故事',
        hero_title: '客戶成功故事', hero_subtitle: '企業客戶透過我們的解決方案持續改善營運',
        status: 'published', published_at: new Date()
      },
      {
        site_id: sites['ets-group'], locale: 'zh-HK', slug: 'news', title: '最新消息',
        hero_title: '最新消息', hero_subtitle: '集團消息、業務動向及重要資訊',
        status: 'published', published_at: new Date()
      }
    ]);

    await client.query(
      `UPDATE cms_pages pages SET content_html = $1
       FROM cms_sites sites
       WHERE pages.site_id = sites.id
         AND sites.site_key = 'eprotel'
         AND pages.locale = 'zh-HK'
         AND pages.slug = 'about'
         AND pages.content_html = $2`,
      [fullAboutContent, shortAboutContent]
    );

    await insertRows(client, 'cms_contact_units', ['site_id', 'locale', 'unit_key'], [
      {
        site_id: sites.eprotel, locale: 'zh-HK', unit_key: 'office', unit_type: 'office',
        title: '辦公室地址', address: '九龍旺角\n廣東道1163號\n中華漆廠大廈4樓',
        status: 'published', sort_order: 10, published_at: new Date()
      },
      {
        site_id: sites.eprotel, locale: 'zh-HK', unit_key: 'contact-centre', unit_type: 'contact-centre',
        title: '全方位客戶聯絡中心服務', phone: '(852) 2799 0202', fax: '(852) 2799 0747',
        contact_person: '白偉琳先生', email: 'info@eprotel.com.hk',
        status: 'published', sort_order: 20, published_at: new Date()
      },
      {
        site_id: sites.eprotel, locale: 'zh-HK', unit_key: 'system-solutions', unit_type: 'system-solutions',
        title: '系統解決方案', phone: '(852) 3919 9686', fax: '(852) 2799 0747',
        contact_person: '關展鵬先生', email: 'info@eprotel.com.hk',
        status: 'published', sort_order: 30, published_at: new Date()
      }
    ]);

    await insertRows(client, 'cms_people', ['site_id', 'locale', 'person_key'], [
      { site_id: sites['ets-group'], locale: 'zh-HK', person_key: 'board-siu-man-on', person_group: 'board', name: '蕭文安', role: '主席、執行董事', biography: '蕭文安先生於2026年2月獲委任為集團執行董事兼董事會主席，並擔任相關成員公司的董事。', secondary_biography: '他於2009年3月加入集團，持有澳洲商學學士學位，為澳洲註冊會計師協會會員及香港會計師公會資深會員。', status: 'published', sort_order: 10, published_at: new Date() },
      { site_id: sites['ets-group'], locale: 'zh-HK', person_key: 'board-cheung-man-yee', person_group: 'board', name: '張敏儀', role: '董事及營運總監', biography: '張敏儀女士是易寶通訊服務有限公司董事及營運總監。', secondary_biography: '張女士自1991年加入易寶通訊集團，持有美國德薩斯州大學奧斯汀分校學士學位。', status: 'published', sort_order: 20, published_at: new Date() },
      { site_id: sites['ets-group'], locale: 'zh-HK', person_key: 'management-siu-man-on', person_group: 'management', name: '蕭文安', role: '執行董事', biography: '蕭文安先生持有澳洲吉朗迪肯大學商學（會計專業）學士學位，為澳洲會計師公會會員及香港會計師公會資深會員。', secondary_biography: '他於2009年加入本公司，曾任企業融資及策劃部總監。', status: 'published', sort_order: 10, published_at: new Date() },
      { site_id: sites['ets-group'], locale: 'zh-HK', person_key: 'management-cheung-man-yee', person_group: 'management', name: '張敏儀', role: '營運總監', biography: '張敏儀女士持有美國德薩斯州大學文學士學位，1991年加入易寶通訊集團，於1994年晉陞為總經理，2003年擢升為營運總監。', secondary_biography: '她主要負責集團香港聯絡中心業務的銷售、拓展及營運工作。', status: 'published', sort_order: 20, published_at: new Date() },
      { site_id: sites['ets-group'], locale: 'zh-HK', person_key: 'management-leung-wai-cheung', person_group: 'management', name: '梁偉祥博士', role: '財務顧問', biography: '梁博士持有商業管理博士、教育學（教育管理）博士及專業會計碩士學位，並具備多項專業會計及公司管治資格。', secondary_biography: '他擁有香港資本市場融資上市及金融財務管理的豐富經驗。', status: 'published', sort_order: 30, published_at: new Date() },
      { site_id: sites['ets-group'], locale: 'zh-HK', person_key: 'management-suen-fuk-hoi', person_group: 'management', name: '孫福開', role: '財務總監', biography: '孫福開先生持有香港公開大學商學院學士學位，並自1998年起為香港會計師公會認可會員。', secondary_biography: '他於2003年加入本公司，負責集團公司的財務整合及財政管理。', status: 'published', sort_order: 40, published_at: new Date() },
      { site_id: sites['ets-group'], locale: 'zh-HK', person_key: 'management-yu-yeuk-sze', person_group: 'management', name: '余若詩', role: '總經理－資訊科技', biography: '余若詩先生持有香港城市大學資訊科技學士學位及項目管理國際認可證書，於2003年加入易寶通訊。', secondary_biography: '他負責集團資訊科技部門及相關管理行政工作，具備軟件開發、網絡架構及系統支援經驗。', status: 'published', sort_order: 50, published_at: new Date() },
      { site_id: sites['ets-group'], locale: 'zh-HK', person_key: 'management-cheung-chi-tat', person_group: 'management', name: '張志達', role: '軟件開發經理', biography: '張志達先生畢業於香港理工大學電子工程系，1990年加入易寶通訊，長期從事客戶系統及營運軟件開發。', secondary_biography: '他現時主要負責「偉思」（WISE-xb）及其他聯絡中心系統開發和研究項目。', status: 'published', sort_order: 60, published_at: new Date() }
    ]);

    const milestoneEvents = [
      [2012, '1月', '易寶通訊之控股集團「易通訊集團有限公司」(HK.8031)於1月9日成功在香港交易所創業板上市'],
      [2011, '12月', '考獲ISO 27001資訊安全管理系統認證證書'],
      [2011, '11月', '考獲「人對人電話促銷專業守則認證」，成為首批獲香港客戶中心協會認證的公司'],
      [2011, '9月', '搬遷其中一個客戶聯絡中心，營運面積擴展至43,000平方呎'],
      [2011, '8月', '成功通過ISO 9001:2008質量管理體系的年度審核'],
      [2010, '2月', '易寶國際集團慶祝成立20周年'],
      [2008, '8月', '公司名稱由「易寶太平洋集團有限公司」改為「易寶通訊集團有限公司」'],
      [2008, '1月', '香港客戶聯絡中心擴展至850話務座席，擁有超過1,000位客戶服務人員'],
      [2006, '2月', '香港客戶聯絡中心擴展至550話務座席及擁有接近850位客戶服務人員'],
      [2005, '5月', '客戶聯絡中心擴展至400座席及擁有接近650位客戶服務人員'],
      [2004, '1月', '與太平洋商業網絡有限公司合併，成立易寶太平洋集團有限公司'],
      [2003, '10月', '與多家銀行及保險公司簽訂協議，提供多元化客戶管理服務'],
      [2003, '2月', '推出「偉思（WISE-xb）客戶聯絡中心系統」'],
      [2000, '9月', '電話中心擴展至350座席，全面提供綜合呼叫中心服務'],
      [2000, '3月', '推出EPRO2000呼叫中心平台系統'],
      [1999, '4月', '公司改名為「易寶通訊服務有限公司」'],
      [1997, '7月', '考獲ISO 9001優質服務認可證書'],
      [1995, '8月', '設立超過200座席之大型電話呼叫中心'],
      [1993, '9月', '推出無線廣播「聚寶盒」，提供即時賽馬及財經資訊服務'],
      [1993, '5月', '香港第一間傳呼公司提供電話秘書服務'],
      [1991, '1月', '第一家傳呼公司提供280MHz嶄新傳呼服務'],
      [1990, '10月', '獲政府發牌以280MHz經營傳呼服務'],
      [1990, '8月', '易寶資訊傳遞有限公司正式成立']
    ];

    await insertRows(client, 'cms_milestones', ['site_id', 'locale', 'source_key'], milestoneEvents.map((item, index) => ({
      site_id: sites.eprotel,
      locale: 'zh-HK',
      source_key: `${item[0]}-${item[1]}-${index + 1}`,
      year: item[0],
      month: item[1],
      event: item[2],
      status: 'published',
      sort_order: index + 1,
      published_at: new Date()
    })));

    await insertRows(client, 'cms_services', ['site_id', 'locale', 'slug'], [
      { site_id: sites['ets-group'], locale: 'zh-HK', slug: 'enterprise-communications', service_group: 'core', name: '企業通訊方案', description: '企業級電話系統、VoIP、統一通訊及協作平台，提升企業通話品質與管理效率。', image_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1200&auto=format&fit=crop', status: 'published', sort_order: 10, published_at: new Date() },
      { site_id: sites['ets-group'], locale: 'zh-HK', slug: 'cloud-network', service_group: 'core', name: '雲端與網絡服務', description: '安全穩定的雲端架構、SD-WAN、企業網路規劃，確保資料可用性與業務連續性。', image_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop', status: 'published', sort_order: 20, published_at: new Date() },
      { site_id: sites['ets-group'], locale: 'zh-HK', slug: 'systems-integration', service_group: 'core', name: '系統整合', description: '整合第三方系統與企業流程，自動化日常作業，降低營運成本。', image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=1200&auto=format&fit=crop', status: 'published', sort_order: 30, published_at: new Date() },
      { site_id: sites['ets-group'], locale: 'zh-HK', slug: 'cyber-security', service_group: 'subsidiary', name: '網絡安全', description: '防火牆、端點保護、安全審計與ISO 27001合規顧問服務。', image_url: 'https://images.unsplash.com/photo-1563986768609-322da13575f2?q=80&w=1200&auto=format&fit=crop', status: 'published', sort_order: 40, published_at: new Date() },
      { site_id: sites['ets-group'], locale: 'zh-HK', slug: 'talent-services', service_group: 'subsidiary', name: '人才服務', description: 'IT人才招聘、外包服務及專業培訓，為企業提供靈活人力資源方案。', image_url: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=1200&auto=format&fit=crop', status: 'published', sort_order: 50, published_at: new Date() },
      { site_id: sites['ets-group'], locale: 'zh-HK', slug: 'ict-consulting', service_group: 'subsidiary', name: 'ICT顧問服務', description: '數碼轉型策略規劃、IT架構評估與技術路線圖制定。', image_url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1200&auto=format&fit=crop', status: 'published', sort_order: 60, published_at: new Date() },
      { site_id: sites.eprotel, locale: 'zh-HK', slug: 'outsourcing', service_group: 'contact-centre', name: '外判服務', description: '專業外呼及內呼客戶聯絡中心外判服務。', status: 'published', sort_order: 10, published_at: new Date() },
      { site_id: sites.eprotel, locale: 'zh-HK', slug: 'facility-management', service_group: 'contact-centre', name: '設備管理服務', description: '客戶聯絡服務中心設備管理及託管服務。', status: 'published', sort_order: 20, published_at: new Date() },
      { site_id: sites.eprotel, locale: 'zh-HK', slug: 'training', service_group: 'contact-centre', name: '培訓服務', description: '為聯絡中心團隊提供專業培訓。', status: 'published', sort_order: 30, published_at: new Date() },
      { site_id: sites.eprotel, locale: 'zh-HK', slug: 'staffing', service_group: 'contact-centre', name: '人員派遣服務', description: '按企業營運需求提供靈活的人員派遣服務。', status: 'published', sort_order: 40, published_at: new Date() },
      { site_id: sites.eprotel, locale: 'zh-HK', slug: 'contact-centre-systems', service_group: 'contact-centre', name: '系統解決方案', description: '客戶聯絡中心系統規劃、開發及整合。', status: 'published', sort_order: 50, published_at: new Date() },
      { site_id: sites.eprotel, locale: 'zh-HK', slug: 'consulting', service_group: 'contact-centre', name: '顧問服務', description: '聯絡中心營運、流程與技術顧問服務。', status: 'published', sort_order: 60, published_at: new Date() }
    ]);

    await insertRows(client, 'cms_case_studies', ['site_id', 'locale', 'slug'], [
      { site_id: sites['ets-group'], locale: 'zh-HK', slug: 'bank-communications', title: '金融業：通訊整合專案', industry: '金融業', description: '為區域銀行提供安全通訊與分行連線解決方案。', image_url: 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?q=80&w=1200&auto=format&fit=crop', featured: true, status: 'published', sort_order: 10, published_at: new Date() },
      { site_id: sites['ets-group'], locale: 'zh-HK', slug: 'retail-cloud-pbx', title: '零售：多門市雲端PBX', industry: '零售', description: '整合門市通訊系統，提升客服效率與可追蹤性。', image_url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=1200&auto=format&fit=crop', featured: true, status: 'published', sort_order: 20, published_at: new Date() },
      { site_id: sites['ets-group'], locale: 'zh-HK', slug: 'education-remote-learning', title: '教育機構：遠端學習平台', industry: '教育', description: '架設安全的視訊教學與協作平台。', image_url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop', featured: true, status: 'published', sort_order: 30, published_at: new Date() }
    ]);

    await insertRows(client, 'cms_investor_documents', ['site_id', 'locale', 'document_key'], [
      { site_id: sites['ets-group'], locale: 'zh-HK', document_key: '2025-26-interim-report', category: 'financial-report', title: '2025/26年度中期報告', fiscal_year: '2025/26', status: 'draft', sort_order: 10 },
      { site_id: sites['ets-group'], locale: 'zh-HK', document_key: '2024-25-annual-report', category: 'financial-report', title: '2024/25年度年報', fiscal_year: '2024/25', status: 'draft', sort_order: 20 },
      { site_id: sites['ets-group'], locale: 'zh-HK', document_key: 'board-meeting-notice', category: 'announcement', title: '董事會會議通知', status: 'draft', sort_order: 30 },
      { site_id: sites['ets-group'], locale: 'zh-HK', document_key: 'monthly-return', category: 'monthly-return', title: '月報表', status: 'draft', sort_order: 40 }
    ]);

    await client.query('COMMIT');
    console.log('CMS seed data is ready');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  runSeed()
    .then(async () => {
      await pool.end();
    })
    .catch(async (error) => {
      console.error('CMS seed failed:', error.message);
      await pool.end();
      process.exit(1);
    });
}

module.exports = runSeed;