import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";



// creating method for refresh token and access token.....we dont need asynchandler because it is a internal method 
const generateRefreshandAccesstokens= async (userId)=>{
    try {
        const user=await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({ validateBeforeSave:false })//save directly withour validation example:in user model there password is required but her we pass only one thing 

        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"Something went wrong")
    }

    
}


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
    if (!username||!email) {
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
    const loggedinuser=User.findById(user._id).select(-password -refreshToken)

        // security step
    const options={
        httpOnly:true,
        secure:true
    }
    
    return res
    .status(200)
    .cookie("accessToken",accessToken)
    .cookie("refreshToken",refreshToken)
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
    User.findByIdAndUpdate(
        res.user._id,
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
    .clearcookie("accessToken",options)
    .clearcookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User loggedout successfully"))
})

export {
    registerUser,
    loginUser,
    logout
}