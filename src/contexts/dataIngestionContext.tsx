import React, { createContext, useContext, useState } from 'react';

export enum DataType {
  String = 'String',
  Number = 'Number',
}

export enum RuleType {
  Empty = '',
  Sum = 'Sum',
  Avg = 'Avg',
  Max = 'Max',
  Min = 'Min',
}
export interface FieldMapping {
  sourceField: string;
  sampleValue: string;
  targetField: string;
  dataType: DataType;
  id: string;
  ruleType: RuleType;
  cleaningRule: string;
  isPK: boolean;
  data: {
    value?: string | number;
    path?: string[];
  };
}

interface DataIngestionContextType {
  fieldMappings: FieldMapping[];
  setFieldMappings: React.Dispatch<React.SetStateAction<FieldMapping[]>>;

  // 可選：封裝常用操作
  addMapping: (mapping: FieldMapping) => void;
  updateFieldMapping: <K extends keyof FieldMapping>(index: number, field: K, value: FieldMapping[K]) => void;
  removeFieldMapping: (index: number) => void;
}

const DataIngestionContext = createContext<DataIngestionContextType | undefined>(undefined);

export const DataIngestionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);

  const addMapping = (mapping: FieldMapping) => {
    setFieldMappings((prev) => [...prev, mapping]);
  };

  const updateFieldMapping = <K extends keyof FieldMapping>(index: number, field: K, value: FieldMapping[K]) => {

    setFieldMappings((prev: FieldMapping[]) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const removeFieldMapping = (index: number) => {
    const updated = [...fieldMappings];
    updated.splice(index, 1);
    setFieldMappings(updated);
  };

  return (
    <DataIngestionContext.Provider
      value={{
        fieldMappings,
        setFieldMappings,
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
