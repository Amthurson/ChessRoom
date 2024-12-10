import React from "react";

const Piece = ({ type }) => {
  const isRed = ["帥", "仕", "相", "車", "馬", "炮", "卒"].includes(type);

  return (
    <div
      className="piece"
      style={{
        color: isRed ? "red" : "black", // 红方棋子为红色，黑方为黑色
      }}
    >
      {type}
    </div>
  );
};

export default Piece;
