import { Claim } from "../models/Claim";
import { User, UserDocument } from "../models/User";
import { Errors } from "../utils/common";
import { getMiningData } from "./users";

export async function claimRefferedPoints(userId: string, user: UserDocument):Promise<Boolean> {
    const getRefferedData = await getMiningData(userId);
    console.log({ getRefferedData });

    if (Number(getRefferedData.referenceCounter) < 5) {
      throw new Error(Errors.MinimumKSN);
    }

    const newClaimEntry = new Claim({
      user: user._id,
      claimAmount: user.referredAmount,
      isMined: false,
      isReferred: true,
      isRelease: false,
    });
    // // Save the user document to the database
    console.log({ newClaimEntry });

    const savedUser = await newClaimEntry.save();
    console.log({ savedUser });

    if (!savedUser) {
      throw new Error(Errors.FailedToSave);
    }

    // Create a local array to store the data
    const referredClaimedAtData = [];

    // Iterate over referenceTo array
    for (const id of user.referenceTo) {
      const userDataFromid = await User.findOne({ _id: id }).select('-password');
      if (userDataFromid && userDataFromid.minedNumber !== undefined && userDataFromid.mining) {
        referredClaimedAtData.push({
          userId: userDataFromid._id,
          claimAt: userDataFromid.minedNumber,
        });
      }
    }

    // Push the local array data to the user document
    user.refferedClaimedAt.push(...referredClaimedAtData);
    user.referredAmount = 0;
    await user.save();
    return true;
}