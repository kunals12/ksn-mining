// routes/userRoutes.ts
import express, { Request, Response } from "express";
import { userSchema } from "../validation/userSchema";
import {
  changePassword,
  claim,
  createOtp,
  forgotPassword,
  getAddress,
  getMiningData,
  getMiningStatus,
  login,
  signUp,
  startMining,
  startMiningAtServerStartup,
  updateUser,
  verifyOTP,
} from "../controllers/users";
import { authenticateJwtToken } from "../middleware/jwtAuth";
import { getErrorResponse } from "../utils/common";
import axios from "axios";
const AWS = require('aws-sdk');
import { calculateReferralReward, countReferrals, generateReferralTableData, handleReferranceFromDataAfterMine } from "../controllers/referral";
import { uploadMiddleware } from "../controllers/fileParser";

// Define a custom interface extending the Request interface
interface AuthenticatedRequest extends Request {
 // Define the user property with userId
 user?: any
}

const router = express.Router();
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

router.get("/", (req: Request, res: Response) => {
  res.send("User route");
});

router.post("/startHandler", async (req: Request, res: Response) => {
  try {
    const { key } = req.body;
    if (key && key === process.env.START_KEY) {
      const startMining = await startMiningAtServerStartup();
      res.status(200).json({ message: "Mining Started", res: startMining });
    }
    // res.status(404).json({message: "Key Not Match", res: false});
  } catch (error: any) {
    const { statusCode, errorMessage } = getErrorResponse(error.message);
    res.status(statusCode).json({ error: errorMessage });
  }
});

router.post("/signup", async (req: Request, res: Response) => {
  try {
    const validatedData = userSchema.parse(req.body);
    const user = await signUp(
      validatedData.username,
      validatedData.email,
      req.body.address,
      validatedData.password,
      req.body.referenceFrom
    );
    res.status(200).json({ message: "User created successfully", res: user });
  } catch (error: any) {
    // console.log(error);
    
    const { statusCode, errorMessage } = getErrorResponse(error.message);
    res.status(statusCode).json({ error: errorMessage });
  }
});

router.post("/verify", async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body; // Assuming email and OTP are sent in the request body

    // Perform OTP verification here
    const isOTPValid = await verifyOTP(email, otp);

    if (isOTPValid) {
      res
        .status(200)
        .json({ message: "OTP verified successfully.", res: isOTPValid });
    } else {
      res.status(400).json({ message: "Invalid OTP." });
    }
  } catch (error: any) {
    const { statusCode, errorMessage } = getErrorResponse(error.message);
    res.status(statusCode).json({ error: errorMessage });
  }
});

// Endpoint for user login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if(!email) {
      throw new Error("Email is required")
    }

    // Validate email and password
    if (!password) {
      throw new Error("Password is required");
    }

    // Authenticate user
    const token = await login(email, password);
    // Send JWT token in response
    res
      .status(200)
      .json({ message: "User Logged-In Successfully", res: token });
  } catch (error: any) {  
    // console.log(error);
      
    const { statusCode, errorMessage } = getErrorResponse(error.message);
    res.status(statusCode).json({ error: errorMessage });
  }
});

// router.post('/doc/upload', uploadMiddleware.single('file'), async (req:AuthenticatedRequest, res:Response) => {
//   // File upload handling goes here
//   const file = req.file;

//   if(!file) {
//     return res.status(404).json({message: "File Not Found"});
//   }

//   const params = {
//     // Bucket: "process.env.AWS_S3_BUCKET_NAME",
//     Bucket: "kissanmining",
//     Key: file.originalname,
//     Body: file.buffer,
//     ContentType: file.mimetype
//   };

//   try {
//     const resp = await s3.upload(params).promise();
//     console.log({resp});
    
//     res.status(200).send('File uploaded to S3 successfully!');
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Error uploading file to S3');
//   }
// });

// PUT route for updating a user
router.put(
  "/update",
  authenticateJwtToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!._id;
      // Extract only specific fields from the request body
      const { address, email, username } = req.body;

      // Construct an object with the extracted fields
      const updatedUserData = { address, email, username };
      const updatedUser = await updateUser(userId, updatedUserData);
      res
        .status(200)
        .json({ message: "User updated successfully", user: updatedUser });
    } catch (error: any) {
      const { statusCode, errorMessage } = getErrorResponse(error.message);
      res.status(statusCode).json({ error: errorMessage });
    }
  }
);


router.post(
  "/otp/create",
  async (req: Request, res: Response) => {
    try {
      const {email} = req.body;

      const isOtpSent = await createOtp(email);
      res
        .status(200)
        .json({ message: "Otp sent", res: isOtpSent });
    } catch (error: any) {
      const { statusCode, errorMessage } = getErrorResponse(error.message);
      res.status(statusCode).json({ error: errorMessage });
    }
  }
);

// POST route for forgot password
router.post(
  "/password/forgot",
  async (req: Request, res: Response) => {
    try {
      const { email, otp, password } = req.body;
      const response = await forgotPassword(email, otp, password);
      // Implement your logic for sending a password reset email to the provided email address
      res
        .status(200)
        .json({
          message: "Password reset successfully",
          res: response,
        });
    } catch (error: any) {
      const { statusCode, errorMessage } = getErrorResponse(error.message);
      res.status(statusCode).json({ error: errorMessage });
    }
  }
);

