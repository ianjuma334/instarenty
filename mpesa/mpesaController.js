import axios from 'axios';
import { getMpesaAccessToken } from '../services/mpesa.js';

// controllers/mpesaController.js
import pubsub from "../graphql/pubsub.js";

const PAYMENT_RECEIVED = "PAYMENT_RECEIVED";

export const handleMpesaCallback = (req, res) => {
  try {
    // Comprehensive logging for debugging
    console.log("=== MPESA CALLBACK RECEIVED ===");
    console.log("🕒 Timestamp:", new Date().toISOString());
    console.log("🌐 Headers:", JSON.stringify(req.headers, null, 2));
    console.log("📦 Body:", JSON.stringify(req.body, null, 2));
    console.log("📍 IP:", req.ip);
    console.log("🤖 User-Agent:", req.get('User-Agent'));
    console.log("🔗 Content-Type:", req.get('Content-Type'));

    // Validate callback structure
    if (!req.body || !req.body.Body || !req.body.Body.stkCallback) {
      console.error("❌ Invalid callback structure received");
      return res.status(400).json({
        "ResponseCode": "1",
        "ResponseDesc": "Invalid callback format"
      });
    }

    const { stkCallback } = req.body.Body;
    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    // Additional validation
    if (!CheckoutRequestID) {
      console.error("❌ Missing CheckoutRequestID in callback");
      return res.status(400).json({
        "ResponseCode": "1",
        "ResponseDesc": "Missing CheckoutRequestID"
      });
    }

    console.log("📥 Processing Mpesa Callback:", {
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      hasCallbackMetadata: !!CallbackMetadata
    });

    const channel = `${PAYMENT_RECEIVED}_${CheckoutRequestID}`;

    if (ResultCode === 0) {
      // ✅ Successful payment
      if (!CallbackMetadata || !CallbackMetadata.Item) {
        console.error("❌ Missing CallbackMetadata in successful payment");
        return res.status(400).json({
          "ResponseCode": "1",
          "ResponseDesc": "Invalid callback metadata"
        });
      }

      const items = CallbackMetadata.Item;
      const amountPaid = items.find((i) => i.Name === "Amount")?.Value;
      const mpesaReceiptNumber = items.find((i) => i.Name === "MpesaReceiptNumber")?.Value;

      console.log("✅ Payment successful! CheckoutRequestID:", CheckoutRequestID);
      console.log("💰 Amount:", amountPaid, "Receipt:", mpesaReceiptNumber);
      console.log("🚀 Publishing to subscription channel:", channel);

      if (pubsub) {
        pubsub.publish(channel, {
          paymentReceived: {
            CheckoutRequestID,
            ResultCode,
            ResultDesc,
            Amount: amountPaid,
            MpesaReceiptNumber: mpesaReceiptNumber,
          },
        });
        console.log("✅ Published to GraphQL subscription");
      } else {
        console.error("❌ PubSub not available for publishing");
      }
    } else {
      // ❌ Failed or cancelled — still publish!
      console.log("❌ Payment failed or cancelled:", {
        CheckoutRequestID,
        ResultCode,
        ResultDesc,
      });

      if (pubsub) {
        pubsub.publish(channel, {
          paymentReceived: {
            CheckoutRequestID,
            ResultCode,
            ResultDesc,
            Amount: null,
            MpesaReceiptNumber: null,
          },
        });
        console.log("✅ Published failed payment to subscription");
      } else {
        console.error("❌ PubSub not available for publishing failed payment");
      }
    }

    // Return CORRECT M-Pesa response format
    const response = {
      "ResponseCode": "0",
      "ResponseDesc": "success",
      "ThirdPartyTransID": CheckoutRequestID
    };

    console.log("📤 Sending response to M-Pesa:", response);
    res.json(response);

  } catch (error) {
    console.error("💥 Critical error processing M-Pesa callback:", error);
    console.error("Stack trace:", error.stack);

    // Return error response in M-Pesa format
    res.status(500).json({
      "ResponseCode": "1",
      "ResponseDesc": "Internal server error"
    });
  }
};



// paybillController.js
export const handlePaybillConfirmation = (req, res) => {
  console.log('📥 Received Paybill Confirmation:', req.body);

  const {
    TransID,
    TransAmount,
    BillRefNumber, // Username
    MSISDN,
    TransTime,
  } = req.body;

  // TODO: Find user with BillRefNumber (username), save payment

  console.log(`✅ Payment received from ${MSISDN}: KES ${TransAmount} for user ${BillRefNumber}`);

  res.json({
    ResultCode: 0,
    ResultDesc: "Confirmation Received Successfully",
  });
};

export const getAccessToken = async (req, res) => {
  try {
    console.log("🔑 Fetching Mpesa Access Token...");
    const token = await getMpesaAccessToken();
    res.json({ token });
  } catch (error) {
    console.error("❌ Error fetching token:", error.message);
    res.status(500).json({ error: "Failed to fetch Mpesa access token" });
  }
};

export const initiateStkPush = async (req, res) => {
  try {
    console.log("🔑 Fetching M-Pesa Access Token for STK Push...");
    const token = await getMpesaAccessToken();

    const url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    };

    // Use production URL for M-Pesa callbacks
    const BASE_URL = process.env.NODE_ENV === 'production'
      ? 'https://instarenty.onrender.com'
      : process.env.BASE_URL || req.protocol + '://' + req.get('host');
    //const callbackUrl = `${BASE_URL}/mpesa/callback`;
    const callbackUrl = `https://eodtzjjckalvy11.m.pipedream.net`;

    console.log("📍 Using callback URL:", callbackUrl);

    // Generate dynamic timestamp and password
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const shortcode = process.env.MPESA_SHORTCODE || "174379";
    const passkey = process.env.MPESA_PASSKEY || "MTc0Mzc5YmZiMjc5ZjlhYTliZGJjZjE1OGU5N2RkNzFhNDY3Y2QyZTBjODkzMDU5YjEwZjc4ZTZiNzJhZGExZWQyYzkxOTIwMjUwOTA1MDUxNDQ2";
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

    const payload = {
      BusinessShortCode: parseInt(shortcode),
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: req.body.amount || 1,
      PartyA: req.body.phone || 254708374149,
      PartyB: parseInt(shortcode),
      PhoneNumber: req.body.phone || 254757690059,
      CallBackURL: callbackUrl,
      AccountReference: req.body.account || "InstaRenty",
      TransactionDesc: req.body.desc || "Payment for services",
    };

    console.log("🚀 STK Push Payload:", {
      ...payload,
      Password: "[HIDDEN]", // Don't log password
      CallBackURL: callbackUrl
    });

    const response = await axios.post(url, payload, { headers });
    console.log("✅ STK Push Response:", response.data);

    res.json({
      success: true,
      data: response.data,
      callbackUrl: callbackUrl
    });
  } catch (error) {
    console.error("❌ STK Push Error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    res.status(500).json({
      error: "STK Push failed",
      message: error.response?.data?.CustomerMessage || error.message
    });
  }
};

