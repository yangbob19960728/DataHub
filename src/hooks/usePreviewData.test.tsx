import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { usePreviewData } from '../hooks/usePreviewData';
import { dataIngestionService } from '../services/dataIngestionService';

// 🔧 模擬 dataIngestionService
jest.mock('../services/dataIngestionService', () => ({
  dataIngestionService: {
    parsePreviewData: jest.fn()
  }
}));

// 測試用元件：使用 usePreviewData hook
const TestPreviewComponent: React.FC<{ fieldMappings: any[], apiData: any }> = ({ fieldMappings, apiData }) => {
  const { previewData, loading, error } = usePreviewData(fieldMappings, apiData);
  return (
    <div>
      <p data-testid="loading">{loading ? 'true' : 'false'}</p>
      <p data-testid="preview">{previewData !== null ? JSON.stringify(previewData) : 'null'}</p>
      <p data-testid="error">{error ? error.message : 'none'}</p>
    </div>
  );
};

describe('usePreviewData 自訂 Hook', () => {
  const sampleMappings = [
    { sourceField: 'a', targetField: 'A', isPK: false, cleaningRule: '', data: { path: ['a'] } },
    { sourceField: 'b', targetField: 'B', isPK: true, cleaningRule: '$.b', data: { path: ['b'] } }
  ];
  const sampleApiData1 = { foo: 1 };
  const sampleApiData2 = { foo: 2 };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('應正確取得預覽資料（成功解析）', async () => {
    const resultData = { preview: 'DATA' };
    // 模擬 parsePreviewData 成功回傳資料
    (dataIngestionService.parsePreviewData as jest.Mock).mockResolvedValue(resultData);
    render(<TestPreviewComponent fieldMappings={sampleMappings} apiData={sampleApiData1} />);
    // 初始時 loading 為 true，預覽資料為 null，錯誤為 none
    expect(screen.getByTestId('loading').textContent).toBe('true');
    expect(screen.getByTestId('preview').textContent).toBe('null');
    expect(screen.getByTestId('error').textContent).toBe('none');
    // 等待解析完成
    const previewElement = await screen.findByTestId('preview');
    // 結束後 loading 應為 false
    expect(screen.getByTestId('loading').textContent).toBe('false');
    // 預覽資料應更新為回傳的結果
    expect(previewElement.textContent).toBe(JSON.stringify(resultData));
    // 錯誤狀態應為 none（無錯誤）
    expect(screen.getByTestId('error').textContent).toBe('none');
    // 確認 parsePreviewData 被呼叫且傳入正確的參數
    expect(dataIngestionService.parsePreviewData).toHaveBeenCalledWith(sampleApiData1, sampleMappings);
  });

  it('應在解析失敗時設定錯誤狀態（error）', async () => {
    const error = new Error('Parse failed');
    // 模擬 parsePreviewData 拋出錯誤
    (dataIngestionService.parsePreviewData as jest.Mock).mockRejectedValue(error);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(<TestPreviewComponent fieldMappings={sampleMappings} apiData={sampleApiData1} />);
    // 等待錯誤處理完成
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    // 錯誤訊息應顯示
    expect(screen.getByTestId('error').textContent).toBe(error.message);
    // 預覽資料仍為 null（解析失敗）
    expect(screen.getByTestId('preview').textContent).toBe('null');
    // 應已記錄錯誤至 console.error
    expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch preview data:', error);
    consoleSpy.mockRestore();
  });

  it('在 fieldMappings 或 apiData 變更時應重新取得預覽資料', async () => {
    // 模擬兩次不同的解析結果
    (dataIngestionService.parsePreviewData as jest.Mock)
      .mockResolvedValueOnce({ val: 1 })
      .mockResolvedValueOnce({ val: 2 });
    const { rerender } = render(<TestPreviewComponent fieldMappings={sampleMappings} apiData={sampleApiData1} />);
    // 等待第一次結果
    await screen.findByText(JSON.stringify({ val: 1 }));
    // 重新渲染組件，改變 apiData
    rerender(<TestPreviewComponent fieldMappings={sampleMappings} apiData={sampleApiData2} />);
    // 等待第二次結果
    await screen.findByText(JSON.stringify({ val: 2 }));
    // 應再次呼叫 parsePreviewData
    expect(dataIngestionService.parsePreviewData).toHaveBeenCalledTimes(2);
    expect(dataIngestionService.parsePreviewData).toHaveBeenLastCalledWith(sampleApiData2, sampleMappings);
  });

  it('組件卸載後應避免更新狀態（isMounted 機制）', async () => {
    // 建立一個可控的 Promise 以模擬延遲
    let resolvePromise: any;
    const pendingPromise = new Promise(resolve => { resolvePromise = resolve; });
    (dataIngestionService.parsePreviewData as jest.Mock).mockReturnValue(pendingPromise);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(<TestPreviewComponent fieldMappings={sampleMappings} apiData={sampleApiData1} />);
    // 在 Promise 尚未 resolved 時即卸載組件
    unmount();
    // 模擬 Promise 解析成功
    await act(async () => {
      resolvePromise({ delayed: 'done' });
    });
    // 確認不會拋出錯誤或進一步設定 state（console.error 未被 React 調用）
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});