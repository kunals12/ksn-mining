import { Claim } from '../models/Claim';
import { User, UserDocument } from '../models/User';
import { Errors } from '../utils/common';

export async function getReferenceAmount(user: UserDocument): Promise<Number> {
  return user.referredAmount;
}

// export async function storeReferenceAmount(user: UserDocument): Promise<boolean> {
//   // Get direct referrals
//   const referredToArray = user.referenceTo;
//   const level1 = await calculateTotalMinedAmount(referredToArray);
//   console.log({ level1 });

//   // Calculate 10% bonus for direct referrals
//   let totalReferredAmount = (level1 * 10) / 100;
//   console.log({ 'Direct Referral Bonus': totalReferredAmount });

//   // Recursively calculate referral bonus for indirect referrals
//   const calculateIndirectReferralBonus = async (userIds: string[], level: number): Promise<number> => {
//     let bonus = 0;
//     for (const userId of userIds) {
//       const referredUser = await User.findOne({ _id: userId }).select('-password');
//       if (referredUser && referredUser.referenceTo.length > 0 && level > 0) {
//         const levelMinedAmount = await calculateTotalMinedAmount(referredUser.referenceTo);
//         console.log({ 'Referral Level': level });

//         // Get bonus percentage for the current level
//         const levelBonusPercentage = getBonusPercentage(level);
//         // Calculate bonus amount for the current level
//         const levelBonus = (levelMinedAmount * levelBonusPercentage) / 100;
//         bonus += levelBonus;
//         // Calculate bonus for next level
//         const subBonus = await calculateIndirectReferralBonus(referredUser.referenceTo, level + 1);
//         bonus += subBonus;
//       }
//     }
//     return bonus;
//   };

//   // Calculate bonus for indirect referrals at all levels
//   const indirectReferralBonusTotal = await calculateIndirectReferralBonus(referredToArray, 2);
//   console.log({ 'Indirect Referral Bonus (All Levels)': indirectReferralBonusTotal });

//   // Add bonus for indirect referrals to total
//   totalReferredAmount += indirectReferralBonusTotal;
//   console.log({ 'Total Referred Amount': totalReferredAmount });

//   // Save total referred amount to user document
//   user.referredAmount = totalReferredAmount;
//   await user.save();
//   return true;
// }

interface ReferralDataRow {
  username: string;
  directAmount: number;
  teamMembers: number;
  rewardPoints: number;
}

export async function generateReferralTableData(userId: string) {
  // Find the user document by userId
  const user = await User.findById(userId).select('referenceTo');

  if (!user) {
    throw new Error('User not found');
  }

  // Extract the referenceTo array from the user document
  const referenceToIds: string[] = user.referenceTo || [];

  // Map through the referenceTo array to get usernames and modified minedNumber
  const referralData = await Promise.all(
    referenceToIds.map(async (refUserId: string) => {
      // Find the referred user document by id and select the username, minedNumber, and referenceTo
      const referredUser = await User.findById(refUserId).select('username minedNumber referenceTo');

      // If referred user is found, apply the formula to the minedNumber
      if (referredUser) {
        // Calculate the referral level starting from level 2
        const level = 1;

        // Apply the formula to the minedNumber
        const modifiedMinedNumber = (referredUser.minedNumber * 10) / 100;

        // Recursively check for team members of the referred user
        const teamMembers = await countTeamMembers(refUserId, 1, refUserId);

        let totalTeamEarning = 0;
        if (teamMembers.length) {
          teamMembers.map((i) => {
            totalTeamEarning += i.rewardPoints;
          });
        }

        return {
          username: referredUser.username,
          minedNumber: referredUser.minedNumber || 0,
          modifiedMinedNumber: Number(modifiedMinedNumber.toFixed(8)),
          teamMembers: teamMembers.length,
          teamEarning: totalTeamEarning.toFixed(8),
        };
      } else {
        // If referred user is not found, return null
        return null;
      }
    }),
  );

  // Calculate total direct and indirect earnings
  let totalDirectEarning = 0;
  let totalIndirectEaring = 0;

  referralData.forEach((data) => {
    if (data) {
      totalDirectEarning += data.modifiedMinedNumber;
      totalIndirectEaring += Number(data.teamEarning);
    }
  });

  console.log("fixing to 8");
  
  totalIndirectEaring.toFixed(8);

  // Filter out null values and return the result along with total earnings
  const filteredReferralData = referralData.filter((data) => !!data);
  return { referralData: filteredReferralData, totalDirectEarning, totalIndirectEaring };
}

