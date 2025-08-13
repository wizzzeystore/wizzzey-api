import logger from '../utils/logger.ut.js';
import cleanupService from '../services/cleanupService.js';
import { ApiResponse } from '../utils/responseHandler.ut.js';

/**
 * Manual cleanup trigger
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const triggerManualCleanup = async (req, res) => {
  try {
    logger.info('Manual cleanup triggered via API endpoint');
    
    // Start cleanup in background (don't wait for completion)
    cleanupService.performCleanup().catch(error => {
      logger.error('Background cleanup failed:', error);
    });

    return ApiResponse.success(res, 'Cleanup process started successfully' , {
      message: 'Cleanup process has been initiated. Check logs for progress.',
      timestamp: new Date().toISOString()
    }, 200);

  } catch (error) {
    logger.error('Error triggering manual cleanup:', error);
    return responseHandler(res, 500, 'ERROR', 'Failed to trigger cleanup process', null);
  }
};

/**
 * Get cleanup service status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getCleanupStatus = async (req, res) => {
  try {
    const status = {
      isRunning: cleanupService.isRunning,
      schedulerActive: cleanupService.isSchedulerActive && typeof cleanupService.isSchedulerActive === 'function' ? cleanupService.isSchedulerActive() : !!cleanupService.task,
      lastRun: null, // Could be enhanced to track last run time
      nextScheduledRun: 'Daily at 12:00 AM IST (6:30 PM UTC)',
      uploadsDirectory: cleanupService.uploadsDir
    };

    return ApiResponse.success(res, 'Cleanup service status retrieved successfully', status, 200);

  } catch (error) {
    logger.error('Error getting cleanup status:', error);
    return ApiResponse.error(res, 'Failed to get cleanup status', 500);
  }
};

/**
 * Get orphaned files preview (without deleting)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getOrphanedFilesPreview = async (req, res) => {
  try {
    logger.info('Orphaned files preview requested');

    // Get referenced images from database
    const referencedImages = await cleanupService.getReferencedImages();

    // Get all files in uploads directory
    const uploadedFiles = await cleanupService.getUploadedFiles();

    // Find orphaned files
    const orphanedFiles = [];
    for (const file of uploadedFiles) {
      if (!referencedImages.has(file)) {
        orphanedFiles.push(file);
      }
    }

    const preview = {
      totalFilesInUploads: uploadedFiles.size,
      referencedFiles: referencedImages.size,
      orphanedFiles: orphanedFiles.length,
      orphanedFileList: orphanedFiles,
      estimatedSpaceSaved: 'Calculated based on file sizes', // Could be enhanced to calculate actual size
      timestamp: new Date().toISOString()
    };

    return ApiResponse.success(res, 'Orphaned files preview generated successfully', preview, 200);

  } catch (error) {
    logger.error('Error generating orphaned files preview:', error);
    return ApiResponse.error(res, 'Failed to generate orphaned files preview', 500);
  }
};

/**
 * Start the cleanup scheduler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const startCleanupScheduler = async (req, res) => {
  try {
    cleanupService.startScheduler();
    
    return ApiResponse.success(res, 'Cleanup scheduler started successfully', {
      message: 'Cleanup scheduler is now active',
      nextRun: 'Daily at 12:00 AM IST (6:30 PM UTC)',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error starting cleanup scheduler:', error);
    return responseHandler(res, 500, 'ERROR', 'Failed to start cleanup scheduler', null);
  }
};

/**
 * Stop the cleanup scheduler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const stopCleanupScheduler = async (req, res) => {
  try {
    cleanupService.stopScheduler();
    
    return ApiResponse.success(res, 'Cleanup scheduler stopped successfully', {
      message: 'Cleanup scheduler has been stopped',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error stopping cleanup scheduler:', error);
    return responseHandler(res, 500, 'ERROR', 'Failed to stop cleanup scheduler', null);
  }
}; 