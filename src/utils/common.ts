import jwt from "jsonwebtoken";
import { getMiningData } from "../controllers/users";

export const Errors = {
  UserNotFound: "User Not Found",
  InvalidPassword: "Invalid Password",
  UserAlreadyExist: "User Already Exist",
  UserNotVerified: "User Not Verified",
  UserVerified: "User Already Verified",
  OtpNotValid: "Not Valid OTP",
  AlreadyMining: "Already Mining",
  MinimumKSN: "Minimum KSN must be 5",
  InvalidReference: "Invalid Referral Code",
  FailedToSave: "Failed To Save",
  FailedToGet: "Failed To Get Data",
  AddressExist: "Wallet Address Already In Used"
};

interface ErrorResponse {
  statusCode: number;
  errorMessage: string;
}

export function getErrorResponse(errorMsg: string): ErrorResponse {
  switch (errorMsg) {
    case Errors.UserNotFound:
      return { statusCode: 404, errorMessage: errorMsg }; // Not Found
    case Errors.InvalidPassword:
      return { statusCode: 401, errorMessage: errorMsg }; // Unauthorized
    case Errors.UserNotVerified:
      return { statusCode: 403, errorMessage: errorMsg }; // Forbidden
    case Errors.OtpNotValid:
      return { statusCode: 400, errorMessage: errorMsg }; // Bad Request
    case Errors.MinimumKSN:
      return { statusCode: 400, errorMessage: errorMsg }; // Bad Request
    case Errors.InvalidReference:
      return { statusCode: 404, errorMessage: errorMsg }; // Not Found
    case Errors.UserAlreadyExist:
      return { statusCode: 409, errorMessage: errorMsg }; // Conflict
    case Errors.UserVerified:
      return { statusCode: 200, errorMessage: errorMsg }; // Ok
    case Errors.AlreadyMining:
      return { statusCode: 409, errorMessage: errorMsg }; // Conflict
    case Errors.FailedToSave:
      return { statusCode: 403, errorMessage: errorMsg }; // Conflict
    case Errors.AddressExist:
      return { statusCode: 403, errorMessage: errorMsg }; // Conflict
    default:
      return { statusCode: 500, errorMessage: "Internal Server Error" }; // Default to Internal Server Error
  }
}

export async function getJwtToken(user: any) {
  const miningData = await getMiningData(user._id);

  const data = {
    _id: user._id,
    username: user.username,
    email: user.email,
    address: user.address,
    referral: user.referralCode,
    isVerified: user.isVerified,
    miningData: miningData,
  };

  return jwt.sign(data, "your_secret_key", {
    expiresIn: "1m",
  } as jwt.SignOptions);
}
