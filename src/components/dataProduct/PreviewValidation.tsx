import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { useTranslation } from 'react-i18next';
import { Skeleton } from 'primereact/skeleton';
import Editor, { Monaco } from '@monaco-editor/react';
import { Dialog } from 'primereact/dialog';
import { dataProductService, SaveDataProductPayload, queryDataProductPayload } from '../../services/dataProductService';
import { FormData, useFormData } from '../../contexts/dataProductFormDataContext';
import { AuthMethod } from '../../constants';
import { useHistory } from 'react-router-dom';
import { debounce } from 'lodash';

interface PreviewValidationProps {
    onPrev: () => void;
    showToast: (message: { severity: string; summary: string; detail: string }) => void;
}
const PreviewValidation = ({ onPrev, showToast }) => {
    const { formData, updateFormData, resetFormData } = useFormData();
    const [queryParam, setQueryParam] = useState('');
    const [paramError, setParamError] = useState('');
    const [previewData, setPreviewData] = useState(null);
    const [noDataMessage, setNoDataMessage] = useState('');
    const { t } = useTranslation();
    const [showClearDialog, setShowClearDialog] = useState(false);
    const history = useHistory();
    const [saving, setSaving] = useState(false);
    const [apiError, setApiError] = useState('');
    const [loading, setLoading] = useState(true);
    const validateQueryParam = useCallback((queryParam: string) => {
        // 驗證參數格式 (需為 key=value,value2&key2=value2)
        const reg = /^([^=&#]+)=([^=&#]+(?:,[^=&#]+)*)(?:&([^=&#]+)=([^=&#]+(?:,[^=&#]+)*))*$/;
        if (queryParam && !reg.test(queryParam)) {
            setParamError(t('validation.invalidQueryParameter'));
            return;
        }
        setParamError('');
    }, [queryParam]);

    const debounceValidateQueryParam = useCallback(debounce((queryParam) => {
        validateQueryParam(queryParam);
    }, 300), []);
    const getPreviewData = useCallback(async (params: string, formData: FormData) => {
        setLoading(true);
        // 從FormData中獲取欄位名稱
        const payload: queryDataProductPayload = {
            data_product: {
                name: formData.productName,
                integration_mode: formData.integrationMode,
                data: formData.dataProduct
            }
        }
        try {
            const data = await dataProductService.queryDataProduct(params, payload);
            setApiError('');
            setPreviewData(JSON.stringify(data, null, 2));
        } catch (error) {
            console.log(error)
            showToast({
                severity: 'error',
                summary: t('error.apiConnection'),
                detail: (error?.message) ? t('error.apiConnectionErrorMessage', { message: error?.message }) : t('error.unknownError'),
            });
            setPreviewData(null);
            setApiError(t('error.apiConnection'));
        }
        finally {
            setLoading(false);
        }
    }, [t]);
    useEffect(() => {
        console.log('create previewData');
        getPreviewData(queryParam, formData)
    }, []);


    const onQueryParamChange = (e) => {
        const value = e.target.value;
        setQueryParam(value);
        debounceValidateQueryParam(value);
    }

    // 執行 API 測試請求 (根據 queryParam 重新篩選資料)
    const testApi = async () => {
        await getPreviewData(queryParam, formData);
    };

    // 下載目前預覽資料為 JSON 檔案
    const downloadJson = () => {
        if (!previewData) return;
        const now = new Date();
        const taiwanOffset = now.getTime() + (8 * 60 * 60 * 1000); // UTC+8
        const filename = `data-product-preview_${new Date(taiwanOffset).toISOString().replace(/[-:.]/g, '').slice(0, 15)}.json`;
        const blob = new Blob([previewData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleSave = async () => {
        // 模擬儲存：實際應呼叫後端 API 儲存設定

        try {
            setSaving(true);
            await dataProductService.saveDataProduct({
                api: {
                    request_url: formData.apiPath,
                    request_method: formData.requestMethod.code,
                    authorization_method: formData.authMethod,
                    basic_username: (formData.authMethod === AuthMethod.Basic) ? formData.username : '',
                    basic_password: (formData.authMethod === AuthMethod.Basic) ? formData.password : '',
                    api_token: formData.authMethod === AuthMethod.ApiKey ? formData.apiKey : '',
                },
                data_product: {
                    name: formData.productName,
                    integration_mode: formData.integrationMode,
                    data: formData.dataProduct,
                },
                user_info: {
                    name: 'admin',
                }
            });
            // 儲存成功後導回首頁
            history.push('/dataHub/data-product');
        }
        catch (error: any) {
            console.error('Save Error:', error);
            // 顯示錯誤Toast
            showToast({
                severity: 'error',
                summary: t('error.saveFailed'),
                detail: (error?.message) ? t('error.apiConnection', { message: error?.message }) : t('error.unknownError'),
            });
        }
        finally {
            setSaving(false);
        }
    };

    const handlePre = () => {
        // 把資料更新到 FormData

        onPrev();
    }

    return (
        <div>
            {previewData !== null ? <>
                <div className='mt-5'>
                    <div className="mb-5 flex justify-content-end">
                        <Button label="Download" icon="pi pi-download" className="p-button-help mr-2" onClick={downloadJson} />
                        <Button label={t('testApiConnection')} icon="pi pi-refresh" onClick={testApi} />
                    </div>
                </div>
                <div className='flex flex-column border-solid border-black-alpha-70 border-2 ' style={{ height: '500px' }}>
                    <div className='flex-auto'>
                        <Editor
                            height="100%"
                            theme="vs-light"
                            defaultLanguage="json"
                            value={previewData}
                            options={{
                                readOnly: true,
                                minimap: {
                                    enabled: false,
                                },
                                scrollBeyondLastLine: false,
                                fontSize: 14,
                            }}
                        />
                    </div>
                    <div className="flex-none p-3">
                        <label htmlFor="params">Request Parameters: </label>
                        <InputText id="params" value={queryParam} onChange={onQueryParamChange} className="p-inputtext-sm w-30rem"
                            placeholder="key1=value&key2=value2"
                            tooltip="Example: name=Alpha (use output field names defined as searchable)" tooltipOptions={{ position: 'top' }} />

                        {paramError && <div>
                            <small className="p-error">{paramError}</small></div>}
                    </div>
                </div>
                <div className="mt-3 flex justify-content-between">
                    <div>
                        <Button label="Previous" icon="pi pi-arrow-left" className="p-button-secondary" onClick={handlePre} />
                    </div>
                    <div>
                        <Button label={t('actions.cancel')} className="p-button-secondary mr-3" onClick={() => setShowClearDialog(true)} />
                        <Button label="Save" icon="pi pi-save" disabled={previewData === null || saving} onClick={handleSave} />
                    </div>


                </div>
            </>
                : <Skeleton width="100%" height="100%"></Skeleton>
            }
            <Dialog
                header={t('actions.clearAll')}
                visible={showClearDialog}
                style={{ width: '30vw' }}
                data-testid="dialog"
                onHide={() => setShowClearDialog(false)}
                footer={
                    <>
                        <div className="flex justify-content-between">
                            <Button label={t('actions.cancel')} icon="pi pi-times" onClick={() => setShowClearDialog(false)} className="p-button-text" />
                            <Button
                                label={t('actions.confirm')}
                                icon="pi pi-check"
                                className="p-button-danger"
                                onClick={() => {
                                    // 清除資料
                                    resetFormData();

                                    setShowClearDialog(false);
                                    // 跳轉回首頁
                                    history.push('/dataHub/data-product');
                                }}
                            />
                        </div>
                    </>
                }
            />

        </div>
    );
};

export default PreviewValidation;
