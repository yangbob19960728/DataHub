import React, { createContext, useContext, useState } from 'react';
import { DATA_FORMAT_OPTIONS, REQUEST_METHOD_OPTIONS } from '../constants/dropdownOptions';
import { AuthMethod, DropdownItem, IntegrationDataStoreMode } from '../constants';
import { SaveDataProductPayload } from '../services/dataProductService';

export interface FormData {
    productName: string;
    apiPath: string;
    fullApiPath: string;
    dataFormate: typeof DATA_FORMAT_OPTIONS[number];
    requestMethod: typeof REQUEST_METHOD_OPTIONS[number];
    authMethod: AuthMethod;
    apiKey: string;
    username: string;
    password: string;
    selectedStores: DropdownItem<IntegrationDataStoreMode>[];
    integrationMode: IntegrationDataStoreMode;
    fieldMappings: any[];  // 可根據實際型別調整
    dataProduct:  SaveDataProductPayload['data_product']['data']
}

export const INITIAL_FROM_DATA: FormData = {
    productName: '',
    apiPath: '',
    fullApiPath: '',
    requestMethod: REQUEST_METHOD_OPTIONS[0],
    dataFormate: DATA_FORMAT_OPTIONS[0],
    authMethod: AuthMethod.None,
    apiKey: '',
    username: '',
    password: '',
    selectedStores: [],
    integrationMode: IntegrationDataStoreMode.Single,
    fieldMappings: [],
    dataProduct: []
};
interface DataProductFormDataContextType {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  resetFormData: () => void;
}

const FormDataContext = createContext<DataProductFormDataContextType | undefined>(undefined);

export const FormDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [formData, setFormData] = useState<FormData>({ ...INITIAL_FROM_DATA });

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const resetFormData = () => setFormData({ ...INITIAL_FROM_DATA });

  return (
    <FormDataContext.Provider value={{ formData, updateFormData, resetFormData }}>
      {children}
    </FormDataContext.Provider>
  );
};

export const useFormData = () => {
  const context = useContext(FormDataContext);
  if (!context) {
    throw new Error('useFormData must be used within a FormDataProvider');
  }
  return context;
}
