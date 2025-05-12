import { jsonToTreeNodes, findTreeNodeByKey, buildCleaningRuleExpression } from '../utils/dataUtils';
import { RuleType } from '../contexts/dataIngestionContext';

describe('dataUtils 工具函式', () => {
  describe('jsonToTreeNodes 函式', () => {
    it('應將各種陣列結構轉換為對應的 TreeNode 節點', () => {
      const input = {
        emptyArr: [],
        doubleArr: [[{ nested: 'val' }]],
        objArr: [{ foo: 1, bar: 2 }, { foo: 3 }],
        primArr: [42, 43, 44]
      };
      const nodes = jsonToTreeNodes(input);
      // emptyArr: 空陣列應產生單一節點（無 children），data 為 JSON 字串
      const emptyNode = nodes.find(n => n.label.startsWith('emptyArr'));
      expect(emptyNode).toBeDefined();
      expect(typeof emptyNode!.data).toBe('string');
      const emptyDataObj = JSON.parse(emptyNode!.data as string);
      expect(emptyDataObj.value).toEqual([]);
      expect(emptyDataObj.path).toEqual(['emptyArr']);
      // doubleArr: 陣列的第一元素也是陣列 -> label 帶 "[ [ ] ]"，應有 children 展開第一個內層陣列元素
      const doubleNode = nodes.find(n => n.label.startsWith('doubleArr'));
      expect(doubleNode).toBeDefined();
      expect(doubleNode!.children).toBeDefined();
      expect(doubleNode!.label).toBe('doubleArr [ [ ] ]');
      // doubleArr node data.value 應為 string 化的整個值，children 應包含 'nested' 節點
      expect(doubleNode!.data).toMatchObject({
        value: JSON.stringify([[{ nested: 'val' }]]),
        path: ['doubleArr']
      });
      const nestedChild = doubleNode!.children![0];
      expect(nestedChild.label).toBe('nested');
      expect(nestedChild.data).toMatchObject({ value: 'val', path: ['doubleArr', 'nested'] });
      // objArr: 陣列中是物件 -> label "[ ]"，children 包含該物件的欄位
      const objArrNode = nodes.find(n => n.label.startsWith('objArr'));
      expect(objArrNode).toBeDefined();
      expect(objArrNode!.label).toBe('objArr [ ]');
      expect(objArrNode!.children!.length).toBe(2);
      const fooChild = objArrNode!.children!.find(c => c.label === 'foo');
      const barChild = objArrNode!.children!.find(c => c.label === 'bar');
      expect(fooChild?.data).toMatchObject({ value: 1, path: ['objArr', 'foo'] });
      expect(barChild?.data).toMatchObject({ value: 2, path: ['objArr', 'bar'] });
      // primArr: 陣列中是基本型別 -> label "[ ]"，無 children，data.value 為整個陣列的 JSON 字串
      const primArrNode = nodes.find(n => n.label.startsWith('primArr'));
      expect(primArrNode).toBeDefined();
      expect(primArrNode!.label).toBe('primArr [ ]');
      expect(primArrNode!.children).toBeUndefined();
      expect(primArrNode!.data).toMatchObject({
        value: JSON.stringify([42, 43, 44]),
        path: ['primArr']
      });
    });

    it('應將巢狀物件與基本欄位轉換為 TreeNode 節點', () => {
      const input = {
        nestedObj: { inner: 100 },
        simpleStr: 'hello',
        simpleNum: 123,
        boolVal: false,
        nullVal: null
      };
      const nodes = jsonToTreeNodes(input);
      // nestedObj: 有 children 對應內部欄位
      const nestedNode = nodes.find(n => n.label === 'nestedObj');
      expect(nestedNode).toBeDefined();
      expect(nestedNode!.children).toBeDefined();
      const innerChild = nestedNode!.children!.find(c => c.label === 'inner');
      expect(innerChild?.data).toMatchObject({ value: 100, path: ['nestedObj', 'inner'] });
      // simpleStr: 單一字串欄位
      const strNode = nodes.find(n => n.label === 'simpleStr');
      expect(strNode?.data).toMatchObject({ value: 'hello', path: ['simpleStr'] });
      // simpleNum: 單一數字欄位
      const numNode = nodes.find(n => n.label === 'simpleNum');
      expect(numNode?.data).toMatchObject({ value: 123, path: ['simpleNum'] });
      // boolVal: 布林值欄位
      const boolNode = nodes.find(n => n.label === 'boolVal');
      expect(boolNode?.data).toMatchObject({ value: false, path: ['boolVal'] });
      // nullVal: null 值欄位
      const nullNode = nodes.find(n => n.label === 'nullVal');
      expect(nullNode?.data).toMatchObject({ value: null, path: ['nullVal'] });
    });
  });

  describe('findTreeNodeByKey 函式', () => {
    const tree: any = [
      { key: 'root1', label: 'Root1', children: [{ key: 'child', label: 'Child' }] },
      { key: 'root2', label: 'Root2' }
    ];

    it('應能找到對應 key 的 TreeNode（包含巢狀節點）', () => {
      const foundChild = findTreeNodeByKey(tree, 'child');
      expect(foundChild).toBeDefined();
      expect(foundChild!.label).toBe('Child');
      const foundRoot = findTreeNodeByKey(tree, 'root2');
      expect(foundRoot).toBe(tree[1]);
      expect(foundRoot!.label).toBe('Root2');
    });

    it('找不到對應 key 時應回傳 null', () => {
      const result = findTreeNodeByKey(tree, 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('buildCleaningRuleExpression 函式', () => {
    const path = ['parent', 'child'];
    it('應依 RuleType 產生正確的 JSONata 表達式', () => {
      expect(buildCleaningRuleExpression(RuleType.Sum, path)).toBe('$sum(parent.child)');
      expect(buildCleaningRuleExpression(RuleType.Avg, path)).toBe('$average(parent.child)');
      expect(buildCleaningRuleExpression(RuleType.Max, path)).toBe('$max(parent.child)');
      expect(buildCleaningRuleExpression(RuleType.Min, path)).toBe('$min(parent.child)');
      expect(buildCleaningRuleExpression(RuleType.Len, path)).toBe('$length(parent.child)');
      expect(buildCleaningRuleExpression(RuleType.UpperCase, path)).toBe('$uppercase(parent.child)');
      expect(buildCleaningRuleExpression(RuleType.LowerCase, path)).toBe('$lowercase(parent.child)');
      expect(buildCleaningRuleExpression(RuleType.Trim, path)).toBe('$trim(parent.child)');
      expect(buildCleaningRuleExpression(RuleType.Empty, path)).toBe('');
    });
  });
});
