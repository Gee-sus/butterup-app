#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const sourceDir = path.join(__dirname, '../../backend/manual_images');
const targetDir = path.join(__dirname, '../public/images/butter');

async function copyButterImages() {
  try {
    console.log('🧈 Copying butter images from backend to frontend...');
    
    // Create target directory if it doesn't exist
    await fs.mkdir(targetDir, { recursive: true });
    
    // Read source directory
    const files = await fs.readdir(sourceDir);
    
    // Filter for image files
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
    });
    
    if (imageFiles.length === 0) {
      console.log('⚠️  No image files found in backend/manual_images/');
      return;
    }
    
    console.log(`📁 Found ${imageFiles.length} image files:`);
    
    // Copy each image file
    let copiedCount = 0;
    for (const file of imageFiles) {
      const sourcePath = path.join(sourceDir, file);
      const targetPath = path.join(targetDir, file);
      
      try {
        await fs.copyFile(sourcePath, targetPath);
        console.log(`✅ Copied: ${file}`);
        copiedCount++;
      } catch (error) {
        console.error(`❌ Failed to copy ${file}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Successfully copied ${copiedCount}/${imageFiles.length} images to frontend/public/images/butter/`);
    console.log('📝 Update your React components to use: /images/butter/<filename>');
    
  } catch (error) {
    console.error('❌ Error copying images:', error.message);
    process.exit(1);
  }
}

// Run the script
copyButterImages();
