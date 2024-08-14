import jwt from "jsonwebtoken";
// import { Request, Response } from 'express';

// Extract the token from the "Bearer <token>" format
export const checkTokenFormat = (token: any) => {
  const tokenParts = token.split(" ");
  if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
    throw new Error("Unauthorized: Invalid token format");
  }
  return tokenParts[1];
};

// Function to verify the token
export const verifyJwtToken = (token: any) => {
  try {
    const decoded = jwt.verify(token, "your_secret_key");
    return decoded;
  } catch (error) {
    // console.error("Error verifying JWT token:", error.message);
    return null; // or whatever value you prefer to indicate failure
  }
};

// Middleware function for token authentication
export const authenticateJwtToken = (req: any, res: any, next: any) => {
  const token = req.headers["authorization"];
  if (!token) {
    return res.status(401).json({
      message: "Unauthorized: Token missing",
    });
  }

  // Check the token format
  const authToken = checkTokenFormat(token);
  if (!authToken) {
    return res.status(401).json({
      message: "Unauthorized: Invalid token format",
    });
  }

  // Verify JWT token
  const decoded = verifyJwtToken(authToken);
  if (!decoded) {
    return res.status(401).json({
      message: "Unauthorized Token",
    });
  }  
  // Token is valid, continue to the next middleware or route handler
  req.user = decoded; // Attach the decoded user data to the request object
  next();
};

// export const getUserIdFromToken = async(req:Request, res:Response) =>{
//    // Decode JWT token from request header
//    const token = req.header("Authorization")?.split(" ")[1];

//    if (!token) {
//        return res.status(401).json({ error: 'No token provided' });
//    }

//    const decodedToken = jwt.decode(token) as { userId: string }; // Assuming your token contains a userId

//    const userId = decodedToken.userId;
//    console.log(userId);
//    return userId;
// }
