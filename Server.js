import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { connectToDatabase } from './DbConnection.js';
import userRoute from './routes/userRoute.js';
import jwt, { decode } from "jsonwebtoken"
import cors from "cors";
import inquiryRouter from './routes/inquiryRouter.js';
import orderRoute from './routes/orderRoute.js';
import paymentRouter from './routes/paymentRoute.js';
import notificationRoute from './routes/notificationRoute.js';
import restaurantRoute from './routes/ownerRoute.js';
import collectionRoute from './routes/collectionRoute.js';
import reviewRouter from './routes/reviewRouter.js';
import driverRoute from './routes/driverRoute.js';
import deliveryRoute from './routes/deliveryRoute.js';


dotenv.config();

const app = express();


app.use(cors());




app.use(bodyParser.json());

app.use((req,res,next)=>{
    let token = req.header
    ("Authorization")

    if(token!=null){
        token = token.replace("Bearer ","");
        jwt.verify(token,process.env.SEKRET_KEY,
            (err,decode)=>{
                if(!err){
                    req.user = decode;
                }
            }
        );
    }
    next()

});

connectToDatabase();

app.use("/api/v1/notification",notificationRoute);
app.use("/api/payment",paymentRouter)
app.use("/api/v1/users",userRoute)
app.use("/api/inquiry",inquiryRouter);
app.use("/api/v1/restaurant",restaurantRoute)
app.use("/api/v1/collection",collectionRoute)
app.use("/api/v1/reviews",reviewRouter)
app.use("/api/v1/orders",orderRoute)
app.use("/api/v1/driver",driverRoute);
app.use("/api/v1/delivery",deliveryRoute)

app.listen(3000,()=>{
    console.log("Server is running on port 3000")
})


