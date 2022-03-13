import { useState, useEffect } from "react";

//
function useKeyPress(targetKeyCode) {
  const [isKeyPressed, setIsKeyPressed] = useState(false);

  const keyDownHandler = ({ keyCode }) => {
    if (keyCode === targetKeyCode) {
      setIsKeyPressed(true);
    }
  };

  const keyUpHandler = ({ keyCode }) => {
    if (keyCode === targetKeyCode) {
      setIsKeyPressed(false);
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", keyDownHandler);
    document.addEventListener("keyup", keyUpHandler);
    return () => {
      document.removeEventListener("keydown", keyDownHandler);
      document.removeEventListener("keyup", keyUpHandler);
    };
  }, []);

  return isKeyPressed;
}

export default useKeyPress;
