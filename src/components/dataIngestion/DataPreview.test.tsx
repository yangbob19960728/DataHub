import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import DataPreview from './DataPreview';
import { dataIngestionService } from '../../services/dataIngestionService';

// 🔧 模擬 usePreviewData hook，使我們可以控制 previewData 和 loading 狀態
jest.mock('../../hooks/usePreviewData', () => ({
  usePreviewData: jest.fn()
}));
import { usePreviewData } from '../../hooks/usePreviewData';
import { DataType, FieldMapping, RuleType, RuleValidationState, Step1Data } from '../../contexts/dataIngestionContext';

// 🔧 模擬 react-router-dom 的 useHistory，以監聽 push 被呼叫
const pushMock = jest.fn();
jest.mock('react-router-dom', () => ({
  useHistory: () => ({ push: pushMock })
}));

// 🔧 模擬 dataIngestionService，用於攔截 saveDataStore 函式
jest.mock('../../services/dataIngestionService', () => ({
  dataIngestionService: {
    saveDataStore: jest.fn()
  }
}));

// 🔧 模擬 i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'actions.cancel': 'Cancel',
        'actions.confirm': 'Confirm',
        'actions.save': 'Save',
        'actions.clearAll': 'Clear all data',
        'error.saveFailed': 'Save Failed',
        'error.apiConnection': 'API Connection Error',
        'error.unknownError': 'Unknown Error'
      };
      return translations[key] || key;
    }
  })
}));

