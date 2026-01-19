import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path. dirname(__filename);

console.log('📋 Copying Contract ABI to Frontend...');

// Source and destination paths
const sourcePath = path.join(__dirname, '.. ', 'artifacts', 'contracts', 'AcademicTranscript.sol', 'AcademicTranscript.json');
const destDir = path. join(__dirname, '..', 'frontend', 'src', 'contracts');
const destPath = path.join(destDir, 'AcademicTranscript.json');

// Create destination directory if it doesn't exist
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  console.log('✅ Created directory:', destDir);
}

// Copy file
try {
  fs. copyFileSync(sourcePath, destPath);
  console.log('✅ ABI copied successfully! ');
  console.log('   From:', sourcePath);
  console.log('   To:', destPath);
} catch (error) {
  console.error('❌ Error copying ABI:', error. message);
  process.exit(1);
}