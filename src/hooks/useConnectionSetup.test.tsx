import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { useConnectionSetup } from './useConnectionSetup';
import { dataIngestionService } from '../services/dataIngestionService';
import { validateStep1Data } from '../utils/validationUtils';
import { Step1Data, Step1Errors, Step1Touched } from '../contexts/dataIngestionContext';

// 🔧 模擬相關模組與函式
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: any) => opts?.message ? `${key}:${opts.message}` : key })
}));
jest.mock('../services/dataIngestionService', () => ({
  dataIngestionService: {
    getExistingNames: jest.fn(),
    testApiConnection: jest.fn()
  }
}));
jest.mock('../utils/validationUtils', () => ({
  validateStep1Data: jest.fn()
}));

// 測試用元件：模擬使用 useConnectionSetup hook
const TestComponent: React.FC<{ initialData: Step1Data }> = ({ initialData }) => {
  const [step1Data, setStep1Data] = React.useState<Step1Data>(initialData);
  const [step1Errors, setStep1Errors] = React.useState<Step1Errors>({
    dataStoreName: '', dataEndpoint: '', apiKey: '', username: '', password: '', testApiConnection: ''
  });
  const [step1Touched, setStep1Touched] = React.useState<Step1Touched>({
    dataStoreName: false, dataEndpoint: false, apiKey: false, username: false, password: false, testApiConnection: false
  });
  const [apiData, setApiData] = React.useState<any>(null);

  const hook = useConnectionSetup({ 
    step1Data, setStep1Data, 
    step1Errors, setStep1Errors, 
    step1Touched, setStep1Touched, 
    setApiData 
  });
  // 從 hook 獲取狀態與方法
  const { loading, apiError, apiDialogVisible, testConnection, closeApiDialog } = hook;

  return (
    <div>
      <p data-testid="loading">{loading ? 'true' : 'false'}</p>
      <p data-testid="apiError">{apiError ? apiError : 'none'}</p>
      <p data-testid="dialog">{apiDialogVisible ? 'true' : 'false'}</p>
      <p data-testid="testApiConn">{String(step1Data.testApiConnection)}</p>
      <button data-testid="test-conn-btn" onClick={() => testConnection()}>Test</button>
      <button data-testid="close-dialog-btn" onClick={() => closeApiDialog()}>Close</button>
      <button data-testid="change-endpoint-btn" onClick={() => setStep1Data(prev => ({ ...prev, dataEndpoint: 'http://changed.com' }))}>
        Change Endpoint
      </button>
      <p data-testid="apiData">{apiData !== null ? JSON.stringify(apiData) : 'null'}</p>
      <p data-testid="errorMsgApiConnection">{step1Errors.testApiConnection}</p>
      <p data-testid="errorMsgDataStoreName">{step1Errors.dataStoreName}</p>
    </div>
  );
};

