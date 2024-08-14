// import { Request } from 'express';
// import formidable from 'formidable';
// import { Transform } from 'stream';

// const parsefile = async (req: Request) => {
//     return new Promise((resolve, reject) => {
//         let options: formidable.Options = {
//             maxFileSize: 100 * 1024 * 1024, // 100 MBs converted to bytes
//             allowEmptyFiles: false
//         };

//         const form = formidable(options);

//         form.parse(req, (err, fields, files) => {
//             // Your code logic here
//         });

//         form.on('error', error => {
//             reject(error.message);
//         });

//         form.on('data', (data: formidable.Data) => {
//             if ((data as any).name === "successUpload") {
//                 resolve((data as any).value);
//             }
//         });

//         form.on('fileBegin', (formName, file) => {
//             file.open = async function () {
//                 this._writeStream = new Transform({
//                     transform(chunk, encoding, callback) {
//                         callback(null, chunk);
//                     }
//                 });

//                 this._writeStream.on('error', e => {
//                     form.emit('error', e);
//                 });
//             };
//         });
//     });
// };

import multer from 'multer';
import { Request } from 'express';

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const storage = multer.memoryStorage();
const uploadMiddleware = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // Limiting file size to 5MB
  fileFilter: fileFilter,
});

const filteredUploadMiddleware = multer({ storage, fileFilter });

export { uploadMiddleware, filteredUploadMiddleware };
