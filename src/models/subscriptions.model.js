import mongoose,{Schema} from "mongoose";

const subscriptionSchema=new Schema({
    subscriber:{
        type:Schema.Types.ObjectId,//those who subcribe the channel
        ref:"User"
    },
    channel:{
        type:Schema.Types.ObjectId,//those who the subscribers subscribe their channel
        ref:"User"
    }
},{
    timestamps:true
})

export const Subscription=mongoose.model("Subscription",subscriptionSchema)