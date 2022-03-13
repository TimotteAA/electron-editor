import { useEffect, useRef } from "react";
const remote = window.require("@electron/remote");
const { Menu, MenuItem } = remote;

// 选择元素的选择器

const useContextMenu = (itemArr, targetSelector, deps = []) => {
  let clickedEl = useRef(null);
  useEffect(() => {
    const menu = new Menu();
    itemArr.forEach((item) => {
      menu.append(new MenuItem(item));
    });
    const handleContextManu = (e) => {
      e.preventDefault();
      // 记录点击的元素
      // 仅当点击的元素在传入的选择器中

      let isContain = false;
      const containers = document.querySelectorAll(targetSelector);
      Array.prototype.forEach.call(containers, (item) => {
        if (item.contains(e.target)) {
          isContain = true;
        }
      });
      if (isContain) {
        clickedEl.current = e.target;
        menu.popup({ window: remote.getCurrentWindow() });
      }
    };
    window.addEventListener("contextmenu", handleContextManu);
    return () => {
      window.removeEventListener("contextmenu", handleContextManu);
    };
  }, [deps]);
  return clickedEl;
};

export default useContextMenu;
