import * as React from 'react';
import DataTable, { DataTableMode } from './DataTable';
import { FieldMapping as FieldMappingType } from '../../contexts/dataIngestionContext';

interface DataCleaningProps {
  fieldMappings: FieldMappingType[];
  updateFieldMapping: <K extends keyof FieldMappingType>(index: number, field: K, value: FieldMappingType[K]) => void;
  updateFieldPK: (index: number, value: boolean) => void;
  removeFieldMapping: (index: number) => void;
}
const DataCleaning: React.FC<DataCleaningProps> = ({
  fieldMappings,
  updateFieldMapping,
  updateFieldPK,
  removeFieldMapping
}) => {
  return (
    <div className="w-full min-w-0">
      <DataTable
        mode={DataTableMode.DataCleaning}
        fieldMappings={fieldMappings}
        updateFieldMapping={updateFieldMapping}
        removeFieldMapping={removeFieldMapping}
        updateFieldPK={updateFieldPK}
      />
    </div>

  )
}
export default DataCleaning;