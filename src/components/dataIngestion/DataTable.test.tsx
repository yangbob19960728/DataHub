import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DataTable, { DataTableMode } from './DataTable';
import { DataIngestionProvider, useDataIngestion, DataType, RuleType, RuleValidationState, FieldMapping as FieldMappingType } from '../../contexts/dataIngestionContext';

// Mock translation
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

// 建立測試用的 fieldMappings 資料
const fieldMappings: FieldMappingType[] = [
  // 第一筆：具有錯誤的 targetField，id 非空字串
  {
    sourceField: 'name', sampleValue: 'Alice', targetField: 'Name',
    dataType: DataType.String, id: '123', ruleType: RuleType.Empty, cleaningRule: '',
    isPK: true,
    data: {}, targetFieldTouched: true, targetFieldError: 'Required field',
    ruleValidationState: RuleValidationState.None, cleaningRuleError: '', cleaningRuleTouched: false
  },
  // 第二筆：新加入的 mapping，id 為空，targetField 尚未填寫
  {
    sourceField: 'city', sampleValue: 'Wonderland', targetField: '',
    dataType: DataType.String, id: '', ruleType: RuleType.Empty, cleaningRule: '',
    isPK: false,
    data: {}, targetFieldTouched: false, targetFieldError: '',
    ruleValidationState: RuleValidationState.None, cleaningRuleError: '', cleaningRuleTouched: false
  }
];
const updateFieldMapping = jest.fn();
const removeFieldMapping = jest.fn();
const updateFieldPK = jest.fn();

test('renders FieldMapping mode with remove button and no PK column', () => {
  const props = {
      mode: DataTableMode.FieldMapping,
      fieldMappings,
      updateFieldMapping,
      removeFieldMapping,
      updateFieldPK
    };
  render(<DataTable {...props} />);
  // There should be a remove (delete) button for the mapping
  expect(document.querySelector('.pi.pi-times')).toBeInTheDocument();
  // PK input switch should not be present in FieldMapping mode
  expect(screen.queryByRole('checkbox')).toBeNull();
});

test('renders DataCleaning mode with PK column and no remove button', () => {
  const props = {
      mode: DataTableMode.DataCleaning,
      fieldMappings,
      updateFieldMapping,
      removeFieldMapping,
      updateFieldPK
    };
  render(<DataTable {...props} />);
  // PK switch should be present
  expect(screen.getAllByRole('switch')[0]).toBeInTheDocument();
  expect(screen.getAllByRole('switch')[0]).toBeChecked();
  // Remove button should not be present in DataCleaning mode
  expect(document.querySelector('.pi.pi-times')).toBeNull();
});
