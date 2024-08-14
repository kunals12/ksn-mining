import express, { Request, Response } from "express";
import { getClaimData } from "../controllers/admin";
import { getErrorResponse } from "../utils/common";
const router = express.Router();

router.get("/", async(req: Request, res: Response) => {
    try {
        const data = await getClaimData();
    return res.status(200).json({message: "Data Found", res: data});
    } catch (error:any) {   
        // console.log(error);
             
        const { statusCode, errorMessage } = getErrorResponse(error.message);
        res.status(statusCode).json({ error: errorMessage }); 
    }
})

// router.put("/", async(req: Request, res:Response) => {
//     try {
//         const data = await 
//     } catch (error) {
        
//     }
// })

export default router;
