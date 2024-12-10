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
        case "leaveRoom":
            handleLeaveRoom(ws, roomId);
            break;
        case "createRoom":
            handleCreateRoom(ws, payload);
            break;
        case "getRoomList":
            handleGetRoomList(ws);
            break;
        case "joinRoom":
            handleJoinRoom(ws, roomId, payload);
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
    console.log("WebSocket连接关闭");
    cleanUpDisconnectedPlayer(ws);
  });
});

function handleGetRoomList(ws) {
  ws.send(JSON.stringify({ type: "roomList", rooms: Object.keys(rooms) }));
}

function handleLeaveRoom(ws, roomId) {
  const room = rooms[roomId];
  if (!room) return;
  
  // 找到离开的玩家
  const leavingPlayer = room.players.find(player => player.ws === ws);
  if (!leavingPlayer) return;
  
  // 先广播消息
  // 广播后再从房间移除玩家
  broadcastToRoom(roomId, { 
    type: "playerLeft", 
    player: {
      color: leavingPlayer.color,
      nickname: leavingPlayer.nickname
    },
    state: {
      ...room.state,
      players: room.players.map(p => ({
        color: p.color,
        nickname: p.nickname
      }))
    }
  });
  room.players = room.players.filter(player => player.ws !== ws);
  broadcastToRoom(roomId, { 
    type: "playerLeft", 
    player: {
      color: leavingPlayer.color,
      nickname: leavingPlayer.nickname
    },
    state: {
      ...room.state,
      players: room.players.map(p => ({
        color: p.color,
        nickname: p.nickname
      }))
    }
  });
  
  // 如果房间空了就删除
  if (room.players.length === 0) {
    delete rooms[roomId];
  }

  // 更新房间列表
  broadcastToAll({ type: "roomList", rooms: Object.keys(rooms) });
}

function handleCreateRoom(ws, payload) {
  const roomId = Date.now().toString();
  const { nickname } = payload;
  
  // 检查所有房间中是否有相同昵称的玩家
  const nicknameExists = Object.values(rooms).some(room => 
    room.players.some(player => player.nickname === nickname)
  );
  
  if (nicknameExists) {
    ws.send(JSON.stringify({ 
      type: "error", 
      message: "该昵称已被使用，请更换昵称" 
    }));
    return;
  }
  
  console.log("创建新房间:", roomId, "创建者昵称:", nickname);
  
  rooms[roomId] = {
    players: [{
      ws,
      color: "red",
      nickname
    }],
    state: createInitialState()
  };
  
  ws.send(JSON.stringify({
    type: "roomJoined",
    roomId,
    playerColor: "red",
    state: {
      ...rooms[roomId].state,
      players: rooms[roomId].players.map(p => ({
        color: p.color,
        nickname: p.nickname
      }))
    }
  }));
  
  broadcastToAll({ type: "roomList", rooms: Object.keys(rooms) });
}

function handleJoinRoom(ws, roomId, payload) {
  const { nickname } = payload;
  console.log("尝试加入房间:", roomId);
  
  if (!rooms[roomId]) {
    ws.send(JSON.stringify({ type: "error", message: "房间未找到" }));
    return;
  }

  const room = rooms[roomId];
  
  if (room.players.length >= 2) {
    ws.send(JSON.stringify({ type: "error", message: "房间已满" }));
    return;
  }

  // 检查房间中是否有相同昵称的玩家
  if (room.players.some(player => player.nickname === nickname)) {
    ws.send(JSON.stringify({ 
      type: "error", 
      message: "该昵称已被使用，请更换昵称" 
    }));
    return;
  }

  // 检查现有玩家的颜色，分配另一个颜色
  const existingPlayer = room.players[0];
  const newPlayerColor = existingPlayer ? 
    (existingPlayer.color === "red" ? "black" : "red") : 
    "red";

  room.players.push({
    ws,
    color: newPlayerColor,
    nickname
  });
  
  // 发送加入成功消息给新加入的玩家
  ws.send(JSON.stringify({
    type: "roomJoined",
    roomId,
    playerColor: newPlayerColor,
    state: {
      ...room.state,
      players: room.players.map(p => ({
        color: p.color,
        nickname: p.nickname
      }))
    }
  }));

  // 广播更新后的游戏状态给房间内所有玩家
  broadcastToRoom(roomId, {
    type: "move",  // 使用 move 类型来更新状态
    state: {
      ...room.state,
      players: room.players.map(p => ({
        color: p.color,
        nickname: p.nickname
      }))
    }
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
  
  // 检查历史记录是否存在
  if (room.state.history?.length > 1) {
    // 获取倒数第二个状态（上一步的状态）
    const previousState = room.state.history[room.state.history.length - 2];
    
    // 恢复到上一步的状态
    room.state.pieces = previousState.pieces;
    room.state.turn = previousState.turn;
    
    // 移除最后一步
    room.state.history = room.state.history.slice(0, -1);
    
    // 广播��棋后的状态
    broadcastToRoom(roomId, {
      type: "undo",
      state: {
        pieces: room.state.pieces,
        turn: room.state.turn,
        history: room.state.history,
        players: room.players.map(p => ({
          color: p.color,
          nickname: p.nickname
        }))
      }
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

  room.players.forEach(({ws}) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
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

function cleanUpDisconnectedPlayer(ws) {
  Object.keys(rooms).forEach((roomId) => {
    const room = rooms[roomId];
    if (room) {
      room.players = room.players.filter((player) => player.ws !== ws);
      if (room.players.length === 0) {
        delete rooms[roomId];
        console.log(`房间 ${roomId} 已销毁`);
      }
    }
  });
  // 广播更新后的房间列表
  broadcastToAll({ type: "roomList", rooms: Object.keys(rooms) });
}
