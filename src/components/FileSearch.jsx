import React, { useState, useEffect, useRef } from "react";

import useKeyPress from "../hooks/useKeyPress";

// onFileSeach按下enter后搜索,esc取消搜索

export default function FileSearch({ title, onFileSearch }) {
  const [inputActive, setInputActive] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef();

  // esc关闭
  const closeSearch = () => {
    setInputActive(false);
    setValue("");
    onFileSearch("");
  };

  const enterPressed = useKeyPress(13);
  const escPressed = useKeyPress(27);

  useEffect(() => {
    if (enterPressed && inputActive) {
      onFileSearch(value);
      //   setInputActive(false);
      //   setValue("");
    }
    if (escPressed && inputActive) {
      closeSearch();
    }
  }, [enterPressed, escPressed, inputActive]);

  useEffect(() => {
    if (inputActive) {
      inputRef.current.focus();
    }
  }, [inputActive]);

  return (
    <div className="alert alert-primary align-items-center mb-0">
      {!inputActive ? (
        <div className="d-flex justify-content-between align-items-center">
          <div className="align-middle">{title}</div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setInputActive(true);
            }}
          >
            搜索
          </button>
        </div>
      ) : (
        <div className="row">
          <input
            className="col-8"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            ref={inputRef}
          />
          <button
            type="button"
            className="btn btn-primary col-4"
            onClick={(e) => closeSearch(e)}
          >
            关闭
          </button>
        </div>
      )}
    </div>
  );
}
