// utils/rules.js

// 判断棋子的移动是否合法
export const isValidMove = (from, to, piece, pieces) => {
    const [fromRow, fromCol] = from.split("-").map(Number);
    const [toRow, toCol] = to.split("-").map(Number);
  
    // 如果目标位置有棋子，并且是自己一方的棋子，不能移动
    if (pieces[to] && isSameTeam(piece, pieces[to])) return false;
  
    switch (piece) {
      case "卒":
      case "兵":
        return validatePawnMove(fromRow, fromCol, toRow, toCol, piece);
      case "車":
      case "车":
        return validateRookMove(fromRow, fromCol, toRow, toCol, pieces);
      case "馬":
      case "马":
        return validateKnightMove(fromRow, fromCol, toRow, toCol, pieces);
      case "炮":
      case "砲":
        return validateCannonMove(fromRow, fromCol, toRow, toCol, pieces, to);
      case "帥":
      case "将":
        return validateKingMove(fromRow, fromCol, toRow, toCol);
      case "仕":
      case "士":
        return validateGuardMove(fromRow, fromCol, toRow, toCol, piece);
      case "相":
      case "象":
        return validateBishopMove(fromRow, fromCol, toRow, toCol, piece, pieces);
      default:
        return false;
    }
  };
  
  // 判断棋子是否是同一阵营
  const isSameTeam = (pieceA, pieceB) => {
    const redPieces = ["帥", "仕", "相", "車", "馬", "炮", "卒"];
    const blackPieces = ["将", "士", "象", "车", "马", "砲", "兵"];

    return (
        (redPieces.includes(pieceA) && redPieces.includes(pieceB)) ||
        (blackPieces.includes(pieceA) && blackPieces.includes(pieceB))
    );
  };
  
  // 卒/兵移动规则
  const validatePawnMove = (fromRow, fromCol, toRow, toCol, piece) => {
    const isRed = piece === "卒";
    const direction = isRed ? 1 : -1;
    const isCrossRiver = isRed ? fromRow >= 5 : fromRow <= 4;
  
    if (toRow === fromRow + direction && toCol === fromCol) {
      return true; // 前进
    }
    if (
      isCrossRiver &&
      toRow === fromRow &&
      Math.abs(toCol - fromCol) === 1
    ) {
      return true; // 过河后可左右
    }
    return false;
  };
  
  // 車移动规则
  const validateRookMove = (fromRow, fromCol, toRow, toCol, pieces) => {
    if (fromRow !== toRow && fromCol !== toCol) return false;
    const isHorizontal = fromRow === toRow;
    const start = isHorizontal ? Math.min(fromCol, toCol) : Math.min(fromRow, toRow);
    const end = isHorizontal ? Math.max(fromCol, toCol) : Math.max(fromRow, toRow);
  
    for (let i = start + 1; i < end; i++) {
      const key = isHorizontal ? `${fromRow}-${i}` : `${i}-${fromCol}`;
      if (pieces[key]) return false; // 中间有阻挡
    }
    return true;
  };
  
  // 马移动规则
  const validateKnightMove = (fromRow, fromCol, toRow, toCol, pieces) => {
    const rowDiff = Math.abs(fromRow - toRow);
    const colDiff = Math.abs(fromCol - toCol);
  
    if (rowDiff === 2 && colDiff === 1) {
      const blocking = `${(fromRow + toRow) / 2}-${fromCol}`;
      return !pieces[blocking];
    }
    if (rowDiff === 1 && colDiff === 2) {
      const blocking = `${fromRow}-${(fromCol + toCol) / 2}`;
      return !pieces[blocking];
    }
    return false;
  };
  
  // 炮/砲移动规则
  const validateCannonMove = (fromRow, fromCol, toRow, toCol, pieces, to) => {
    if (fromRow !== toRow && fromCol !== toCol) return false;
  
    const isHorizontal = fromRow === toRow;
    const start = isHorizontal ? Math.min(fromCol, toCol) : Math.min(fromRow, toRow);
    const end = isHorizontal ? Math.max(fromCol, toCol) : Math.max(fromRow, toRow);
  
    let blockCount = 0;
    for (let i = start + 1; i < end; i++) {
      const key = isHorizontal ? `${fromRow}-${i}` : `${i}-${fromCol}`;
      if (pieces[key]) blockCount++;
    }
  
    if (!pieces[to]) {
      return blockCount === 0; // 普通移动：无阻挡
    } else {
      return blockCount === 1; // 吃子：中间有且仅有一个阻挡
    }
  };
  
  // 帅/将移动规则
  const validateKingMove = (fromRow, fromCol, toRow, toCol) => {
    const isInPalace = (row, col) =>
      col >= 3 && col <= 5 && ((row >= 0 && row <= 2) || (row >= 7 && row <= 9));
  
    return (
      isInPalace(toRow, toCol) &&
      Math.abs(fromRow - toRow) + Math.abs(fromCol - toCol) === 1
    );
  };
  
  // 士/仕移动规则
  const validateGuardMove = (fromRow, fromCol, toRow, toCol, piece) => {
    const isRed = piece === "仕";
    const palaceRowRange = isRed ? [0, 2] : [7, 9];
  
    return (
      toCol >= 3 &&
      toCol <= 5 &&
      toRow >= palaceRowRange[0] &&
      toRow <= palaceRowRange[1] &&
      Math.abs(fromRow - toRow) === 1 &&
      Math.abs(fromCol - toCol) === 1
    );
  };
  
  // 象/相移动规则
  const validateBishopMove = (fromRow, fromCol, toRow, toCol, piece, pieces) => {
    const isRed = piece === "相";
    const riverBoundary = isRed ? 4 : 5;
  
    if (
      Math.abs(fromRow - toRow) === 2 &&
      Math.abs(fromCol - toCol) === 2
    ) {
      const blocking = `${(fromRow + toRow) / 2}-${(fromCol + toCol) / 2}`;
      return (
        !pieces[blocking] &&
        (isRed ? toRow <= riverBoundary : toRow >= riverBoundary)
      );
    }
    return false;
  };