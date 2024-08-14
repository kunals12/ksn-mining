import { z } from "zod";

// Define custom error messages for each validation rule
const customErrorMessages = {
  minLength: "Field must be at least 3 characters long",
  email: "Invalid email format",
  passwordLength: "Password must be at least 6 characters long",
  required: "Field is required",
};

// Define the user schema with custom error messages
export const userSchema = z.object({
  username: z.string().min(3, { message: customErrorMessages.minLength }),
  email: z.string().email({ message: customErrorMessages.email }),
  password: z.string().min(6, { message: customErrorMessages.passwordLength }),
  address: z.string().nonempty({ message: customErrorMessages.required }),
});
