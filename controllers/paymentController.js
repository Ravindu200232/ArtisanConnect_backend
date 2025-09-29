import Payment from "../models/payment.js";
import bcrypt from "bcrypt";
import { checkAdmin } from "./authController.js";

export const makePayment = async (req, res) => {
  try {
    const { bookingId, amount, paymentType, cardNumber, expiry, cvv } =
      req.body;

    // Hash sensitive card data
    const hashedCardNumber = await bcrypt.hash(cardNumber, 10);
    const hashedExpiry = await bcrypt.hash(expiry, 10);
    const hashedCvv = await bcrypt.hash(cvv, 10);

    const payment = new Payment({
      bookingId,
      amount,
      paymentType,
      cardNumber: hashedCardNumber,
      expiry: hashedExpiry,
      cvv: hashedCvv,
    });

    await payment.save();

    res
      .status(200)
      .json({ message: "Payment successful", paymentId: payment._id });
  } catch (err) {
    console.error("Payment failed:", err);
    res.status(500).json({ message: "Payment processing error" });
  }
};

export const getAllPayments = async (req, res) => {
  try {
    if (!checkAdmin(req)) {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const payments = await Payment.find().select("-cardNumber -expiry -cvv"); // Exclude sensitive info

    res.status(200).json(payments);
  } catch (err) {
    console.error("Error fetching all payments:", err);
    res.status(500).json({ message: "Server error while retrieving payments" });
  }
};
