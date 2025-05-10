import React, { useEffect } from "react";
import { Column } from "primereact/column";
import { DataTable as PrimeDataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { InputSwitch } from "primereact/inputswitch";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { useTranslation } from "react-i18next";
import { DropdownItem } from "../../constants/dropdownOptions";
import { debounce } from "lodash";
import jsonata from "jsonata";

import { FieldMapping as FieldMappingType, DataType, RuleType, RuleValidationState } from '../../contexts/dataIngestionContext';
import { buildCleaningRuleExpression } from '../../utils/dataUtils';
export enum DataTableMode {
  FieldMapping = 'fieldMapping',
  DataCleaning = 'dataCleaning',
}
interface DataTableProps {
  mode: DataTableMode;
  fieldMappings: FieldMappingType[];
  updateFieldMapping: <K extends keyof FieldMappingType>(index: number, field: K, value: FieldMappingType[K]) => void;
  removeFieldMapping: (index: number) => void;
  updateFieldPK?: (index: number, value: boolean) => void;
  setFieldMappings?: (mappings: FieldMappingType[]) => void;
}
const requiredStyle = {
  color: 'var(--red-400)',
};
const DataTable: React.FC<DataTableProps> = ({
  mode,
  fieldMappings,
  updateFieldMapping,
  removeFieldMapping,
  updateFieldPK,
  setFieldMappings
}) => {
  const { t } = useTranslation();
  const isCleaningMode = mode === DataTableMode.DataCleaning;
  const isMappingMode = mode === DataTableMode.FieldMapping;
  const getRuleTypes = (rowData: any) => {
    if (rowData.id === '') {
      return [RuleType.Empty];
    }
    if (typeof rowData.sampleValue === 'string') {
      return [RuleType.Empty, RuleType.Len, RuleType.UpperCase, RuleType.LowerCase, RuleType.Trim];
    }
    if (typeof rowData.sampleValue === 'number') {
      return [RuleType.Empty, RuleType.Sum, RuleType.Avg, RuleType.Max, RuleType.Min];
    }
    return [RuleType.Empty];
  };
  const getRuleStateIcon = (ruleValidationState: RuleValidationState) => {
    switch (ruleValidationState) {
      case RuleValidationState.Success:
        return <i className="pi pi-check ml-3" style={{ color: 'var(--green-500)' }}></i>;
      case RuleValidationState.Error:
        return <i className="pi pi-times ml-3" style={{ color: 'var(--red-500)' }}></i>;
      default:
        return null;
    }
  }
  function changeRuleType(index: number, rowData: any, newRuleType: RuleType) {
    const expression = buildCleaningRuleExpression(newRuleType, rowData.data.path || []);
    updateFieldMapping(index, 'cleaningRule', expression);
  }
  const getDataTypeOptions = (rawValue: any): DataType[] => {
    if (rawValue === null || rawValue === undefined) {
      return [DataType.Null];
    }

    const str = String(rawValue).trim();
    // 是數字
    if (typeof rawValue === 'number' || !isNaN(Number(str))) {
      return [
        DataType.String,
        DataType.Number
      ];
    }
    // 無法轉數字 → 僅能為 string
    return [DataType.String];
  };
  return (
    <>
      <PrimeDataTable value={fieldMappings} emptyMessage={t("noData")} scrollable reorderableRows={isMappingMode} onRowReorder={(e) => setFieldMappings(e.value as FieldMappingType[])}>
        {/* Source Field */}
        <Column
          style={{ width: '3rem' }}
          body={(rowData, options) => (
            rowData.id !== '' ? (
              <i className="pi pi-link" style={{ fontSize: '1rem' }}></i>
            ) : null
          )}
        />
        <Column
          header={t("sourceField")}
          body={(rowData, options) => (
            <InputText
              value={rowData.sourceField}
              disabled
              style={{ backgroundColor: "var(--surface-300)" }}
            />
          )}
        />

        {/* Sample Value */}
        <Column
          header={t("sampleValue")}
          body={(rowData, options) => (
            <InputText
              value={rowData.sampleValue}
              disabled
              style={{ backgroundColor: "var(--surface-300)" }}
              className={`sample-value-input${rowData.id}`}
              tooltip={rowData.sampleValue}
              tooltipOptions={{ showOnDisabled: true, position: 'top', mouseTrack: true, mouseTrackTop: 15 }}
            />

          )}
        />


        {/* Target Field */}
        <Column
          header={() => (
            <>
              <span style={requiredStyle}>*</span>
              {t("targetField")}
            </>
          )}
          body={(rowData, options) => (
            <div className="flex flex-column">
              <InputText
                value={rowData.targetField}
                disabled={isCleaningMode}
                invalid={rowData.targetFieldTouched && rowData.targetFieldError}
                onChange={(e) => {
                  updateFieldMapping(options.rowIndex, 'targetField', e.target.value);
                  updateFieldMapping(options.rowIndex, 'targetFieldTouched', true);
                }
                }
              />
              {
                rowData.targetFieldTouched && rowData.targetFieldError && (
                  <small className="p-error">{rowData.targetFieldError}</small>
                )
              }
            </div>

          )}
        />

        {/* Data Type Dropdown */}
        <Column
          header={t("dataType")}
          body={(rowData, options) => (
            <Dropdown
              value={rowData.dataType}
              options={getDataTypeOptions(rowData.sampleValue)}
              disabled={isCleaningMode}
              onChange={(e) =>
                updateFieldMapping(options.rowIndex, 'dataType', e.value)
              }
            />
          )}
        />
        {isCleaningMode && (<Column
          header={t("ruleType")}
          body={(rowData, options) => (
            <Dropdown
              value={rowData.ruleType}
              options={getRuleTypes(rowData)}
              onChange={(e) => {
                updateFieldMapping(options.rowIndex, 'ruleType', e.value);
                changeRuleType(options.rowIndex, rowData, e.value);
              }
              }
            />
          )}
        />)}
        {isCleaningMode && (<Column
          header={t("dataCleaningRule")}
          style={{ minWidth: '260px' }}
          body={(rowData, options) => (
            <>
              <div>
                <InputText
                  value={rowData.cleaningRule || ''}
                  invalid={rowData.cleaningRuleTouched && rowData.cleaningRuleError}
                  disabled={rowData.id !== '' && rowData.ruleType !== RuleType.Empty}
                  placeholder=""
                  onChange={(e) =>
                    updateFieldMapping(options.rowIndex, 'cleaningRule', e.target.value)
                  }
                />
                {getRuleStateIcon(rowData.ruleValidationState)}

              </div>
              <div>
                {
                  rowData.cleaningRuleTouched && rowData.cleaningRuleError && (
                    <small className="p-error">{rowData.cleaningRuleError}</small>
                  )
                }
              </div>
            </>
          )}
        />)}

        {isCleaningMode && (
          <Column
            header={() =>
              <>
                <span style={requiredStyle}>*</span>
                {t("pk")}
              </>}
            body={(rowData, options) => (
              <InputSwitch
                checked={rowData.isPK === true}
                onChange={(e) =>
                  updateFieldPK(options.rowIndex, e.value)
                }
              />
            )}
          />

        )}
        {isMappingMode && (
          <Column rowReorder style={{ width: '3rem' }} />
        )}

        {isMappingMode && (
          <Column
            body={(rowData, options) => (
              <Button
                icon="pi pi-times"
                className="p-button-rounded p-button-text"
                onClick={() => removeFieldMapping(options.rowIndex)}
              />
            )}
          />
        )}
      </PrimeDataTable>
    </>
  );
}
export default DataTable;