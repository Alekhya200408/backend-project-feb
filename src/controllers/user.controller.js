import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import { set } from "mongoose";



// creating method for generating refresh token and access token.....we dont need asynchandler because it is a internal method 
const generateRefreshandAccesstokens= async (userId)=>{
    try {
        const user=await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({ validateBeforeSave:false })//save directly without validation example:in user model there password is required but here we pass only one thing 

        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"Something went wrong")
    }

    
}

// register user
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

    const {fullname,email,password,username}=req.body||{};
    // console.log("email: ",email);
    
    // validation - not empty
    if (
        [fullname,email,password,username].some((field)=>field?.trim()==="")
    ) {
        throw new ApiError(400,"All feilds are required")
    }
    
    // check if user already exists: username, email
    const existedUser = await User.findOne({
        $or:[ { username },{ email }]
    })

    if (existedUser) {
        throw new ApiError(409,"User already exist")
    }

    // console.log(req.files);
    
    // check for images, check for avatar
   
    const avatarLocalpath=req.files?.avatar[0]?.path;
    // const coverImageLocalpath=req.files?.coverImage[0]?.path;

    // modified checking for coverimage
    let coverImageLocalpath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0) {
        coverImageLocalpath=req.files.coverImage[0].path
    }


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
    const user=await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url||"",//for checking coverimage is in DB or not
        password,
        username:username.toLowerCase(),
        email,
    })

    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )
    
    // checking the createduser 
    if (!createdUser) {
        throw new ApiError(500,"Something went wrong while registering the user")   
    }

    // return in a structured way
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User Registered successfully")
    )
})

// login user
const loginUser=asyncHandler(async(req,res)=>{
    // req.body-> data
    // username or email
    // find the user
    // password checking
    // refresh and access token 
    // send through the cookies


    // req.body-> data
    const {email,password,username}=req.body;

    // checking if username or email field empty or not
    if (!username && !email) {
        throw new ApiError(400,"Username or email is required")
    }

   const user= await User.findOne({
        $or:[{ email },{ username }] // $or find by email and username both 
    })

    // check if user exist or not
    if (!user) {
        throw new ApiError(404,"User not found")
    }

    // password checking
    const isPasswordvalid=await user.isPasswordCorrect(password)

    if (!isPasswordvalid) {
        throw new ApiError(402,"Password is not matching")
    }

    // refresh and access token 
    const {accessToken,refreshToken}=await generateRefreshandAccesstokens(user._id)

    //process of send through cookies
    const loggedinuser=await User.findById(user._id).select("-password -refreshToken")

        // security step
    const options={
        httpOnly:true,
        secure:true
    }
    
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedinuser,accessToken,refreshToken
            },
            "User Logged in successfully"
        )
    )
    
})

// Logout
const logoutUser=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true //store new values after refresh token undefined
        },
    )
    const options={
        httpOnly:true,
        secure:true
    }

    return res.
    status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User loggedout successfully"))
})

// refresh and access token verify...like to check if the user had the token or not
const refreshAccesstoken=asyncHandler(async(req,res)=>{
   const incommingRefreshToken= req.cookies.refreshToken||req.body.refreshToken;

   if (!incommingRefreshToken) {
    throw new ApiError(401,"Unauthorized token")
   }
   //incoming token converted into decoded Token
   try {
    const decodedToken=jwt.verify(
     incommingRefreshToken,
     process.env.REFRESH_TOKEN_SECRET)
 
     const user=await User.findById(decodedToken?._id)
 
     if (!user) {
     throw new ApiError(401,"invalid Refreshtoken")
    }
    if (incommingRefreshToken!==user?.refreshToken) {
         throw new ApiError(401," Refresh token is expired or used")
    }
 
 //    we send the cookies from generaterefreshtoken and we use options when we access the cookies
    const options={
     httpOnly:true,
     secure:true
    }
 
    const {accessToken,newrefreshToken}= await generateRefreshandAccesstokens(user._id)
 
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",newrefreshToken,options)
    .json(
     new ApiResponse(200,
         {accessToken,refreshToken:newrefreshToken},
         "Access Token Refreshed"
     )
    )
   } catch (error) {
    throw new ApiError(400,error?.message||"Invalid Token")
   }
})

// changepassword
const changepassword=asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body

    const user=User.findById(req.user?._id)

    const ispasswordcorrect= await user.isPasswordCorrect(oldPassword) //from user model ispasswordcorrect method

    if(!ispasswordcorrect){
        throw new ApiError(400,"Password is wrong")
    }

    user.password=newPassword
    await user.save() //always use await here for database purpose 

    // for a massage direct return no need for const
    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password changed"))
    
})

// get the current User
const getcurrentUser=asyncHandler(async(req,res)=>{
    // return directly it goes through the middleware
    return res
    .status(200)
    .json(200,req.user,"Current user fetched successfully")
})

// update user details
const updateUserDetails=asyncHandler(async(req,res)=>{
    const {fullname,email}=req.body;

    if(!fullname || !email){
        throw new ApiError(400,"This feild is required")
    }
    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname,
                email
            }
        },
        {
            new:true //it returns the value after the update
        }

    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"User details Updated successfully"))
})

// update files 
// apdate avatar
const updateAvatar=asyncHandler(async(req,res)=>{
    const avatarLocalpath=req.file?.path //finding the local path by multer
    
    if (!avatarLocalpath) {
        throw new ApiError(400,"Avatar Not found")
    }
    const avatar =await uploadOnCloudinary(avatarLocalpath)

    if (!avatar.url) {
        throw new ApiError(400,"Error while uploading avatar file")   //use avatar url
    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            set:{
            avatar:avatar.url
        }
    }
    ).select("-password")

    return req
    .status(200)
    .json(new ApiResponse(200,user,"Avatar updated successfully"))
})

// update coverimage
const updateCoverimage=asyncHandler(async(req,res)=>{
    const coverimageLocalpath=req.file?.path //finding the local path by multer
    
    if (!coverimageLocalpath) {
        throw new ApiError(400,"Avatar Not found")
    }
    const coverImage =await uploadOnCloudinary(coverimageLocalpath)

    if (!coverImage.url) {
        throw new ApiError(400,"Error while uploading avatar file")   //use avatar url
    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            set:{
            coverImage:coverImage.url
        }
    }
    ).select("-password")

    return req
    .status(200)
    .json(new ApiResponse(200,user,"coverImage updated successfully"))
})
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccesstoken,
    changepassword,
    getcurrentUser,
    updateUserDetails,
    updateAvatar,
    updateCoverimage
}