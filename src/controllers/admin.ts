import jwt from 'jsonwebtoken';
import { Claim, ClaimDocument } from '../models/Claim';
import { Errors } from '../utils/common';

export async function getClaimData() {
  // Retrieve data from the Claim collection
  const claims = await Claim.find().populate('user');
  console.log(claims[0]);

  if (!claims) {
    throw new Error(Errors.UserNotFound);
  }

  // Format the retrieved data with user information
  const formattedData = claims.map((claim: ClaimDocument) => ({
    claimId: claim._id,
    claimAmount: claim.claimAmount,
    isMined: claim.isMined,
    isReferred: claim.isReferred,
    isRelease: claim.isRelease,
    userId: claim.user._id,
    username: claim.user.username,
    email: claim.user.email,
    address: claim.user.address,
    verified: claim.user.isVerified,
    createdAt: claim.createdAt
  }));

  return jwt.sign({ data: formattedData }, 'your_secret_key', {
    expiresIn: '1h',
  } as jwt.SignOptions);
}

// export async function editUserData(userId: string, isRelease:boolean) {
//   await C
// }
