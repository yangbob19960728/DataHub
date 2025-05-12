import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  REQUEST_METHOD_OPTIONS,
  INTERVAL_OPTIONS,
  DATA_FORMAT_OPTIONS,
  DATA_PROCESSING_METHODS,
  AUTH_METHOD_OPTIONS,
} from '../constants/dropdownOptions';
import { debounce, DebouncedFunc } from 'lodash';
import { useTranslation } from 'react-i18next';
import FieldMapping from '../components/dataIngestion/FieldMapping';
import { validateJsonataExpression, validateStep1Data, validateFieldMappings } from '../utils/validationUtils';

export enum DataType {
  String = 'string',
  Number = 'number',
  Null = 'null',
}

export enum RuleType {
  Empty = '',
  Sum = 'Sum',
  Avg = 'Avg',
  Max = 'Max',
  Min = 'Min',
  Len = 'Len',
  UpperCase = 'UpperCase',
  LowerCase = 'LowerCase',
  Trim = 'Trim',
}
export enum RuleValidationState {
  Success = 'success',
  Error = 'error',
  None = '',
  Loading = 'loading'
}
export interface FieldMapping {
  sourceField: string;
  sampleValue: any;
  targetField: string;
  dataType: DataType;
  id: string;
  ruleType: RuleType;
  cleaningRule: string;
  isPK: boolean;
  data: {
    value?: any;
    path?: string[];
  };
  targetFieldTouched: boolean;
  targetFieldError: string;
  ruleValidationState: RuleValidationState;
  cleaningRuleError: string;
  cleaningRuleTouched: boolean;
}

export interface Step1Data {
  dataStoreName: string;
  dataEndpoint: string;
  requestMethod: typeof REQUEST_METHOD_OPTIONS[number];
  requestParameters?: string;
  dataFormate: typeof DATA_FORMAT_OPTIONS[number];
  interval: typeof INTERVAL_OPTIONS[number];
  dataProcessingMethod: typeof DATA_PROCESSING_METHODS[number]['code'];
  authMethod: typeof AUTH_METHOD_OPTIONS[number]['code'];
  apiKey: string;
  username: string;
  password: string;
  testApiConnection: boolean;
}

export interface Step1Errors {
  dataStoreName: string;
  dataEndpoint: string;
  apiKey: string;
  username: string;
  password: string;
  testApiConnection: string;
}
export interface Step1Touched {
  dataStoreName: boolean;
  dataEndpoint: boolean;
  apiKey: boolean;
  username: boolean;
  password: boolean;
  testApiConnection: boolean;
}

interface DataIngestionContextType {
  apiData: any;
  setApiData: React.Dispatch<React.SetStateAction<any>>;
  fieldMappings: FieldMapping[];
  setFieldMappings: React.Dispatch<React.SetStateAction<FieldMapping[]>>;
  updateFieldPK: (index: number, value: boolean) => void;
  step1Data: Step1Data;
  setStep1Data: (data: Step1Data) => void;
  step1Errors: Step1Errors;
  setStep1Errors: (errors: Step1Errors) => void;
  validateStep1Field: DebouncedFunc<(data: Step1Data, existingDataStoreNames: string[]) => void>;
  validateStep2Field: DebouncedFunc<(fieldMappings: FieldMapping[]) => void>;
  isStep1Valid: boolean;
  isStep2Valid: boolean;
  isStep3Valid: boolean;
  isEnabledTestApiConnection: boolean;
  step1Touched: Step1Touched;
  setStep1Touched: (touched: Step1Touched) => void;
  addMapping: (mapping: FieldMapping) => void;
  updateFieldMapping: <K extends keyof FieldMapping>(index: number, field: K, value: FieldMapping[K]) => void;
  removeFieldMapping: (index: number) => void;
}

export const INITIAL_STEP1_DATA: Step1Data = {
  dataStoreName: '',
  dataEndpoint: '',
  requestMethod: REQUEST_METHOD_OPTIONS[0],
  dataFormate: DATA_FORMAT_OPTIONS[0],
  interval: INTERVAL_OPTIONS[1],
  dataProcessingMethod: DATA_PROCESSING_METHODS[0].code,
  requestParameters: '',
  authMethod: AUTH_METHOD_OPTIONS[0].code,
  apiKey: '',
  username: '',
  password: '',
  testApiConnection: false,
};

const DataIngestionContext = createContext<DataIngestionContextType | undefined>(undefined);

