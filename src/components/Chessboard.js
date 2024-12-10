import React, { useState, useEffect } from "react";
import Square from "./Square";
import Piece from "./Piece";
import { isValidMove } from "../utils/rules";
import "../styles.css";
import { getNextMove, shouldMakeMove } from '../utils/autoPlayer';

const Chessboard = ({ gameState, onMove, onUndo, onRestart, onLeaveRoom, playerColor }) => {
    const [selectedPiece, setSelectedPiece] = useState(null);
    const [turn, setTurn] = useState(gameState.turn);
    const [pieces, setPieces] = useState(gameState.pieces);
    const [history, setHistory] = useState(gameState.history); // 棋局历史记录
    const [winner, setWinner] = useState(null); // 获胜方，null 表示游戏未结束

    useEffect(() => {
        // 更新棋局状态
        setPieces(gameState.pieces);
        setTurn(gameState.turn);
        setHistory(gameState.history);

        // 只在AI模式开启时才执行AI移动
        if (gameState?.isAIMode && shouldMakeMove(gameState, playerColor)) {
            // 添加一个小延迟，使移动看起来更自然
            const timer = setTimeout(() => {
                const aiMove = getNextMove(gameState, gameState.turn === "red");
                if (aiMove) {
                    onMove(aiMove);
                }
            }, 500);
            
            return () => clearTimeout(timer);
        }
    }, [gameState, playerColor]);

    // 检查棋子是否属于当前回合的玩家
    const isCurrentTurnPiece = (piece) => {
        const isRed = ["帥", "仕", "相", "車", "馬", "炮", "卒"].includes(piece);
        return (turn === "red" && isRed) || (turn === "black" && !isRed);
    };

    // 检查是否有一方获胜
    const checkWinner = (currentPieces) => {
        const hasRedKing = Object.values(currentPieces).includes("帥");
        const hasBlackKing = Object.values(currentPieces).includes("将");
        
        if (!hasRedKing) {
            setWinner("黑方");
        } else if (!hasBlackKing) {
            setWinner("红方");
        }
    };
  
    // 点击格子的处理逻辑
    const handleSquareClick = (position) => {
        if (winner) return; // 游戏结束后不允许继续操作

        // 检查是否是当前玩家的回合
        if (turn !== playerColor) {
            alert("还没轮到你的回合");
            return;
        }

        if (selectedPiece) {
            const piece = pieces[selectedPiece];
            // 检查是否是当前玩家的棋子
            if ((playerColor === "red" && !isRedPiece(piece)) || 
                (playerColor === "black" && !isBlackPiece(piece))) {
                alert("只能移动自己的棋子");
                setSelectedPiece(null);
                return;
            }

            if (isValidMove(selectedPiece, position, piece, pieces)) {
                // 保存当前状态到历史记录
                // setHistory((prevHistory) => [...prevHistory, { pieces, turn }]);

                // 更新棋局
                const newPieces = { ...pieces };
                newPieces[position] = newPieces[selectedPiece];
                delete newPieces[selectedPiece];
                setPieces(newPieces);

                setSelectedPiece(null);
                const newTurn = turn === "red" ? "black" : "red";
                setTurn(newTurn); // 切换回合

                // 通知服务器
                onMove({ pieces: newPieces, turn: newTurn });

                // 检查是否有一方获胜
                checkWinner(newPieces);
            } else {
                setSelectedPiece(null);
            }
        } else if (pieces[position]) {
            const piece = pieces[position];
            // 检查是否是当前玩家的棋子
            if ((playerColor === "red" && isRedPiece(piece)) || 
                (playerColor === "black" && isBlackPiece(piece))) {
                setSelectedPiece(position); // 选中棋子
            } else {
                alert("只能选择自己的棋子");
            }
        }
    };

    // 悔棋逻辑
    const handleUndo = () => {
        onUndo();
        // if (history.length > 0) {
        //     const lastState = history[history.length - 1]; // 获取最后一个状态
        //     setPieces(lastState.pieces); // 恢复棋局状态
        //     setTurn(lastState.turn); // 恢复回合状态
        //     setHistory((prevHistory) => prevHistory.slice(0, -1)); // 移除最后一个历史状态
        //     setWinner(null); // 重置获胜方

        //     // 通知服务器
        //     onUndo(lastState);
        // }
    };

    // 重新开始逻辑
    const handleRestart = () => {
        const initialPieces = {
        "0-0": "車", "0-1": "馬", "0-2": "相", "0-3": "仕", "0-4": "帥",
        "0-5": "仕", "0-6": "相", "0-7": "馬", "0-8": "車",
        "2-1": "炮", "2-7": "炮",
        "3-0": "卒", "3-2": "卒", "3-4": "卒", "3-6": "卒", "3-8": "卒",
        "9-0": "車", "9-1": "馬", "9-2": "象", "9-3": "士", "9-4": "將",
        "9-5": "士", "9-6": "象", "9-7": "馬", "9-8": "車",
        "7-1": "砲", "7-7": "砲",
        "6-0": "兵", "6-2": "兵", "6-4": "兵", "6-6": "兵", "6-8": "兵",
        };
        setPieces(initialPieces);
        setTurn("red");
        setWinner(null);
        setHistory([]);
        onRestart();
    };

    const board = [];
    for (let row = 0; row < 10; row++) {
        const rowContent = [];
        for (let col = 0; col < 9; col++) {
        const position = `${row}-${col}`;
        const piece = pieces[position];
        const isSelected = position === selectedPiece;

        rowContent.push(
            <Square
            key={position}
            position={position}
            isSelected={isSelected}
            onClick={() => handleSquareClick(position)}
            >
            {piece && <Piece type={piece} />}
            </Square>
        );
        }

        // 插入楚河汉界
        if (row === 4) {
        board.push(
            <div key={`row-${row}`} className="board-row">
            {rowContent}
            </div>
        );
        board.push(
            <div key="楚河汉界" className="chess-divider">
            <span>楚河</span>
            <span>汉界</span>
            </div>
        );
        } else {
        board.push(
            <div key={`row-${row}`} className="board-row">
            {rowContent}
            </div>
        );
        }
    }

    const handleLeaveRoom = () => {
        onLeaveRoom();
    };

    // Helper functions to determine piece color
    const isRedPiece = (piece) => ["帥", "仕", "相", "車", "馬", "炮", "卒"].includes(piece);
    const isBlackPiece = (piece) => ["将", "士", "象", "车", "马", "砲", "兵"].includes(piece);

    return (
        <div className="chessboard-container">
        <h3>中国象棋</h3>
        <h4>当前回合：<span className={turn === "red" ? "red" : "black"}>{turn === "red" ? "红方" : "黑方"}</span></h4>
        {winner ? <h4>胜者：{winner}</h4> : null}
        <button onClick={handleUndo} disabled={history?.length === 0}>
            悔棋
        </button>
        <button onClick={handleRestart}>重新开始</button>
        <button onClick={handleLeaveRoom}>离开房间</button>
        <div className="chessboard">{board}</div>
        </div>
    );
};

export default Chessboard;
