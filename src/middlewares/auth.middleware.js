import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model";

// middleware for logout and remove the accesstoken ......and if res has not any work we can exchage res with "_"
export const verifyJWT=asyncHandler(async (req,_,next)=>{
    const token=req.cookies?.accessToken||req.header("authorization")?.replace("Bearer ", "")

    try {
        if (!token) {
            throw new ApiError(401,"Unauthorized Request")
        }
    
        const decodedToken=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
    
        const user = User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if (!user) {
            throw new ApiError(401,"Invalid access Token")
        }
    
        req.user=user
        next()
    } catch (error) {
        throw new ApiError(401,error?.message||"invalid access token")
    }
})