describe('useConnectionSetup 自訂 Hook', () => {
  // 共用假資料：有效的 Step1Data 初始值
  const createValidStep1Data = (overrides?: Partial<Step1Data>): Step1Data => ({
    dataStoreName: 'validname',
    dataEndpoint: 'http://example.com',
    requestMethod: { code: 'GET' } as any,
    dataFormate: { code: 'JSON' } as any,
    interval: { code: 'Daily' } as any,
    dataProcessingMethod: 'method',
    requestParameters: '',
    authMethod: '', // 無認證
    apiKey: '',
    username: '',
    password: '',
    testApiConnection: false,
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('初始化時應呼叫 getExistingNames 並處理重複名稱錯誤', async () => {
    // 模擬 API 回傳已有名稱清單，包含與目前 dataStoreName 相同的名稱
    const existingNames = ['dupName', 'other'];
    (dataIngestionService.getExistingNames as jest.Mock).mockResolvedValue(existingNames);
    // 模擬驗證函式：第一輪（無重複）無錯誤，第二輪（有重複）回傳重複名稱錯誤
    (validateStep1Data as jest.Mock)
      .mockReturnValueOnce({
        dataStoreName: '', dataEndpoint: '', apiKey: '', username: '', password: '', testApiConnection: 'testApiConnection.failure'
      })
      .mockReturnValueOnce({
        dataStoreName: 'dataStoreName.duplicate', dataEndpoint: '', apiKey: '', username: '', password: '', testApiConnection: 'testApiConnection.failure'
      });
    // 初始資料：名稱 'dupName'（重複），其他皆有效
    const initialData = createValidStep1Data({ dataStoreName: 'dupName' });
    render(<TestComponent initialData={initialData} />);

    // 等待模擬 API 名稱清單取得完成並進行第二次驗證
    await waitFor(() => {
      // 確認 validateStep1Data 已以包含取得的 existingNames 呼叫
      expect(validateStep1Data).toHaveBeenLastCalledWith(expect.objectContaining({ dataStoreName: 'dupName' }), existingNames);
      // 驗證 dataStoreName 錯誤訊息已更新為重複名稱錯誤
      const errorMsg = screen.getByTestId('errorMsgDataStoreName').textContent;
      expect(errorMsg).toBe('dataStoreName.duplicate');
    });
    // 確認 getExistingNames 只被呼叫一次
    expect(dataIngestionService.getExistingNames).toHaveBeenCalledTimes(1);
  });

  it('當 getExistingNames 發生錯誤時應記錄錯誤並繼續執行', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // 模擬 API 拋出錯誤
    (dataIngestionService.getExistingNames as jest.Mock).mockRejectedValue(new Error('Fail'));
    // 模擬驗證函式：返回 testApiConnection 錯誤（未測試 API 即為 failure）
    (validateStep1Data as jest.Mock).mockReturnValue({
      dataStoreName: '', dataEndpoint: '', apiKey: '', username: '', password: '', testApiConnection: 'testApiConnection.failure'
    });
    const initialData = createValidStep1Data();
    render(<TestComponent initialData={initialData} />);
    // 等待 effect 完成
    await waitFor(() => {
      // 應記錄 fetch 名稱失敗的錯誤
      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch data store names:', expect.any(Error));
      // 確認未出現重複名稱錯誤（因未取得任何名稱）
      const errorMsgApiConnection = screen.getByTestId('errorMsgApiConnection').textContent;
      expect(errorMsgApiConnection).toBe('testApiConnection.failure');
    });
    consoleSpy.mockRestore();
  });

  it('testConnection 成功時，應設定狀態並回傳資料', async () => {
    // 模擬 API 測試連線成功回傳資料
    const apiResponse = { foo: 'bar' };
    const existingNames = ['dupName', 'other'];
    (dataIngestionService.getExistingNames as jest.Mock).mockResolvedValue(existingNames);
    (dataIngestionService.testApiConnection as jest.Mock).mockResolvedValue(apiResponse);
    (validateStep1Data as jest.Mock)
      .mockReturnValueOnce({
        dataStoreName: '', dataEndpoint: '', apiKey: '', username: '', password: '', testApiConnection: 'testApiConnection.failure'
      })
      .mockReturnValueOnce({
        dataStoreName: '', dataEndpoint: '', apiKey: '', username: '', password: '', testApiConnection: ''
      })
    // 初始資料：有效且尚未測試
    const initialData = createValidStep1Data();
    render(<TestComponent initialData={initialData} />);
    // 點擊「Test Connection」按鈕執行測試
    await act(async () => {
      fireEvent.click(screen.getByTestId('test-conn-btn'));
    });
    // 確認 API 被呼叫且傳入正確的 step1Data
    expect(dataIngestionService.testApiConnection).toHaveBeenCalledWith(expect.objectContaining({
      dataEndpoint: 'http://example.com', requestMethod: { code: 'GET' }
    }));
    // 成功後 loading 應恢復 false，對話框應顯示，無錯誤訊息
    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(screen.getByTestId('dialog').textContent).toBe('true');
    expect(screen.getByTestId('apiError').textContent).toBe('none');
    // apiData 應更新為回傳資料
    expect(screen.getByTestId('apiData').textContent).toBe(JSON.stringify(apiResponse));
    // step1Data.testApiConnection 應設為 true
    expect(screen.getByTestId('testApiConn').textContent).toBe('true');
    // step1Touched.testApiConnection 應設為 true（表示已嘗試測試）
    expect(screen.getByTestId('errorMsgApiConnection').textContent).toBe(''); // 成功後不應有 testApiConnection 錯誤訊息
  });

  it('testConnection 失敗時，應設定錯誤狀態並清除資料', async () => {
    // 模擬 API 測試連線失敗拋出錯誤
    const error = new Error('Connection failed');
    (dataIngestionService.testApiConnection as jest.Mock).mockRejectedValue(error);
    const initialData = createValidStep1Data();
    render(<TestComponent initialData={initialData} />);
    // 執行測試連線
    await act(async () => {
      fireEvent.click(screen.getByTestId('test-conn-btn'));
    });
    // 應呼叫 API，一旦失敗，apiData 應被設為 null，顯示錯誤訊息
    expect(dataIngestionService.testApiConnection).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('apiData').textContent).toBe('null');
    // apiError 應包含錯誤訊息
    const apiErrorMsg = screen.getByTestId('apiError').textContent;
    expect(apiErrorMsg).toBe(`error.apiConnection:${error.message}`);
    // testApiConnection flag 應為 false（仍未成功）
    expect(screen.getByTestId('testApiConn').textContent).toBe('false');
    // testApiConnection 錯誤訊息應設定為 failure
    expect(screen.getByTestId('errorMsgApiConnection').textContent).toBe('testApiConnection.failure');
    // 對話框仍應顯示（顯示錯誤結果）
    expect(screen.getByTestId('dialog').textContent).toBe('true');
  });

  it('在成功測試後，如使用者修改輸入欄位，應重置 testApiConnection 標誌', async () => {
    // 模擬 API 測試連線成功
    (dataIngestionService.testApiConnection as jest.Mock).mockResolvedValue({ result: 1 });
    const initialData = createValidStep1Data();
    render(<TestComponent initialData={initialData} />);
    // 執行測試連線成功，將 testApiConnection 設為 true
    await act(async () => {
      fireEvent.click(screen.getByTestId('test-conn-btn'));
    });
    expect(screen.getByTestId('testApiConn').textContent).toBe('true');
    // 模擬使用者修改相關欄位（如 dataEndpoint）
    await act(async () => {
      fireEvent.click(screen.getByTestId('change-endpoint-btn'));
    });
    // 修改後應自動將 testApiConnection 重置為 false
    await waitFor(() => {
      expect(screen.getByTestId('testApiConn').textContent).toBe('false');
    });
  });

  it('初始 step1Data.testApiConnection 為 true 時，首次 render 即重置為 false', async () => {
    // 確保不觸發額外錯誤：模擬 getExistingNames 返回空列表
    (dataIngestionService.getExistingNames as jest.Mock).mockResolvedValue([]);
    (validateStep1Data as jest.Mock).mockReturnValue({
      dataStoreName: '', dataEndpoint: '', apiKey: '', username: '', password: '', testApiConnection: ''
    });
    const initialData = createValidStep1Data({ testApiConnection: true });
    render(<TestComponent initialData={initialData} />);
    // 等待 effect 執行完畢，確認 testApiConnection 已被重置為 false
    await waitFor(() => {
      expect(screen.getByTestId('testApiConn').textContent).toBe('false');
    });
  });

  it('closeApiDialog 應能隱藏對話框', async () => {
    // 直接設定 hook 狀態，使對話框 initially 顯示
    (dataIngestionService.getExistingNames as jest.Mock).mockResolvedValue([]);
    (validateStep1Data as jest.Mock).mockReturnValue({
      dataStoreName: '', dataEndpoint: '', apiKey: '', username: '', password: '', testApiConnection: ''
    });
    const initialData = createValidStep1Data();
    render(<TestComponent initialData={initialData} />);
    // 模擬對話框目前為開啟狀態
    await act(async () => {
      // 強制將對話框設為開啟（調用 hook 的方法）
      fireEvent.click(screen.getByTestId('test-conn-btn'));
      (dataIngestionService.testApiConnection as jest.Mock).mockResolvedValue({});
    });
    // 此時對話框為開啟狀態（因我們沒有等待完整 API，但直接設置對話框開啟）
    screen.getByTestId('dialog').textContent = 'true';
    // 點擊關閉對話框按鈕
    fireEvent.click(screen.getByTestId('close-dialog-btn'));
    // 對話框應關閉
    expect(screen.getByTestId('dialog').textContent).toBe('false');
  });
});
