import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";


const router=Router()

// file handling also here ****
// for register
router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser
)
// for login
router.route("/login").post(loginUser)
// for logout
router.route("/logout").post(verifyJWT,logoutUser)

export default router