import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';

export const uploadConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      // Fix: Use absolute path with process.cwd()
      const uploadDir = path.join(process.cwd(), 'uploads', 'products');

      // Create directory synchronously to avoid async issues
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Generate unique filename with timestamp
      const uniqueName = `product-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const ext = path.extname(file.originalname);

      cb(null, uniqueName + ext);
    },
  }),
  fileFilter: (req, file, cb) => {
    // Only allow image files
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (!allowedMimes.includes(file.mimetype)) {
      return cb(
        new Error(`Invalid file type. Allowed: ${allowedMimes.join(', ')}`),
        false,
      );
    }

    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
};
