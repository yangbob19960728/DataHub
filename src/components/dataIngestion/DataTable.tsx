import React from "react";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { DataType, RuleType, useDataIngestion } from "../../contexts/dataIngestionContext";
import { InputSwitch } from "primereact/inputswitch";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { useTranslation } from "react-i18next";
export enum DataTableMode {
  FieldMapping = 'fieldMapping',
  DataCleaning = 'dataCleaning',
}
interface Props {
  mode: DataTableMode;
}
export default ({ mode }: Props) => {
  const { fieldMappings, updateFieldMapping, removeFieldMapping } = useDataIngestion();
  const { t } = useTranslation();
  const isCleaningMode = mode === DataTableMode.DataCleaning;
  const isMappingMode = mode === DataTableMode.FieldMapping;

  const dataTypes = [DataType.String, DataType.Number];
  const ruleTypes = [RuleType.Empty, RuleType.Sum, RuleType.Avg, RuleType.Max, RuleType.Min];
  console.log('mode', mode, isCleaningMode)
  const getRuleTypes = (rowData: any) => {
    console.log('rowData', rowData.sampleValue);
    if (typeof rowData.sampleValue === 'string') {
      return [RuleType.Empty];
    }
    if (typeof rowData.sampleValue === 'number') {
      return [RuleType.Empty, RuleType.Sum, RuleType.Avg, RuleType.Max, RuleType.Min];
    }
    return [RuleType.Empty];
  };
  function changeCleaningRule(rowData: any, value: RuleType) {
    switch (value) {
      case RuleType.Sum:
        rowData.cleaningRule = `$sum(${rowData.data.path.join('.')})`;
        break;
      case RuleType.Avg:
        rowData.cleaningRule = `$average(${rowData.data.path.join('.')})`;
        break;
      case RuleType.Max:
        rowData.cleaningRule = `$max(${rowData.data.path.join('.')})`;
        break;
      case RuleType.Min:
        rowData.cleaningRule = `$min(${rowData.data.path.join('.')})`;
        break;
      default:
        break;
    }
  }

  return (
    <>
      <DataTable value={fieldMappings} emptyMessage={t("noData")}>
        {/* Source Field */}
        <Column
          header={t("sourceField")}
          body={(rowData, options) => (
            <InputText
              value={rowData.sourceField}
              disabled={true}
              style={{ backgroundColor: "var(--surface-300)" }}
              onChange={(e) =>
                updateFieldMapping(options.rowIndex, 'sourceField', e.target.value)
              }
            />
          )}
        />

        {/* Sample Value */}
        <Column
          header={t("sampleValue")}
          body={(rowData, options) => (
            <InputText
              value={rowData.sampleValue}
              disabled={true}
              style={{ backgroundColor: "var(--surface-300)" }}
              className={"sample-value-input" + rowData.id}
              onChange={(e) =>
                updateFieldMapping(options.rowIndex, 'sampleValue', e.target.value)
              }
              tooltip={rowData.sampleValue}
              tooltipOptions={{ showOnDisabled: true, position: 'top', mouseTrack: true, mouseTrackTop: 15 }}
            />

          )}
        />


        {/* Target Field */}
        <Column
          header={t("targetField")}
          body={(rowData, options) => (
            <InputText
              value={rowData.targetField}
              disabled={isCleaningMode}
              onChange={(e) =>
                updateFieldMapping(options.rowIndex, 'targetField', e.target.value)
              }
            />
          )}
        />

        {/* Data Type Dropdown */}
        <Column
          header={t("dataType")}
          body={(rowData, options) => (
            <Dropdown
              value={rowData.dataType}
              options={dataTypes}
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
                changeCleaningRule(rowData, e.value);
              }
              }
            />
          )}
        />)}
        {isCleaningMode && (<Column
          header={t("dataCleaningRule")}
          body={(rowData, options) => (
            <InputText
              value={rowData.cleaningRule || ''}
              disabled={rowData.id !== ''}
              placeholder=""
              onChange={(e) =>
                updateFieldMapping(options.rowIndex, 'cleaningRule', e.target.value)
              }
            />
          )}
        />)}

        {isCleaningMode && (
          <Column
            header={t("pk")}
            body={(rowData, options) => (
              <InputSwitch
                checked={rowData.isPK === true}
                onChange={(e) =>
                  updateFieldMapping(options.rowIndex, 'isPK', e.value)
                }
              />
            )}
          />

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
      </DataTable>
    </>
  );
}