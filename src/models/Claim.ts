// models/claim.ts
import mongoose, { Document, Schema } from "mongoose";
import { UserDocument } from "./User";

interface ClaimDocument extends Document {
  user: UserDocument["_id"]; // Reference to the user
  claimAmount: number;
  isMined: boolean;
  isReferred: boolean;
  isRelease: boolean;
  extraReferredReward: number; // Additional reward for referrals
  createdAt: Date; // Timestamp of when the claim was created
  updatedAt: Date; // Timestamp of when the claim was last updated
}

const claimSchema = new Schema<ClaimDocument>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true }, // Reference to the user
  claimAmount: { type: Number, required: true },
  isMined: { type: Boolean, default: false },
  isReferred: { type: Boolean, default: false },
  isRelease: { type: Boolean, default: false },
  extraReferredReward: { type: Number, default: 0 }, // Default to 0
  createdAt: { type: Date, default: Date.now }, // Default to current timestamp
  updatedAt: { type: Date, default: Date.now }, // Default to current timestamp
});

const Claim = mongoose.model<ClaimDocument>("Claim", claimSchema);

export { Claim, ClaimDocument };
