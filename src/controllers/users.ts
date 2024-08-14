import { User, UserDocument } from '../models/User';
import { Miner } from '../models/Miner';
import bcrypt from 'bcrypt';
import Web3 from 'web3';
import jwt from 'jsonwebtoken';
import { AuthenticatedWebSocket } from '../middleware/ws';
import { sendOTP } from '../utils/email';
import { Errors, getJwtToken } from '../utils/common';
import { Claim } from '../models/Claim';
import { getReferenceAmount, handleReferranceFromDataAfterMine } from './referral';

const web3 = new Web3('https://bsc-testnet-rpc.publicnode.com');
const JWT_PASS = process.env.JWT_PASS;

if (!JWT_PASS) {
  console.error('JWT_PASS is not defined in environment variables');
  process.exit(1); // Exit the process if DATABASE_URL is not defined
}

function generateReferralCode(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let referralCode = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    referralCode += characters[randomIndex];
  }
  return referralCode;
}

// Function to generate a random 7-digit referral code
function generateUniqueIdForUser(length: number) {
  let code = '';
  const characters = '0123456789'; // Using digits 0-9

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }

  return code;
}

/**
 * User Registration
 * @param username string - must be unique
 * @param email string - must be unique
 * @param address user wallet address
 * @param password password for user
 * @param referenceFrom referral code
 * @returns User
 */
export async function signUp(
  username: string,
  email: string,
  address: string,
  password: string,
  referenceFrom?: string,
) {
  if (referenceFrom) {
    const checkUserByReferralCode = await User.findOne({referralCode: referenceFrom});

    if(!checkUserByReferralCode) {
      throw new Error(Errors.InvalidReference);
    }
  }

  // Generate a unique referral code
  let referralCode;
  let isReferralCodeUnique = false;
  while (!isReferralCodeUnique) {
    referralCode = generateReferralCode(8); // Adjust the length as needed
    const existingUserWithReferralCode = await User.findOne({ referralCode });
    if (!existingUserWithReferralCode) {
      isReferralCodeUnique = true;
    }
  }

  let uniqueId;
  let isUnique = false;

  while (!isUnique) {
    console.log('11');

    uniqueId = generateUniqueIdForUser(7); // Generating a 7-digit unique ID
    const existingUserWithUniqueId = await User.findOne({ userId: uniqueId });

    if (!existingUserWithUniqueId) {
      isUnique = true; // Update the isUnique flag if the unique ID is not found
    }
  }

  const isWalletAddressExists = await User.findOne({ address });

  if (isWalletAddressExists) {
    throw new Error(Errors.AddressExist);
  }

  const existingUserWithEmail = await User.findOne({ email });

  if (existingUserWithEmail) {
    throw new Error(Errors.UserAlreadyExist);
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);
  const minedNumber = 0;
  // Create a new user document
  const newUser = new User({
    userId: uniqueId,
    username,
    email,
    address,
    password: hashedPassword,
    referralCode,
    referenceFrom: referenceFrom ? referenceFrom : '',
    minedNumber,
  });

  // Save the user document to the database
  const savedUser = await newUser.save();

  const OTP = await sendOTP(savedUser.email);

  savedUser.otp = Number(OTP); // Assign OTP to the user document
  await savedUser.save();

  if (referenceFrom) {
    const referringUser = await User.findOne({ referralCode: referenceFrom });

    if (!referringUser) {
      throw new Error(Errors.InvalidReference);
    }
    // Push the new user's ID to the referenceTo array of the referring user
    referringUser.referenceTo.push(savedUser._id);
    await referringUser.save();
  }

  // Return the user document without the password field
  return savedUser.toObject({
    getters: true,
    versionKey: false,
    virtuals: false,
    transform: (doc, ret) => {
      return {
        uniqueId: ret.uniqueId,
        username: ret.username,
        email: ret.email,
      };
    },
  });
}

