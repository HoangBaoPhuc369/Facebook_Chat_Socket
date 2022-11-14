const io = require("socket.io")(8900, {
  cors: {
    origin: "http://localhost:3000",
  },
});

const { PeerServer } = require('peer');
 
const peerServer = PeerServer({ port: 9000, path: '/myapp' });

let users = [];

const broadcastEventTypes = {
  ACTIVE_USERS: 'ACTIVE_USERS',
  GROUP_CALL_ROOMS: 'GROUP_CALL_ROOMS'
};

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

    console.log("users", users);

    io.sockets.emit('broadcast', {
      event: broadcastEventTypes.ACTIVE_USERS,
      activeUsers: users
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

  //when disconnect
  socket.on("disconnect", () => {
    console.log("a user disconnected!");
    removeUser(socket.id);
    io.emit("getUsers", users);
  });
});
