import WebSocket from 'ws';
import http from 'http';
import jwt from 'jsonwebtoken';

export async function startWS(http: any, path: any) {    
    const wss = new WebSocket.Server({ server: http });

    wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
        console.log("connection");
        
        // Extract the JWT token from the request headers
        const token = req.headers['authorization'];
        console.log(token);
        
      
        if (!token) {
          ws.close(1008, 'Unauthorized: Missing JWT token');
          return;
        }
      
        try {
          // Verify the JWT token
          const decoded = jwt.verify(token, 'your-secret-key') as { userId: string };
      
          // Store the user ID associated with this WebSocket connection
          const userId = decoded.userId;
      
          // Perform any necessary user authentication logic here...
          // For example, you can check if the user exists in your database,
          // or if they have permission to access the WebSocket server.
      
          // If the user is authenticated, you can send them a welcome message
          ws.send('Welcome to the WebSocket server!');
      
          // Handle incoming messages from the client
          ws.on('message', (message: string) => {
            console.log(`Received message from user ${userId}: ${message}`);
            // Handle the incoming message...
          });
      
          // Handle WebSocket connection closure
          ws.on('close', () => {
            console.log(`WebSocket connection closed for user ${userId}`);
            // Perform any cleanup tasks...
          });
      
        } catch (error) {
          console.error('WebSocket connection error:', error);
          ws.close(1008, 'Unauthorized: Invalid JWT token');
        }
      });
}
