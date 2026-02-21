import mongoose,{Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema=new Schema(
    {
        username:{
            type:String,
            required:true,
            unique:true,
            index:true,
            trim:true,
            lowercase:true
        },
        email:{
            type:String,
            required:true,
            unique:true,
            trim:true,
            lowercase:true
        },
        fullname:{
            type:String,
            required:true,
            unique:true,
            index:true
        },
        avatar:{
            type:String,//cloudinary url
            required:true
        },
        coverImage:{
            type:String
        },
        watchHistory:[
            {
                type:Schema.Types.ObjectId,
                ref:"Video"
            }
        ],
        password:{
            type:String,
            required:[true,'password is required']
        },
        refreshtoken:{
            type:String
        }

    },
    {
        timestamps:true
    }
)

// this part is important,here do not use arrow function because arrow func does not aloow the 'this' for the scheema we need to add normal function and it is the ENCRYPT PART.......also this should be in modified part beacuse if not modified then it updates the password all the time....and this is wrong
userSchema.pre("save", async function(next){
    if(this.isModified("password")){
        this.password=bcrypt.hash(this.password,10)
        next()
    }
})

userSchema.methods.isPasswordCorrect=async function(password){
   return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken= function(){
   return jwt.sign(
        {
            _id:this._id,
            username:this.username,
            fullname:this.fullname,
            email:this.email
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken= function(){
    return jwt.sign(
        {
            _id:this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}


export const user=mongoose.model("User",userSchema)