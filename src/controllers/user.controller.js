import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { user } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const registerUser=asyncHandler(async (req,res)=>{
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    // get user details from frontend
    const {fullname,email,password,username}=req.body
    console.log("email: ",email);
    
    // validation - not empty
    if (
        [fullname,email,password,username].some((field)=>field?.trim==="")
    ) {
        throw new ApiError(400,"All feilds are required")
    }
    
    // check if user already exists: username, email
    const existedUser = user.findOne({
        $or:[ { username },{ email }]
    })

    if (existedUser) {
        throw new ApiError(409,"User already exist")
    }

    // check for images, check for avatar
    const avatarLocalpath=req.files?.avatar[0]?.path;
    const coverImageLocalpath=req.files?.coverImage[0]?.path;

    if (!avatarLocalpath) {
        throw new ApiError(408,"Avatar required")
    }

    //upload them to cloudinary, avatar
    const avatar= await uploadOnCloudinary(avatarLocalpath)
    const coverImage= await uploadOnCloudinary(coverImageLocalpath)

    if (!avatar) {
        throw new ApiError(408,"Avatar required")
    }


    // create user object - create entry in db
    const user=await user.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url||"",//for checking coverimage is in DB or not
        password,
        username:username.toLowercase(),
        email,
    })

    const createdUser=await user.findbyId(user._id).select(
        "-password -refreshToken"
    )
    
    // checking the createduser 
    if (!createdUser) {
        throw new ApiError(500,"Something went wrong while registering the user")   
    }

    // return in a structured way
    return res.status(201).json(
        new ApiResponse(200,createdUser,"Useer Registered successfully")
    )
})

export {registerUser}