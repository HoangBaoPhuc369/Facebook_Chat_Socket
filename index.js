const io = require("socket.io")(8900, {
  cors: {
    origin: "http://localhost:3000",
  },
});

let users = [];

const addUser = (userId, socketId) => {
  !users.some((user) => user.userId === userId) &&
    users.push({ userId, socketId });
};

const removeUser = (socketId) => {
  users = users.filter((user) => user.socketId !== socketId);
};

const getUser = (userId) => {
  return users.find((user) => user.userId === userId);
};

io.on("connection", (socket) => {
  //when connect
  console.log("a user connected.");

  //take userId and socketId from user
  socket.on("addUser", (userId) => {
    addUser(userId, socket.id);
    io.emit("getUsers", users);
  });

  //send and get message
  socket.on("sendMessage", ({ senderId, receiverId, currentChatId, text }) => {
    const user = getUser(receiverId);
    const user2 = getUser(senderId);
    io.to(user?.socketId).emit("getMessage", {
      senderId,
      currentChatId,
      text,
    });

    io.to(user2?.socketId).emit("getMessage", {
      senderId,
      currentChatId,
      text,
    });
  });

  // Listen typing events
  socket.on("start typing message", (data) => {
    const user = getUser(data.receiverId);
    io.to(user?.socketId).emit("start typing message", data);
  });
  socket.on("stop typing message", (data) => {
    const user = getUser(data.receiverId);
    io.to(user?.socketId).emit("stop typing message", data);
  });

  //when disconnect
  socket.on("disconnect", () => {
    console.log("a user disconnected!");
    removeUser(socket.id);
    io.emit("getUsers", users);
  });
});
