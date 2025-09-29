import express from 'express'
import { blockorUnblockUser, changePassword, createUser, deleteUser, getOneUser, getUsers, loginWithGoogle, sendOTP, updateUser, userLogin, verifyOTP } from '../controllers/userController.js';

const userRoute = express.Router();

userRoute.post("/",createUser);
userRoute.post("/login",userLogin)


userRoute.get("/",getUsers);

userRoute.put("/block/:email",blockorUnblockUser)

userRoute.get("/oneuser/:id",getOneUser)

userRoute.put("/update/:id",updateUser)

userRoute.put("/update/password/:id",changePassword)

userRoute.delete("/:id",deleteUser)

userRoute.post("/google",loginWithGoogle)

userRoute.get("/sendOTP",sendOTP)

userRoute.post("/verifyOTP",verifyOTP)

export default userRoute