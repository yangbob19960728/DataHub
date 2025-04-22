import * as React from 'react';
import { useMemo, useState } from 'react';
import { Button } from "primereact/button";
import { Panel } from 'primereact/panel';
import DataTable, { DataTableMode } from './DataTable';
import { RuleType, useDataIngestion } from '../../contexts/dataIngestionContext';
import { useTranslation } from 'react-i18next';

import { Tree, TreeCheckboxSelectionKeys, TreeMultipleSelectionKeys } from 'primereact/tree';
import { TreeNode } from 'primereact/treenode';
export const apiData = {
  "stationCode": "ST001",
  "equipmentCode": "EQ999",
  "maintenanceList": [
    {
      "company": "ABC",
      "count": 2,
      "date": "2024-05-01"
    },
    {
      "company": "asd",
      "count": 5,
      "date": "2024-05-02"
    }
  ],
  "otherField": {
    "nestedField": "value",
    "nestedName": "Tom"
  },
  "nestedArray": [
    [
      { "name": 1 },
      { "name": 2 },
      { "name": 3 },
      { "name": 4 }
    ],
    [
      { "name": 10 },
      { "name": 20 },
      { "name": 30 },
      { "name": 40 }
    ]
  ],
  "log": [
    {
      "timestamp": "2025-01-01",
      "errors": ["E1", "E2"]
    }
  ],
  "value": ["123", "345", "645", "0987"],
  "test": "1233424"
}
export default () => {
  const [selectedFieldId, setSelectedFieldId] = useState<string | null | TreeMultipleSelectionKeys | TreeCheckboxSelectionKeys>(null);
  const { fieldMappings, addMapping } = useDataIngestion();
  const { t } = useTranslation();

  enum DataType {
    String = 'String',
    Number = 'Number',
  }
  const dataTypes = [DataType.String, DataType.Number]
  // 從API資料中轉換成樹狀結構的資料
  const jsonToTreeNodes = (obj: any, prefix = '', path = []): TreeNode[] => {
    const result: TreeNode[] = [];
    let nodeId = 0;

    for (const key in obj) {
      const value = obj[key];
      const currentKey = `${prefix}${nodeId++}`;

      if (Array.isArray(value)) {
        if (value.length === 0) {
          // 空陣列
          result.push({
            key: currentKey,
            label: `${key} [ ]`,
            // data: key,
            data: JSON.stringify({
              value,
              path: [...path, key],
            }),
          });
        } else {
          const firstItem = value[0];
          if (Array.isArray(firstItem)) {
            // 陣列中還是陣列 → 遞迴處理第一層
            result.push({
              key: currentKey,
              label: `${key} [ [ ] ]`,
              // 因為是雙陣列，因此傳入陣列的第一個值
              children: jsonToTreeNodes(firstItem[0], `${currentKey}-`, [...path, key]),
              data: {
                value: JSON.stringify(value),
                path: [...path, key],
              },
            });
          } else if (typeof firstItem === 'object' && firstItem !== null) {
            // 陣列中是物件 → 展開第一個物件
            result.push({
              key: currentKey,
              label: `${key} [ ]`,
              children: jsonToTreeNodes(firstItem, `${currentKey}-`, [...path, key]),
              data: {
                value: JSON.stringify(value),
                path: [...path, key],
              },
            });
          } else {
            // 陣列中是基本型別
            result.push({
              key: currentKey,
              label: `${key} [ ]`,
              // data: key,
              data: {
                value: JSON.stringify(value),
                path: [...path, key],
              },
            });
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        // 巢狀物件
        result.push({
          key: currentKey,
          label: key,
          children: jsonToTreeNodes(value, `${currentKey}-`, [...path, key]),
          data: {
            value: JSON.stringify(value),
            path: [...path, key],
          },
        });
      } else {
        // 單一欄位
        result.push({
          key: currentKey,
          label: key,
          data: {
            value,
            path: [...path, key],
          },
        });
      }
    }

    return result;
  }

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
  // const handleFieldChange = (index: number, field: keyof FieldMapping, value: any) => {
  //   const updated = [...fieldMappings];
  //   updated[index] = { ...updated[index], [field]: value };

  //   // 如果修改的是 isPK，清除其他項目的 PK 設定
  //   if (field === 'isPK' && value === true) {
  //     updated.forEach((item, idx) => {
  //       if (idx !== index) item.isPK = false;
  //     });
  //   }

  //   onUpdate(updated);
  // };


  return (<>
    <div className='flex' >
      <div className="col-4">
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
                setSelectedFieldId(e.value);
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
              // console.log('fieldMappings', fieldMappings);
              const alreadyExists = fieldMappings.some(
                (item) => item.id === selectedFieldId
              );
              if (!alreadyExists) {
                const selectedFieldData = findTreeNodeByKey(treeNodeData, selectedFieldId as string);
                console.log('selectedFieldData', selectedFieldData);
                console.log('path', selectedFieldData.data.path);
                addMapping(
                  {
                    sourceField: selectedFieldData?.label || '',
                    sampleValue: selectedFieldData?.data?.value,
                    targetField: '',
                    dataType: typeof selectedFieldData?.data?.value === 'number' ? DataType.Number : DataType.String,
                    id: selectedFieldId as string,
                    ruleType: RuleType.Empty,
                    cleaningRule: '',
                    isPK: false,
                    data: selectedFieldData?.data,
                  });
              }
            }
          }}
          className="p-button-sm"
          aria-label="Add Field"
        />
      </div>
      <div className='col'>
        <Panel header={t("fieldMappingTable")}>
          <DataTable mode={DataTableMode.FieldMapping} />

          {/* 新增欄位按鈕 */}
          <Button
            icon="pi pi-plus"
            className="p-button-sm mt-3"
            onClick={() =>
              addMapping({ sourceField: '', sampleValue: '', targetField: '', dataType: DataType.String, id: '', cleaningRule: '', isPK: false, ruleType: RuleType.Empty, data: {} })
            }
            label={t("addField")}
          />
        </Panel>
      </div>
    </div>
  </>);
};
