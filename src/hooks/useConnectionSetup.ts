import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Step1Data, Step1Errors, Step1Touched } from '../contexts/dataIngestionContext';
import { dataIngestionService } from '../services/dataIngestionService';
import { validateStep1Data } from '../utils/validationUtils';

interface UseConnectionSetupParams {
  step1Data: Step1Data;
  setStep1Data: (data: Step1Data) => void;
  step1Errors: Step1Errors;
  setStep1Errors: React.Dispatch<React.SetStateAction<Step1Errors>>;
  step1Touched: Step1Touched;
  setStep1Touched: React.Dispatch<React.SetStateAction<Step1Touched>>;
  setApiData: (data: any) => void;
}

export function useConnectionSetup({
  step1Data,
  setStep1Data,
  step1Errors,
  setStep1Errors,
  step1Touched,
  setStep1Touched,
  setApiData
}: UseConnectionSetupParams) {
  const { t } = useTranslation();
  const [existingDataStoreNames, setExistingDataStoreNames] = useState<string[]>([]);
  const [apiDialogVisible, setApiDialogVisible] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch existing Data Store names on mount
  useEffect(() => {
    dataIngestionService.getExistingNames()
      .then(names => setExistingDataStoreNames(names))
      .catch(error => {
        console.error('Failed to fetch data store names:', error);
        setExistingDataStoreNames([]);
      });
  }, []);

  // Validate Step 1 fields whenever input changes or existing names list updates
  useEffect(() => {
    const errors = validateStep1Data(step1Data, existingDataStoreNames);
    setStep1Errors(prevErrors => {
      let changed = false;
      for (const key in errors) {
        if (errors[key as keyof Step1Errors] !== prevErrors[key as keyof Step1Errors]) {
          changed = true;
          break;
        }
      }
      return changed ? errors : prevErrors;
    });
  }, [step1Data, existingDataStoreNames, setStep1Errors]);

  // Reset testApiConnection flag if any relevant field changes after a successful test
  useEffect(() => {
    if (step1Data.testApiConnection) {
      setStep1Data({ ...step1Data, testApiConnection: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    step1Data.dataEndpoint,
    step1Data.requestMethod,
    step1Data.authMethod,
    step1Data.apiKey,
    step1Data.username,
    step1Data.password,
    step1Data.requestParameters
  ]);

  const testConnection = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const data = await dataIngestionService.testApiConnection(step1Data);
      setApiData(data);
      setStep1Data({ ...step1Data, testApiConnection: true });
      setApiDialogVisible(true);
    } catch (error: any) {
      console.error('API connection test failed:', error);
      setApiData(null);
      setStep1Data({ ...step1Data, testApiConnection: false });
      setStep1Errors(prev => ({ ...prev, testApiConnection: t('testApiConnection.failure') }));
      setApiError(t('error.apiConnection', { message: error.message }));
      setApiDialogVisible(true);
    } finally {
      setLoading(false);
      setStep1Touched(prev => ({ ...prev, testApiConnection: true }));
    }
  };

  const closeApiDialog = () => setApiDialogVisible(false);

  return {
    loading,
    apiError,
    apiDialogVisible,
    testConnection,
    closeApiDialog
  };
}
