import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth";

let io: SocketIOServer;

export const initSocket = (server: HttpServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin:
        process.env.FRONTEND_URL ||
        "http://localhost:5173",
      credentials: true,
    },
  });

  /*
   * Authenticate every Socket.IO connection
   * using the existing Better Auth session.
   */
  io.use(async (socket, next) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(
          socket.request.headers,
        ),
      });

      if (!session) {
        return next(
          new Error("Unauthorized socket connection"),
        );
      }

      /*
       * Store the authenticated user on the socket.
       */
      socket.data.user = session.user;

      next();
    } catch (error) {
      console.error(
        "Socket authentication error:",
        error,
      );

      next(
        new Error("Unauthorized socket connection"),
      );
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;

    console.log(
      `Socket connected: ${socket.id} (${user?.id})`,
    );

    /*
     * User-specific room.
     *
     * The room is created from the authenticated
     * session, not from a role supplied by the client.
     */
    if (user?.id) {
      socket.join(`user_${user.id}`);
    }

    /*
     * User-created event.
     */
    socket.on("notify_user_created", () => {
  const currentUser = socket.data.user;

  if (
    currentUser?.role !== "admin" &&
    currentUser?.role !== "superadmin"
  ) {
    return;
  }

  io.emit("notify_user_created");
});

    socket.on("disconnect", (reason) => {
      console.log(
        `Socket disconnected: ${socket.id} (${reason})`,
      );
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }

  return io;
};