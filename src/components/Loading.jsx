import React from "react";

import "./loading.scss";

const Loading = ({ text = "处理中" }) => {
  return (
    <div className="loading-component text-center">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">{text}</span>
      </div>
      <h5 className="text-primary">{text}</h5>
    </div>
  );
};

export default Loading;
