// models/user.ts
import mongoose, { Document, Schema } from "mongoose";

// Define the structure for the claimedAt field
interface RefferedClaim {
  userId: string;
  claimAt: number;
}


interface UserDocument extends Document {
  userId: number;
  username: string;
  email: string;
  address: string;
  password: string;
  minedNumber: number;
  mining: boolean;
  otp: number;
  isVerified: boolean;
  referralCode: string;
  referenceFrom: string;
  referenceTo: string[];
  referredAmount: number;
  refferedClaimedAt: RefferedClaim[];
  createdAt: Date; // Timestamp of when the claim was created
  updatedAt: Date; // Timestamp of when the claim was last updated
}

const userSchema = new Schema<UserDocument>({
  userId: {type: Number, unique: true, required: true},
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  address: { type: String },
  password: { type: String, required: true },
  minedNumber: Number,
  mining: { type: Boolean, default: false },
  otp: Number,
  isVerified: { type: Boolean, default: false },
  referralCode: { type: String, unique: true },
  referenceFrom: String,
  referenceTo: [String],
  referredAmount: {type: Number, default: 0},
  refferedClaimedAt: [
    {
      // Define the claimedAt field in the schema
      userId: { type: Schema.Types.ObjectId, ref: "User" }, // Reference to the user
      claimAt: { type: Number },
    },
  ],
  createdAt: { type: Date, default: Date.now }, // Default to current timestamp
  updatedAt: { type: Date, default: Date.now }, // Default to current timestamp
});

const User = mongoose.model<UserDocument>("User", userSchema);

export { User, UserDocument };
