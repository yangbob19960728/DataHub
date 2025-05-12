import React, { useEffect, useRef, useState, } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import monaco from 'monaco-editor';
import { useHistory } from 'react-router-dom';
import { useDataIngestion } from '../../contexts/dataIngestionContext';
import jsonata from 'jsonata';
import { Skeleton } from 'primereact/skeleton';
import axios from 'axios';

import { useTranslation } from 'react-i18next';
import { Button } from 'primereact/button';
import { set } from 'lodash';
import { Dialog } from 'primereact/dialog';

import { Toast } from 'primereact/toast';
import { AUTH_METHOD_OPTIONS, DATA_FORMAT_OPTIONS, DATA_PROCESSING_METHODS, INTERVAL_OPTIONS, REQUEST_METHOD_OPTIONS } from '../../constants/dropdownOptions';

import { Step1Data, FieldMapping as FieldMappingType } from '../../contexts/dataIngestionContext';
import { usePreviewData } from '../../hooks/usePreviewData';
import { dataIngestionService } from '../../services/dataIngestionService';

interface DataPreviewProps {
  fieldMappings: FieldMappingType[];
  step1Data: Step1Data;
  apiData: any;
  clearAll: () => void;
}

const DataPreview: React.FC<DataPreviewProps> = ({ fieldMappings, step1Data, apiData, clearAll }) => {
  const monacoRef = useRef<Monaco | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const { t } = useTranslation();
  const history = useHistory();
  const toast = useRef<Toast>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const { previewData, loading: previewLoading } = usePreviewData(fieldMappings, apiData);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await dataIngestionService.saveDataStore(step1Data, fieldMappings);
      // 儲存成功後導回首頁
      history.push('/dataHub/load-data');
    }
    catch (error: any) {
      console.error('Save Error:', error);
      // 顯示錯誤Toast
      toast.current?.show({
        severity: 'error',
        summary: t('error.saveFailed'),
        detail: (error?.message) ? t('error.apiConnection', {message: error?.message}) : t('error.unknownError'),
        life: 5000,
      });
    }
    finally {
      setSaving(false);
    }
  }
  return (
    <div className='col-10 mx-auto' style={{ height: '500px' }}>
      {previewData !== null ? <div className='border-2 border-solid border-black-alpha-70 h-full'>
        <Editor
          height="100%"
          theme="vs-light"
          defaultLanguage="json"
          defaultValue={JSON.stringify(previewData, null, 2)}
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
      </div>
        : <Skeleton width="100%" height="100%"></Skeleton>
      }
      <div className='flex justify-content-end mt-2'>
        <Button label={t('actions.cancel')} className="p-button-secondary mr-3" onClick={() => setShowClearDialog(true)} />
        <Button label={t('actions.save')} disabled={previewData === null || saving} onClick={handleSave} />
      </div>
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
                  clearAll();
                  
                  setShowClearDialog(false);
                  // 跳轉回首頁
                  history.push('/dataHub/load-data');
                }}
              />
            </div>
          </>
        }
      />
      <Toast ref={toast} />
    </div>
  );
}

export default DataPreview;