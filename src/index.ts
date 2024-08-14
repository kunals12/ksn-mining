// src/index.ts
require("dotenv").config();
import express, { Request, Response } from "express";
import mongoose from "mongoose";
import cors from "cors"; // Import the cors middleware
import userRoutes from "./routes/users";
import adminRoutes from "./routes/admin";
import { startWS } from "./controllers/websocket";

const app = express();
const PORT = process.env.PORT || 3000;
const mongoURI = process.env.DATABASE_URL;

if (!mongoURI) {
  console.error("DATABASE_URL is not defined in environment variables");
  process.exit(1); // Exit the process if DATABASE_URL is not defined
}

const start = async () => {
  try {
    await mongoose.connect(mongoURI);
    app.listen(PORT, () => {
      console.log("Server running on port", PORT, "...");
    });
    startWS(app, "/ws");
    app.use(express.json());
    app.use(cors());
    // await startMiningAtServerStartup()
    app.use("/user", userRoutes); // Mount the user routes at /users
    app.use("/admin", adminRoutes)
  } catch (error) {
    // console.log(error);
  }
};

start();