// Recursive function to count team members for a given user
async function countTeamMembers(userId: string, level: number, targetUserId: string): Promise<ReferralDataRow[]> {
  // Find the user document by userId
  const user = await User.findById(userId).select('referenceTo minedNumber username');

  if (!user) {
    return []; // If user is not found, return an empty array
  }

  // Extract the referenceTo array from the user document
  const referenceToIds: string[] = user.referenceTo || [];

  // Initialize an array to store the results
  const results: ReferralDataRow[] = [];

  // Recursively count team members and calculate total minedNumber for each reference user starting from level 2
  if (level >= 1) {
    for (const refUserId of referenceToIds) {
      const subResults = await countTeamMembers(refUserId, level + 1, targetUserId); // Decrease the level by 1
      results.push(...subResults); // Concatenate sub-results with the main results array
    }
  }

  // Apply the bonus percentage to the total minedNumber
  const bonusPercentage = getBonusPercentage(level);
  const modifiedTotalMinedNumber = (user.minedNumber || 0) * (bonusPercentage / 100);

  // Add the current user's data to the results array if it's not the target user
  if (userId !== targetUserId) {
    results.push({
      username: user.username || '',
      directAmount: user.minedNumber || 0,
      teamMembers: referenceToIds.length,
      rewardPoints: modifiedTotalMinedNumber,
    });
  }

  return results;
}

// Function to calculate total mined amount for a list of users
async function calculateTotalMinedAmount(userIds: string[]): Promise<number> {
  let totalMinedAmount = 0;
  for (const userId of userIds) {
    const user = await User.findOne({ _id: userId }).select('-password');
    if (user && user.minedNumber !== undefined && user.minedNumber !== 0) {
      totalMinedAmount += user.minedNumber;
    }
  }
  console.log({ 'Total Mined Amount': totalMinedAmount });
  return totalMinedAmount;
}

// Function to get bonus percentage based on referral level
const getBonusPercentage = (level: number): number => {
  if (level === 1) {
    return 10;
  } else if (level === 2) {
    return 5;
  } else if (level === 3) {
    return 3;
  } else if (level >= 4 && level <= 5) {
    return 2;
  } else if (level >= 6 && level <= 7) {
    return 1.5;
  } else if (level >= 8 && level <= 10) {
    return 1;
  } else if (level >= 11 && level <= 14) {
    return 5; // 5% divided by 10
  } else if (level >= 15 && level <= 17) {
    return 1;
  } else if (level >= 18 && level <= 19) {
    return 1.5;
  } else if (level === 20) {
    return 2;
  } else if (level === 21) {
    return 3;
  }
  return 0; // Default bonus percentage for other levels
};

export async function countReferrals(userId: string): Promise<{ directRef: number; indirectRef: number }> {
  let directRef = 0;
  let indirectRef = 0;

  // Get the user document
  const user = await User.findOne({ _id: userId }).select('-password');

  if (!user) {
    throw new Error(Errors.UserNotFound);
  }

  // Count direct referrals
  directRef = user.referenceTo.length;

  // Count indirect referrals recursively
  for (const referredUserId of user.referenceTo) {
    const indirectCount = await countReferrals(referredUserId);
    indirectRef += indirectCount.directRef + indirectCount.indirectRef;
  }

  return { directRef, indirectRef };
}

