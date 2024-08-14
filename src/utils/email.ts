import nodemailer from "nodemailer";

//  Configuring email service provider here
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.USER_NAME,
    pass: process.env.USER_PASS,
  },
});

// Function to generate a random OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP
}

// Function to send OTP to user's email
export async function sendOTP(email: string): Promise<string> {
  const otp = generateOTP(); // Generate OTP
  const mailOptions = {
    from: process.env.USER_NAME,
    to: email,
    subject: "Your OTP for Registration",
    text: `Your OTP is ${otp}. Please use this OTP to complete your registration.`,
  };

  try {
    // Send email
    await transporter.sendMail(mailOptions);
    console.log("OTP sent successfully.");
    return otp; // Return OTP for validation
  } catch (error) {
    console.error("Error sending OTP:", error);
    throw new Error("Failed to send OTP.");
  }
}