export async function verifyOTP(email: string, otp: number) {
  const user = await User.findOne({ email }).select('-password');

  if (!user) {
    throw new Error(Errors.UserNotFound);
  }

  if (user.isVerified) {
    throw new Error(Errors.UserAlreadyExist);
  }

  if (user.otp === otp && !user.isVerified) {
    user.isVerified = true;
    user.otp = 0;
    await user.save();
    // Generate JWT token
    const token = getJwtToken(user);
    return token;
  } else {
    throw new Error(Errors.OtpNotValid);
  }
}

/**
 * Login
 * @param email email of user
 * @param password password of user
 * @returns JWT token includes userId, email, walletAddress, referralCode
 */
export async function login(email: string, password: string) {
  // Find user by email
  const user = await User.findOne({ email }).select('+password'); // Include the password field

  if (!user) {
    throw new Error(Errors.UserNotFound);
  }
  // Check if password is correct
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error(Errors.InvalidPassword);
  }

  const token = await getJwtToken(user);
  return token;
}

export async function createOtp(email: string) {
  const user = await User.findOne({ email }).select('-password');
  if (!user) {
    throw new Error(Errors.UserNotFound);
  }
  const OTP = await sendOTP(user!.email);

  if (!OTP) {
    throw new Error('Failed to send OTP');
  }
  user.otp = Number(OTP);
  await user?.save();
  return true;
}

export async function changePassword(userId: string, oldPassword: string, newPassword: string) {
  const user = await User.findOne({ _id: userId });
  if (!user) {
    throw new Error(Errors.UserNotFound);
  }

  // Compare the provided oldPassword with the hashed password stored in the user document
  const passwordMatch = await bcrypt.compare(oldPassword, user.password);

  // If old password doesn't match, throw an error
  if (!passwordMatch) {
    throw new Error('Old password is incorrect');
  }

  // Hash the new password
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);

  // Update the user's password in the database
  user.password = hashedNewPassword;
  await user.save();

  // Return success message or updated user data
  return true;
}

export async function forgotPassword(email: string, otp: number, password: string): Promise<Boolean> {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error(Errors.UserNotFound);
  }

  if (user.otp === otp) {
    user.otp = 0;
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    try {
      await user.save();
      return true;
    } catch (error) {
      throw new Error(Errors.FailedToSave);
    }
  } else {
    throw new Error(Errors.OtpNotValid);
  }
}

export async function updateUser(userId: string, updatedUserData: any) {
  console.log({ userId, updatedUserData });

  // Find the user by ID
  const userToUpdate = await User.findById(userId);

  // Check if the user exists
  if (!userToUpdate) {
    throw new Error(Errors.UserNotFound);
  }

  // Update user data
  Object.assign(userToUpdate, updatedUserData);

  // Save the updated user document to the database
  const updatedUser = await userToUpdate.save();
  console.log({ updatedUser });

  return await getJwtToken(updatedUser);
}

export async function getAddress(id: string) {
  const user = await User.findOne({ _id: id }).select('-password');

  if (!user) {
    throw new Error(Errors.UserNotFound);
  }
  return user.address;
}

export async function getMiningData(userId: string) {
  const user = await User.findOne({ _id: userId }).select('-password');

  if (!user) {
    throw new Error(Errors.UserNotFound);
  }

  console.log(user.minedNumber);
  

  // TODO: Get this data and return in msg
  // const storeReferenceData = await storeReferenceAmount(user);
  // if (!storeReferenceData) {
  //   throw new Error(Errors.FailedToGet);
  // }

  const referenceCounter = await getReferenceAmount(user);
  return {
    minedCounter: user.minedNumber,
    referenceCounter,
    isMining: user.mining,
  };
}



export async function getMiningStatus(userId: string) {
  const user = await User.findOne({ _id: userId }).select('-password');
  if (!user) {
    throw new Error(Errors.UserNotFound);
  }
  return user.mining;
}

