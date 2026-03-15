// routes/mpesaRoutes.js
import express from "express";
import {
  handleMpesaCallback,
  handlePaybillConfirmation,
  getAccessToken,
  initiateStkPush, // optional, if you want a test endpoint
} from "./mpesaController.js";

const router = express.Router();

// Safaricom will POST here after STK push or C2B events
router.post("/callback", handleMpesaCallback);

// Safaricom will POST here for Paybill confirmations
router.post("/confirmation", handlePaybillConfirmation);

// optional: test route to manually get token
router.get("/token", getAccessToken);

// optional: test route to initiate STK push
router.post("/stkpush", initiateStkPush);

export default router;