export async function calculateReferralReward(userId: string): Promise<number> {
  const user = await User.findOne({ _id: userId }).select('-password');
  if (!user) {
    throw new Error(Errors.UserNotFound);
  }

  const { directRef, indirectRef } = await countReferrals(userId);
  const daysSinceCreation = calculateDaysSinceCreation(user.createdAt);

  let reward = 0;

  if (daysSinceCreation >= 120) {
    if (directRef >= 280 && indirectRef >= 500000) {
      reward = 510000;
    }
  } else if (daysSinceCreation >= 90) {
    if (directRef >= 250 && indirectRef >= 200000) {
      reward = 170000;
    }
  } else if (daysSinceCreation >= 60) {
    if (directRef >= 220 && indirectRef >= 100000) {
      reward = 75000;
    }
  } else if (daysSinceCreation >= 45) {
    if (directRef >= 200 && indirectRef >= 35000) {
      reward = 15000;
    }
  } else if (daysSinceCreation >= 30) {
    if (directRef >= 180 && indirectRef >= 15000) {
      reward = 5000;
    }
  } else if (daysSinceCreation >= 20) {
    if (directRef >= 150 && indirectRef >= 5000) {
      reward = 1500;
    }
  } else if (daysSinceCreation >= 10) {
    if (directRef >= 100 && indirectRef >= 1500) {
      reward = 500;
    }
  }

  if (reward !== 0) {
    // Find the claim document associated with the user
    let claim = await Claim.findOne ({ user: userId });
    if (!claim) {
      // If claim document doesn't exist, create a new one
      claim = new Claim({ user: userId, claimAmount: 0 });
    }

    // Update the claim document with the extra referred reward
    claim.extraReferredReward = reward;
    await claim.save();
  }

  return reward;
}

function calculateDaysSinceCreation(createdAt: Date): number {
  const oneDayInMilliseconds = 1000 * 60 * 60 * 24;
  const currentDate = new Date();
  const diffInMilliseconds = currentDate.getTime() - createdAt.getTime();
  const days = Math.floor(diffInMilliseconds / oneDayInMilliseconds);
  return days;
}

export async function handleReferranceFromDataAfterMine(user: UserDocument) {
  // Get the user's referenceFrom
  const rootUser = user;  

  const getAllReferenceFrom = async (userId: string, level: number = 1) => {
    const user = await User.findOne({ _id: userId }).select('-password');

    if (!user) {
      throw new Error('User not found');
    }

    const referenceFromId = user.referenceFrom;

    // If there's no referenceFrom, stop the recursion
    if (!referenceFromId) {
      return; // No need to proceed further
    }

    // Find the user who referred the current user
    const referringUser = await User.findOne({ referralCode: referenceFromId });

    if (!referringUser) {
      throw new Error('Referring user not found');
    }

    // console.log('Referring User:', referringUser.username);

    // Recursively call the function for the referring user
    await getAllReferenceFrom(referringUser._id, level + 1);

    // console.log('Current Level:', level);

    // Calculate referral bonus based on user's minedNumber and level
    const bonusPercentage = getBonusPercentage(level);
    // console.log('Bonus Percentage:', bonusPercentage);
    // console.log('base username', rootUser.username);

    const referralBonus = rootUser.minedNumber * (bonusPercentage / 100);
    // console.log('Referral Bonus:', referralBonus, 'Mined Number:', rootUser.minedNumber);

    // Update referredAmount for the current user
    // console.log('Updating referredAmount for User:', referringUser.username);
    referringUser.referredAmount += referralBonus;
    await referringUser.save();

    return true;
  };

  const setReferranceData = await getAllReferenceFrom(rootUser._id);
  console.log({setReferranceData});

  if(!setReferranceData) {
    throw new Error(Errors.FailedToGet)
  }

  rootUser.minedNumber = 0;
  rootUser.mining = false;
  rootUser.updatedAt = new Date();
  await rootUser.save();
  // return {
  //   minedNumber: rootUser.minedNumber,
  //   mining: rootUser.mining
  // }
  return true;
}

