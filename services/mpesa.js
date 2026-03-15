// services/mpesa.js
import axios from "axios";

const consumerKey = process.env.MPESA_CONSUMER_KEY || "MWHF1ZMSr4d85qwvkylCdLHuO1YANK3FOUE5tGjGhDXwBBGO";
const consumerSecret = process.env.MPESA_CONSUMER_SECRET || "Ic7Y7GFetyepAUevbaiAkDBFpOhNJFAd2jauYf4B97tAiM4nxW1TxkfXz15i4GMX";

const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

// cache vars
let cachedToken = null;
let tokenExpiry = null;

export const getMpesaAccessToken = async () => {
  // return cached token if valid
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    console.log("♻️  Using cached Mpesa token");
    return cachedToken;
  }

  try {
    console.log("🔑 Requesting new Mpesa Access Token...");

    const response = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    const { access_token, expires_in } = response.data;

    // cache it with expiry (minus 60s safety buffer)
    cachedToken = access_token;
    tokenExpiry = Date.now() + (parseInt(expires_in, 10) - 60) * 1000;

    console.log("✅ Mpesa Access Token acquired");
    return cachedToken;
  } catch (error) {
    console.error("❌ Failed to get access token", error.response?.data || error.message);
    throw new Error("Could not authenticate with Safaricom");
  }
};
