# Image Cleanup Service

## Overview

The Image Cleanup Service is an automated system that runs every midnight at 12:00 AM IST to remove orphaned image files from the `/uploads` directory. It scans all database collections for image references and deletes files that are no longer referenced.

## Features

- **Automated Scheduling**: Runs daily at 12:00 AM IST (6:30 PM UTC)
- **Comprehensive Scanning**: Checks all database collections for image references
- **Safe Deletion**: Only deletes files that are not referenced anywhere in the database
- **Manual Trigger**: Can be triggered manually via API endpoints
- **Preview Mode**: Preview orphaned files without deleting them
- **Status Monitoring**: Check service status and scheduler information

## Database Collections Scanned

The service scans the following collections for image references:

1. **Products**: `imageUrl`, `media` array
2. **Categories**: `imageUrl`, `image` object, `media` array
3. **Brands**: `logo.url`
4. **AppSettings**: `storeLogo.filename`, `heroImage.filename`
5. **Users**: `avatarUrl`
6. **BlogPosts**: `featuredImage`, `media` array

## API Endpoints

### Authentication Required
All endpoints require authentication and Admin role.

### 1. Trigger Manual Cleanup
```http
POST /api/cleanup/trigger
```

**Response:**
```json
{
  "type": "OK",
  "message": "Cleanup process started successfully",
  "data": {
    "message": "Cleanup process has been initiated. Check logs for progress.",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Get Service Status
```http
GET /api/cleanup/status
```

**Response:**
```json
{
  "type": "OK",
  "message": "Cleanup service status retrieved successfully",
  "data": {
    "isRunning": false,
    "schedulerActive": true,
    "lastRun": null,
    "nextScheduledRun": "Daily at 12:00 AM IST (6:30 PM UTC)",
    "uploadsDirectory": "/path/to/uploads"
  }
}
```

### 3. Preview Orphaned Files
```http
GET /api/cleanup/preview
```

**Response:**
```json
{
  "type": "OK",
  "message": "Orphaned files preview generated successfully",
  "data": {
    "totalFilesInUploads": 15,
    "referencedFiles": 10,
    "orphanedFiles": 5,
    "orphanedFileList": [
      "unused-image-1.jpg",
      "unused-image-2.png"
    ],
    "estimatedSpaceSaved": "Calculated based on file sizes",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Start Scheduler
```http
POST /api/cleanup/scheduler/start
```

### 5. Stop Scheduler
```http
POST /api/cleanup/scheduler/stop
```

## Configuration

### Cron Schedule
The service uses the following cron expression:
```
30 18 * * *
```
This translates to 6:30 PM UTC, which is 12:00 AM IST the next day.

### Timezone
The service runs in UTC timezone. The cron job is scheduled to account for IST (UTC+5:30).

## File Reference Detection

The service extracts filenames from various URL formats:

1. **Full URLs**: `https://example.com/uploads/image.jpg` → `image.jpg`
2. **Relative Paths**: `/uploads/image.jpg` → `image.jpg`
3. **Direct Filenames**: `image.jpg` → `image.jpg`

## Safety Features

1. **Concurrent Execution Prevention**: Only one cleanup process can run at a time
2. **Error Handling**: Individual file deletion errors don't stop the entire process
3. **Logging**: Comprehensive logging of all operations
4. **Graceful Shutdown**: Proper cleanup on server shutdown

## Testing

### Run Test Script
```bash
npm run test-cleanup
```

This will:
- Connect to the database
- Scan for referenced images
- List files in uploads directory
- Show orphaned files (without deleting)
- Provide a preview of what would be cleaned up

### Manual Testing
1. Upload some test images
2. Create database records referencing some images
3. Leave some images unreferenced
4. Run the preview endpoint to see orphaned files
5. Trigger manual cleanup to test deletion

## Logging

The service logs all operations with the following information:
- Start and end times
- Number of files scanned
- Number of orphaned files found
- Number of files deleted
- Any errors encountered

## Monitoring

Monitor the service through:
1. **Application Logs**: Check for cleanup service logs
2. **API Status Endpoint**: Check if service is running
3. **File System**: Monitor uploads directory size
4. **Database**: Verify no referenced images are missing

## Troubleshooting

### Common Issues

1. **Service Not Running**
   - Check if scheduler is started
   - Verify database connection
   - Check application logs

2. **Files Not Being Deleted**
   - Verify file permissions
   - Check if files are actually orphaned
   - Review error logs

3. **Wrong Files Deleted**
   - Check database references
   - Verify URL parsing logic
   - Review file naming conventions

### Debug Mode

Enable debug logging by setting the log level to debug in your logger configuration.

## Security Considerations

1. **Authentication Required**: All endpoints require Admin authentication
2. **File System Access**: Service has read/write access to uploads directory
3. **Database Access**: Service queries multiple collections
4. **Error Information**: Error logs may contain file paths

## Performance Considerations

1. **Database Queries**: Service performs multiple collection scans
2. **File System Operations**: Large uploads directories may take time to scan
3. **Memory Usage**: Large file lists are held in memory during processing
4. **Concurrent Access**: Service prevents multiple simultaneous executions

## Future Enhancements

1. **File Size Calculation**: Calculate actual space saved
2. **Last Run Tracking**: Store and display last cleanup execution time
3. **Configurable Schedule**: Allow schedule modification via API
4. **Batch Processing**: Process files in batches for better performance
5. **File Type Filtering**: Only process specific file types
6. **Backup Before Deletion**: Create backup of files before deletion 