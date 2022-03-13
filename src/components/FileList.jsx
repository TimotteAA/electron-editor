import React, { useState, useEffect, useRef } from "react";
import { FileMarkdownOutlined } from "@ant-design/icons";

import useKeyPress from "../hooks/useKeyPress";
import useContextMenu from "../hooks/useContextMenu";
import { getParentNode } from "../utils/helper";

// remote module
const remote = window.require("@electron/remote");
const { Menu, MenuItem } = remote;

export default function FileList({
  files,
  onSaveEdit,
  onFileClick,
  onFileDelete,
}) {
  const [editStatus, setEditStatus] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef(null);
  const closeSearch = (editItem) => {
    setEditStatus(false);
    setValue("");
    // editItem是isNew属性，delete这个file（按下esc）
    if (editItem.isNew) {
      onFileDelete(editItem.id);
    }
  };

  const enterPressed = useKeyPress(13);
  const escPressed = useKeyPress(27);

  useEffect(() => {
    const editItem = files.find((file) => file.id === editStatus);
    if (enterPressed && editStatus) {
      onSaveEdit(editItem.id, value, editItem.isNew);
      setEditStatus(false);
      setValue("");
    }
    if (escPressed && editStatus) {
      closeSearch(editItem);
    }
  }, [escPressed, editStatus, enterPressed]);

  useEffect(() => {
    const newFile = files.find((file) => file.isNew);
    if (newFile) {
      setEditStatus(newFile.id);
      setValue(newFile.title);
    }
  }, [files]);

  useEffect(() => {
    if (editStatus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editStatus]);

  const clickedEl = useContextMenu(
    [
      {
        label: "打开",
        click: () => {
          const parentNode = getParentNode(
            clickedEl.current,
            "list-group-item"
          );

          if (parentNode) {
            onFileClick(parentNode.dataset.id);
          }
        },
      },
      {
        label: "重命名",
        click: () => {
          const parentNode = getParentNode(
            clickedEl.current,
            "list-group-item"
          );

          if (parentNode) {
            setEditStatus(parentNode.dataset.id);
            setValue(parentNode.dataset.title);
          }
        },
      },
      {
        label: "删除",
        click: () => {
          const parentNode = getParentNode(
            clickedEl.current,
            "list-group-item"
          );

          if (parentNode) {
            onFileDelete(parentNode.dataset.id);
          }
        },
      },
    ],
    ".list-group-item",
    files
  );

  return (
    <ul className="list-group list-group-flush">
      {files?.map((file) => {
        return (
          <li
            className="list-group-item d-flex  align-items-center file-item row"
            key={file.id}
            data-id={file.id}
            data-title={file.title}
          >
            {editStatus !== file.id && !file.isNew && (
              <>
                <span className="d-flex col-4 align-items-center">
                  <FileMarkdownOutlined className="icon" />
                </span>
                <span
                  className="d-flex col-8 align-items-center file-title"
                  onClick={() => onFileClick(file.id)}
                >
                  {file.title}
                </span>
                {/* <button onClick={() => onFileDelete(file.id)}>删除</button>
                <button
                  onClick={() => {
                    setEditStatus(file.id);
                    setValue(file.title);
                  }}
                >
                  编辑
                </button> */}
              </>
            )}
            {(file.id === editStatus || file.isNew) && (
              <>
                <input
                  className="col-8"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  ref={inputRef}
                  placeholder="请输入文件名称"
                />
                <button
                  type="button"
                  className="btn btn-primary col-4"
                  onClick={() => closeSearch(file)}
                >
                  关闭
                </button>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
