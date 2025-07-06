import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import logger from '../utils/logger.ut.js';
import connectDB from '../config/db.js';

// Import models
import {Product} from '../models/Product.mo.js';
import {Category} from '../models/Category.mo.js';
import {Brand} from '../models/Brand.mo.js';
import AppSettings from '../models/AppSettings.mo.js';
import User from '../models/User.mo.js';
import BlogPost from '../models/BlogPost.mo.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CleanupService {
  constructor() {
    this.uploadsDir = path.join(__dirname, '../../uploads');
    this.isRunning = false;
  }

  /**
   * Extract filename from URL
   * @param {string} url - The URL to extract filename from
   * @returns {string|null} - The filename or null if invalid
   */
  extractFilenameFromUrl(url) {
    if (!url) return null;
    
    try {
      // Handle both full URLs and relative paths
      const urlPath = url.startsWith('http') ? new URL(url).pathname : url;
      const filename = path.basename(urlPath);
      return filename || null;
    } catch (error) {
      logger.error('Error extracting filename from URL:', error);
      return null;
    }
  }

  /**
   * Get all image references from database collections
   * @returns {Promise<Set<string>>} - Set of referenced filenames
   */
  async getReferencedImages() {
    const referencedImages = new Set();

    try {
      // Get images from Products
      const products = await Product.find({}, 'imageUrl media');
      products.forEach(product => {
        if (product.imageUrl) {
          const filename = this.extractFilenameFromUrl(product.imageUrl);
          if (filename) referencedImages.add(filename);
        }
        if (product.media && Array.isArray(product.media)) {
          product.media.forEach(media => {
            if (media.url) {
              const filename = this.extractFilenameFromUrl(media.url);
              if (filename) referencedImages.add(filename);
            }
          });
        }
      });

      // Get images from Categories
      const categories = await Category.find({}, 'imageUrl image media');
      categories.forEach(category => {
        if (category.imageUrl) {
          const filename = this.extractFilenameFromUrl(category.imageUrl);
          if (filename) referencedImages.add(filename);
        }
        if (category.image && category.image.filename) {
          referencedImages.add(category.image.filename);
        }
        if (category.media && Array.isArray(category.media)) {
          category.media.forEach(media => {
            if (media.url) {
              const filename = this.extractFilenameFromUrl(media.url);
              if (filename) referencedImages.add(filename);
            }
          });
        }
      });

      // Get images from Brands
      const brands = await Brand.find({}, 'logo');
      brands.forEach(brand => {
        if (brand.logo && brand.logo.url) {
          const filename = this.extractFilenameFromUrl(brand.logo.url);
          if (filename) referencedImages.add(filename);
        }
      });

      // Get images from AppSettings
      const appSettings = await AppSettings.findOne({}, 'storeLogo heroImage');
      if (appSettings) {
        if (appSettings.storeLogo && appSettings.storeLogo.filename) {
          referencedImages.add(appSettings.storeLogo.filename);
        }
        if (appSettings.heroImage && appSettings.heroImage.filename) {
          referencedImages.add(appSettings.heroImage.filename);
        }
      }

      // Get images from Users (avatar)
      const users = await User.find({}, 'avatarUrl');
      users.forEach(user => {
        if (user.avatarUrl) {
          const filename = this.extractFilenameFromUrl(user.avatarUrl);
          if (filename) referencedImages.add(filename);
        }
      });

      // Get images from BlogPosts
      const blogPosts = await BlogPost.find({}, 'featuredImage media');
      blogPosts.forEach(blogPost => {
        if (blogPost.featuredImage) {
          const filename = this.extractFilenameFromUrl(blogPost.featuredImage);
          if (filename) referencedImages.add(filename);
        }
        if (blogPost.media && Array.isArray(blogPost.media)) {
          blogPost.media.forEach(media => {
            if (media.url) {
              const filename = this.extractFilenameFromUrl(media.url);
              if (filename) referencedImages.add(filename);
            }
          });
        }
      });

      logger.info(`Found ${referencedImages.size} referenced images in database`);
      return referencedImages;

    } catch (error) {
      logger.error('Error getting referenced images from database:', error);
      throw error;
    }
  }

  /**
   * Get all files in uploads directory
   * @returns {Promise<Set<string>>} - Set of filenames in uploads directory
   */
  async getUploadedFiles() {
    try {
      const files = await fs.readdir(this.uploadsDir);
      const fileSet = new Set(files.filter(file => file !== '.gitkeep'));
      logger.info(`Found ${fileSet.size} files in uploads directory`);
      return fileSet;
    } catch (error) {
      logger.error('Error reading uploads directory:', error);
      throw error;
    }
  }

  /**
   * Delete orphaned files
   * @param {Set<string>} orphanedFiles - Set of orphaned filenames
   * @returns {Promise<number>} - Number of files deleted
   */
  async deleteOrphanedFiles(orphanedFiles) {
    let deletedCount = 0;
    const errors = [];

    for (const filename of orphanedFiles) {
      try {
        const filePath = path.join(this.uploadsDir, filename);
        await fs.unlink(filePath);
        deletedCount++;
        logger.info(`Deleted orphaned file: ${filename}`);
      } catch (error) {
        logger.error(`Error deleting file ${filename}:`, error);
        errors.push({ filename, error: error.message });
      }
    }

    if (errors.length > 0) {
      logger.warn(`Failed to delete ${errors.length} files:`, errors);
    }

    return deletedCount;
  }

  /**
   * Perform the cleanup operation
   */
  async performCleanup() {
    if (this.isRunning) {
      logger.warn('Cleanup service is already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting image cleanup service...');

      // Ensure database connection
      await connectDB();

      // Get referenced images from database
      const referencedImages = await this.getReferencedImages();

      // Get all files in uploads directory
      const uploadedFiles = await this.getUploadedFiles();

      // Find orphaned files (files in uploads but not referenced in DB)
      const orphanedFiles = new Set();
      for (const file of uploadedFiles) {
        if (!referencedImages.has(file)) {
          orphanedFiles.add(file);
        }
      }

      logger.info(`Found ${orphanedFiles.size} orphaned files`);

      // Delete orphaned files
      if (orphanedFiles.size > 0) {
        const deletedCount = await this.deleteOrphanedFiles(orphanedFiles);
        logger.info(`Cleanup completed: ${deletedCount} files deleted`);
      } else {
        logger.info('No orphaned files found');
      }

      const duration = Date.now() - startTime;
      logger.info(`Cleanup service completed in ${duration}ms`);

    } catch (error) {
      logger.error('Error during cleanup service:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start the cleanup service scheduler
   */
  startScheduler() {
    // Schedule cleanup to run every day at 12:00 AM IST (6:30 PM UTC)
    // Cron format: minute hour day month day-of-week
    // IST is UTC+5:30, so 12:00 AM IST = 6:30 PM UTC (previous day)
    const cronExpression = '30 18 * * *'; // 6:30 PM UTC = 12:00 AM IST next day

    cron.schedule(cronExpression, () => {
      logger.info('Scheduled cleanup service triggered');
      this.performCleanup();
    }, {
      timezone: 'UTC'
    });

    logger.info('Cleanup service scheduler started - will run daily at 12:00 AM IST');
  }

  /**
   * Stop the cleanup service scheduler
   */
  stopScheduler() {
    cron.getTasks().forEach(task => task.stop());
    logger.info('Cleanup service scheduler stopped');
  }

  /**
   * Manual cleanup trigger (for testing or immediate cleanup)
   */
  async manualCleanup() {
    logger.info('Manual cleanup triggered');
    await this.performCleanup();
  }
}

// Create singleton instance
const cleanupService = new CleanupService();

export default cleanupService; 