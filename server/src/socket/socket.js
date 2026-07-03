import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

let io;

const onlineUsers = new Map();

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

      socket.userId = decoded.sub;
      socket.companyId = decoded.companyId || null;
      socket.role = decoded.role;

      next();
    } catch (error) {
      next(new Error("Invalid socket token"));
    }
  });

  io.on("connection", (socket) => {
    onlineUsers.set(socket.userId, socket.id);

    socket.join(`user:${socket.userId}`);

    if (socket.companyId) {
      socket.join(`company:${socket.companyId}`);
    }

    socket.on("disconnect", () => {
      onlineUsers.delete(socket.userId);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }

  return io;
};

export const emitNotificationToUser = (userId, notification) => {
  if (!io) return;

  io.to(`user:${userId}`).emit("notification:new", notification);
};

export const emitMessageToUser = (userId, message) => {
  if (!io) return;

  io.to(`user:${userId}`).emit("message:new", message);
};

export const emitToCompany = (companyId, eventName, payload) => {
  if (!io) return;

  io.to(`company:${companyId}`).emit(eventName, payload);
};

export const getOnlineUsers = () => {
  return Array.from(onlineUsers.keys());
};