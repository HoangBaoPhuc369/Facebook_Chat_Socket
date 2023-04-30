const express = require("express");
const socket = require("socket.io");
const { ExpressPeerServer } = require("peer");
const groupCallHandler = require("./groupCallHandler");
const PORT = 8900;

const app = express();

const server = app.listen(PORT, () => {
  console.log(`server is listening on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});

const peerServer = ExpressPeerServer(server, {
  debug: true,
});

app.use("/peerjs", peerServer);

groupCallHandler.createPeerServerListeners(peerServer);

const io = socket(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let users = [];

const broadcastEventTypes = {
  ACTIVE_USERS: "ACTIVE_USERS",
  GROUP_CALL_ROOMS: "GROUP_CALL_ROOMS",
};

const addUser = (userId, socketId, userName, picture, timeJoin) => {
  !users.some((user) => user.userId === userId) &&
    users.push({ userId, socketId, userName, picture, timeJoin });
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
  socket.on("addUser", (data) => {
    addUser(data.userId, socket.id, data.userName, data.picture, data.timeJoin);
    io.emit("getUsers", users);

    io.emit("broadcast", {
      event: broadcastEventTypes.ACTIVE_USERS,
      activeUsers: users,
    });
  });

  //send and get message
  socket.on("sendMessage", ({ messages, currentChatID }) => {
    const user = getUser(messages?.receiver);
    io.to(user?.socketId).emit("getMessage", { messages, currentChatID });
  });

  //get and sent message delivered
  socket.on("messageDelivered", (data) => {
    const user = getUser(data.message?.sender);
    io.to(user?.socketId).emit("getMessageDelivered", data);
  });

  //get and sent message seen
  socket.on("messageSeen", (data) => {
    const user = getUser(data.message?.sender);
    io.to(user?.socketId).emit("getMessageSeen", data);
  });

  //get and sent message seen all
  socket.on("messageSeenAll", (data) => {
    const user = getUser(data.receiverId);
    io.to(user?.socketId).emit("getMessageSeenAll", data);
  });

  // Listen typing events
  socket.on("start typing message", (data) => {
    console.log("start typing message", data);
    const user = getUser(data.receiverId);
    io.to(user?.socketId).emit("start typing message", data);
  });
  socket.on("stop typing message", (data) => {
    const user = getUser(data.receiverId);
    io.to(user?.socketId).emit("stop typing message", data);
  });

  //=================Notifications =================//
  //send and get notification
  socket.on("sendNotification", (data) => {
    const user = getUser(data.receiverId);
    io.to(user?.socketId).emit("getNotification", data);
  });

  //=================HANDLE Call =================//

  // listeners related with direct call
  socket.on("call-other", (data) => {
    const user = getUser(data.receiveId);
    io.to(user?.socketId).emit("call-other", {
      callerUserId: data.senderId,
      callerUsername: data.username,
      callerPicture: data.picture,
      roomId: data.roomId,
    });
  });

  //when disconnect
  socket.on("disconnect", () => {
    console.log("a user disconnected!");
    removeUser(socket.id);
    io.emit("getUsers", users);
  });

});
