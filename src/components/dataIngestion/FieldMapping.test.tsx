import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import FieldMapping from './FieldMapping';
import { DataType, FieldMapping as FieldMappingType, RuleType, RuleValidationState } from '../../contexts/dataIngestionContext';

// 🔧 模擬將 JSON 資料轉換為樹狀節點的工具函式
jest.mock('../../utils/dataUtils', () => ({
  jsonToTreeNodes: jest.fn(),
  // findTreeNodeByKey 在元件內有定義，這裡可不額外模擬
}));

// 🔧 模擬 Tree 組件（來自 primereact/tree），簡化為點擊項目直接更新選取值
jest.mock('primereact/tree', () => ({
  Tree: ({ value, selectionMode, selectionKeys, onSelectionChange }: any) => (
    <ul>
      {value.map((node: any) => (
        <li key={node.key} onClick={() => onSelectionChange({ value: node.key })}>
          {node.label}
        </li>
      ))}
    </ul>
  )
}));

// 🔧 模擬 i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'apiFields': 'API Fields',
        'fieldMappingTable': 'Field Mapping Table',
        'addField': '新增欄位'
      };
      return translations[key] || key;
    }
  })
}));

describe('FieldMapping 元件', () => {
  // 準備模擬的 API 回傳資料及對應的樹狀結構節點
  const apiDataSample = { name: 'Alice', age: 30 };
  const treeNodes = [
    { key: 'name', label: 'name', data: { value: 'Alice' } },
    { key: 'age', label: 'age', data: { value: 30 } }
  ];
  const addMapping = jest.fn();
  const updateFieldMapping = jest.fn();
  const removeFieldMapping = jest.fn();
  const updateFieldPK = jest.fn();
  const setFieldMappings = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    const { jsonToTreeNodes } = require('../../utils/dataUtils');
    jsonToTreeNodes.mockReturnValue(treeNodes);
  });

  it('未選擇欄位時，點擊右箭頭不應新增 mapping', async () => {
    const props = {
      fieldMappings: [], setFieldMappings,
      apiData: apiDataSample,
      addMapping, updateFieldMapping, removeFieldMapping, updateFieldPK
    };
    await act(async () => {
      render(<FieldMapping {...props} />);
    });
    // 尚未點選任何樹節點就直接點擊右箭頭按鈕
    const addButton = screen.getByLabelText('Add Field');
    await act(async () => {
      fireEvent.click(addButton);
    });
    // 此時因沒有選擇欄位，addMapping 不應被呼叫
    expect(addMapping).not.toHaveBeenCalled();
  });

  it('點選樹狀節點並點擊右箭頭，應新增對應的 field mapping', async () => {
    const props = {
      fieldMappings: [], setFieldMappings,
      apiData: apiDataSample,
      addMapping, updateFieldMapping, removeFieldMapping, updateFieldPK
    };
    await act(async () => {
      render(<FieldMapping {...props} />);
    });
    // 模擬使用者點擊樹狀的 "name" 節點
    fireEvent.click(screen.getByText('name'));
    // 點擊 "Add Field" 箭頭按鈕
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Add Field'));
    });
    // 新增的 mapping 應對應選取的 'name' 節點內容
    expect(addMapping).toHaveBeenCalledWith(expect.objectContaining({
      id: 'name',                 // 對應選取節點的 key
      sourceField: 'name',        // 對應節點 label
      sampleValue: 'Alice',       // 對應節點資料值
      targetField: '',            // 初始 targetField 為空
      dataType: 'string',         // 字串類型
      ruleType: '',               // 預設無清理規則
      isPK: true                  // 第一筆映射預設為 PK
    }));
  });

  it('若選取的欄位已存在於 mapping 中，點擊右箭頭不應重複新增', async () => {
    // 初始已有 id 'name' 的映射
    const initialMapping: FieldMappingType = {
      sourceField: 'name', sampleValue: 'Alice', targetField: '', dataType: DataType.String,
      id: 'name', ruleType: RuleType.Empty, cleaningRule: '', isPK: true,
      data: {}, targetFieldTouched: false, targetFieldError: '', ruleValidationState: RuleValidationState.None, cleaningRuleError: '', cleaningRuleTouched: false
    };
    const props = {
      fieldMappings: [initialMapping], setFieldMappings,
      apiData: apiDataSample,
      addMapping, updateFieldMapping, removeFieldMapping, updateFieldPK
    };
    await act(async () => {
      render(<FieldMapping {...props} />);
    });
    // 模擬點擊樹狀 "name" 節點（與已有映射重複）
    fireEvent.click(screen.getByText('name'));
    // 點擊右箭頭按鈕
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Add Field'));
    });
    // 因為 'name' 已存在於 fieldMappings，中途應檢查 alreadyExists = true，因此不應再呼叫 addMapping
    expect(addMapping).not.toHaveBeenCalled();
  });

  it('點擊 "新增欄位" (加號) 按鈕應新增空白 mapping，其 PK 狀態取決於當前 mapping 數量', async () => {
    // 案例1：目前無任何 mapping，點擊加號後應新增 isPK=true 的映射
    let props = {
      fieldMappings: [], setFieldMappings,
      apiData: apiDataSample,
      addMapping, updateFieldMapping, removeFieldMapping, updateFieldPK
    };
    let rerender: any;
    await act(async () => {
      const renderResult = render(<FieldMapping {...props} />);
      rerender = renderResult.rerender;
    });
    const addFieldButton = screen.getByRole('button', { name: '新增欄位' });
    await act(async () => {
      fireEvent.click(addFieldButton);
    });
    expect(addMapping).toHaveBeenCalledWith(expect.objectContaining({
      id: '', sourceField: '', sampleValue: '', targetField: '',
      isPK: true  // 第一筆新增為 PK
    }));
    jest.clearAllMocks();
    // 案例2：已有一筆 mapping，再次點擊加號，新增 mapping 的 isPK 應為 false（確保只保留一個 PK）
    const existingMapping: FieldMappingType = {
      sourceField: 'fieldX', sampleValue: '123', targetField: '', dataType: DataType.String,
      id: 'fieldX', ruleType: RuleType.Empty, cleaningRule: '', isPK: true,
      data: {}, targetFieldTouched: false, targetFieldError: '', ruleValidationState: RuleValidationState.None, cleaningRuleError: '', cleaningRuleTouched: false
    };
    props = {
      fieldMappings: [existingMapping], setFieldMappings,
      apiData: apiDataSample,
      addMapping, updateFieldMapping, removeFieldMapping, updateFieldPK
    };
    await act(async () => {
      rerender(<FieldMapping {...props} />);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '新增欄位' }));
    });
    expect(addMapping).toHaveBeenCalledWith(expect.objectContaining({ isPK: false }));
  });
});