// POST route for changing password
router.post(
  "/password/change",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!._id;
      const { oldPassword, newPassword } = req.body;
      const isPasswordChanged = await changePassword(
        userId,
        oldPassword,
        newPassword
      );
      res
        .status(200)
        .json({
          message: "Password changed successfully",
          res: isPasswordChanged,
        });
    } catch (error: any) {
      const { statusCode, errorMessage } = getErrorResponse(error.message);
      res.status(statusCode).json({ error: errorMessage });
    }
  }
);

router.get(
  "/address",
  authenticateJwtToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const address = await getAddress(req.user!._id);
      return res
        .status(200)
        .json({ message: "Address Received", res: { address } });
    } catch (error: any) {
      const { statusCode, errorMessage } = getErrorResponse(error.message);
      res.status(statusCode).json({ error: errorMessage });
    }
  }
);

router.get(
  "/ismining",
  authenticateJwtToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const address = await getMiningStatus(req.user!._id);
      return res
        .status(200)
        .json({ message: "Mining Status", res: { address } });
    } catch (error: any) {
      const { statusCode, errorMessage } = getErrorResponse(error.message);
      res.status(statusCode).json({ error: errorMessage });
    }
  }
);


router.get(
  "/mine/data",
  authenticateJwtToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      console.log(req.user?._id);
      
      const data = await getMiningData(req.user!._id);
      // const data = await generateReferralTableData(req.user!._id)

      return res.status(200).json({ message: "Data Found", res: data });
    } catch (error: any) {
      // console.log(error);

      const { statusCode, errorMessage } = getErrorResponse(error.message);
      res.status(statusCode).json({ error: errorMessage });
    }
  }
);

router.get(
  "/reward/data",
  authenticateJwtToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const data = await generateReferralTableData(req.user!._id)

      return res.status(200).json({ message: "Data Found", res: data });
    } catch (error: any) {
      const { statusCode, errorMessage } = getErrorResponse(error.message);
      res.status(statusCode).json({ error: errorMessage });
    }
  }
);

router.get(
  "/mine/start",
  authenticateJwtToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const mining = await startMining(req.user!._id);

      if (mining) {
        return res.status(200).json({ message: "Mining Start", res: true });
      }
    } catch (error: any) {
      const { statusCode, errorMessage } = getErrorResponse(error.message);
      res.status(statusCode).json({ error: errorMessage });
    }
  }
);

router.post(
  "/claim/mined",
  authenticateJwtToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // const { txHash } = req.body;
      // console.log(txHash);

      const isClaimable = await claim(req.user!._id, false);

      if (isClaimable) {
        return res
          .status(200)
          .json({ message: "Claimed Successfully", res: isClaimable });
      }
    } catch (error: any) {      
      const { statusCode, errorMessage } = getErrorResponse(error.message);
      res.status(statusCode).json({ error: errorMessage });
    }
  }
);

router.post(
  "/claim/reffered",
  authenticateJwtToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // const { txHash } = req.body;
      // console.log(txHash);

      const isClaimable = await claim(req.user!._id, true);

      if (isClaimable) {
        return res
          .status(200)
          .json({ message: "Claimed Successfully", res: isClaimable });
      }
    } catch (error: any) {
      // console.log(error);

      const { statusCode, errorMessage } = getErrorResponse(error.message);
      res.status(statusCode).json({ error: errorMessage });
    }
  }
);

router.get("/referral/count", authenticateJwtToken, async(req:AuthenticatedRequest, res: Response) => {
  try {    
    const count = await countReferrals(req.user!._id);
    return res.status(200).json({message: "Referral Count", res: count})
  } catch (error:any) {
    const { statusCode, errorMessage } = getErrorResponse(error.message);
      res.status(statusCode).json({ error: errorMessage });
  }
})

router.get("/referral/reward", authenticateJwtToken,  async(req:AuthenticatedRequest, res: Response) => {
  try {
    const rewards = await calculateReferralReward(req.user!._id);
    return res.status(200).json({message: "Referral Count", res: rewards})
  } catch (error:any) {
    const { statusCode, errorMessage } = getErrorResponse(error.message);
      res.status(statusCode).json({ error: errorMessage });
  }
})

router.get("/ksn", async (req: Request, res: Response) => {
  try {
    const response = await axios.get(
      "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=ksn",
      {
        headers: {
          "X-CMC_PRO_API_KEY": process.env.CMC_API_KEY,
        },
      }
    );
    // Check if the response contains data
    const ksnPriceInUSD = response.data.data.KSN[0].quote.USD.price;
    // const amountInBnb = 2 / bnbPriceInUSD;
    console.log(ksnPriceInUSD);
    const inNumber = ksnPriceInUSD.toFixed(4)
    return res
      .status(200)
      .json({ message: "KSN price fetch successfully", res: inNumber });
  } catch (error: any) {
    // console.log(error);
    const { statusCode, errorMessage } = getErrorResponse(error.message);
    res.status(statusCode).json({ error: errorMessage });
  }
});

// router.post("/mine/stop", authenticateJwtToken, async(req: Request, res: Response) => {
//     try {
//          // Decode JWT token from request header
//          const token = req.header("Authorization")?.split(" ")[1];

//          if (!token) {
//              return res.status(401).json({ error: 'No token provided' });
//          }

//          const decodedToken = jwt.decode(token) as { userId: string }; // Assuming your token contains a userId

//          const userId = decodedToken.userId;
//          console.log(userId);

//          const mining = await stopMining(userId);
//         //  console.log({mining});
//          return res.status(200).json({message: "Mining Stop"})

//     } catch (error) {
//         return res.status(401).json({message: "Failed To Stop Mining"})
//     }
// })

export default router;
