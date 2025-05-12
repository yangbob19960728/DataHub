import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import ConnectionSetup from './ConnectionSetup';
import { Step1Data, Step1Errors, Step1Touched } from '../../contexts/dataIngestionContext';

// 🔧 模擬 useConnectionSetup hook，以控制連線測試過程中的狀態變化
jest.mock('../../hooks/useConnectionSetup', () => ({ useConnectionSetup: jest.fn() }));
import { useConnectionSetup } from '../../hooks/useConnectionSetup';
import { AUTH_METHOD_OPTIONS, DATA_FORMAT_OPTIONS, DATA_PROCESSING_METHODS, INTERVAL_OPTIONS, REQUEST_METHOD_OPTIONS } from '../../constants/dropdownOptions';

// 🔧 模擬 i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'testApiConnection': 'Test Connection',
        'actions.ok': 'OK'
      };
      return translations[key] || key;
    }
  })
}));

describe('ConnectionSetup 元件', () => {
  const baseStep1Data: Step1Data = {
    dataStoreName: '',
    dataEndpoint: '',
    requestMethod: REQUEST_METHOD_OPTIONS[0], // 假資料
    requestParameters: '',
    dataFormate: DATA_FORMAT_OPTIONS[0], // 假資料
    interval: INTERVAL_OPTIONS[1],
    dataProcessingMethod: DATA_PROCESSING_METHODS[1].code,
    authMethod: AUTH_METHOD_OPTIONS[0].code, // 預設使用 Basic 認證
    apiKey: '',
    username: '',
    password: '',
    testApiConnection: false
  };
  const baseStep1Errors: Step1Errors = {
    dataStoreName: '', dataEndpoint: '', apiKey: '', username: '', password: '', testApiConnection: ''
  };
  const baseStep1Touched: Step1Touched = {
    dataStoreName: false, dataEndpoint: false, apiKey: false, username: false, password: false, testApiConnection: false
  };

  const setStep1Data = jest.fn();
  const setStep1Errors = jest.fn();
  const setStep1Touched = jest.fn();
  const setApiData = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('在初始狀態下，當 isEnabledTestApiConnection 為 false 時，"Test Connection" 按鈕應為禁用', async () => {
    // 模擬 useConnectionSetup 回傳初始值（未點擊測試連線）
    (useConnectionSetup as jest.Mock).mockReturnValue({
      loading: false,
      apiError: null,
      apiDialogVisible: false,
      testConnection: jest.fn(),
      closeApiDialog: jest.fn()
    });
    // isEnabledTestApiConnection=false 時按鈕 disabled
    const props = {
      step1Data: { ...baseStep1Data },
      step1Errors: { ...baseStep1Errors, dataEndpoint: '錯誤' }, // 有錯誤代表不可按測試
      step1Touched: { ...baseStep1Touched },
      isEnabledTestApiConnection: false,
      setStep1Data, setStep1Errors, setStep1Touched,
      setApiData, apiData: null
    };

    await act(async () => {
      render(<ConnectionSetup {...props} />);
    });
    const testButton = screen.getByRole('button', { name: 'Test Connection' });
    expect(testButton).toBeDisabled();
  });

  it('當必填欄位皆正確時，"Test Connection" 按鈕應可使用並點擊後調用 testConnection 函式', async () => {
    const testConnectionMock = jest.fn();
    const closeApiDialogMock = jest.fn();
    // 所有欄位無錯誤，按鈕應該可點擊
    (useConnectionSetup as jest.Mock).mockReturnValue({
      loading: false,
      apiError: null,
      apiDialogVisible: false,
      testConnection: testConnectionMock,
      closeApiDialog: closeApiDialogMock
    });
    const props = {
      step1Data: { ...baseStep1Data },
      step1Errors: { ...baseStep1Errors },  // 無任何錯誤
      step1Touched: { ...baseStep1Touched },
      isEnabledTestApiConnection: true,
      setStep1Data, setStep1Errors, setStep1Touched,
      setApiData, apiData: null
    };

    await act(async () => {
      render(<ConnectionSetup {...props} />);
    });
    const testButton = screen.getByRole('button', { name: 'Test Connection' });
    expect(testButton).toBeEnabled();
    // 🔍 驗證點擊按鈕會呼叫 hook 提供的 testConnection 函式
    await act(async () => {
      fireEvent.click(testButton);
    });
    expect(testConnectionMock).toHaveBeenCalled();
  });

  it('點擊 "Test Connection" 後成功取得資料，應顯示結果對話框且無錯誤訊息', async () => {
    const testConnectionMock = jest.fn();
    const closeApiDialogMock = jest.fn();
    // 初次渲染前，設定 testConnection 尚未執行，對話框未顯示
    (useConnectionSetup as jest.Mock).mockReturnValue({
      loading: false,
      apiError: null,
      apiDialogVisible: false,
      apiData: null,
      testConnection: testConnectionMock,
      closeApiDialog: closeApiDialogMock
    });
    const props = {
      step1Data: { ...baseStep1Data },
      step1Errors: { ...baseStep1Errors },
      step1Touched: { ...baseStep1Touched },
      isEnabledTestApiConnection: true,
      setStep1Data, setStep1Errors, setStep1Touched,
      setApiData, apiData: null
    };
    let rerender: any;
    await act(async () => {
      const renderResult = render(<ConnectionSetup {...props} />);
      rerender = renderResult.rerender;
    });
    // 點擊 "Test Connection" 按鈕
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Test Connection' }));
    });
    expect(testConnectionMock).toHaveBeenCalled();

    // 模擬 testConnection 執行後 hook 回傳成功：取得 apiData 且顯示對話框
    const sampleData = { message: 'Success' };
    (useConnectionSetup as jest.Mock).mockReturnValue({
      loading: false,
      apiError: null,
      apiDialogVisible: true,
      apiData: sampleData,
      testConnection: testConnectionMock,
      closeApiDialog: closeApiDialogMock
    });
    // 重新渲染以反映 hook 狀態改變
    await act(async () => {
      rerender(<ConnectionSetup {...props} />);
    });
    // 對話框應該出現，且不應出現錯誤訊息
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByText(/Error/i)).toBeNull();  // 沒有錯誤訊息文字
    // 🔍 點擊對話框中的 OK 按鈕應呼叫關閉函式，並關閉對話框
    const okButton = screen.getByRole('button', { name: 'OK' });
    await act(async () => {
      fireEvent.click(okButton);
    });
    expect(closeApiDialogMock).toHaveBeenCalled();
    
    // 模擬關閉對話框狀態
    (useConnectionSetup as jest.Mock).mockReturnValue({
      loading: false,
      apiError: null,
      apiDialogVisible: false,
      apiData: sampleData,
      testConnection: testConnectionMock,
      closeApiDialog: closeApiDialogMock
    });
    await act(async () => {
      rerender(<ConnectionSetup {...props} />);
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    
    // console.log(screen.getByRole('dialog').style);
    // expect(screen.getByRole('dialog')).toBeNull();  // 對話框已關閉
  });

  it('點擊 "Test Connection" 後若 API 連線失敗，應顯示錯誤訊息對話框', async () => {
    const testConnectionMock = jest.fn();
    const closeApiDialogMock = jest.fn();
    // 初始狀態
    (useConnectionSetup as jest.Mock).mockReturnValue({
      loading: false,
      apiError: null,
      apiDialogVisible: false,
      apiData: null,
      testConnection: testConnectionMock,
      closeApiDialog: closeApiDialogMock
    });
    const props = {
      step1Data: { ...baseStep1Data },
      step1Errors: { ...baseStep1Errors },
      step1Touched: { ...baseStep1Touched },
      isEnabledTestApiConnection: true,
      setStep1Data, setStep1Errors, setStep1Touched,
      setApiData, apiData: null
    };

    await act(async () => {
      render(<ConnectionSetup {...props} />);
    });
    // 執行測試連線
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Test Connection' }));
    });
    expect(testConnectionMock).toHaveBeenCalled();
    // 模擬連線失敗時 hook 狀態：apiError 有訊息，apiDialogVisible=true
    (useConnectionSetup as jest.Mock).mockReturnValue({
      loading: false,
      apiError: 'Failed to connect',
      apiDialogVisible: true,
      apiData: null,
      testConnection: testConnectionMock,
      closeApiDialog: closeApiDialogMock
    });
    await act(async () => {
      render(<ConnectionSetup {...props} />);
    });
    // 對話框應顯示錯誤訊息
    expect(screen.getByText('Failed to connect')).toBeInTheDocument();
    // 點擊 OK 關閉錯誤對話框
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    });
    expect(closeApiDialogMock).toHaveBeenCalled();
  });

  it('輸入欄位變更時應更新 step1Data 與 step1Touched 狀態', async () => {
    (useConnectionSetup as jest.Mock).mockReturnValue({
      loading: false,
      apiError: null,
      apiDialogVisible: false,
      testConnection: jest.fn(),
      closeApiDialog: jest.fn()
    });
    const props = {
      step1Data: { ...baseStep1Data, dataEndpoint: '' },
      step1Errors: { ...baseStep1Errors },
      step1Touched: { ...baseStep1Touched },
      isEnabledTestApiConnection: false,
      setStep1Data, setStep1Errors, setStep1Touched,
      setApiData, apiData: null
    };

    await act(async () => {
      render(<ConnectionSetup {...props} />);
    });
    // 模擬使用者在 "API URL" 輸入欄輸入文字
    const endpointInput = screen.getByPlaceholderText('http(s)://');
    await act(async () => {
      fireEvent.change(endpointInput, { target: { value: 'http://example.com/api' } });
    });
    // 應呼叫 setStep1Data，將 dataEndpoint 更新為輸入值
    expect(setStep1Data).toHaveBeenCalledWith(expect.objectContaining({ dataEndpoint: 'http://example.com/api' }));
    // 應呼叫 setStep1Touched，將 dataEndpoint 的 touched 設為 true
    expect(setStep1Touched).toHaveBeenCalledWith(expect.objectContaining({ dataEndpoint: true }));
  });

  it('切換認證方式 (authMethod) 時應更新 step1Data，並顯示對應的欄位', async () => {
    (useConnectionSetup as jest.Mock).mockReturnValue({
      loading: false,
      apiError: null,
      apiDialogVisible: false,
      testConnection: jest.fn(),
      closeApiDialog: jest.fn()
    });
    const props = {
      step1Data: { ...baseStep1Data },
      step1Errors: { ...baseStep1Errors },
      step1Touched: { ...baseStep1Touched },
      isEnabledTestApiConnection: true,
      setStep1Data, setStep1Errors, setStep1Touched,
      setApiData, apiData: null
    };

    await act(async () => {
      render(<ConnectionSetup {...props} />);
    });
    // 取得認證方式的 radio 按鈕
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toBeChecked();    // 第0個應為 Basic 且勾選
    expect(radios[1]).not.toBeChecked();// 第1個為 API Key/Bearer，未勾選
    // 模擬點擊第二個認證方式 (切換為 Bearer/API Key)
    await act(async () => {
      fireEvent.click(radios[1]);
    });
    // setStep1Data 應被呼叫，authMethod 更新為新的值 (預期為 'Bearer')
    expect(setStep1Data).toHaveBeenCalledWith(expect.objectContaining({ authMethod: expect.stringMatching(/Bearer|API Key/) }));
    // 模擬父層重新給入更新後的 authMethod 屬性並重新渲染
    const newStep1Data = { ...baseStep1Data, authMethod: 'Bearer', username: '', password: '' };
    await act(async () => {
      render(<ConnectionSetup {...props} step1Data={newStep1Data} />);
    });
    // 切換為 Bearer 後，應顯示 API Key 輸入欄位 (id="auth-method-api-key")
    const apiKeyInput = screen.getByTestId('auth-method-api-key');  // 以空值輸入框搜尋
    expect(apiKeyInput).toBeInTheDocument();
    expect(apiKeyInput.getAttribute('id')).toBe('auth-method-api-key');
    // 且 Username/Password 輸入欄位在 Bearer 模式下可省略 (不重複出現或被隱藏)
    // （這裡假定切換後 Username/Password 欄位不再呈現）
    expect(screen.queryByLabelText(/Username/i)).toBeNull();
    expect(screen.queryByLabelText(/Password/i)).toBeNull();
  });
});
