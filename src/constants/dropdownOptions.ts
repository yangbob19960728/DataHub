export interface DropdownItem {
  name: string;  // 顯示名稱（可對應 i18n key）
  code: string;  // 實際值
}

// API 請求方法選單
export const REQUEST_METHOD_OPTIONS: DropdownItem[] = [
  { name: 'Get', code: 'GET' },
  { name: 'Post', code: 'POST' },
];

// 資料更新頻率
export const INTERVAL_OPTIONS: DropdownItem[] = [
  { name: '1m', code: '1m' },
  { name: '5m', code: '5m' },
  { name: '30m', code: '30m' },
  { name: '1h', code: '1h' },
  { name: '24h', code: '24h' },
];

// 資料格式選擇
export const DATA_FORMAT_OPTIONS: DropdownItem[] = [
  { name: 'JSON', code: 'json' },
  // 如有 CSV 需求可加入：{ name: 'CSV', code: 'csv' },
];

// 資料處理方式
export const DATA_PROCESSING_METHODS: DropdownItem[] = [
  { name: 'Replace', code: 'replace' },
  { name: 'Append', code: 'append' },
];

// 認證方式（非 Dropdown，但你可共用 interface）
export const AUTH_METHOD_OPTIONS: DropdownItem[] = [
  { name: 'authMethod.none', code: '' },
  { name: 'authMethod.bearer', code: 'Bearer' },
  { name: 'authMethod.basic', code: 'Basic' },
];