export async function startMining(userId: string) {
  console.log({ userId });

  const user = await User.findOne({ _id: userId }).select('-password');
  if (!user) {
    throw new Error(Errors.UserNotFound);
  }

  if (!user.isVerified) {
    throw new Error(Errors.UserNotVerified);
  }

  if (user.mining) {
    console.log('already mining');
    throw new Error(Errors.AlreadyMining);
  }

  if (!user.mining) {
    // Set user.mining to true
    user.mining = true;
    await user.save();
  }

  const miningInterval = 10 * 1000; // 10sec
  const miningIncrement = 0.000125;
  const miningDuration = 2 * 60 * 1000; // 2min

  // const miningInterval = 60 * 1000; // 1min
  //   const miningIncrement = 0.000125;
  //   const miningDuration = 1 * 60  * 60 * 1000; //

  // Start the mining interval
  const intervalId = setInterval(async () => {
    try {
      // Retrieve the user document again to get the latest value of the mining field
      const updatedUser = await User.findById(user._id);

      if (!updatedUser || !updatedUser.mining) {
        clearInterval(intervalId); // Stop the interval
        return false; // Exit the interval function
      }

      // Increment minedNumber by the miningIncrement value
      updatedUser.minedNumber = Number((updatedUser.minedNumber + miningIncrement).toFixed(5));
      updatedUser.updatedAt = new Date();
      // Save the updated document
      await updatedUser.save();
      console.log(`Mining for ${updatedUser.username}: ${updatedUser.minedNumber}`);
    } catch (error: any) {
      clearInterval(intervalId); // Stop the interval if an error occurs while saving
      throw new Error(Errors.FailedToSave);
    }
  }, miningInterval);

  // Stop mining after miningDuration (12 hours)
  setTimeout(async () => {
    clearInterval(intervalId); // Stop the mining interval
    // Set user.mining to false
    user.mining = false;
    await user.save();
    console.log(`Mining stopped for ${user.username}`);
  }, miningDuration);

  return true;
}

export async function claim(userId: string, isReffered: boolean): Promise<boolean> {
  const user = await User.findOne({ _id: userId }).select('-password');
  if (!user) {
    throw new Error(Errors.UserNotFound);
  }

  if (!user.isVerified) {
    throw new Error(Errors.UserNotVerified);
  }

  // const txn = await web3.eth.getTransaction(txHash);
  // console.log(txn);

  // // Check if transaction exists
  // if (!txn) {
  //   throw new Error('Transaction not found');
  // }

  // if (!txn.value) {
  //   throw new Error('Value not found in txn');
  // }

  // if (txn.to !== '0x62e50c56d4e00dba1203833b01df764da32ee7f0') {
  //   console.log('address not match');

  //   throw new Error('To address does not match');
  // }

  if (isReffered) {
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

    const savedUser = await newClaimEntry.save();
    console.log({ savedUser });

    if (!savedUser) {
      throw new Error(Errors.FailedToSave);
    }

    

    // Create a local array to store the data
    // const referredClaimedAtData = [];

    // // Iterate over referenceTo array
    // for (const id of user.referenceTo) {
    //   const userDataFromid = await User.findOne({ _id: id }).select('-password');
    //   if (userDataFromid && userDataFromid.minedNumber !== undefined && userDataFromid.mining) {
    //     referredClaimedAtData.push({
    //       userId: userDataFromid._id,
    //       claimAt: userDataFromid.minedNumber,
    //     });
    //   }
    // }

    // // Push the local array data to the user document
    // user.refferedClaimedAt.push(...referredClaimedAtData);
    user.referredAmount = 0;
    await user.save();
    console.log("savedddd");
    
    return true;
  }

  // Mined
  if (!isReffered) {
    if (user.minedNumber < 5) {
      throw new Error(Errors.MinimumKSN);
    }

    const newClaimEntry = new Claim({
      user: user._id,
      claimAmount: user.minedNumber,
      isMined: true,
      isReferred: false,
    });
    console.log('New Claim Entry:', newClaimEntry); // Log the new claim entry explicitly

    // Save the user document to the database
    const savedClaimEntry = await newClaimEntry.save();
    if (!savedClaimEntry) {
      throw new Error(Errors.FailedToSave);
    }
    // Update the minedNumber to 0 and mining status to false
    await handleReferranceFromDataAfterMine(user)

    if(!handleReferranceFromDataAfterMine) {
      throw new Error(Errors.FailedToSave)
    }

    return true;
  }

  console.log('returing false');
  return false;
}

