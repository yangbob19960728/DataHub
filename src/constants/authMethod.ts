export enum AuthMethod {
  None = '',         // 空字串表示「無驗證」
  ApiKey = 'apiKey',
  Bearer = 'Bearer',
  Basic = 'Basic',
}
export const AuthMethodLabels: Record<AuthMethod, string> = {
  [AuthMethod.None]: 'authMethod.none',
  [AuthMethod.Bearer]: 'authMethod.bearer',
  [AuthMethod.Basic]: 'authMethod.basic',
  [AuthMethod.ApiKey]: 'authMethod.apiKey',
};