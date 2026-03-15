#!/usr/bin/env node

/**
 * Migration Script: Populate Reaction Counts
 * 
 * This script calculates and updates totalLikes and totalDislikes for all existing posts
 * based on the reactions stored in the userReactions array.
 * 
 * Run with: node scripts/populateReactionCounts.js
 */

import mongoose from 'mongoose';
import Post from '../Data/PostDetails.js';
import Reaction from '../Data/ReactionDetails.js';

// Import database config
import '../config/db.js';

const runMigration = async () => {
  try {
    console.log('🚀 Starting reaction counts migration...');
    
    // Get all posts
    const posts = await Post.find({});
    console.log(`📊 Found ${posts.length} posts to process`);
    
    let processed = 0;
    let updated = 0;
    
    for (const post of posts) {
      processed++;
      console.log(`\n📝 Processing post ${processed}/${posts.length}: ${post._id}`);
      
      // Get all reactions for this post
      const reactions = await Reaction.find({ postId: post._id });
      console.log(`📊 Found ${reactions.length} reactions for this post`);

      // Count likes and dislikes
      const likesCount = reactions.filter(r => r.type === 1).length;
      const dislikesCount = reactions.filter(r => r.type === 2).length;

      console.log(`👍 Likes: ${likesCount}, 👎 Dislikes: ${dislikesCount}`);

      // Check if counts need updating
      const currentLikes = post.totalLikes || 0;
      const currentDislikes = post.totalDislikes || 0;

      if (currentLikes !== likesCount || currentDislikes !== dislikesCount) {
        // Update the post
        post.totalLikes = likesCount;
        post.totalDislikes = dislikesCount;
        await post.save();

        console.log(`✅ Updated post ${post._id}: ${likesCount} likes, ${dislikesCount} dislikes`);
        updated++;
      } else {
        console.log(`⏭️ Post ${post._id} already has correct counts`);
      }
    }
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`📊 Total posts processed: ${processed}`);
    console.log(`🔄 Posts updated: ${updated}`);
    console.log(`✅ Posts with correct counts: ${processed - updated}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run the migration
runMigration();