import React from "react";

import { CloseOutlined } from "@ant-design/icons";
import classNames from "classnames";

import "./tabList.scss";

export default function TabLIst({
  files,
  activeId,
  unsavedIds,
  onTabClick,
  onCloseTab,
}) {
  return (
    <ul className="nav nav-pills tablist-component">
      {files.length &&
        files.map((file) => {
          const withUnsavedMark = unsavedIds.includes(file.id);
          const fileClassName = classNames({
            "nav-link": true,
            active: file.id === activeId,
            "d-flex": true,
            "align-items-center": true,
            withUnsaved: withUnsavedMark,
          });

          return (
            <li className="nav-item" key={file.id}>
              <a
                href="#"
                className={fileClassName}
                onClick={(e) => {
                  e.preventDefault();
                  onTabClick(file.id);
                }}
              >
                {file.title}
                <span
                  className="close-icon"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onCloseTab(file.id);
                  }}
                >
                  <CloseOutlined className="close-icon-item" />
                </span>
                {withUnsavedMark && (
                  <span className="rounded-circle unsaved-icon"></span>
                )}
              </a>
            </li>
          );
        })}
    </ul>
  );
}
