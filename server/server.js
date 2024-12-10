const express = require("express");
const { WebSocketServer, WebSocket } = require("ws");

const app = express();
const PORT = 3001;

// 将 rooms 移到全局作用域
const rooms = {};  // 改为 const，并移到顶层

// 启动 HTTP 服务
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// 启动 WebSocket 服务
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("新的WebSocket连接");
  
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      const { type, roomId, payload } = data;
      console.log("收到消息:", type, roomId);

      switch (type) {
        case "createRoom":
            handleCreateRoom(ws);
            break;
        case "getRoomList":
            handleGetRoomList(ws);
            break;
        case "joinRoom":
            handleJoinRoom(ws, roomId);
            break;
        case "move":
            handleMove(ws, roomId, payload);
            break;
        case "undo":
            handleUndo(ws, roomId);
            break;
        case "restart":
            handleRestart(ws, roomId);
            break;
        case "disconnect":
            handleDisconnect(ws, roomId);
            break;
        default:
            console.log("Unknown message type:", type);
    }
    } catch (error) {
      console.error("消息处理错误:", error);
    }
  });

  ws.on("close", () => {
    // 清理断线用户
    Object.keys(rooms).forEach((roomId) => {
      if (rooms[roomId]) {
        rooms[roomId].players = rooms[roomId].players.filter((player) => player !== ws);
        if (rooms[roomId].players.length === 0) {
          delete rooms[roomId];
        }
      }
    });
    // 广播更新后的房间列表
    broadcastToAll({ type: "roomList", rooms: Object.keys(rooms) });
  });
});

function handleGetRoomList(ws) {
  ws.send(JSON.stringify({ type: "roomList", rooms: Object.keys(rooms) }));
}

function handleCreateRoom(ws) {
  const roomId = Date.now().toString();
  console.log("创建新房间:", roomId);
  
  rooms[roomId] = {
    players: [ws],
    state: createInitialState()
  };
  
  ws.send(JSON.stringify({
    type: "roomJoined",
    roomId,
    playerColor: "red",
    state: rooms[roomId].state
  }));
  
  // 广播更新后的房间列表
  broadcastToAll({ type: "roomList", rooms: Object.keys(rooms) });
}

function handleJoinRoom(ws, roomId) {
  console.log("尝试加入房间:", roomId);
  console.log("当前所有房间:", Object.keys(rooms));
  console.log("房间信息:", rooms[roomId]);
  
  if (!rooms[roomId]) {
    ws.send(JSON.stringify({ type: "error", message: "房间未找到" }));
    return;
  }

  const room = rooms[roomId];
  
  if (room.players.length >= 2) {
    ws.send(JSON.stringify({ type: "error", message: "房间已满" }));
    return;
  }

  room.players.push(ws);
  const playerColor = room.players.length === 1 ? "red" : "black";
  
  ws.send(JSON.stringify({
    type: "roomJoined",
    roomId,
    playerColor,
    state: room.state
  }));

  broadcastToRoom(roomId, {
    type: "playerJoined",
    playerColor,
  });
}

function handleMove(ws, roomId, move) {
  const room = rooms[roomId];
  if (!room) return;

  // 更新棋盘状态
  room.state.pieces = move.pieces;
  room.state.turn = move.turn;

  room.state.history.push(move);

  broadcastToRoom(roomId, {
    type: "move",
    state: room.state,
  });
}

function handleUndo(ws, roomId) {
  const room = rooms[roomId];
  if (!room) return;
  console.log(room.state.history);
  // 恢复上一状态（仅示例）
  if (room.state.history?.length > 0) {
    const lastState = room.state.history[room.state.history.length - 1]; // 获取最后一个状态
    room.state.pieces = lastState.pieces; // 恢复棋局状态
    room.state.turn = lastState.turn; // 恢复回合状态
    room.state.history = room.state.history.slice(0, -1); // 移除最后一个历史状态
    broadcastToRoom(roomId, {
      type: "undo",
      state: lastState,
    });
  }
}

function handleRestart(ws, roomId) {
  const room = rooms[roomId];
  if (!room) return;

  room.state = createInitialState();
  broadcastToRoom(roomId, { type: "restart", state: room.state });
}

function handleDisconnect(ws, roomId) {
  const room = rooms[roomId];
  if (!room) return;

  room.players = room.players.filter((player) => player !== ws);

  if (room.players.length === 0) {
    delete rooms[roomId];
  } else {
    broadcastToRoom(roomId, { type: "playerDisconnected" });
  }
}

function broadcastToAll(message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

function broadcastToRoom(roomId, message) {
  const room = rooms[roomId];
  if (!room) return;

  room.players.forEach((player) => {
    player.send(JSON.stringify(message));
  });
}

function createInitialState() {
  return {
    pieces: {
      "0-0": "車", "0-1": "馬", "0-2": "相", "0-3": "仕", "0-4": "帥",
      "0-5": "仕", "0-6": "相", "0-7": "馬", "0-8": "車",
      "2-1": "炮", "2-7": "炮",
      "3-0": "卒", "3-2": "卒", "3-4": "卒", "3-6": "卒", "3-8": "卒",
      "9-0": "车", "9-1": "马", "9-2": "象", "9-3": "士", "9-4": "将",
      "9-5": "士", "9-6": "象", "9-7": "马", "9-8": "车",
      "7-1": "砲", "7-7": "砲",
      "6-0": "兵", "6-2": "兵", "6-4": "兵", "6-6": "兵", "6-8": "兵",
    },
    turn: "red",
    history: [],
  };
}
