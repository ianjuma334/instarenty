// mpesa.resolvers.js
import axios from 'axios';
import { getMpesaAccessToken } from '../../services/mpesa.js';

const BASE_URL = process.env.BASE_URL || 'https://b16d-154-159-237-84.ngrok-free.app'; // Dynamic ngrok URL

const mpesaResolvers = {
  Query: {
    testMpesaAuth: async () => {
      console.log('Starting testMpesaAuth resolver...');
      try {
        const token = await getMpesaAccessToken();
        console.log('Got token:', token);
        return token;
      } catch (error) {
        console.error('Error in testMpesaAuth resolver:', error.message);
        throw new Error('Authentication failed');
      }
    },
  },

  Mutation: {
    registerMpesaUrls: async () => {
      console.log('Starting registerMpesaUrls resolver...');
      try {
        const accessToken = await getMpesaAccessToken();
        console.log('Received access token:', accessToken);

        const response = await axios.post(
          'https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl',
          {
            ShortCode: process.env.MPESA_SHORTCODE,
            ResponseType: 'Completed',
            ConfirmationURL: `${BASE_URL}/mpesa/confirmation`, // dynamic
            ValidationURL: `${BASE_URL}/mpesa/validation`,     // dynamic
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        console.log('Register URL response:', response.data);

        return {
          success: true,
          message: 'URLs registered successfully!',
        };
      } catch (error) {
        console.error('Error registering URLs:', error.response?.data || error.message);
        return {
          success: false,
          message: 'Failed to register URLs.',
        };
      }
    },

    initiateMpesaPayment: async (_, { phoneNumber, amount }) => {
      try {
        console.log('Starting initiateMpesaPayment resolver...');

        const accessToken = await getMpesaAccessToken();
        console.log('Received access token:', accessToken);

        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = Buffer.from(
          `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
        ).toString('base64');

        const payload = {
          BusinessShortCode: process.env.MPESA_SHORTCODE,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: amount,
          PartyA: phoneNumber,
          PartyB: process.env.MPESA_SHORTCODE,
          PhoneNumber: phoneNumber,
          CallBackURL: `${BASE_URL}/mpesa/callback`, // dynamic
          AccountReference: 'TestAccount',
          TransactionDesc: 'Payment for goods',
        };

        console.log('STK Push payload:', payload);

        const response = await axios.post(
          'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
          payload,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        console.log('STK Push response:', response.data);

        return {
          success: true,
          message: response.data.CustomerMessage,
          merchantRequestID: response.data.MerchantRequestID,
          checkoutRequestID: response.data.CheckoutRequestID,
          customerMessage: response.data.CustomerMessage,
        };
      } catch (error) {
        console.error('STK Push error:', error.response?.data || error.message);
        return {
          success: false,
          message: 'Failed to initiate payment',
          merchantRequestID: null,
          checkoutRequestID: null,
          customerMessage: null,
        };
      }
    },
  },
};

export default mpesaResolvers;