async function referenceClaimLogic(from: string, to: string) {}

export async function startMiningAtServerStartup() {
    const users = await User.find({ mining: true });

    if (users.length <= 0) {
      console.log('No users found with mining enabled.');
      return;
    }

    const miningInterval = 60 * 1000; // 1 minute
    const miningIncrement = 0.000125;
    const miningDuration =  12 * 60 * 60 * 1000; // 12 hours

    users.forEach((user) => {
      let miningTimeout: NodeJS.Timeout;

      const miningIntervalId = setInterval(async () => {
        try {
          const updatedUser = await User.findById(user._id);

          if (!updatedUser || !updatedUser.mining) {
            clearInterval(miningIntervalId);
            clearTimeout(miningTimeout);
            console.log(`Mining stopped for ${user.username}.`);
            return;
          }

          updatedUser.minedNumber = Number((updatedUser.minedNumber + miningIncrement).toFixed(5));
          await updatedUser.save();
          console.log(`Mining for ${updatedUser.username}: ${updatedUser.minedNumber}`);
        } catch (error:any) {
          console.error(`Error while mining for ${user.username}: ${error.message}`);
        }
      }, miningInterval);

      // Stop mining after miningDuration (12 hours)
      miningTimeout = setTimeout(async () => {
        clearInterval(miningIntervalId);
        const updatedUser = await User.findById(user._id);
        if (updatedUser) {
          updatedUser.mining = false;
          await updatedUser.save();
          console.log(`Mining stopped for ${user.username} after ${miningDuration} ms.`);
        }
      }, miningDuration);
    });

    console.log('Mining started for all eligible users.');

    return true;

}

async function miningLogic(user: UserDocument) {
  try {
    // Set the initial minedNumber value
    user.minedNumber = user.minedNumber || 0;

    // Increment minedNumber by 0.5 every 10 seconds
    const miningInterval = 10 * 1000; // 10 seconds
    const intervalId = setInterval(async () => {
      try {
        // Increment minedNumber by 0.5
        if (user.mining) {
          user.minedNumber = Number((user.minedNumber + 0.5).toFixed(3));

          // Save the updated document
          await user.save();

          console.log(`Mining for ${user.username}: ${user.minedNumber}`);
        }
      } catch (error: any) {
        clearInterval(intervalId); // Stop the interval if an error occurs while saving
        console.error(`Error while mining for ${user.username}: ${error.message}`);
        throw new Error(Errors.FailedToSave);
      }
    }, miningInterval);

    console.log(`Mining started for ${user.username}`);

    // Update 'mining' field
    user.mining = true;
    await user.save(); // Save the updated document

    return true; // Indicate that mining has started successfully
  } catch (error: any) {
    console.error(`Error while starting mining for ${user.username}: ${error.message}`);
    return false; // Indicate that an error occurred while starting mining
  }
}

/**
 * BACKUP CODE
 * 
 * // Resume mining for all users who were previously mining
User.find({}).then(users => {
  users.forEach(user => {
    if (user.mining) {
      const interval = setInterval(async () => {
        user.minedCounter++;
        await user.save();
        console.log(`Mining for ${user.username}: ${user.minedCounter}`);
      }, 30s00);
      miningIntervals.set(user.username, interval);
      console.log(`Mining resumed for ${user.username}`);
    }
  });
});
 */
