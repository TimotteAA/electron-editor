import React from "react";

export default function ButtonBtn({ type, title, icon, onClick }) {
  return (
    <button
      type="button"
      className={`btn ${type} d-flex align-items-center btn-left-bottom justify-content-center`}
      onClick={() => {
        onClick();
      }}
    >
      <span className="icon d-flex align-items-center">{icon}</span>
      {title}
    </button>
  );
}
