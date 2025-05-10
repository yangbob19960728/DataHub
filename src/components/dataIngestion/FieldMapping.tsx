import React, { useMemo, useState, useEffect } from 'react';
import { Button } from "primereact/button";
import { Panel } from 'primereact/panel';
import DataTable, { DataTableMode } from './DataTable';
import { useTranslation } from 'react-i18next';

import { Tree, TreeCheckboxSelectionKeys, TreeMultipleSelectionKeys } from 'primereact/tree';
import { TreeNode } from 'primereact/treenode';
import { FieldMapping as FieldMappingType, DataType, RuleType, RuleValidationState } from '../../contexts/dataIngestionContext';
import { jsonToTreeNodes, findTreeNodeByKey } from '../../utils/dataUtils';


interface FieldMappingProps {
  fieldMappings: FieldMappingType[];
  setFieldMappings: React.Dispatch<React.SetStateAction<FieldMappingType[]>>
  apiData: any;
  addMapping: (mapping: FieldMappingType) => void;
  updateFieldMapping: <K extends keyof FieldMappingType>(index: number, field: K, value: FieldMappingType[K]) => void;
  removeFieldMapping: (index: number) => void;
  updateFieldPK?: (index: number, value: boolean) => void;
}

const FieldMapping: React.FC<FieldMappingProps> = ({
  fieldMappings,
  setFieldMappings,
  apiData,
  addMapping,
  updateFieldMapping,
  removeFieldMapping,
  updateFieldPK
}) => {
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const { t } = useTranslation();
  const treeNodes: TreeNode[] = useMemo(() => jsonToTreeNodes(apiData), [apiData]);


  const findTreeNodeByKey = (nodes: TreeNode[], key: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.key === key) {
        return node;
      }
      if (node.children) {
        const found = findTreeNodeByKey(node.children, key);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }
  const treeNodeData = useMemo(() => jsonToTreeNodes(apiData), [apiData]);

  return (<>
    <div className='flex' >
      <div className="col-3">
        <Panel header={t("apiFields")} >
          <div
            className='overflow-auto'
            style={{ maxHeight: 'calc(-320px - 8rem + 100vh)' }}
          >
            <Tree
              value={treeNodeData}
              selectionMode="single"
              selectionKeys={selectedFieldId}
              onSelectionChange={(e) => {
                setSelectedFieldId(e.value as string)
              }}
            />
          </div>
        </Panel>
      </div>
      <div className='col-auto align-self-center'>
        <Button
          icon="pi pi-chevron-right"
          onClick={() => {
            if (selectedFieldId !== null) {
              // 檢查是否已存在於 mapping table 中
              const alreadyExists = fieldMappings.some(
                (item) => item.id === selectedFieldId
              );
              if (!alreadyExists) {
                const selectedFieldData = findTreeNodeByKey(treeNodeData, selectedFieldId as string);
                addMapping(
                  {
                    sourceField: selectedFieldData?.label || '',
                    sampleValue: selectedFieldData?.data?.value,
                    targetField: '',
                    dataType: typeof selectedFieldData?.data?.value === 'number' ? DataType.Number : DataType.String,
                    id: selectedFieldId as string,
                    ruleType: RuleType.Empty,
                    cleaningRule: '',
                    isPK: fieldMappings.length === 0,
                    data: selectedFieldData?.data,
                    targetFieldTouched: false,
                    targetFieldError: '',
                    ruleValidationState: RuleValidationState.None,
                    cleaningRuleError: '',
                    cleaningRuleTouched: false
                  });
              }
            }
          }}
          className="p-button-sm"
          aria-label="Add Field"
        />
      </div>
      <div className='col min-w-0'>
        <Panel header={t("fieldMappingTable")}>
          <DataTable
            mode={DataTableMode.FieldMapping}
            fieldMappings={fieldMappings}
            setFieldMappings={setFieldMappings}
            updateFieldMapping={updateFieldMapping}
            removeFieldMapping={removeFieldMapping}
            updateFieldPK={updateFieldPK} />

          {/* 新增欄位按鈕 */}
          <Button
            icon="pi pi-plus"
            className="p-button-sm mt-3"
            onClick={() =>
              addMapping({ sourceField: '', sampleValue: '', targetField: '', dataType: DataType.String, id: '', cleaningRule: '', isPK: fieldMappings.length === 0, ruleType: RuleType.Empty, data: {}, targetFieldTouched: false, targetFieldError: '', ruleValidationState: RuleValidationState.None, cleaningRuleError: '', cleaningRuleTouched: false })
            }
            label={t("addField")}
          />
        </Panel>
      </div>
    </div>
  </>);
};

export default FieldMapping;