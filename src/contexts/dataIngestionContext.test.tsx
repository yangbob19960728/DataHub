import React from 'react';
import { render, act } from '@testing-library/react';
import { DataIngestionProvider, useDataIngestion, FieldMapping as FieldMappingType, RuleValidationState, RuleType, DataType } from './dataIngestionContext';
import { validateStep1Data, validateFieldMappings, validateJsonataExpression } from '../utils/validationUtils';

// 🔧 模擬外部的驗證工具函式，避免真正的 debounce 延遲與異步行為
jest.mock('../utils/validationUtils', () => ({
  validateStep1Data: jest.fn(),
  validateFieldMappings: jest.fn(),
  validateJsonataExpression: jest.fn()
}));

// Mock translation
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ 
    t: (key: string) => {
      const translations: Record<string, string> = {
        'validation.requiredField': 'This field is required.',
        'validation.duplicateField': 'This field is duplicated.',
      };
      return translations[key] || key;
    }
  })
}));
describe('dataIngestionContext', () => {
  // 建立一個測試用組件以使用 useDataIngestion
  const TestComponent: React.FC<{ onTest?: (ctx: ReturnType<typeof useDataIngestion>) => void }> = ({ onTest }) => {
    const context = useDataIngestion();
    onTest?.(context);
    return <div />;
  };

  // 工具函式：建立 FieldMapping 物件
  const createMapping = (partial: Partial<FieldMappingType>): FieldMappingType => ({
    sourceField: '', sampleValue: '', targetField: '', dataType: DataType.String,
    id: '', ruleType: RuleType.Empty, cleaningRule: '', isPK: false,
    data: {}, targetFieldTouched: false, targetFieldError: '',
    ruleValidationState: RuleValidationState.None, cleaningRuleError: '', cleaningRuleTouched: false,
    ...partial
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('初始狀態：isStep1Valid 應為 false（尚未測試 API），isEnabledTestApiConnection 為 true（無欄位錯誤）', () => {
    let contextValue: any;
    render(
      <DataIngestionProvider>
        <TestComponent onTest={(ctx) => { contextValue = ctx; }} />
      </DataIngestionProvider>
    );
    // 初始 testApiConnection=false，且沒有欄位錯誤，故 isStep1Valid=false，isEnabledTestApiConnection=true
    expect(contextValue.isStep1Valid).toBe(false);
    expect(contextValue.isEnabledTestApiConnection).toBe(true);
    // 初始 fieldMappings 應為空陣列，isStep2Valid 應為 false（因為沒有任何 mapping）
    expect(contextValue.fieldMappings).toEqual([]);
    expect(contextValue.isStep2Valid).toBe(false);
    // isStep3Valid 因無 mapping 或 PK 不足而為 false
    expect(contextValue.isStep3Valid).toBe(false);
  });

  it('當設定 Step1 欄位錯誤時，isEnabledTestApiConnection 變為 false；清除錯誤則恢復 true', () => {
    let context: any;
    render(
      <DataIngestionProvider>
        <TestComponent onTest={(ctx) => { context = ctx; }} />
      </DataIngestionProvider>
    );
    // 初始所有錯誤皆空，isEnabledTestApiConnection 為 true
    expect(context.isEnabledTestApiConnection).toBe(true);
    // 模擬產生一個 Step1 錯誤
    act(() => {
      context.setStep1Errors({ ...context.step1Errors, dataEndpoint: 'Error' });
    });
    expect(context.isEnabledTestApiConnection).toBe(false);
    // 移除錯誤
    act(() => {
      context.setStep1Errors({ ...context.step1Errors, dataEndpoint: '' });
    });
    expect(context.isEnabledTestApiConnection).toBe(true);
  });

  it('Step1 驗證：validateStep1Field 更新錯誤狀態', () => {
    (validateStep1Data as jest.Mock).mockReturnValue({
      dataStoreName: '', dataEndpoint: '必填', apiKey: '', username: '', password: '', testApiConnection: ''
    });
    let context: any;
    render(
      <DataIngestionProvider>
        <TestComponent onTest={(ctx) => { context = ctx; }} />
      </DataIngestionProvider>
    );
    // 呼叫 validateStep1Field（debounce 內部實現）
    act(() => {
      context.validateStep1Field({ ...context.step1Data }, []);
      jest.advanceTimersByTime(500);
    });
    // 應更新 step1Errors 為 validateStep1Data 所回傳的錯誤
    expect(context.step1Errors.dataEndpoint).toBe('必填');
    // 再次呼叫但 validateStep1Data 回傳相同錯誤，不應重複更新 (因為值未改變)
    (validateStep1Data as jest.Mock).mockReturnValue({
      dataStoreName: '', dataEndpoint: '必填', apiKey: '', username: '', password: '', testApiConnection: ''
    });
    const prevErrorObj = context.step1Errors;
    act(() => {
      context.validateStep1Field({ ...context.step1Data }, []);
      jest.advanceTimersByTime(500);
    });
    expect(context.step1Errors).toBe(prevErrorObj);
  });

  it('Step2 驗證：validateFieldMappings 更新 fieldMappings 狀態', () => {
    // 模擬 validateFieldMappings 將所有 mapping 的 targetFieldTouched 設為 true
    (validateFieldMappings as jest.Mock).mockImplementation((prevMappings: FieldMappingType[]) =>
      prevMappings.map(m => ({ ...m, targetFieldTouched: true }))
    );
    let context: any;
    render(
      <DataIngestionProvider>
        <TestComponent onTest={(ctx) => { context = ctx; }} />
      </DataIngestionProvider>
    );
    // 新增兩筆 mapping
    act(() => {
      context.addMapping(createMapping({ id: 'A', targetField: 'X' }));
      context.addMapping(createMapping({ id: 'B', targetField: 'Y' }));
    });
    expect(context.fieldMappings.length).toBe(2);
    // 呼叫 validateStep2Field
    act(() => {
      context.validateStep2Field();
      jest.advanceTimersByTime(500);
    });
    // 所有 mapping 的 targetFieldTouched 應被設為 true
    context.fieldMappings.forEach((m: FieldMappingType) => {
      expect(m.targetFieldTouched).toBe(true);
    });
  });

  it('新增/更新/移除 FieldMapping 應影響 isStep2Valid 與 isStep3Valid', () => {
    let context: any;
    render(
      <DataIngestionProvider>
        <TestComponent onTest={(ctx) => { context = ctx; }} />
      </DataIngestionProvider>
    );
    // 初始無 mapping，isStep2Valid 應為 false，isStep3Valid 亦為 false
    expect(context.isStep2Valid).toBe(false);
    expect(context.isStep3Valid).toBe(false);
    // ➕ 新增一筆映射，預設 targetFieldTouched=false，targetFieldError=''，isPK=true
    act(() => {
      context.addMapping(createMapping({ id: 'id1', isPK: true }));
    });
    // 此時因尚未輸入 targetField (touched=false)，isStep2Valid 應仍為 false
    expect(context.isStep2Valid).toBe(false);
    // Step3 檢查：目前1筆 mapping 且有且僅有一個 PK，ruleValidationState=None 無錯誤，id 非空 => 條件滿足，isStep3Valid 應為 true
    expect(context.isStep3Valid).toBe(true);
    // ✏️ 模擬填寫 targetField
    act(() => {
      context.updateFieldMapping(0, 'targetField', 'FieldName');
      context.updateFieldMapping(0, 'targetFieldTouched', true);
    });
    // 現在 targetField 有值且 touched=true，沒有錯誤，isStep2Valid 應為 true
    expect(context.isStep2Valid).toBe(true);
    // ➕ 再新增一筆映射（此筆 PK=false, id 非空）
    act(() => {
      context.addMapping(createMapping({ id: 'id2', isPK: false }));
    });
    // 目前第二筆 mapping targetFieldTouched 預設 false，因此 isStep2Valid 應為 false（因為並非所有 mapping 都 touched）
    expect(context.isStep2Valid).toBe(false);
    // 而 Step3 條件不符（PK 只有一筆仍滿足，但新增的第二筆 id 非空但 cleaningRuleTouched=false，也視為有效；重點在 PK 數仍為1），理論上 isStep3Valid 仍為 true
    expect(context.isStep3Valid).toBe(true);
    // ❌ 移除第一筆映射（原本 PK=true），移除後應自動將剩餘第一筆設為 PK
    act(() => {
      context.removeFieldMapping(0);
    });
    expect(context.fieldMappings.length).toBe(1);
    expect(context.fieldMappings[0].isPK).toBe(true);
    // 移除後僅剩一筆且 PK 存在，但其 targetFieldTouched 仍為 false，因此 isStep2Valid 應為 false
    expect(context.isStep2Valid).toBe(false);
    // 剩餘一筆 mapping (id='id2')，id 非空、ruleValidationState=None，且仍有一個 PK，isStep3Valid 應為 true
    expect(context.isStep3Valid).toBe(true);
    // 🔄 更新剩餘映射的 PK 為 false => 導致沒有 PK，isStep3Valid 應為 false
    act(() => {
      context.updateFieldPK(0, false);
    });
    expect(context.fieldMappings[0].isPK).toBe(false);
    expect(context.isStep3Valid).toBe(false);
  });

  it('更新 FieldMapping 的 targetField 時會即時驗證，設定必要的錯誤訊息', async() => {
    let context: any;
    render(
      <DataIngestionProvider>
        <TestComponent onTest={(ctx) => { context = ctx; }} />
      </DataIngestionProvider>
    );
    // 新增兩筆映射，用於測試空值與重複值
    await act(() => {
      context.addMapping(createMapping({ id: '1', targetField: 'ABC' }));
      context.addMapping(createMapping({ id: '2', targetField: 'XYZ' }));
    });
    // Case 1: 將第一筆的 targetField 更新為空字串 -> 觸發必填錯誤
    await act(() => {
      context.updateFieldMapping(0, 'targetField', '');
    });
    expect(context.fieldMappings[0].targetFieldError).toEqual('This field is required.');  // 應有錯誤訊息 (必填)
    // Case 2: 將第一筆的 targetField 更新為與第二筆相同 "XYZ" -> 觸發重複錯誤
    act(() => {
      context.updateFieldMapping(0, 'targetField', 'XYZ');
    });
    expect(context.fieldMappings[0].targetFieldError).toEqual('This field is duplicated.');  // 應有錯誤訊息 (重複欄位)
    // Case 3: 修改第一筆為不重複且非空的值 -> 錯誤訊息應清空
    act(() => {
      context.updateFieldMapping(0, 'targetField', 'DEF');
    });
    expect(context.fieldMappings[0].targetFieldError).toBe('');
  });

  it('更新 FieldMapping 的 cleaningRule 時會將狀態設為 Loading，並在驗證後更新狀態', async () => {
    (validateJsonataExpression as jest.Mock).mockResolvedValue(RuleValidationState.Success);
    let context: any;
    render(
      <DataIngestionProvider>
        <TestComponent onTest={(ctx) => { context = ctx; }} />
      </DataIngestionProvider>
    );
    // 新增一筆無 id 的映射（表示自訂欄位），以測試 cleaningRule 必填錯誤
    act(() => {
      context.addMapping(createMapping({ id: '', ruleType: RuleType.Empty, cleaningRule: '' }));
    });
    // 將 cleaningRule 設為空字串 -> 對於 id='' 應產生 "必填" 錯誤
    act(() => {
      context.updateFieldMapping(0, 'cleaningRule', '');
    });
    // 更新後立刻：ruleValidationState 應為 Loading，cleaningRuleTouched=true，cleaningRuleError 有必填錯誤訊息
    let mapping = context.fieldMappings[0];
    expect(mapping.ruleValidationState).toBe(RuleValidationState.Loading);
    expect(mapping.cleaningRuleTouched).toBe(true);
    expect(mapping.cleaningRuleError).toBeTruthy();
    // 快進 fake timer 讓 debounced validateCleaningRule 執行，並等待 Promise
    await act(async () => {
      jest.advanceTimersByTime(300);
      // 等待 validateJsonataExpression resolved
    });
    // validateJsonataExpression 回傳 Success：此時 ruleValidationState 應更新為 Success、清除錯誤訊息
    mapping = context.fieldMappings[0];
    expect(mapping.ruleValidationState).toBe(RuleValidationState.Success);
    expect(mapping.cleaningRuleError).toBe('');
  });
});
