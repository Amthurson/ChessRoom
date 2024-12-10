export const canMovePiece = (from, to, piece) => {
    const [fromRow, fromCol] = from.split("-").map(Number);
    const [toRow, toCol] = to.split("-").map(Number);
  
    switch (piece) {
      case "卒":
        return toRow === fromRow + 1 && fromCol === toCol;
      case "車":
        return toRow === fromRow || fromCol === toCol;
      case "馬":
        return (
          (Math.abs(toRow - fromRow) === 2 && Math.abs(toCol - fromCol) === 1) ||
          (Math.abs(toRow - fromRow) === 1 && Math.abs(toCol - fromCol) === 2)
        );
      // 其他规则...
      default:
        return false;
    }
  };
  