export * from './authMethod';
export * from './integrationDataStoreMode';
export * from './dropdownOptions';
export interface DropdownItem<K extends string = string> {
  name: string;  // 顯示名稱（可對應 i18n key）
  code: K;  // 實際值
}