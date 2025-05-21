export enum IntegrationDataStoreMode {
  Single = 'single',
  Merge = 'merge',
  // Join = 'join', // 預留，未來可能開放
}

export const IntegrationDataStoreModeLabels: Record<IntegrationDataStoreMode, string> = {
  [IntegrationDataStoreMode.Single]: 'Single Output Mode',
  [IntegrationDataStoreMode.Merge]: 'Merge Mode',
  // [IntegrationDataStoreMode.Join]: 'Join Mode',
}