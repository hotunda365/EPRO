UPDATE cms_navigation_items navigation
SET location = 'primary', updated_at = CURRENT_TIMESTAMP
FROM cms_sites sites
WHERE navigation.site_id = sites.id
  AND sites.site_key = 'ets-group'
  AND navigation.locale = 'zh-HK'
  AND navigation.item_key = 'news'
  AND navigation.url = '/pages/news.html'
  AND navigation.location = 'footer';