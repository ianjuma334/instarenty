import Grab from '../Data/GrabDetails.js';
import Post from '../Data/PostDetails.js';

export const expireGrabIfNeeded = async (post) => {
  let changed = false;

  // Worker grab
  if (post.activeWorkerGrab) {
    const grab = await Grab.findById(post.activeWorkerGrab);
    if (grab && !grab.isExpired && grab.expiresAt < new Date()) {
      grab.isExpired = true;
      grab.penaltyPaid = false;
      await grab.save();

      post.activeWorkerGrab = null;
      changed = true;
    }
  }

  // Customer grab
  if (post.activeCustomerGrab) {
    const grab = await Grab.findById(post.activeCustomerGrab);
    if (grab && !grab.isExpired && grab.expiresAt < new Date()) {
      grab.isExpired = true;
      grab.penaltyPaid = false;
      await grab.save();

      post.activeCustomerGrab = null;
      changed = true;
    }
  }

  if (changed) await post.save();
  return post;
};
