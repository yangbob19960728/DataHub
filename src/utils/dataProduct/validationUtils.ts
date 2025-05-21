// 驗證Data Product 表單

export const validateProductDataName = (val: string, existingNames: string[], t: Function): string => {
  val = val.trim();
  if (!val) {
    return t('validation.requiredProductName');
  }
  // 僅允許中英文、數字(不允許特殊字元如 / 等)
  const namePattern = /^[A-Za-z0-9\u4e00-\u9fa5]+$/;
  if (!namePattern.test(val)) {
    return t('validation.invalidProductName');
  }
  console.log('existingNames', existingNames);
  if (existingNames.includes(val)) {
    return t('validation.duplicateProductName');
  }

  return '';
};

export const validatePath = (val: string, t: Function): string => {
  val = val.trim();
  if (!val) {
    return t('validation.requiredApiPath');
  }
  // 自動去除開頭斜線，因 Prefix 已包含 "/api/"
  const path = val.startsWith('/') ? val.substring(1) : val;
  // 只允許小寫英數字、短橫線和斜線
  const pathPattern = /^[a-z0-9\-\/]+$/;
  if (!pathPattern.test(path)) {
    return t('validation.invalidApiPath');
  }
  return '';
};

export const validateApiKey = (val: string, t: Function): string => {
  if (!val) {
    return t('validation.requiredApiKey');
  }
  // API Key 僅允許英數，長度限制 32~64
  const keyPattern = /^[A-Za-z0-9]+$/;
  if (!keyPattern.test(val) || val.length < 32 || val.length > 64) {
    return t('validation.invalidApiKey');
  }
  return '';
};

export const validateUsername = (val: string, t: Function): string => {
  val = val.trim();
  if (!val) return t('validation.requiredUsername');
  const userPattern = /^[A-Za-z0-9!@#\$%\^&\*\(\)_\+\-=\[\]\{\};':"\\|,.<>\/?]+$/;
  if (!userPattern.test(val)) {
    return t('validation.invalidUsername');
  }
  return '';
};

export const validatePassword = (val: string, t: Function): string => {
  val = val.trim();
  if (!val) return t('validation.requiredPassword');
  const passPattern = /^[A-Za-z0-9!@#\$%\^&\*\(\)_\+\-=\[\]\{\};':"\\|,.<>\/?]+$/;
  if (!passPattern.test(val)) {
    return t('validation.invalidPassword');
  }
  return '';
};