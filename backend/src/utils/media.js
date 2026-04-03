const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const generateThumbnail = async (inputPath) => {
  const thumbnailDir = path.join(path.dirname(inputPath), 'thumbnails');
  if (!fs.existsSync(thumbnailDir)) fs.mkdirSync(thumbnailDir, { recursive: true });

  const outputName = `thumb-${path.basename(inputPath, path.extname(inputPath))}.webp`;
  const outputPath = path.join(thumbnailDir, outputName);

  try {
    await sharp(inputPath)
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(outputPath);
    
    return `/uploads/thumbnails/${outputName}`;
  } catch (err) {
    console.error('Thumbnail generation failed:', err.message);
    return null;
  }
};

const getVideoMetadata = (inputPath) => {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        console.error('Video metadata extraction failed:', err.message);
        return resolve(null);
      }
      
      const { duration, width, height } = metadata.format || {};
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      
      resolve({
        duration: duration || videoStream?.duration,
        width: width || videoStream?.width,
        height: height || videoStream?.height,
      });
    });
  });
};

module.exports = { generateThumbnail, getVideoMetadata };