// export async function storeReferenceAmount(user: UserDocument): Promise<Boolean> {
//   const refferedClaimedAtArray = user.refferedClaimedAt;

//   let totalRefferedAmount = 0;
//   let level1 = 0;
//   let level2 = 0;

//   if (refferedClaimedAtArray.length) {
//     for (let i = 0; i < refferedClaimedAtArray.length; i++) {
//       const data = refferedClaimedAtArray[i];
//       const user: any = await User.findOne({ _id: data.userId }).select('-password');
//       const minedAmount = user.minedNumber;
//       totalRefferedAmount += minedAmount - data.claimAt;
//     }
//   } else {
//     // Getting all the referred To data
//     const referredToArray = user?.referenceTo;
//     console.log({ referredToArray });

//     if (referredToArray.length > 0) {
//       console.log('logging reference level1');
//       for (let id of referredToArray) {
//         const user = await User.findOne({ _id: id }).select('-password'); // finding referred to users by id
//         if (user && user.minedNumber !== undefined && user.minedNumber !== 0) {
//           console.log(user.minedNumber, id);
//           level1 += user.minedNumber; // storing there mined amount

//           if (user.referenceTo.length > 0) {
//             console.log('logging reference level2');

//             const l2Array = user.referenceTo;
//             for (let id2 of l2Array) {
//               const user2 = await User.findOne({ _id: id2 }).select('-password'); // finding referred to users by id
//               if (user2 && user2.minedNumber !== undefined && user2.minedNumber !== 0) {
//                 level2 += user2.minedNumber;
//               }
//             }
//           }
//         }
//       }
//     }
//   }

//   console.log({level1});

//   console.log({level2});

//   console.log(totalRefferedAmount);

//   totalRefferedAmount = Number(((level1 * 10) / 100).toFixed(3));
//   totalRefferedAmount += Number(((level2 * 5) / 100).toFixed(3));

// //   const calculateFivePercentOfTotalRefferedKSN = Number(((totalRefferedAmount * 5) / 100).toFixed(3));
// //   console.log({ calculateFivePercentOfTotalRefferedKSN });

//   user.referredAmount = totalRefferedAmount;
//   await user.save();
//   return true;
// }

// export async function storeReferenceAmount(user: UserDocument): Promise<Boolean> {
//     const refferedClaimedAtArray = user.refferedClaimedAt;

//     let totalRefferedAmount = 0;
//     let level1 = 0;   // Level1

//     if (refferedClaimedAtArray.length) {
//       for (let i = 0; i < refferedClaimedAtArray.length; i++) {
//         const data = refferedClaimedAtArray[i];
//         const user: any = await User.findOne({ _id: data.userId }).select('-password');
//         const minedAmount = user.minedNumber;
//         totalRefferedAmount += minedAmount - data.claimAt;
//       }
//     } else {
//       // Getting all the referred To data
//       const referredToArray = user?.referenceTo;
//       console.log({ referredToArray });

//       if (referredToArray.length > 0) {
//           console.log("logging reference level1");
//         for (let id of referredToArray) {
//           const user = await User.findOne({ _id: id }).select('-password'); // finding referred to users by id
//           if (user && user.minedNumber !== undefined && user.minedNumber !== 0) {
//             console.log(user.minedNumber, id);
//             level1 += user.minedNumber; // storing there mined amount

//             if (user.referenceTo.length > 0) {
//               console.log("logging reference level2");

//               const l2Array = user.referenceTo;
//               for (let l2 = 0; l2 < l2Array.length; l2++) {
//                   const element = l2Array[l2];
//                   console.log({element});
//               }
//             }
//           }
//         }
//       }
//     }

//     console.log(totalRefferedAmount);

//     const calculateFivePercentOfTotalRefferedKSN = Number(((totalRefferedAmount * 5) / 100).toFixed(3));
//     console.log({ calculateFivePercentOfTotalRefferedKSN });

//     user.referredAmount = calculateFivePercentOfTotalRefferedKSN;
//     await user.save();
//     return true;
//   }
