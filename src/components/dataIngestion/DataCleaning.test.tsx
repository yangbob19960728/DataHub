import React from 'react';
import { render, screen } from '@testing-library/react';
import DataCleaning from './DataCleaning';
import { DataTableMode } from './DataTable';
import { DataType, FieldMapping, RuleType, RuleValidationState } from '../../contexts/dataIngestionContext';

// 模擬 useTranslation
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

// 測試用假資料與函式
const sampleMappings: FieldMapping[] = [
  { sourceField: 'id', sampleValue: 1, targetField: 'ID', dataType: DataType.Number, id: 'id', 
    ruleType: RuleType.Empty, cleaningRule: '', isPK: true, data: {}, targetFieldTouched: true, targetFieldError: '', 
    ruleValidationState: RuleValidationState.None, cleaningRuleError: '', cleaningRuleTouched: false }
];
const updateFieldMapping = jest.fn();
const updateFieldPK = jest.fn();
const removeFieldMapping = jest.fn();

test('渲染 DataCleaning 時包含 DataTable，且模式為 DataCleaning', () => {
  render(<DataCleaning 
    fieldMappings={sampleMappings}
    updateFieldMapping={updateFieldMapping}
    updateFieldPK={updateFieldPK}
    removeFieldMapping={removeFieldMapping}
  />);
  // DataTable 應該被渲染。可以檢查空資料時的 "noData" 或主鍵切換控制項出現
  expect(screen.queryByText('noData')).toBeNull(); // 因為有提供 mapping，不應顯示 noData
  // 主鍵切換 InputSwitch (checkbox) 在清理模式中應出現
  const pkSwitch = screen.getByRole('switch');
  expect(pkSwitch).toBeInTheDocument();
  // 切換 PK 開關
  pkSwitch.click();
  expect(updateFieldPK).toHaveBeenCalled();  // 交由 DataTable 處理，這裡確認已觸發對應函式
});

test('當沒有 mapping 資料時顯示空狀態訊息', () => {
  render(<DataCleaning 
    fieldMappings={[]} 
    updateFieldMapping={updateFieldMapping}
    updateFieldPK={updateFieldPK}
    removeFieldMapping={removeFieldMapping}
  />);
  // 沒有資料時，DataTable 應顯示 "noData"
  expect(screen.getByText('noData')).toBeInTheDocument();
});
