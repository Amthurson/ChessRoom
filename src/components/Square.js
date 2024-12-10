import React from "react";
import "../styles.css";

const Square = ({ position, isSelected, onClick, children }) => {
  return (
    <div
      className={`square ${isSelected ? "selected" : ""}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Square;
