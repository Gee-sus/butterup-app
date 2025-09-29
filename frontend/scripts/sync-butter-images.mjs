import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const sourceDir = path.resolve(__dirname, '../../backend/manual_images');
const targetDir = path.resolve(__dirname, '../public/images/butter');

// Supported image extensions
const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp'];

async function syncImages() {
  try {
    console.log('🧈 Syncing butter images...');
    console.log(`Source: ${sourceDir}`);
    console.log(`Target: ${targetDir}`);

    // Check if source directory exists
    if (!fs.existsSync(sourceDir)) {
      console.error(`❌ Source directory does not exist: ${sourceDir}`);
      process.exit(1);
    }

    // Ensure target directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      console.log(`📁 Created target directory: ${targetDir}`);
    }

    // Get all files from source directory
    const files = fs.readdirSync(sourceDir);
    let copiedCount = 0;

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      
      if (imageExtensions.includes(ext)) {
        const sourcePath = path.join(sourceDir, file);
        const targetPath = path.join(targetDir, file);
        
        try {
          fs.copyFileSync(sourcePath, targetPath);
          console.log(`✅ Copied: ${file}`);
          copiedCount++;
        } catch (error) {
          console.error(`❌ Failed to copy ${file}:`, error.message);
        }
      }
    }

    console.log(`\n🎉 Sync complete! Copied ${copiedCount} image(s).`);

    // List what's now in the target directory
    const targetFiles = fs.readdirSync(targetDir).filter(file => 
      imageExtensions.includes(path.extname(file).toLowerCase())
    );
    
    if (targetFiles.length > 0) {
      console.log('\n📋 Images in target directory:');
      targetFiles.forEach(file => console.log(`   - ${file}`));
    }

  } catch (error) {
    console.error('❌ Error during sync:', error.message);
    process.exit(1);
  }
}

syncImages();
