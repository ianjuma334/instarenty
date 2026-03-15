import admin from '../config/firebaseAdmin.js';

const authenticate = async (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Firebase ID token must be provided');
    return null;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.log("Invalid Firebase token:", error.message);
    return null;
  }
};

export default authenticate;
