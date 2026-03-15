import pubsub from "../graphql/pubsub.js";
import axios from "axios";
import { getMpesaAccessToken } from "../services/mpesa.js";

const PAYMENT_RECEIVED = "PAYMENT_RECEIVED";
const BALANCE_UPDATED = "BALANCE_UPDATED";

/**
 * Helper to publish balance updates for a specific user
 * @param {String} userId - The user's MongoDB _id
 * @param {Number} newBalance - The new balance value
 */
export const notifyBalanceUpdate = (userId, newBalance) => {
  console.log(`📢 Publishing balance update for user ${userId}: ${newBalance}`);

  if (pubsub) {
    pubsub.publish(`${BALANCE_UPDATED}_${userId}`, {
      balanceUpdated: {
        userId,
        newBalance,
      },
    });
  }
};

export const mpesaResolvers = {
  Mutation: {
    initiateStkPush: async (_, { amount, phone, account, desc }) => {
      try {
        console.log("🚀 Initiating STK Push:", { amount, phone, account });

        // Format phone number to international format
        let formattedPhone = phone.toString().replace(/\s+/g, ''); // Remove spaces

        // Handle different formats
        if (formattedPhone.startsWith('+254')) {
          formattedPhone = formattedPhone.substring(1); // Remove + prefix
        } else if (formattedPhone.startsWith('254')) {
          // Already in correct format
        } else if (formattedPhone.startsWith('0')) {
          // Local format, convert to international
          formattedPhone = '254' + formattedPhone.substring(1);
        } else if (formattedPhone.length === 9) {
          // Assume it's without country code, add it
          formattedPhone = '254' + formattedPhone;
        }

        // Validate the final format
        if (!/^254[0-9]{9}$/.test(formattedPhone)) {
          throw new Error('Invalid phone number format. Please use a valid Kenyan phone number.');
        }

        console.log("📞 Formatted phone number:", formattedPhone);

        const token = await getMpesaAccessToken();
        const url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";

        // Generate dynamic timestamp and password
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const shortcode = process.env.MPESA_SHORTCODE || "174379";
        const passkey = process.env.MPESA_PASSKEY || "MTc0Mzc5YmZiMjc5ZjlhYTliZGJjZjE1OGU5N2RkNzFhNDY3Y2QyZTBjODkzMDU5YjEwZjc4ZTZiNzJhZGExZWQyYzkxOTIwMjUwOTA1MDUxNDQ2";
        const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

        // Use production URL for M-Pesa callbacks
        const BASE_URL = process.env.NODE_ENV === 'production'
          ? 'https://instarenty.onrender.com'
          : process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        const callbackUrl = `${BASE_URL}/mpesa/callback`;

        console.log("📍 Using callback URL:", callbackUrl);

        const payload = {
          BusinessShortCode: parseInt(shortcode),
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: amount,
          PartyA: formattedPhone,
          PartyB: parseInt(shortcode),
          PhoneNumber: formattedPhone,
          CallBackURL: callbackUrl,
          AccountReference: account || "InstaRenty",
          TransactionDesc: desc || "Payment for services",
        };

        console.log("📦 STK Push payload prepared");

        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        const response = await axios.post(url, payload, { headers });
        const checkoutRequestID = response.data.CheckoutRequestID;

        console.log("✅ STK Push successful:", {
          CheckoutRequestID: checkoutRequestID,
          MerchantRequestID: response.data.MerchantRequestID,
          ResponseCode: response.data.ResponseCode
        });

        return {
          MerchantRequestID: response.data.MerchantRequestID,
          CheckoutRequestID: checkoutRequestID,
          ResponseCode: response.data.ResponseCode,
          ResponseDescription: response.data.ResponseDescription,
          CustomerMessage: response.data.CustomerMessage,
        };
      } catch (error) {
        console.error("❌ STK Push failed:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });

        throw new Error(`Payment initiation failed: ${error.response?.data?.CustomerMessage || error.message}`);
      }
    },
  },

  Subscription: {
    paymentReceived: {
      subscribe: (_, { checkoutRequestID }) => {
        if (!pubsub) {
          throw new Error("PubSub not available - Redis connection required for subscriptions");
        }
        console.log("📡 Subscription request received with CheckoutRequestID:", checkoutRequestID);

        if (!checkoutRequestID) {
          console.error("❌ Subscription attempted without checkoutRequestID");
          throw new Error("checkoutRequestID is required for subscription");
        }

        const channel = `${PAYMENT_RECEIVED}_${checkoutRequestID}`;
        console.log("📡 Subscribing to channel:", channel);
        return pubsub.asyncIterator(channel);
      },
    },
    balanceUpdated: {
      subscribe: (_, { userId }) => {
        if (!pubsub) {
          throw new Error("PubSub not available - Redis connection required for subscriptions");
        }
        console.log("📡 Subscribed to balance updates for user:", userId);
        return pubsub.asyncIterator(`${BALANCE_UPDATED}_${userId}`);
      },
    },
  },
};

export default mpesaResolvers;
