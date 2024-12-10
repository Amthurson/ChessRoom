import { isValidMove } from './rules';

// 棋子价值表
const PIECE_VALUES = {
    '帥': 10000, '将': 10000,
    '仕': 200, '士': 200,
    '相': 200, '象': 200,
    '車': 900, '车': 900,
    '馬': 400, '马': 400,
    '炮': 450, '砲': 450,
    '卒': 100, '兵': 100
};

// 检查游戏是否结束
function isGameOver(pieces) {
    const hasRedKing = Object.values(pieces).includes("帥");
    const hasBlackKing = Object.values(pieces).includes("将");
    return !hasRedKing || !hasBlackKing;
}

// 获取所有可能的移动
function getAllPossibleMoves(pieces, isRed) {
    const moves = [];
    const redPieces = ["帥", "仕", "相", "車", "馬", "炮", "卒"];
    const blackPieces = ["将", "士", "象", "车", "马", "砲", "兵"];
    
    // 遍历棋盘上的所有棋子
    Object.entries(pieces).forEach(([from, piece]) => {
        // 只处理当前颜色的棋子
        if ((isRed && redPieces.includes(piece)) || (!isRed && blackPieces.includes(piece))) {
            const [fromRow, fromCol] = from.split("-").map(Number);
            
            // 遍历所有可能的目标位置
            for (let toRow = 0; toRow < 10; toRow++) {
                for (let toCol = 0; toCol < 9; toCol++) {
                    const to = `${toRow}-${toCol}`;
                    
                    // 使用 rules.js 中的 isValidMove 检查移动是否合法
                    if (isValidMove(from, to, piece, pieces)) {
                        let moveValue = 0;
                        
                        // 计算移动价值
                        if (pieces[to]) {
                            // 吃子价值
                            moveValue += PIECE_VALUES[pieces[to]] * 2;
                        }
                        
                        // 战略位置价值
                        if (piece === "卒" || piece === "兵") {
                            // 兵卒过河奖励
                            const crossedRiver = isRed ? toRow >= 5 : toRow <= 4;
                            if (crossedRiver) {
                                moveValue += 50;
                            }
                        }
                        
                        // 控制中心奖励
                        if (toCol >= 3 && toCol <= 5) {
                            moveValue += 10;
                        }
                        
                        // 保护将帅
                        if ((piece === "仕" || piece === "士" || piece === "相" || piece === "象") &&
                            toCol >= 3 && toCol <= 5) {
                            moveValue += 30;
                        }
                        
                        moves.push({
                            from,
                            to,
                            piece,
                            value: moveValue
                        });
                    }
                }
            }
        }
    });
    
    return moves;
}

// 评估局面分数
function evaluatePosition(pieces) {
    let score = 0;
    Object.entries(pieces).forEach(([pos, piece]) => {
        const [row, col] = pos.split('-').map(Number);
        const pieceValue = PIECE_VALUES[piece];
        
        if (["帥", "仕", "相", "車", "馬", "炮", "卒"].includes(piece)) {
            score += pieceValue;
            // 位置加成
            if (piece === "卒" && row >= 5) {
                score += 50; // 过河兵价值提升
            }
        } else {
            score -= pieceValue;
            if (piece === "兵" && row <= 4) {
                score -= 50; // 过河兵价值提升
            }
        }
    });
    return score;
}

// 获取AI的下一步移动
export function getNextMove(gameState, isRed) {
    // 如果游戏已经结束，返回 null
    if (isGameOver(gameState.pieces)) {
        return null;
    }

    const possibleMoves = getAllPossibleMoves(gameState.pieces, isRed);
    
    if (possibleMoves.length === 0) {
        return null;
    }
    
    // 对每个可能的移动进行评分
    possibleMoves.forEach(move => {
        // 模拟这个移动
        const newPieces = { ...gameState.pieces };
        newPieces[move.to] = newPieces[move.from];
        delete newPieces[move.from];
        
        // 评估移动后的局面
        const positionValue = evaluatePosition(newPieces);
        move.value += positionValue;
    });
    
    // 选择最佳移动（加入一些随机性）
    possibleMoves.sort((a, b) => b.value - a.value);
    const topMoves = possibleMoves.slice(0, Math.min(3, possibleMoves.length));
    const selectedMove = topMoves[Math.floor(Math.random() * topMoves.length)];
    
    return {
        pieces: {
            ...gameState.pieces,
            [selectedMove.to]: selectedMove.piece,
            [selectedMove.from]: undefined
        },
        turn: isRed ? "black" : "red",
        from: selectedMove.from,
        to: selectedMove.to
    };
}

// 检查是否应该执行AI移动
export function shouldMakeMove(gameState, playerColor) {
    // 如果游戏已经结束，不应该移动
    if (isGameOver(gameState.pieces)) {
        return false;
    }
    return gameState.turn !== playerColor;
}