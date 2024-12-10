import React, { useState, useEffect } from "react";
import Chessboard from "./components/Chessboard";

const ChessRoom = () => {
  const [ws, setWs] = useState(null);
  const [playerColor, setPlayerColor] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [roomList, setRoomList] = useState([]);
  const [roomId, setRoomId] = useState(null);

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

  useEffect(() => {
    if (!ws) return;

    const handleMessage = (message) => {
      const data = JSON.parse(message.data);
      console.log("收到服务器消息:", data);

      switch (data.type) {
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
  }, [ws, roomList]); // 添加 roomList 作为依赖

  const handleCreateRoom = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "createRoom" }));
    }
  };

  const handleJoinRoom = (roomId) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log("尝试加入房间:", roomId);
      ws.send(JSON.stringify({ type: "joinRoom", roomId: roomId.toString() }));
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

  return (
    <div>
      <h2>房间列表</h2>
      {roomList.length === 0 ? (
        <p>暂无可用房间</p>
      ) : (
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
      <button onClick={handleCreateRoom}>创建房间</button>
      {roomId && (
        <>
          <h1>房间号: {roomId}</h1>
          <h2>你是: {playerColor === "red" ? "红方" : "黑方"}</h2>
          {gameState && <Chessboard gameState={gameState} onMove={handleMove} onUndo={handleUndo} onRestart={handleRestart} />}
        </>
      )}
    </div>
  );
};

export default ChessRoom;
