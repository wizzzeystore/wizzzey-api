import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';

// Ensure uploads directory exists
const uploadsDir = 'uploads/';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// Initialize upload
export const upload = multer({ storage: storage });

// Middleware to compress images and videos after upload
export const compressFiles = async (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();
  const compressPromises = req.files.map(async (file) => {
    const ext = path.extname(file.filename).toLowerCase();
    const filePath = file.path;
    if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
      // Compress image
      const compressedPath = filePath.replace(ext, `-compressed${ext}`);
      try {
        await sharp(filePath)
          .resize({ width: 1200 }) // Resize to max width 1200px
          .jpeg({ quality: 70 }) // Compress JPEG quality
          .toFile(compressedPath);
        
        // Add a longer delay before attempting to delete the file
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Use fs.promises for better async handling
        await fs.promises.unlink(filePath).catch(err => {
          console.warn(`Could not delete original file ${filePath}: ${err.message}`);
        });
        
        file.path = compressedPath;
        file.filename = path.basename(compressedPath);
      } catch (err) {
        console.error(`Error processing image ${filePath}: ${err.message}`);
        // Don't rethrow, continue with original file
      }
    } else if (['.mp4', '.mov', '.avi', '.webm'].includes(ext)) {
      // Compress video
      const compressedPath = filePath.replace(ext, `-compressed${ext}`);
      try {
        await new Promise((resolve, reject) => {
          ffmpeg(filePath)
            .outputOptions([
              '-vf scale=1280:-2', // Resize video width to 1280px
              '-crf 28', // Lower quality for smaller size
              '-preset veryfast',
            ])
            .on('end', resolve)
            .on('error', reject)
            .save(compressedPath);
        });
        
        // Add a longer delay before attempting to delete the file
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Use fs.promises for better async handling
        await fs.promises.unlink(filePath).catch(err => {
          console.warn(`Could not delete original file ${filePath}: ${err.message}`);
        });
        
        file.path = compressedPath;
        file.filename = path.basename(compressedPath);
      } catch (err) {
        console.error(`Error processing video ${filePath}: ${err.message}`);
        // Don't rethrow, continue with original file
      }
    }
  });
  
  try {
    await Promise.all(compressPromises);
    next();
  } catch (err) {
    next(err);
  }
};