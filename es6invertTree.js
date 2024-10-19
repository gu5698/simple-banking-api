// 創建二元樹節點
const createTreeNode = (val = 0, left = null, right = null) => ({
  val,
  left,
  right,
});

// 反轉樹
const invertTree = (root) => {
  // 在函數開始時加入 null 檢查
  if (root === null) {
    return null;
  }

  const queue = [root];

  for (let i = 0; i < queue.length; i++) {
    const node = queue[i];

    // 交換左右子節點
    [node.left, node.right] = [node.right, node.left];

    // 將非空的子節點加入隊列
    if (node.left) queue.push(node.left);
    if (node.right) queue.push(node.right);
  }

  return root;
};

// 從數組構建樹
const buildTree = (arr) => {
  if (!arr.length) return null;

  const root = createTreeNode(arr[0]);
  const queue = [root];

  for (let i = 1; i < arr.length; i += 2) {
    const current = queue.shift();

    if (arr[i] !== null) {
      current.left = createTreeNode(arr[i]);
      queue.push(current.left);
    }

    if (i + 1 < arr.length && arr[i + 1] !== null) {
      current.right = createTreeNode(arr[i + 1]);
      queue.push(current.right);
    }
  }

  return root;
};

// 將樹轉換為數組（層序遍歷）
const treeToArray = (root) => {
  if (!root) return [];

  const result = [];
  const queue = [root];

  for (let i = 0; i < queue.length; i++) {
    const node = queue[i];
    if (node !== null) {
      result.push(node.val);
      queue.push(node.left || null);
      queue.push(node.right || null);
    } else {
      result.push(null);
    }
  }

  // 移除數組尾部的 null
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i] !== null) break;
    result.pop();
  }

  return result;
};

// 測試函數
const testInvertTree = (input, expected) => {
  const root = buildTree(input);
  const inverted = invertTree(root);
  const result = treeToArray(inverted);

  console.log("Input:   ", input);
  console.log("Output:  ", result);
  console.log("Expected:", expected);
  console.log("Result:  ", arraysEqual(result, expected) ? "PASS" : "FAIL");
  console.log("---");
};

// 輔助函數：比較兩個數組是否相等
const arraysEqual = (a, b) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

// 運行測試
testInvertTree([5, 3, 8, 1, 7, 2, 6], [5, 8, 3, 6, 2, 7, 1]);
testInvertTree([6, 8, 9], [6, 9, 8]);
testInvertTree(
  [5, 3, 8, 1, 7, 2, 6, 100, 3, -1],
  [5, 8, 3, 6, 2, 7, 1, null, null, null, null, null, -1, 3, 100]
);

// 運行邊界測試
testInvertTree([], []);
