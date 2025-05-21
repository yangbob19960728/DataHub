import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Step1Data, useDataIngestion, Step1Errors, Step1Touched } from '../../contexts/dataIngestionContext';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { RadioButton } from 'primereact/radiobutton';
import { useTranslation } from 'react-i18next';
import { Dialog } from 'primereact/dialog';
import Editor, { Monaco } from '@monaco-editor/react';
import { InputTextarea } from 'primereact/inputtextarea';
import { Password } from 'primereact/password';
import { REQUEST_METHOD_OPTIONS, INTERVAL_OPTIONS, DATA_FORMAT_OPTIONS, DATA_PROCESSING_METHODS, AUTH_METHOD_OPTIONS } from '../../constants/dropdownOptions';
import { useConnectionSetup } from '../../hooks/useConnectionSetup';

interface DropdownItem {
  name: string;
  code: string;
}
interface ConnectionSetupProps {
  step1Data: Step1Data;
  step1Errors: Step1Errors;
  step1Touched: Step1Touched;
  isEnabledTestApiConnection: boolean;
  setStep1Data: (data: Step1Data) => void;
  setStep1Errors: React.Dispatch<React.SetStateAction<Step1Errors>>;
  setStep1Touched: React.Dispatch<React.SetStateAction<Step1Touched>>;
  setApiData: (data: any) => void;
  apiData: any;
}
const ConnectionSetup: React.FC<ConnectionSetupProps> = ({
  step1Data,
  step1Errors,
  step1Touched,
  isEnabledTestApiConnection,
  setStep1Data,
  setStep1Errors,
  setStep1Touched,
  setApiData,
  apiData
}) => {
  const { t } = useTranslation();
  const [existingDataStoreNames, setExistingDataStoreNames] = useState<string[]>([]);
  const {
    loading,
    apiError,
    apiDialogVisible,
    testConnection,
    closeApiDialog
  } = useConnectionSetup({
    step1Data,
    setStep1Data,
    step1Errors,
    setStep1Errors,
    step1Touched,
    setStep1Touched,
    setApiData
  });

  const requiredStyle = {
    color: 'var(--red-400)',
  };
  return (
    <>
      <div className="field">
        <label
          htmlFor="data-store-name"
          className="col-12 mb-0"
        >
          <span style={requiredStyle}>*</span>
          {t('dataStoreName')}
        </label>
        <div className="col">
          <InputText id="data-store-name" type="text" value={step1Data.dataStoreName}
            invalid={step1Touched.dataStoreName && step1Errors.dataStoreName ? true : false}
            onChange={(e) => {
              setStep1Data({ ...step1Data, dataStoreName: e.target.value });
              setStep1Touched({ ...step1Touched, dataStoreName: true });
            }} />
          {step1Touched.dataStoreName && step1Errors.dataStoreName && <small className="p-error">{step1Errors.dataStoreName}</small>}
        </div>
      </div>
      <div className="field">
        <label
          htmlFor="data-endpoint"
          className="col-12 mb-0"
        >
          <span style={requiredStyle}>*</span>
          {t('apiSourceConfiguration')}
        </label>
        <div className="grid col">
          <div className="col-2">
            <Dropdown
              id="request-method"
              value={step1Data.requestMethod}
              onChange={(e) => setStep1Data({ ...step1Data, requestMethod: e.value })}
              options={REQUEST_METHOD_OPTIONS}
              optionLabel="name"
            ></Dropdown>
          </div>
          <div className="col-10">
            <InputText id="data-endpoint" type="text" placeholder='http(s)://' value={step1Data.dataEndpoint}
              invalid={step1Touched.dataEndpoint && step1Errors.dataEndpoint ? true : false}
              onChange={(e) => {
                setStep1Data({ ...step1Data, dataEndpoint: e.target.value });
                setStep1Touched({ ...step1Touched, dataEndpoint: true });
              }} />
            {step1Touched.dataEndpoint && step1Errors.dataEndpoint && <small className="p-error">{step1Errors.dataEndpoint}</small>}
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
                  <RadioButton inputId={item.name} name="authMethod" value={item.code} onChange={(e) => setStep1Data({ ...step1Data, authMethod: e.value })} checked={step1Data.authMethod === item.code} />
                  <label htmlFor={item.name} className="ml-2">{t(item.name)}</label>
                </div>
              )
            })
          }
        </div>
      </div>
      <div>
        {
          step1Data.authMethod === AUTH_METHOD_OPTIONS[1].code && <div className="field">
            <label
              htmlFor="auth-method-api-key"
              className="col-12 mb-0"
            >
              <span style={requiredStyle}>*</span>
              {t('authMethod.apiKeyValue')}
            </label>
            <div className="col">
              <InputText id="auth-method-api-key"
              data-testid="auth-method-api-key"
              type="text" value={step1Data.apiKey}
                invalid={step1Touched.apiKey && step1Errors.apiKey ? true : false}
                onChange={(e) => {
                  setStep1Data({ ...step1Data, apiKey: e.target.value });
                  setStep1Touched({ ...step1Touched, apiKey: true });
                }} />
              {step1Touched.apiKey && step1Errors.apiKey && <small className="p-error">{step1Errors.apiKey}</small>}
            </div>
          </div>
        }
      </div>
      <div>
        {
          step1Data.authMethod === AUTH_METHOD_OPTIONS[2].code &&
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
                <InputText id="auth-method-username" type="text" value={step1Data.username}
                  invalid={step1Touched.username && step1Errors.username ? true : false}
                  onChange={(e) => {
                    setStep1Data({ ...step1Data, username: e.target.value });
                    setStep1Touched({ ...step1Touched, username: true });
                  }} />
                {step1Touched.username && step1Errors.username && <small className="p-error">{step1Errors.username}</small>}
              </div>
            </div>
            <div className="field">
              <label
                id="label-auth-method-password"
                htmlFor="auth-method-password"
                className="col-12 mb-0"
              >
                <span style={requiredStyle}>*</span>
                {t('authMethod.password')}
              </label>
              <div className="col">
                <Password id="auth-method-password" aria-labelledby="label-auth-method-password" type="text" value={step1Data.password}
                  invalid={step1Touched.password && step1Errors.password ? true : false}
                  feedback={false}
                  onChange={(e) => {
                    setStep1Data({ ...step1Data, password: e.target.value });
                    setStep1Touched({ ...step1Touched, password: true });
                  }} />
                {step1Touched.password && step1Errors.password && <small className="p-error">{step1Errors.password}</small>}
              </div>
            </div>
          </>
        }
      </div>
      <div className="field">
        <label
          htmlFor="request-parameters"
          className="col-12 mb-0"
        >
          {t('requestParameters')}
        </label>
        <div className="col-12">
          <InputTextarea id="request-parameters" value={step1Data.requestParameters} onChange={(e) => setStep1Data({ ...step1Data, requestParameters: e.target.value })} rows={5} cols={30} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="data-formate" className='col-12 mb-0'>
          <span style={requiredStyle}>*</span>
          {t('dataFormat')}</label>
        <div className="col-12">
          <Dropdown
            id="data-formate"
            value={step1Data.dataFormate}
            onChange={(e) => setStep1Data({ ...step1Data, dataFormate: e.value })}
            options={DATA_FORMAT_OPTIONS}
            optionLabel="name"
          ></Dropdown>
        </div>
      </div>
      <div className='field flex flex-column align-items-end'>
        <div className='flex-none'>
          <Button label={t('testApiConnection')} disabled={loading || !isEnabledTestApiConnection} onClick={(e) => testConnection()} />

        </div>
        <div className='flex-none'>
          {step1Touched.testApiConnection && step1Errors.testApiConnection && <small className="p-error">{step1Errors.testApiConnection}</small>}
        </div>
      </div>
      <div className="field">
        <label
          htmlFor="data-processing-method"
          className="col-12 mb-0"
        >
          <span style={requiredStyle}>*</span>
          {t('dataProcessingMethod.label')}
        </label>
        <div className="flex flex-wrap gap-3 col">
          {
            DATA_PROCESSING_METHODS.map((item, index) => {
              return (
                <div className="flex align-items-center" key={index}>
                  <RadioButton inputId={item.name} name="dataProcessingMethod" value={item.code} onChange={(e) => setStep1Data({ ...step1Data, dataProcessingMethod: e.value })} checked={step1Data.dataProcessingMethod === item.code} />
                  <label htmlFor={item.name} className="ml-2">{t(item.name)}</label>
                </div>
              )
            })
          }
        </div>
      </div>
      <div className="field">
        <label htmlFor="interval" className='col-12 mb-0'>
          <span style={requiredStyle}>*</span>
          {t('interval')}
        </label>
        <div className="col-12">
          <Dropdown
            id="interval"
            value={step1Data.interval}
            onChange={(e) => setStep1Data({ ...step1Data, interval: e.value })}
            options={INTERVAL_OPTIONS}
            optionLabel="name"
          ></Dropdown>
        </div>
      </div>
      <Dialog
        header={t('testApiConnection')}
        visible={apiDialogVisible}
        style={{ width: '60vw', height: '80vh' }}
        closable={false}
        onHide={closeApiDialog}
        data-testid="dialog"
        footer={
          <div className="flex justify-content-end">
            <Button label={t('actions.ok')} onClick={closeApiDialog} raised />
          </div>
        }
      >
        {!loading && apiError && (
          <div className="p-error">{apiError}</div>
        )}
        {!loading && apiData && (
          <Editor
            height="100%"
            theme="vs-light"
            defaultLanguage="json"
            defaultValue={JSON.stringify(apiData, null, 2)}
            className='chart-config-editor'
            options={{
              readOnly: true,
              minimap: {
                enabled: false,
              },
              scrollBeyondLastLine: false,
              fontSize: 14,
            }}
          />
        )}
      </Dialog>
    </>)
};

export default ConnectionSetup;