import React, { useState, useEffect } from "react";
import Chessboard from "./components/Chessboard";

const ChessRoom = () => {
    const [ws, setWs] = useState(null);
    const [playerColor, setPlayerColor] = useState(null);
    const [gameState, setGameState] = useState(null);
    const [roomList, setRoomList] = useState([]);
    const [roomId, setRoomId] = useState(null);
    const [nickname, setNickname] = useState(()=>localStorage.getItem("nickname") || "");

    useEffect(() => {
        localStorage.setItem("nickname", nickname);
    }, [nickname]);

    useEffect(() => {
        let socket = null;
        
        const connectWebSocket = () => {
            socket = new WebSocket("ws://localhost:3001");
            
            socket.onopen = () => {
                console.log("WebSocket connected");
                socket.send(JSON.stringify({ type: "getRoomList" }));
            };

            socket.onclose = () => {
                console.log("WebSocket disconnected");
                // 可选：重连逻辑
                // setTimeout(connectWebSocket, 1000);
            };

            setWs(socket);
            };

            connectWebSocket();

            // 清理函数
            return () => {
            if (socket) {
                socket.close();
            }
        };
    }, []); // 空依赖数组，只在组件挂载时执行一次

    // 添加处理 AI 模式切换的函数
    const handleToggleAI = () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "toggleAI", roomId }));
        }
    };

    useEffect(() => {
        if (!ws) return;

        const handleMessage = (message) => {
        const data = JSON.parse(message.data);
        console.log("收到服务器消息:", data);

        switch (data.type) {
            case "aiModeChanged":
              setGameState(data.state);
              break;
            case "playerLeft":
                console.log("playerLeft", data.player, ws);
                console.log("nickname", data.player.nickname, nickname);
                if (data.player.nickname === nickname) {
                    alert("你已离开房间");
                    setRoomId(null);
                    setPlayerColor(null);
                    setGameState(null);
                } else {
                    alert("对手已离开");
                    console.log("data.state", gameState, data.state);
                    setGameState(data.state);
                }
            break;
            case "roomList":
            // 只在房间列表有变化时更新
            if (JSON.stringify(roomList) !== JSON.stringify(data.rooms)) {
                console.log("更新房间列表:", data.rooms);
                setRoomList(data.rooms);
            }
            break;
            case "roomJoined":
            setRoomId(data.roomId);
            setPlayerColor(data.playerColor);
            setGameState(data.state);
            break;
            case "move":
            setGameState(data.state);
            break;
            case "undo":
            setGameState(data.state);
            break;
            case "restart":
            setGameState(data.state);
            break;
            case "playerDisconnected":
            alert("对手断开连接");
            break;
            case "error":
            alert(data.message);
            break;
            default:
            console.log("Unknown message type:", data.type);
        }
        };

        ws.onmessage = handleMessage;
    }, [ws, roomList, gameState, playerColor, nickname]); // 添加 roomList 作为依赖

    const handleCreateRoom = () => {
        if (!nickname) {
            alert("请先输入昵称");
            return;
        }
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ 
                type: "createRoom",
                payload: { nickname }
            }));
        }
    };

    const handleJoinRoom = (roomId) => {
        if (!nickname) {
            alert("请先输入昵称");
            return;
        }
        if (ws && ws.readyState === WebSocket.OPEN) {
            console.log("尝试加入房间:", roomId);
            ws.send(JSON.stringify({ 
                type: "joinRoom", 
                roomId: roomId.toString(),
                payload: { nickname }
            }));
        }
    };

    const handleUndo = () => {
        if (ws) {
            ws.send(JSON.stringify({ type: "undo", roomId  }));
        }
    };

    const handleMove = (move) => {
        if (ws) {
            ws.send(JSON.stringify({ type: "move", roomId, payload: move }));
        }
    };

    const handleRestart = () => {
        if (ws) {
            ws.send(JSON.stringify({ type: "restart", roomId }));
        }
    };

    const handleLeaveRoom = () => {
        if (ws) {
            ws.send(JSON.stringify({ type: "leaveRoom", roomId }));
        }
    };

    return (
        <div>
            <input type="text" placeholder="请输入昵称" value={nickname} onChange={(e) => setNickname(e.target.value)} />
            {gameState === null && (
                <h3>房间列表</h3>
            )}
            {roomList.length === 0 && gameState === null ? (
                <p>暂无可用房间</p>
            ) : gameState === null && (
                roomList.map((room) => (
                <div 
                    key={room} 
                    onClick={() => handleJoinRoom(room)}
                    style={{ cursor: 'pointer', padding: '10px', border: '1px solid #ccc', margin: '5px' }}
                >
                    房间号: {room}
                </div>
                ))
            )}
            {gameState === null && <button onClick={handleCreateRoom}>创建房间</button>}
            {roomId && (
                <>
                <h3>房间号: {roomId}</h3>
                {gameState?.players && (
                    <div className="player-info">
                    <div>红方: {gameState.players.find(player => player.color === "red")?.nickname || "等待加入"}</div>
                    <div>黑方: {gameState.players.find(player => player.color === "black")?.nickname || "等待加入"}</div>
                    </div>
                )}
                <h4>你是: {playerColor === "red" ? "红方" : "黑方"}</h4>
                {/* 只对红方显示 AI 模式切换按钮 */}
                {playerColor === "red" && (
                    <button onClick={handleToggleAI}>
                    {gameState?.isAIMode ? "关闭AI模式" : "开启AI模式"}
                    </button>
                )}
                {gameState && <Chessboard 
                    gameState={gameState} 
                    onMove={handleMove} 
                    onUndo={handleUndo} 
                    onRestart={handleRestart} 
                    playerColor={playerColor}
                    onLeaveRoom={handleLeaveRoom}
                />}
                </>
            )}
        </div>
    );
};

export default ChessRoom;
