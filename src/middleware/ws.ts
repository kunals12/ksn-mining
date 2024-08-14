import jwt from "jsonwebtoken";

// Define a custom interface extending the WebSocket interface
export interface AuthenticatedWebSocket extends WebSocket {
  on(arg0: string, arg1: () => void): unknown;
  user?: any;
}

// Middleware to verify JWT token and attach user data to WebSocket object
export function verifyTokenAndAttachUser(
  ws: AuthenticatedWebSocket,
  req: Request
) {
  const token = req.url?.split("token=")[1]; // Extract token from WebSocket URL
  if (!token) {
    ws.close(1008, "Token not provided");
    return;
  }

  jwt.verify(token, "your_secret_key", (err, decoded) => {
    if (err) {
      ws.close(1008, "Invalid token");
      return;
    }

    // Attach user data to WebSocket object
    ws.user = decoded;
  });
}
