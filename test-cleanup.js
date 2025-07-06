import cleanupService from './src/services/cleanupService.js';
import connectDB from './src/config/db.js';
import logger from './src/utils/logger.ut.js';

/**
 * Test script for cleanup service
 * This script can be run independently to test the cleanup functionality
 */

async function testCleanupService() {
  try {
    logger.info('Starting cleanup service test...');

    // Connect to database
    await connectDB();
    logger.info('Database connected successfully');

    // Test 1: Get referenced images
    logger.info('Testing getReferencedImages...');
    const referencedImages = await cleanupService.getReferencedImages();
    logger.info(`Found ${referencedImages.size} referenced images`);

    // Test 2: Get uploaded files
    logger.info('Testing getUploadedFiles...');
    const uploadedFiles = await cleanupService.getUploadedFiles();
    logger.info(`Found ${uploadedFiles.size} files in uploads directory`);

    // Test 3: Find orphaned files
    logger.info('Finding orphaned files...');
    const orphanedFiles = [];
    for (const file of uploadedFiles) {
      if (!referencedImages.has(file)) {
        orphanedFiles.push(file);
      }
    }
    logger.info(`Found ${orphanedFiles.length} orphaned files:`, orphanedFiles);

    // Test 4: Preview orphaned files (without deleting)
    logger.info('Testing orphaned files preview...');
    const preview = {
      totalFilesInUploads: uploadedFiles.size,
      referencedFiles: referencedImages.size,
      orphanedFiles: orphanedFiles.length,
      orphanedFileList: orphanedFiles
    };
    logger.info('Preview result:', preview);

    // Test 5: Manual cleanup (commented out for safety)
    // logger.info('Testing manual cleanup...');
    // await cleanupService.performCleanup();

    logger.info('Cleanup service test completed successfully');

  } catch (error) {
    logger.error('Error during cleanup service test:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testCleanupService(); 