describe('DataPreview 元件', () => {
  const fieldMappingsSample: FieldMapping[] = [
    {
      sourceField: 'id', targetField: 'id', dataType: DataType.String, id: 'id', ruleType: RuleType.Empty, cleaningRule: '', isPK: true, sampleValue: '123',
      targetFieldTouched: true, targetFieldError: '', ruleValidationState: RuleValidationState.None, cleaningRuleError: '', cleaningRuleTouched: false, data: {}
    }
  ];
  const step1DataSample: Step1Data = {
    dataStoreName: '',
    dataEndpoint: '',
    requestMethod: { name: 'GET', code: 'GET' }, // 假資料
    requestParameters: '',
    dataFormate: { name: 'JSON', code: 'JSON' },
    interval: { name: '5m', code: '5m' },
    dataProcessingMethod: 'append',
    authMethod: 'Basic', // 預設使用 Basic 認證
    apiKey: '',
    username: '',
    password: '',
    testApiConnection: false
  };
  const apiDataSample = {
    data: [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' }
    ],
    totalCount: 2
  };
  const clearAll = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('在預覽資料尚未取得時顯示載入 Skeleton，且 Save 按鈕為禁用狀態', async () => {
    // 預覽資料載入中：previewData 為 null, loading 為 true
    (usePreviewData as jest.Mock).mockReturnValue({ previewData: null, loading: true });
    await act(async () => {
      render(<DataPreview fieldMappings={fieldMappingsSample} step1Data={step1DataSample} apiData={apiDataSample} clearAll={clearAll} />);
    });
    // 載入時應顯示 Skeleton (透過 class 判斷)
    expect(document.querySelector('.p-skeleton')).toBeInTheDocument();
    // "Save" 按鈕應為 disabled，"Cancel" 按鈕可用
    const saveButton = screen.getByRole('button', { name: 'Save' });
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    expect(saveButton).toBeDisabled();
    expect(cancelButton).toBeEnabled();
  });

  it('點擊 Cancel 按鈕應彈出清空確認對話框，點擊對話框取消按鈕僅關閉對話框', async () => {
    // 模擬已有預覽資料顯示，確保按鈕可用
    (usePreviewData as jest.Mock).mockReturnValue({ previewData: { foo: 'bar' }, loading: false });
    await act(async () => {
      render(<DataPreview fieldMappings={fieldMappingsSample} step1Data={step1DataSample} apiData={apiDataSample} clearAll={clearAll} />);
    });
    // 點擊 Cancel 按鈕，應顯示 Clear all data 確認對話框
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    });
    expect(screen.getByText('Clear all data')).toBeInTheDocument();
    // 對話框內包含 Confirm 和 Cancel 按鈕
    const dialog = screen.getByTestId('dialog');

    const dialogCancelBtn = within(dialog).getByRole('button', { name: 'Cancel',  });  // 對話框內 Cancel
    const dialogConfirmBtn = screen.getByRole('button', { name: 'Confirm' });
    expect(dialogConfirmBtn).toBeInTheDocument();
    // 點擊對話框 Cancel 按鈕
    await act(async () => {
      fireEvent.click(dialogCancelBtn);
    });
    // 對話框應關閉，且未呼叫 clearAll 或 history.push
    await waitFor(() => {
      expect(screen.queryByText('Clear all data')).toBeNull();
    });
    expect(clearAll).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('點擊確認清空 (Confirm) 按鈕應呼叫 clearAll 並導向回主頁', async () => {
    (usePreviewData as jest.Mock).mockReturnValue({ previewData: { foo: 'bar' }, loading: false });
    await act(async () => {
      render(<DataPreview fieldMappings={fieldMappingsSample} step1Data={step1DataSample} apiData={apiDataSample} clearAll={clearAll} />);
    });
    // 開啟清空確認對話框
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    });
    // 點擊 Confirm 按鈕清空
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    });
    // 應呼叫 clearAll 函式並跳轉頁面
    expect(clearAll).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith('/dataHub/load-data');
  });

  it('點擊 Save 按鈕後成功儲存時，呼叫 API 並跳轉頁面', async () => {
    (usePreviewData as jest.Mock).mockReturnValue({ previewData: { foo: 'bar' }, loading: false });
    // 設定 saveDataStore 回傳 resolved Promise
    (dataIngestionService.saveDataStore as jest.Mock).mockResolvedValueOnce({});
    await act(async () => {
      render(<DataPreview fieldMappings={fieldMappingsSample} step1Data={step1DataSample} apiData={apiDataSample} clearAll={clearAll} />);
    });
    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeEnabled();
    // 點擊 Save 儲存
    await act(async () => {
      fireEvent.click(saveButton);
    });
    // 應呼叫 dataIngestionService.saveDataStore，帶入 step1Data 及 fieldMappings
    expect(dataIngestionService.saveDataStore).toHaveBeenCalledWith(step1DataSample, fieldMappingsSample);
    // 等待儲存 Promise 完成後，自動跳轉回主頁
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dataHub/load-data');
    });
    // 確認未顯示任何錯誤訊息
    expect(screen.queryByText('Save Failed')).toBeNull();
  });

  it('點擊 Save 按鈕後儲存失敗時，應顯示錯誤訊息 Toast，且不跳轉頁面', async () => {
    (usePreviewData as jest.Mock).mockReturnValue({ previewData: { foo: 'bar' }, loading: false });
    // 模擬 saveDataStore 拋出錯誤 reject
    (dataIngestionService.saveDataStore as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });  // 攔截 console.error 輸出
    await act(async () => {
      render(<DataPreview fieldMappings={fieldMappingsSample} step1Data={step1DataSample} apiData={apiDataSample} clearAll={clearAll} />);
    });
    // 點擊 Save
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });
    // 確認 saveDataStore 有被呼叫
    expect(dataIngestionService.saveDataStore).toHaveBeenCalledWith(step1DataSample, fieldMappingsSample);
    // 等待錯誤 Promise 完成
    await waitFor(() => {
      // 應呼叫 console.error 列印錯誤
      expect(consoleErrorSpy).toHaveBeenCalledWith('Save Error:', expect.any(Error));
    });
    // Toast 顯示錯誤訊息（以錯誤摘要翻譯文字判斷）
    expect(screen.getByText('Save Failed')).toBeInTheDocument();
    expect(screen.getByText('API Connection Error')).toBeInTheDocument();
    // 不應跳轉頁面
    expect(pushMock).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
