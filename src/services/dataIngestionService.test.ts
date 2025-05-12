import axios from 'axios';
import { dataIngestionService } from './dataIngestionService';
import { DataType, FieldMapping, RuleType, RuleValidationState, Step1Data } from '../contexts/dataIngestionContext';
import { AUTH_METHOD_OPTIONS, DATA_FORMAT_OPTIONS, DATA_PROCESSING_METHODS, INTERVAL_OPTIONS, REQUEST_METHOD_OPTIONS } from '../constants/dropdownOptions';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('dataIngestionService 服務模組', () => {
  beforeAll(() => {
    // 設定環境變數供 URL 使用
    process.env.API_HOST = 'http://example.com';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getExistingNames 成功取得名稱列表時應回傳字串陣列', async () => {
    const apiResponse = { data: { data: [{ job_name: 'Name1' }, { job_name: 'Name2' }] } };
    mockedAxios.get.mockResolvedValue(apiResponse);
    const result = await dataIngestionService.getExistingNames();
    expect(axios.get).toHaveBeenCalledWith('http://example.com/datahub/datastore-job?nameOnly=true');
    expect(result).toEqual(['Name1', 'Name2']);
  });

  it('getExistingNames 當沒有資料時應回傳空陣列', async () => {
    // 情境1: data 存在但 data.data 非陣列
    mockedAxios.get.mockResolvedValue({ data: { data: 'not-array' } });
    let result = await dataIngestionService.getExistingNames();
    expect(result).toEqual([]);
    // 情境2: data 為 null
    mockedAxios.get.mockResolvedValue({ data: null });
    result = await dataIngestionService.getExistingNames();
    expect(result).toEqual([]);
  });

  it('testApiConnection 應以正確的 payload 呼叫 API 並回傳資料', async () => {
    const step1Data: any = {
      dataEndpoint: 'http://api.test/endpoint',
      requestMethod: { code: 'POST' },
      authMethod: 'Basic',
      username: 'user',
      password: 'pass',
      apiKey: 'tokenUrl',
      requestParameters: 'params'
    };
    const expectedPayload = {
      request_url: 'http://api.test/endpoint',
      request_method: 'POST',
      authorization_method: 'Basic',
      basic_username: 'user',
      basic_password: 'pass',
      api_token_url: 'tokenUrl',
      api_token_body: 'params'
    };
    const apiResponse = { data: { success: true } };
    mockedAxios.post.mockResolvedValue(apiResponse);
    const result = await dataIngestionService.testApiConnection(step1Data);
    expect(axios.post).toHaveBeenCalledWith('http://example.com/datahub/queryDataSource', expectedPayload);
    expect(result).toEqual({ success: true });
  });

  it('testApiConnection 發生錯誤時應將錯誤拋出', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Network Error'));
    await expect(dataIngestionService.testApiConnection(
      {
        dataEndpoint: 'http://api.test/endpoint',
        requestMethod: REQUEST_METHOD_OPTIONS[0],
        authMethod: '',
        username: '',
        password: '',
        apiKey: '',
        requestParameters: '',
      } as any)).rejects.toThrow('Network Error');
  });

it('parsePreviewData 應以正確的 payload 呼叫 API 並回傳解析結果', async () => {
  const fieldMappings: FieldMapping[] = [
    { targetField: 'X', isPK: false, cleaningRule: '', data: { path: ['x'] }, sampleValue: 'sampleX', ruleValidationState: RuleValidationState.None, cleaningRuleError: '', cleaningRuleTouched: false, sourceField: 'x', dataType: DataType.String, ruleType: RuleType.Empty, id: '0', targetFieldTouched: false, targetFieldError: '' },
    { targetField: 'Y', isPK: true, cleaningRule: '$.y', data: { path: ['y'] }, sampleValue: 'sampleY', ruleValidationState: RuleValidationState.None, cleaningRuleError: '', cleaningRuleTouched: false, sourceField: 'y', dataType: DataType.String, ruleType: RuleType.Empty, id: '1', targetFieldTouched: false, targetFieldError: '' },
    { targetField: 'Z', isPK: false, cleaningRule: '', data: { path: [] }, sampleValue: 'sampleZ', ruleValidationState: RuleValidationState.None, cleaningRuleError: '', cleaningRuleTouched: false, sourceField: '', dataType: DataType.String, ruleType: RuleType.Empty, id: '2', targetFieldTouched: false, targetFieldError: '' }
  ];
  const apiData = { foo: 123 };
  // 準備期望的 rules 結構
  const expectedRules = [
    { key: 'X', isPK: false, transform: { type: 'jsonata', expression: '$.x' } },
    { key: 'Y', isPK: true, transform: { type: 'jsonata', expression: '$.y' } },
    { key: 'Z', isPK: false, transform: { type: 'jsonata', expression: '$.' } }
  ];
  const expectedPayload = {
    data_source: { type: 'json', data: apiData },
    cleaning_rule: expectedRules
  };
  const apiResponse = { data: { data: { preview: 'ok' } } };
  mockedAxios.post.mockResolvedValue(apiResponse);
  const result = await dataIngestionService.parsePreviewData(apiData, fieldMappings);
  expect(axios.post).toHaveBeenCalledWith('http://example.com/datahub/parse-jsonata', expectedPayload);
  expect(result).toEqual({ preview: 'ok' });
});

it('parsePreviewData 發生錯誤時應將錯誤拋出', async () => {
  mockedAxios.post.mockRejectedValue(new Error('Parse Error'));
  await expect(dataIngestionService.parsePreviewData({}, [])).rejects.toThrow('Parse Error');
});

it('saveDataStore 應以正確的 payload 呼叫 API 以儲存資料', async () => {
  const step1Data: Step1Data = {
    dataEndpoint: 'http://api/save',
    requestMethod: REQUEST_METHOD_OPTIONS[0],
    authMethod: AUTH_METHOD_OPTIONS[2].code,
    username: 'u1',
    password: 'p1',
    apiKey: '',
    requestParameters: '',
    interval: INTERVAL_OPTIONS[1],
    dataStoreName: 'TestStore',
    dataProcessingMethod: DATA_PROCESSING_METHODS[0].code,
    dataFormate: DATA_FORMAT_OPTIONS[0],
    testApiConnection: true
  };
  const fieldMappings: FieldMapping[] = [
    { targetField: 'A', isPK: false, cleaningRule: '', data: { path: ['fieldA'] }, dataType: DataType.String, ruleType: RuleType.Trim, sampleValue: 'sampleA', ruleValidationState: RuleValidationState.None, cleaningRuleError: '', cleaningRuleTouched: false, sourceField: 'fieldA', id: '0', targetFieldTouched: false, targetFieldError: '' },
    { targetField: 'B', isPK: true, cleaningRule: '$.calcB', data: { path: ['field', 'B'] }, dataType: DataType.String, ruleType: RuleType.LowerCase, sampleValue: 'sampleB', ruleValidationState: RuleValidationState.None, cleaningRuleError: '', cleaningRuleTouched: false, sourceField: 'fieldB', id: '1', targetFieldTouched: false, targetFieldError: '' },
    { targetField: 'C', isPK: false, cleaningRule: '$.c', data: { path: [] }, dataType: DataType.String, ruleType: RuleType.Empty, sampleValue: 'sampleC', ruleValidationState: RuleValidationState.None, cleaningRuleError: '', cleaningRuleTouched: false, sourceField: '', id: '2', targetFieldTouched: false, targetFieldError: '' }
  ];
  const expectedRules = [
    {
      key: 'A', isPK: false, sourceField: 'fieldA', dataType: DataType.String, ruleType: RuleType.Trim,
      transform: { type: 'jsonata', expression: '$.fieldA' }
    },
    {
      key: 'B', isPK: true, sourceField: 'field.B', dataType: DataType.String, ruleType: RuleType.LowerCase,
      transform: { type: 'jsonata', expression: '$.calcB' }
    },
    {
      key: 'C', isPK: false, sourceField: '', dataType: 'string', ruleType: RuleType.Empty,
      transform: { type: 'jsonata', expression: '$.c' }
    }
  ];
  const expectedPayload = {
    api: {
      request_url: 'http://api/save',
      request_method: 'GET',
      authorization_method: 'Basic',
      basic_username: 'u1',
      basic_password: 'p1',
      api_token_url: '',
      api_token_body: '',
      interval: '5m'
    },
    dataStore: {
      name: 'TestStore',
      data_processing_method: 'replace',
      data_formate: 'json',
      data: expectedRules
    }
  };
  mockedAxios.post.mockResolvedValue({ data: {} });
  await expect(dataIngestionService.saveDataStore(step1Data, fieldMappings)).resolves.toBeUndefined();
  expect(axios.post).toHaveBeenCalledWith('http://example.com/datahub/datastore-job', expectedPayload);
});

it('saveDataStore 發生錯誤時應將錯誤拋出', async () => {
  mockedAxios.post.mockRejectedValue(new Error('Save failed'));
  const step1Data: Step1Data = {
    dataEndpoint: 'http://api/save',
    requestMethod: REQUEST_METHOD_OPTIONS[0],
    authMethod: AUTH_METHOD_OPTIONS[2].code,
    username: 'u1',
    password: 'p1',
    apiKey: '',
    requestParameters: '',
    interval: INTERVAL_OPTIONS[1],
    dataStoreName: 'TestStore',
    dataProcessingMethod: DATA_PROCESSING_METHODS[0].code,
    dataFormate: DATA_FORMAT_OPTIONS[0],
    testApiConnection: true
  };
  await expect(dataIngestionService.saveDataStore(step1Data, [])).rejects.toThrow('Save failed');
});

it('getJobsList 應取得工作列表並補上 isActivity 欄位', async () => {
  const jobs = [
    { id: 1, name: 'Job1', isActivity: true },
    { id: 2, name: 'Job2' }  // isActivity 未提供
  ];
  const apiResponse = { data: { data: jobs } };
  mockedAxios.get.mockResolvedValue(apiResponse);
  const result = await dataIngestionService.getJobsList();
  expect(axios.get).toHaveBeenCalledWith('http://example.com/datahub/datastore-job');
  // 第一筆維持原值，第二筆應補上 isActivity:false
  expect(result).toEqual([
    { id: 1, name: 'Job1', isActivity: true },
    { id: 2, name: 'Job2', isActivity: false }
  ]);
});

it('getJobsList 當沒有資料時應回傳空陣列', async () => {
  mockedAxios.get.mockResolvedValue({ data: { data: null } });
  const result = await dataIngestionService.getJobsList();
  expect(result).toEqual([]);
});
});
