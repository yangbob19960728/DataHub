import { validateTargetField, validateJsonataExpression, validateStep1Data, validateFieldMappings } from '../utils/validationUtils';
import { RuleValidationState, FieldMapping, Step1Data, Step1Errors } from '../contexts/dataIngestionContext';

// 🔧 模擬 jsonata 函式
const evaluateMock = jest.fn();
jest.mock('jsonata', () => () => ({ evaluate: evaluateMock }));
// 🔧 模擬 i18n.t 函式
jest.mock('i18next', () => ({ t: (key: string) => key }));


describe('validationUtils 工具模組', () => {
  describe('validateTargetField', () => {
    it('無論輸入為何都應回傳空字串', () => {
      expect(validateTargetField('any', [], 0)).toBe('');
      expect(validateTargetField('', ['x'], 0)).toBe('');
    });
  });

  describe('validateJsonataExpression', () => {
    beforeEach(() => {
      evaluateMock.mockReset();
    });

    it('空字串表達式應回傳 RuleValidationState.None', async () => {
      const result = await validateJsonataExpression('   ', {});
      expect(result).toBe(RuleValidationState.None);
      expect(evaluateMock).not.toHaveBeenCalled();
    });

    it('表達式計算有定義值時應回傳 Success', async () => {
      evaluateMock.mockResolvedValueOnce(42);
      const data = { a: 1 };
      const result = await validateJsonataExpression('a+1', data);
      expect(evaluateMock).toHaveBeenCalledWith(data);
      expect(result).toBe(RuleValidationState.Success);
    });

    it('表達式計算結果為 undefined 時應回傳 Error', async () => {
      evaluateMock.mockResolvedValueOnce(undefined);
      const result = await validateJsonataExpression('undefinedExpr', {});
      expect(result).toBe(RuleValidationState.Error);
    });

    it('表達式拋出錯誤時應回傳 Error', async () => {
      evaluateMock.mockRejectedValueOnce(new Error('Bad expr'));
      const result = await validateJsonataExpression('bad', {});
      expect(result).toBe(RuleValidationState.Error);
    });
  });

  describe('validateStep1Data', () => {
    const baseData: Step1Data = {
      dataStoreName: 'validname',
      dataEndpoint: 'http://valid.url',
      requestMethod: { code: 'GET' } as any,
      requestParameters: '',
      dataFormate: { code: 'JSON' } as any,
      interval: { code: 'Daily' } as any,
      dataProcessingMethod: 'method',
      authMethod: '',  // 無認證
      apiKey: '',
      username: '',
      password: '',
      testApiConnection: true
    };
    it('資料名稱空值或格式不符時應給予 invalid 錯誤訊息', () => {
      const dataEmpty = { ...baseData, dataStoreName: '' , testApiConnection: false };
      let errors = validateStep1Data(dataEmpty, []);
      expect(errors.dataStoreName).toBe('dataStoreName.invalid');
      const dataInvalid = { ...baseData, dataStoreName: '1abc', testApiConnection: false };
      errors = validateStep1Data(dataInvalid, []);
      expect(errors.dataStoreName).toBe('dataStoreName.invalid');
    });

    it('資料名稱重複時應回傳 duplicate 錯誤訊息（即使格式原本不符也以 duplicate 優先）', () => {
      const dataValidName = { ...baseData, dataStoreName: 'dupname', testApiConnection: false };
      let errors = validateStep1Data(dataValidName, ['dupname']);
      expect(errors.dataStoreName).toBe('dataStoreName.duplicate');
      // 同時格式不符與重複時，仍以 duplicate 為結果
      const dataConflict = { ...baseData, dataStoreName: '1dup', testApiConnection: false };
      errors = validateStep1Data(dataConflict, ['1dup']);
      expect(errors.dataStoreName).toBe('dataStoreName.duplicate');
    });

    it('資料端點 URL 無效時應回傳 invalid 錯誤訊息，合法時無錯誤', () => {
      const dataBadUrl = { ...baseData, dataEndpoint: 'invalid-url', testApiConnection: false };
      let errors = validateStep1Data(dataBadUrl, []);
      expect(errors.dataEndpoint).toBe('apiSourceConfiguration.invalid');
      const dataGoodUrl = { ...baseData, dataEndpoint: 'https://valid.com', testApiConnection: false };
      errors = validateStep1Data(dataGoodUrl, []);
      expect(errors.dataEndpoint).toBe('');
    });

    it('當認證方式為 Bearer 但未提供 token 時應回傳 apiKey 錯誤', () => {
      const dataBearerNoKey = { ...baseData, authMethod: 'Bearer', apiKey: '', testApiConnection: false };
      const errors = validateStep1Data(dataBearerNoKey, []);
      expect(errors.apiKey).toBe('authMethod.apiKeyValue.invalid');
      // 若提供 token 則無此錯誤
      const dataBearerWithKey = { ...dataBearerNoKey, apiKey: 'token' };
      const errors2 = validateStep1Data(dataBearerWithKey, []);
      expect(errors2.apiKey).toBe('');
    });

    it('當認證方式為 Basic 時缺少帳號或密碼應回傳對應錯誤', () => {
      const dataBasicMissingBoth = { ...baseData, authMethod: 'Basic', username: '', password: '', testApiConnection: false };
      const errors = validateStep1Data(dataBasicMissingBoth, []);
      expect(errors.username).toBe('authMethod.username.invalid');
      expect(errors.password).toBe('authMethod.password.invalid');
      // 只缺密碼
      const dataBasicNoPass = { ...baseData, authMethod: 'Basic', username: 'user', password: '', testApiConnection: false };
      const errors2 = validateStep1Data(dataBasicNoPass, []);
      expect(errors2.username).toBe('');
      expect(errors2.password).toBe('authMethod.password.invalid');
      // 只缺帳號
      const dataBasicNoUser = { ...baseData, authMethod: 'Basic', username: '', password: 'pass', testApiConnection: false };
      const errors3 = validateStep1Data(dataBasicNoUser, []);
      expect(errors3.username).toBe('authMethod.username.invalid');
      expect(errors3.password).toBe('');
    });

    it('未執行測試連線時應回傳 testApiConnection.failure 錯誤，成功測試後則無錯誤', () => {
      const dataNotTested = { ...baseData, testApiConnection: false };
      const errors = validateStep1Data(dataNotTested, []);
      expect(errors.testApiConnection).toBe('testApiConnection.failure');
      const dataTested = { ...baseData, testApiConnection: true };
      const errors2 = validateStep1Data(dataTested, []);
      expect(errors2.testApiConnection).toBe('');
    });

    it('所有欄位皆符合要求且測試成功時應回傳無錯誤物件', () => {
      const validData: Step1Data = {
        dataStoreName: 'abc', 
        dataEndpoint: 'http://valid.com',
        requestMethod: { code: 'GET' } as any,
        requestParameters: '',
        dataFormate: { code: 'CSV' } as any,
        interval: { code: 'Weekly' } as any,
        dataProcessingMethod: 'method',
        authMethod: 'Basic',
        apiKey: 'someToken',
        username: 'user1',
        password: 'pass1',
        testApiConnection: true
      };
      const errors = validateStep1Data(validData, ['xyz']);  // 'xyz' 與名稱不同，不影響
      // 確認所有錯誤欄位皆為空字串
      Object.values(errors).forEach(err => {
        expect(err).toBe('');
      });
    });
  });

  describe('validateFieldMappings', () => {
    it('應驗證目標欄位是否為空或重複並設置對應錯誤', () => {
      const mappings: FieldMapping[] = [
        { targetField: 'Field1', targetFieldTouched: false, targetFieldError: '', isPK: false } as FieldMapping,
        { targetField: '  ', targetFieldTouched: false, targetFieldError: '', isPK: false } as FieldMapping, // 空白名稱
        { targetField: 'Field2', targetFieldTouched: false, targetFieldError: '', isPK: false } as FieldMapping,
        { targetField: 'Field1', targetFieldTouched: false, targetFieldError: '', isPK: false } as FieldMapping  // 重複 Field1
      ];
      const result = validateFieldMappings(mappings);
      // 第0項與第3項重複，應有 duplicate 錯誤
      expect(result[0].targetFieldError).toBe('validation.duplicateField');
      expect(result[3].targetFieldError).toBe('validation.duplicateField');
      // 第1項為空白，應有 requiredField 錯誤
      expect(result[1].targetFieldError).toBe('validation.requiredField');
      // 第2項唯一且非空，應無錯誤
      expect(result[2].targetFieldError).toBe('');
    });
  });
});
