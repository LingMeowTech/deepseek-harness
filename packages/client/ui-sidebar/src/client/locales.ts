/** `sidebar` namespace dictionaries for shell controls and global panels. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'session.new': '新会话',
  'session.new.label': '新建会话',
  'toggle.open': '打开侧边栏',
  'toggle.collapse': '收起侧边栏',
  'search.label': '搜索',
  'search.placeholder': '搜索会话…',
  'search.clear': '清除搜索',
  'panels.label': '全局面板',
} satisfies Record<string, string>

/** The sidebar namespace key union. */
export type SidebarKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'session.new': 'New Session',
  'session.new.label': 'New session',
  'toggle.open': 'Open sidebar',
  'toggle.collapse': 'Collapse sidebar',
  'search.label': 'Search',
  'search.placeholder': 'Search sessions…',
  'search.clear': 'Clear search',
  'panels.label': 'Global panels',
} satisfies Record<SidebarKey, string>
