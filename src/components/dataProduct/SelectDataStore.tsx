import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MultiSelect } from 'primereact/multiselect';
import { RadioButton } from 'primereact/radiobutton';
import { Button } from 'primereact/button';
import { dataIngestionService } from '../../services/dataIngestionService';
import { Skeleton } from 'primereact/skeleton';
import { useTranslation } from 'react-i18next';
import { DropdownItem, IntegrationDataStoreMode, IntegrationDataStoreModeLabels } from '../../constants';
import { buildOptions } from '../../utils/dropdownBuilder';
import { useFormData } from '../../contexts/dataProductFormDataContext';

interface SelectDataStoreProps {
  onPrev: () => void;
  onNext: () => void;
  showToast: (message: { severity: string; summary: string; detail: string }) => void;
}

const SelectDataStore = ({ onPrev, onNext, showToast }: SelectDataStoreProps) => {
  const { formData, updateFormData } = useFormData();
  console.log('formData?.selectedStores:', formData?.selectedStores);
  const [stores, setStores] = useState(formData?.selectedStores ?? []);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [storesTouched, setStoresTouched] = useState(false);
  const [storesError, setStoresError] = useState('');
  const [dataStoreNames, setDataStoreNames] = useState<DropdownItem<string>[]>([]);
  const { t } = useTranslation();

  const isRadioDisabled = useCallback((selectedNumber: number, type: IntegrationDataStoreMode) => {
    switch (type) {
      case IntegrationDataStoreMode.Single: // Single Output Mode
        return selectedNumber !== 1; // 只有一個資料來源時可選擇
      case IntegrationDataStoreMode.Merge: // Merge Mode
        return selectedNumber < 2; // 至少兩個資料來源時可選擇
      default:
        break;
    }
  }, []);
  const getIntegrationModeOptions = useMemo(() => buildOptions<IntegrationDataStoreMode>(IntegrationDataStoreModeLabels, t), [t]);
  useEffect(() => {
    // 根據已選擇的來源數量，自動設定整合模式
    const count = formData.selectedStores.length;
    let newMode = formData.integrationMode;
    if (count <= 1) {
      newMode = IntegrationDataStoreMode.Single; // 單一來源時，預設為 Single Output Mode
    } else if (count >= 2) {
      // 當選擇兩筆以上資料來源，使用 Merge 模式（Join 預留，但目前不開放顯示）
      newMode = IntegrationDataStoreMode.Merge;
    }
    updateFormData({ integrationMode: newMode });
    // 驗證錯誤更新
    setStoresError(count === 0 ? t('validation.invalidStoreError') : '');
  }, [formData.selectedStores]);
  useEffect(() => {
    const fetchDataStoreNames = async () => {
      setLoading(true);
      try {
        const list = await dataIngestionService.getJobsList();
        console.log('Fetched data store names:', list);
        // 取得資料來源名稱
        setDataStoreNames(list.map(item => ({ name: item.job_name, code: item.job_name })));
        setApiError('');

      } catch (error) {
        console.error('Failed to fetch data store names:', error);
        // 顯示錯誤訊息
        setApiError(t('error.apiConnection'));
        // showToast
        showToast({
          severity: 'error',
          summary: t('error.apiConnection'),
          detail: (error?.message) ? t('error.apiConnectionErrorMessage', { message: error?.message }) : t('error.unknownError'),
        });
      } finally {
        // 清除錯誤狀態
        setLoading(false);
        setStoresError('');
      }
    }
    fetchDataStoreNames();
  }, []);
  const requiredStyle = {
    color: 'var(--red-400)',
  };
  // 當 MultiSelect 選擇變更
  const onStoresChange = useCallback((e) => {
    const value = e.value;
    if (!storesTouched) {
      setStoresTouched(true);
    }
    // 限制最多選擇3筆
    if (value.length > 3) {
      return;
    }
    // setStores(value);
    updateFormData({ selectedStores: value });
  }, [updateFormData]);

  const isStepValid = () => {
    return formData.selectedStores.length > 0;
  };

  const handleNext = () => {
    // 驗證資料
    if (!isStepValid()) {
      return
    }
    onNext();
  };

  if (loading) {
    return (
      <>
        <Skeleton width='200px' height='2rem' />
        <Skeleton width='100%' height='2rem' className='mt-2' />
        <Skeleton width='100%' height='500px' className='mt-2' />
      </>)
  }
  if (apiError) {
    return (
      <div className='p-error'>{apiError}</div>
    )
  }
  return (
    <div>
      <h3 className="mb-3">Select Data Store</h3>
      <p className="mb-4">Select one or up to three data sources, and choose how to integrate them.</p>
      <div className='p-fluid'>
        <div className="field mb-4">
          <label htmlFor="data-sources">
            <span style={requiredStyle}>*</span>
            Data Sources
          </label>
          <div className="col-12">
            <MultiSelect id="data-sources" value={formData.selectedStores} options={dataStoreNames} onChange={onStoresChange} showSelectAll={false}
              optionLabel="name" placeholder="Choose data source(s)" display="chip"
              maxSelectedLabels={3} />
            {storesTouched && storesError && <small className="p-error">{storesError}</small>}
          </div>
        </div>
        <div className="field mb-4">
          <label htmlFor="integration-mode">
            <span style={requiredStyle}>*</span>
            Data Integration Mode
          </label>
          {/* 單選 RadioButton 切換模式 */}
          <div className='col'>
            {getIntegrationModeOptions.map((option) => (
              <div key={option.code} className='mb-2'>
                <RadioButton inputId={`mode-${option.code}`} name="mode" value={option.code} onChange={(e) => { updateFormData({ integrationMode: e.value }); }}
                  checked={option.code === formData.integrationMode} disabled={isRadioDisabled(stores.length, option.code)} />
                <label htmlFor={`mode-${option.code}`} className={stores.length !== 1 ? 'ml-2 text-secondary' : 'ml-2'}>
                  {option.name}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-5 flex justify-content-between">
        <Button label="Previous" icon="pi pi-arrow-left" className="p-button-secondary" onClick={onPrev} />
        <Button label="Next" icon="pi pi-arrow-right" iconPos="right" disabled={!isStepValid()} onClick={handleNext} />
      </div>
    </div>
  );
};

export default SelectDataStore;
