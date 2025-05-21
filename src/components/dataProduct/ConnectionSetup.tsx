// ConnectionSetup.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { AUTH_METHOD_OPTIONS, DATA_FORMAT_OPTIONS, REQUEST_METHOD_OPTIONS } from '../../constants/dropdownOptions';
import { FormDataTouched } from '../../pages/CreateDataProduct';
import { useTranslation } from 'react-i18next';
import { RadioButton } from 'primereact/radiobutton';
import { Password } from 'primereact/password';
import { debounce } from 'lodash';
import { dataProductService } from '../../services/dataProductService';
import { Skeleton } from 'primereact/skeleton';
import copy from 'copy-to-clipboard';
import { FormData, useFormData } from '../../contexts/dataProductFormDataContext';
import { validateApiKey, validatePassword, validatePath, validateProductDataName, validateUsername } from '../../utils/dataProduct/validationUtils';

interface ConnectionSetupProps {
  onNext: () => void;
  showToast: (message: { severity: string; summary: string; detail: string }) => void;
}

export type FormDataError = {
  [i in keyof FormDataTouched]: string;
}

const ConnectionSetup = ({ onNext, showToast }: ConnectionSetupProps) => {
  const { formData, updateFormData } = useFormData();
  const { t } = useTranslation();
  const [existingDataStoreNames, setExistingDataStoreNames] = useState<string[]>([]); // 儲存已存在的資料庫名稱
  const [loading, setLoading] = useState(true); // loading 狀態
  const [apiError, setApiError] = useState(''); // API 錯誤訊息
  const API_PREFIX = process.env.DATA_PRODUCT_API_URL_PREFIX || '/api';
  const [formDataTouched, setFormDataTouched] = useState<FormDataTouched>({
    productName: false,
    apiPath: false,
    apiKey: false,
    username: false,
    password: false,
  });
  const [formDataErrors, setFormDataErrors] = useState<FormDataError>({
    productName: '',
    apiPath: '',
    apiKey: '',
    username: '',
    password: ''
  });
  const [isCopied, setCopied] = useState(false); // 控制複製提示
  // productName: 必填，命名不可重複（這裡只先驗格式），只能中英文數字
  const debouncedValidateProductName = useCallback(debounce((val: string, existingNames: string[], callback?: Function) => {
    const err = validateProductDataName(val, existingNames, t);
    setFormDataErrors(prev => ({ ...prev, productName: err }));
    if (callback) {
      callback();
    }
  }, 500), [t]);
  const debouncedValidatePath = useCallback(debounce((val: string, callback?: Function) => {
    const err = validatePath(val, t);
    setFormDataErrors(prev => ({ ...prev, apiPath: err }));
    if (callback) {
      callback();
    }
  }
    , 500), [t]);
  const debouncedValidateKey = useCallback(debounce((val: string, callback?: Function) => {
    const err = validateApiKey(val, t);
    setFormDataErrors(prev => ({ ...prev, apiKey: err }));
    if (callback) {
      callback();
    }
  }, 500), [t]);
  const debouncedValidateUsername = useCallback(debounce((val: string, callback?: Function) => {
    const err = validateUsername(val, t);
    setFormDataErrors(prev => ({ ...prev, username: err }));
    if (callback) {
      callback();
    }
  }, 500), [t]);

  const debouncedValidatePassword = useCallback(debounce((val: string, callback?: Function) => {
    const err = validatePassword(val, t);
    setFormDataErrors(prev => ({ ...prev, password: err }));
    if (callback) {
      callback();
    }
  }, 500), [t]);
  // 初始化即時驗證狀態
  const init = (formData: FormData, existingNames: string[]) => {
    const errors: FormDataError = {
      productName: validateProductDataName(formData.productName, existingNames, t),
      apiPath: validatePath(formData.apiPath, t),
      apiKey: '',
      username: '',
      password: ''
    };

    if (formData.authMethod === AUTH_METHOD_OPTIONS[1].code) {
      errors.apiKey = validateApiKey(formData.apiKey, t);
    } else if (formData.authMethod === AUTH_METHOD_OPTIONS[2].code) {
      errors.username = validateUsername(formData.username, t);
      errors.password = validatePassword(formData.password, t);
    }
    //初始錯誤狀態
    setFormDataErrors(errors);
  }

  useEffect(() => {
    const getExistingProductNames = async () => {
      try {
        const response = await dataProductService.getExistingProductNames();
        setExistingDataStoreNames(response);
        setApiError('');
        init(formData, response);
      } catch (error) {
        // 顯示錯誤Toast
        showToast({
          severity: 'error',
          summary: t('error.saveFailed'),
          detail: (error?.message) ? t('error.apiConnection', { message: error?.message }) : t('error.unknownError'),
        });
        console.error('Error fetching existing product names:', error);
        setApiError(t('error.apiConnection'));
      } finally {
        setLoading(false);
      }
    }
    getExistingProductNames();
    // 清除debounce 計時器
    return () => {
      debouncedValidateProductName.cancel(); // ✅ 清除 debounce 計時器
      debouncedValidatePath.cancel();
      debouncedValidateKey.cancel();
      debouncedValidateUsername.cancel();
      debouncedValidatePassword.cancel();
    };
  }, []);

  // 當欄位值改變時，同步更新內部狀態與錯誤訊息，並傳回父元件保存
  const onProductNameChange = useCallback((e) => {
    const val = e.target.value;
    updateFormData({ productName: val });  // 更新父狀態
    // 延遲驗證
    debouncedValidateProductName(val, existingDataStoreNames, () => {
      if (!formDataTouched.productName) {
        setFormDataTouched(prev => ({ ...prev, productName: true }));
      }
    });
  }, [debouncedValidateProductName, existingDataStoreNames]);

  const onApiPathChange = useCallback((e) => {
    let val = e.target.value;
    val = val.replace(/\s/g, '').toLowerCase(); // 移除空白 + 小寫
    updateFormData({ apiPath: val, fullApiPath: API_PREFIX + val });
    // 延遲驗證
    debouncedValidatePath(val, () => {
      if (!formDataTouched.apiPath) {
        setFormDataTouched(prev => ({ ...prev, apiPath: true }));
      }
    });
  }, [debouncedValidatePath]);

  const onApiKeyChange = useCallback((e) => {
    const val = e.target.value;
    updateFormData({ apiKey: val });
    // 延遲驗證
    debouncedValidateKey(val, () => {
      if (!formDataTouched.apiKey) {
        setFormDataTouched(prev => ({ ...prev, apiKey: true }));
      }
    });
  }, [debouncedValidateKey]);

  const onUsernameChange = useCallback((e) => {
    const val = e.target.value;
    updateFormData({ username: val });
    // 延遲驗證
    debouncedValidateUsername(val, () => {
      if (!formDataTouched.username) {
        setFormDataTouched(prev => ({ ...prev, username: true }));
      }
    });
  }, [debouncedValidateUsername]);
  const onPasswordChange = useCallback((e) => {
    const val = e.target.value;
    updateFormData({ password: val });

    debouncedValidatePassword(val, () => {
      if (!formDataTouched.password) {
        setFormDataTouched(prev => ({ ...prev, password: true }));
      }
    });  // 延遲驗證
  }, [debouncedValidatePassword]);


  // 產生 API Key 隨機字串 (32 位以上亂數英數組合)
  const generateApiKey = (length: number = 64) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    const result = Array.from(array, byte => chars[byte % chars.length]).join('');

    updateFormData({ apiKey: result });
  };

  const isStepValid = (formData: FormData, error: FormDataError) => {
    let valid: boolean = true;
    switch (formData.authMethod) {
      case AUTH_METHOD_OPTIONS[1].code:
        valid = error.apiKey === ''
        break;
      case AUTH_METHOD_OPTIONS[2].code:
        valid = error.username === '' && error.password === '';
        break;
      default:
        break;
    }
    return error.productName === '' && error.apiPath === '' && valid;
  };

  const handleNext = () => {
    // 點擊 Next 時再次檢查，如有錯誤則不前進
    if (!isStepValid(formData, formDataErrors)) {
      return;
    }
    onNext();  // 沒有錯誤則進入下一步
  };

  const copyUrl = (url) => {
    copy(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const requiredStyle = {
    color: 'var(--red-400)',
  };
  const skeletonStyle = {
    title: {
      width: '200px',
      height: '1.5rem',
    },
    input: {
      width: '100%',
      height: '3.5rem',
    },
  }
  if (loading) {
    return new Array(6).fill(0).map((_, index) => (
      <div className='mt-3' key={index}>
        <Skeleton width={skeletonStyle.title.width} height={skeletonStyle.title.height} />
        <Skeleton className='mt-2' width={skeletonStyle.input.width} height={skeletonStyle.input.height} />
      </div>
    ))
  }
  // 如果有 API 錯誤，顯示錯誤訊息
  if (apiError) {
    return (
      <div className='p-error'>{apiError}</div>
    )
  }
  return (
    <>
      <div className="p-fluid">
        <div className="field mb-4">
          <label htmlFor="productName">
            <span style={requiredStyle}>*</span>
            {t('dataProductForm.productName.label')}
          </label>
          <div className="col">
            <InputText id="productName"
              invalid={formDataTouched.productName && formDataErrors.productName ? true : false}
              value={formData.productName} onChange={onProductNameChange} />
            {formDataTouched.productName && formDataErrors.productName && <small className="p-error">{formDataErrors.productName}</small>}
          </div>

        </div>
        <div className="field mb-4">
          <label htmlFor="apiPath">
            <span style={requiredStyle}>*</span>
            {t('dataProductForm.apiPath.label')}
          </label>
          <div className="col">
            <InputText id="apiPath"
              invalid={formDataTouched.apiPath && formDataErrors.apiPath ? true : false}
              value={formData.apiPath} onChange={onApiPathChange} />
            {formDataTouched.apiPath && formDataErrors.apiPath && <small className="p-error">{formDataErrors.apiPath}</small>}
            {/* Full API URL Preview */}
            <div className="mt-2" style={{ fontSize: '0.9em' }}>
              <strong>{t('dataProductForm.apiPath.fullUrl')}: </strong>
              <code>{API_PREFIX + formData.apiPath}</code>
            </div>
          </div>
        </div>
        <div className="field">
          <label
            className="col-12 mb-0"
          >
            <span style={requiredStyle}>*</span>
            {t('authMethod.label')}
          </label>
          <div className="flex flex-wrap gap-3 col">
            {
              AUTH_METHOD_OPTIONS.map((item, index) => {
                return (
                  <div className="flex align-items-center" key={index}>
                    <RadioButton inputId={item.name} name="authMethod" value={item.code} onChange={(e) => updateFormData({ authMethod: e.value })} checked={formData.authMethod === item.code} />
                    <label htmlFor={item.name} className="ml-2">{t(item.name)}</label>
                  </div>
                )
              })
            }
          </div>
        </div>
        <div>
          {
            formData.authMethod === AUTH_METHOD_OPTIONS[1].code && <div className="field">
              <label
                htmlFor="auth-method-api-key"
                className="col-12 mb-0"
              >
                <span style={requiredStyle}>*</span>
                {t('authMethod.apiKeyValue')}
              </label>
              <div className="col">
                <Password id="auth-method-api-key"
                  data-testid="auth-method-api-key" value={formData.apiKey}
                  invalid={formDataTouched.apiKey && formDataErrors.apiKey ? true : false} onChange={onApiKeyChange}
                  feedback={false} toggleMask />

                <div className="flex mt-2">
                  <div className='flex-none'>
                    <Button style={{ cursor: 'pointer' }} onClick={() => generateApiKey()}>
                      <i className="pi pi-key"></i>
                      <span className='ml-2'>
                        {t('dataProductForm.button.generateNewKey')}
                      </span>
                    </Button>
                  </div>
                  <div className='flex-none ml-2'>
                    <Button style={{ cursor: 'pointer' }} onClick={() => copyUrl(formData.apiKey)}>
                      <i className={`pi  ${isCopied ? 'pi-check' : 'pi-copy'}`}></i>
                      <span className='ml-2'>
                        {t('dataProductForm.button.copy')}
                      </span>
                    </Button>
                  </div>


                </div>
                {formDataTouched.apiKey && formDataErrors.apiKey && <small className="p-error">{formDataErrors.apiKey}</small>}
              </div>
            </div>
          }
        </div>
        <div>
          {
            formData.authMethod === AUTH_METHOD_OPTIONS[2].code &&
            <>
              <div className="field">
                <label
                  htmlFor="auth-method-username"
                  className="col-12 mb-0"
                >
                  <span style={requiredStyle}>*</span>
                  {t('authMethod.username')}
                </label>
                <div className="col">
                  <InputText id="auth-method-username" type="text" value={formData.username}
                    invalid={formDataTouched.username && formDataErrors.username ? true : false}
                    onChange={onUsernameChange} />
                  {formDataTouched.username && formDataErrors.username && <small className="p-error">{formDataErrors.username}</small>}
                </div>
              </div>
              <div className="field">
                <label
                  htmlFor="auth-method-password"
                  className="col-12 mb-0"
                >
                  <span style={requiredStyle}>*</span>
                  {t('authMethod.password')}
                </label>
                <div className="col">
                  <Password id="auth-method-password" type="text" value={formData.password}
                    invalid={formDataTouched.password && formDataErrors.password ? true : false}
                    feedback={false}
                    onChange={onPasswordChange} />
                  {formDataTouched.password && formDataErrors.password && <small className="p-error">{formDataErrors.password}</small>}
                </div>
              </div>
            </>
          }
        </div>
        <div className="field">
          <label htmlFor="data-formate" className='col-12 mb-0'>
            <span style={requiredStyle}>*</span>
            {t('dataFormat')}</label>
          <div className="col-12">
            <Dropdown
              id="data-formate"
              value={formData.dataFormate}
              onChange={(e) => updateFormData({ dataFormate: e.value })}
              options={DATA_FORMAT_OPTIONS}
              optionLabel="name"
            ></Dropdown>
          </div>
        </div>
        <div className="field">
          <label htmlFor="request-method" className='col-12 mb-0'>
            <span style={requiredStyle}>*</span>
            {t('dataProductForm.requestMethod.label')}</label>
          <div className="col-12">
            <Dropdown
              id="request-method"
              value={formData.requestMethod}
              onChange={(e) => updateFormData({ requestMethod: e.value })}
              options={REQUEST_METHOD_OPTIONS}
              optionLabel="name"
            ></Dropdown>
          </div>
        </div>
      </div>
      <div className="mt-5 text-right">
        <Button label="Next" icon="pi pi-arrow-right" iconPos="right" disabled={!isStepValid(formData, formDataErrors)} onClick={handleNext} />
      </div>
    </>
  );
};

export default ConnectionSetup;
