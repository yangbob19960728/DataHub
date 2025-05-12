import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CreateDataStore from './CreateDataStore';
import { INITIAL_STEP1_DATA, Step1Data, Step1Errors, Step1Touched } from '../contexts/dataIngestionContext';

// 🔧 模擬子元件避免渲染複雜 UI，以便專注測試步驟切換邏輯
jest.mock('../components/dataIngestion/ConnectionSetup', () => () => <div data-testid="ConnectionSetup" />);
jest.mock('../components/dataIngestion/FieldMapping', () => () => <div data-testid="FieldMapping" />);
jest.mock('../components/dataIngestion/DataCleaning', () => () => <div data-testid="DataCleaning" />);
jest.mock('../components/dataIngestion/DataPreview', () => () => <div data-testid="DataPreview" />);

// 🔧 模擬 useDataIngestion Hook，提供控制各狀態的假資料與函式
jest.mock('../contexts/dataIngestionContext', () => ({
  ...jest.requireActual('../contexts/dataIngestionContext'),
  useDataIngestion: jest.fn()
}));
import { useDataIngestion } from '../contexts/dataIngestionContext';

// 🔧 模擬 i18n，讓 t(key) 回傳 key 自身或預設翻譯
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'connectionSetup': 'Connection Setup',
        'fieldMapping': 'Field Mapping',
        'dataCleaning': 'Data Cleaning',
        'dataPreview': 'Data Preview',
        'previous': 'Previous',
        'next': 'Next'
      };
      return translations[key] || key;
    }
  })
}));

describe('CreateDataStore 元件', () => {
  let mockContextValue: any;
  const setFieldMappings = jest.fn();
  const setApiData = jest.fn();
  const setStep1Data = jest.fn();
  const setStep1Errors = jest.fn();
  const setStep1Touched = jest.fn();
  const addMapping = jest.fn();
  const updateFieldMapping = jest.fn();
  const removeFieldMapping = jest.fn();
  const updateFieldPK = jest.fn();

  // 每次測試前初始化基本的 context 模擬值
  beforeEach(() => {
    jest.clearAllMocks();
    mockContextValue = {
      // 初始 context 狀態，可依各測試覆蓋
      isStep1Valid: false,
      isStep2Valid: false,
      isStep3Valid: false,
      isEnabledTestApiConnection: false,
      step1Data: { ...INITIAL_STEP1_DATA } as Step1Data,
      step1Errors: {
        dataStoreName: '', dataEndpoint: '', apiKey: '', username: '', password: '', testApiConnection: ''
      } as Step1Errors,
      step1Touched: {
        dataStoreName: false, dataEndpoint: false, apiKey: false, username: false, password: false, testApiConnection: false
      } as Step1Touched,
      fieldMappings: [],
      apiData: null,
      setFieldMappings,
      setApiData,
      setStep1Data,
      setStep1Errors,
      setStep1Touched,
      addMapping,
      updateFieldMapping,
      removeFieldMapping,
      updateFieldPK
    };
    (useDataIngestion as jest.Mock).mockReturnValue(mockContextValue);
  });

  it('初始渲染應顯示第一步驟表單，Next 按鈕在 step1 未驗證通過時為禁用狀態', async () => {
    // step1 尚未有效，因此 isStep1Valid = false，Next 應為 disabled
    mockContextValue.isStep1Valid = false;
    mockContextValue.isStep2Valid = true;   // 設定後續步驟有效，以避免 next 按鈕狀態受其他步驟影響
    mockContextValue.isStep3Valid = true;
    (useDataIngestion as jest.Mock).mockReturnValue(mockContextValue);

    let container: HTMLElement;
    await act(async () => {
      const result = render(<CreateDataStore />);
      container = result.container;
    });
    // 確認第0步驟的 ConnectionSetup 表單出現，其他步驟尚未顯示
    expect(screen.getByTestId('ConnectionSetup')).toBeInTheDocument();
    expect(screen.queryByTestId('FieldMapping')).toBeNull();
    expect(screen.queryByTestId('DataCleaning')).toBeNull();
    expect(screen.queryByTestId('DataPreview')).toBeNull();
    // 確認 Next 按鈕存在且為禁用
    const nextButton = screen.getByRole('button', { name: 'Next' });
    expect(nextButton).toBeDisabled();
    // 確認 Previous 按鈕在第一步不應出現
    expect(screen.queryByRole('button', { name: 'Previous' })).toBeNull();
  });

  it('當 step1 驗證通過時，Next 按鈕應可點擊並切換到後續步驟', async () => {
    // 設定所有步驟皆有效，使 Next 按鈕在各步驟都可用
    mockContextValue.isStep1Valid = true;
    mockContextValue.isStep2Valid = true;
    mockContextValue.isStep3Valid = true;
    // 模擬有一些 fieldMappings 資料，供 FieldMapping/DataCleaning/DataPreview 顯示
    mockContextValue.fieldMappings = [{ id: 'field1' }, { id: 'field2' }];
    (useDataIngestion as jest.Mock).mockReturnValue(mockContextValue);

    await act(async () => {
      render(<CreateDataStore />);
    });
    // 初始應在步驟0 (ConnectionSetup)
    expect(screen.getByTestId('ConnectionSetup')).toBeInTheDocument();
    const nextButton = screen.getByRole('button', { name: 'Next' });
    expect(nextButton).toBeEnabled();

    // ▶️ 模擬點擊 Next 按鈕進入步驟1 (FieldMapping)
    await act(async () => {
      fireEvent.click(nextButton);
    });
    // 應顯示 FieldMapping 元件，且 Previous 按鈕出現
    expect(screen.getByTestId('FieldMapping')).toBeInTheDocument();
    expect(screen.queryByTestId('ConnectionSetup')).toBeNull();
    const prevButton = screen.getByRole('button', { name: 'Previous' });
    expect(prevButton).toBeInTheDocument();
    expect(prevButton).toBeEnabled();
    // Next 按鈕仍然存在（此時處於步驟1，isStep2Valid=true，因此 Next 可用）
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();

    // ▶️ 再次點擊 Next 進入步驟2 (DataCleaning)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    });
    expect(screen.getByTestId('DataCleaning')).toBeInTheDocument();
    expect(screen.queryByTestId('FieldMapping')).toBeNull();
    // Previous 按鈕仍可用，Next 按鈕仍可用 (isStep3Valid=true)
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();

    // ▶️ 再點擊 Next 進入步驟3 (DataPreview)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    });
    expect(screen.getByTestId('DataPreview')).toBeInTheDocument();
    expect(screen.queryByTestId('DataCleaning')).toBeNull();
    // 現在已在最後一步，Next 按鈕應該隱藏，Previous 按鈕仍可用
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();

    // ◀️ 模擬點擊 Previous 後退到步驟2
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    });
    expect(screen.getByTestId('DataCleaning')).toBeInTheDocument();
    expect(screen.queryByTestId('DataPreview')).toBeNull();
    // 再度後退到步驟1
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    });
    expect(screen.getByTestId('FieldMapping')).toBeInTheDocument();
    expect(screen.queryByTestId('DataCleaning')).toBeNull();
    // 最後後退到步驟0
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    });
    expect(screen.getByTestId('ConnectionSetup')).toBeInTheDocument();
    expect(screen.queryByTestId('FieldMapping')).toBeNull();
  });
});