export const DataIngestionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [apiData, setApiData] = useState<any>(null);
  const [step1Data, setStep1Data] = useState<Step1Data>({ ...INITIAL_STEP1_DATA });
  const [step1Errors, setStep1Errors] = useState<Step1Errors>({
    dataStoreName: '',
    dataEndpoint: '',
    apiKey: '',
    username: '',
    password: '',
    testApiConnection: '',
  });
  const [step1Touched, setStep1Touched] = useState<Step1Touched>({
    dataStoreName: false,
    dataEndpoint: false,
    apiKey: false,
    username: false,
    password: false,
    testApiConnection: false,
  });
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const addMapping = (mapping: FieldMapping) => {
    setFieldMappings((prev) => [...prev, mapping]);
  };

  const updateFieldMapping = <K extends keyof FieldMapping>(index: number, field: K, value: FieldMapping[K]) => {
    setFieldMappings((prev: FieldMapping[]) => {
      const updated = [...prev];
      const updatedItem = { ...updated[index], [field]: value };

      // 僅針對 targetField 驗證（即時處理）
      if (field === 'targetField') {
        const allTargetFields = updated.map((m) => m.targetField);
        const isEmpty = !(value as FieldMapping['targetField']).trim();
        const isDuplicate = allTargetFields.some((v, i) => i !== index && v === value);
        updatedItem.targetFieldError = isEmpty
          ? t("validation.requiredField")
          : isDuplicate
            ? t("validation.duplicateField")
            : '';
      }
      if (field === 'cleaningRule') {
        updatedItem.ruleValidationState = RuleValidationState.Loading;
        validateCleaningRule(index, value as FieldMapping['cleaningRule'], apiData);
        updatedItem.cleaningRuleTouched = true;
        updatedItem.cleaningRuleError = (value as FieldMapping['cleaningRule']).trim() === '' && updatedItem.id === '' ? t("validation.requiredField") : '';
      }

      updated[index] = updatedItem;
      return updated;
    });
  };

  const removeFieldMapping = (index: number) => {
    const updated = [...fieldMappings];
    const removed = updated.splice(index, 1)[0];
    if (removed?.isPK && updated.length > 0) {
      updated[0] = { ...updated[0], isPK: true };
    }
    setFieldMappings(updated);
  };

  const updateFieldPK = (index: number, value: boolean) => {
    setFieldMappings((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          return { ...item, isPK: value };
        }
        // PK 只能有一個，其他的設為 false
        return value ? { ...item, isPK: false } : item;
      })
    );
  }

  const validateStep1Field = useCallback(debounce((data: Step1Data, existingNames: string[]) => {
    const errors = validateStep1Data(data, existingNames);
    setStep1Errors(prev => {
      const changed = Object.keys(errors).some(key => errors[key as keyof Step1Errors] !== prev[key as keyof Step1Errors]);
      return changed ? errors : prev;
    });
  }, 300), []);
  const validateStep2Field = useCallback(debounce(() => {
    setFieldMappings(prev => validateFieldMappings(prev));
  }, 300), []);

  const isEnabledTestApiConnection = useMemo(() => {
    return Object.entries(step1Errors).filter(([key]) => key !== 'testApiConnection').every(([, value]) => !value);
  }, [step1Errors]);
  const isStep1Valid = useMemo(() => {
    const hasError = Object.values(step1Errors).some(e => !!e);
    return !hasError && step1Data.testApiConnection;
  }, [step1Errors, step1Data.testApiConnection]);

  const isStep2Valid = useMemo(() => {
    return fieldMappings.length > 0 && fieldMappings.every(f => f.targetFieldError === '' && f.targetFieldTouched);
  }, [fieldMappings]);
  const isStep3Valid = useMemo(() => {
    return fieldMappings.every(m => {
      return m.ruleValidationState !== RuleValidationState.Error && m.ruleValidationState !== RuleValidationState.Loading && (m.id === '' && m.cleaningRuleTouched && m.cleaningRuleError === '' || m.id !== '')
    }) && fieldMappings.filter(m => m.isPK).length === 1;
  }, [fieldMappings]);
  const validateCleaningRule = useCallback(debounce(async (index: number, expression: string, apiData: any) => {
    const isValid = await validateJsonataExpression(expression, apiData);
    setFieldMappings((prev) => {
      const updated = [...prev];
      const oldItem = updated[index];
      updated[index] = {
        ...oldItem,
        ruleValidationState: isValid,
        cleaningRuleError: (isValid === RuleValidationState.Error) ? t('validation.jsonataSyntax') : isValid === RuleValidationState.Success ? '' : oldItem.cleaningRuleError,
      };
      return updated;
    });
  }, 300), []);
  return (
    <DataIngestionContext.Provider
      value={{
        apiData,
        setApiData,
        fieldMappings,
        updateFieldPK,
        setFieldMappings,
        step1Data,
        setStep1Data,
        step1Errors,
        setStep1Errors,
        validateStep1Field,
        validateStep2Field,
        isStep1Valid,
        isStep2Valid,
        isStep3Valid,
        isEnabledTestApiConnection,
        step1Touched,
        setStep1Touched,
        addMapping,
        updateFieldMapping,
        removeFieldMapping
      }}
    >
      {children}
    </DataIngestionContext.Provider>
  );
};

export const useDataIngestion = (): DataIngestionContextType => {
  const context = useContext(DataIngestionContext);
  if (!context) {
    throw new Error('useDataIngestion must be used within a DataIngestionProvider');
  }
  return context;
};
