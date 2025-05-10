import { TreeNode } from 'primereact/treenode';
import { RuleType } from '../contexts/dataIngestionContext';

/**
 * Convert a JSON object into TreeNode structures for display.
 */
export function jsonToTreeNodes(obj: any, prefix: string = '', path: string[] = []): TreeNode[] {
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

/**
 * Find a TreeNode in a Tree structure by key.
 */
export function findTreeNodeByKey(nodes: TreeNode[], key: string): TreeNode | null {
  for (const node of nodes) {
    if (node.key === key) return node;
    if (node.children) {
      const found = findTreeNodeByKey(node.children, key);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Build a cleaning rule expression (JSONata) given the rule type and JSON path.
 */
export function buildCleaningRuleExpression(ruleType: RuleType, path: string[]): string {
  const joinedPath = path.join('.');
  switch (ruleType) {
    case RuleType.Sum: return `$sum(${joinedPath})`;
    case RuleType.Avg: return `$average(${joinedPath})`;
    case RuleType.Max: return `$max(${joinedPath})`;
    case RuleType.Min: return `$min(${joinedPath})`;
    case RuleType.Len: return `$length(${joinedPath})`;
    case RuleType.UpperCase: return `$uppercase(${joinedPath})`;
    case RuleType.LowerCase: return `$lowercase(${joinedPath})`;
    case RuleType.Trim: return `$trim(${joinedPath})`;
    case RuleType.Empty:
    default: return '';
  }
}
