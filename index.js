const { Server } = require("socket.io");
const express = require("express");
const io = new Server(4040, {
  cors: {
    origin: "*",  // Be more specific in production
    methods: ["GET", "POST"]
  }
});
const emailToSocketIdMap = new Map();
const socketidToEmailMap = new Map();
io.on("connection", (socket) => {
  console.log(`Socket Connected`, socket.id);

  socket.on("lobby:join", (data) => {
    const { email } = data;
    console.log(`User ${email} joined lobby `)
    if (emailToSocketIdMap.has(email)) {
      console.log("User already in lobby");
      io.to(socket.id).emit("lobby:joined:failed", "User already in lobby");
      io.to(socket.id).emit("lobby:joined", Array.from(emailToSocketIdMap));
      return
    }
    for (let [key, value] of emailToSocketIdMap) {
      console.log(key + ' = ' + value);
    }
    socket.join("lobby");
    io.to(socket.id).emit("lobby:joined", Array.from(emailToSocketIdMap));
    io.to("lobby").emit("user:joined", [email, socket.id]);
    emailToSocketIdMap.set(email, socket.id);
    socketidToEmailMap.set(socket.id, email);
    for (let [key, value] of socketidToEmailMap) {
      console.log(key + ' = ' + value);
    }
  })
  // socket.on("room:join", (data) => {
  //   const { email, room } = data;
  //   console.log(`User ${email} joined room ${room}`);
  //   emailToSocketIdMap.set(email, socket.id);
  //   socketidToEmailMap.set(socket.id, email);
  //   socket.join(room);
  //   io.to(room).emit("user:joined", { email, id: socket.id });
  //   io.to(socket.id).emit("room:join", data);
  // });
  socket.on('call:hangup', (data) => {
    const { to } = data;
    io.to(to).emit('call:hangup', { from: socket.id });
    console.log(`User ${socket.id} is hanging up call with ${to}`);
  });
  socket.on("user:call", ({ to, offer }) => {
    io.to(to).emit("incomming:call", { from: socket.id,name:socketidToEmailMap.get(socket.id), offer });
    console.log(`User ${socketidToEmailMap.get(socket.id)} is calling ${to}`);
  });
  socket.on("lobby:leave", (data) => {
    const { email } = data;
    console.log(`User ${email} left lobby `)
    if (!emailToSocketIdMap.has(email)) {
      console.log("User not in lobby");
      io.to(socket.id).emit("lobby:leave:failed", "User not in lobby");
      return
    }
    emailToSocketIdMap.delete(email);
    socket.leave("lobby");
    io.to(socket.id).emit("lobby:leave", Array.from(emailToSocketIdMap));
    io.to("lobby").emit("user:left", [email, socket.id]);
  })
  socket.on("call:accepted", ({ to, ans }) => {
    io.to(to).emit("call:accepted", { from: socket.id, ans });
    console.log(`Call accepted from ${socket.id} to ${to}`);
  });

  socket.on("peer:nego:needed", ({ to, offer }) => {
    console.log("peer:nego:needed", offer);
    io.to(to).emit("peer:nego:needed", { from: socket.id, offer });

  });

  socket.on("peer:nego:done", ({ to, ans }) => {
    console.log("peer:nego:done", ans);
    io.to(to).emit("peer:nego:final", { from: socket.id, ans });
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("ice-candidate", { from: socket.id, candidate });
    console.log("Ice Candidate", candidate);
  });
});