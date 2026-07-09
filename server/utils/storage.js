const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Ensure directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Approved MIME types
const APPROVED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip'
];

/**
 * Validate upload MIME type.
 * @param {string} mimeType - Checked MIME type.
 * @returns {boolean} True if approved.
 */
const isMimeTypeApproved = (mimeType) => {
  return APPROVED_MIME_TYPES.includes(mimeType.toLowerCase());
};

/**
 * Save file to disk with a unique UUID-based filename.
 * @param {Buffer} buffer - Raw file content.
 * @param {string} originalName - Original name uploaded by client.
 * @param {string} mimeType - MIME type.
 * @returns {object} Metadata (filename, filePath, fileSize).
 */
const saveFile = async (buffer, originalName, mimeType) => {
  if (!isMimeTypeApproved(mimeType)) {
    const error = new Error('File type not approved for upload.');
    error.statusCode = 400;
    throw error;
  }

  // Generate safe unique filename
  const extension = path.extname(originalName);
  const uuid = crypto.randomUUID();
  const filename = `${uuid}${extension}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  // Write content
  fs.writeFileSync(filePath, buffer);

  return {
    filename,
    filePath: `/uploads/${filename}`, // Public relative reference
    fileSize: buffer.length
  };
};

/**
 * Delete file from local disk.
 * @param {string} relativePath - Relative path starting with /uploads/.
 */
const deleteFile = async (relativePath) => {
  const filename = path.basename(relativePath);
  const fullPath = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};

/**
 * Get full resolution local filepath.
 * @param {string} relativePath - Relative path.
 * @returns {string} Path.
 */
const getFullPath = (relativePath) => {
  const filename = path.basename(relativePath);
  return path.join(UPLOADS_DIR, filename);
};

module.exports = {
  saveFile,
  deleteFile,
  getFullPath,
  isMimeTypeApproved,
  UPLOADS_DIR
};
