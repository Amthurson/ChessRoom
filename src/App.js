import React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import ChessRoom from "./Chatroom";
function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="App">
        <ChessRoom />
      </div>
    </DndProvider>
  );
}

export default App;
