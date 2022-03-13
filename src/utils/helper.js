export const flattenArr = (arr) => {
  const obj = arr.reduce((prev, cur) => {
    prev[cur.id] = cur;
    return prev;
  }, {});
  return obj;
};

export const objToArr = (obj) => {
  const res = Object.keys(obj).map((key) => obj[key]);
  return res;
};

export const getParentNode = (node, parentClassName) => {
  let cur = node;
  while (cur !== null) {
    if (cur.classList.contains(parentClassName)) {
      return cur;
    }
    cur = cur.parentNode;
  }
  return false;
};
