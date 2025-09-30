import express from 'express'
import { EmailSender } from '../controllers/notificationSender.js';

const notificationRoute = express.Router();

notificationRoute.post("/",EmailSender);

export default notificationRoute