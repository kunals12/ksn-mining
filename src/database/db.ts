import mongoose from "mongoose";

mongoose.set("strictQuery", true);

export const connection = async (Url: string) => {
  try {
    await mongoose.connect(Url);
    console.log("successfully connected with database");
  } catch (error) {
    console.log("error while connecting with database");
  }
};

export default connection;
