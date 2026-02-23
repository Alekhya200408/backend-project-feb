import { v2 as cloudinary} from "cloudinary";
import fs from "fs"


cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET,
})

const uploadOnCloudinary=async (localFilePath)=>{
    try {
        if(!localFilePath) return null;
        // upload file on cloudinary
        const response =await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        // file has been successfully uploaded
        // console.log("File is uploaded on cloudinary",response.url);
        fs.unlinkSync(localFilePath)
        return response;
        
    } catch (error) {
        fs.unlinkSync(localFilePath);//it removes the temporary uploaded file in local storage on the basis of upload operation got failed
        return null
    }
}


console.log("Cloudinary config:", {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY
});
export {uploadOnCloudinary}