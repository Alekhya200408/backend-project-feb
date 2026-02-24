import { Router } from "express";
import { loginUser, logoutUser, refreshAccesstoken, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

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
// for logout //secured Route
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/refresh-token").post(refreshAccesstoken)

export default router