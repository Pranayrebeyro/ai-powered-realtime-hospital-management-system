import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace(/\/api$/, "") ||
  "http://localhost:5000";

export const socket = io(SOCKET_URL, {
  withCredentials: true, // Important if you need to send cookies
  autoConnect: false, // We connect manually in the component
});
