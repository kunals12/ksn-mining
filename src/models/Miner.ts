// models/miner.ts
import mongoose, { Document, Schema } from "mongoose";

interface MinerDocument extends Document {
  taskId: string;
  cronTask: string; // Store the serialized cron task object
  isRunning: boolean;
  user: mongoose.Types.ObjectId;
}

const minerSchema = new Schema<MinerDocument>({
  taskId: { type: String, default: null },
  cronTask: { type: String, default: null }, // Store the serialized cron task object
  isRunning: { type: Boolean, default: false },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
});

const Miner = mongoose.model<MinerDocument>("Miner", minerSchema);

export { Miner, MinerDocument };
