// server/graphql/resolvers/testUploadResolvers.js

import { GraphQLUpload } from 'graphql-upload';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const uploadResolver = {
  Upload: GraphQLUpload,

  Mutation: {
    uploadProfilePicture: async (_, { file }) => {
      const { createReadStream, filename, mimetype } = await file;

      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(mimetype)) {
        throw new Error('Invalid file type. Only JPEG, JPG, and PNG are allowed.');
      }

      const uniqueName = `${uuidv4()}-${filename}`;
      const uploadPath = path.join(process.cwd(), 'uploads', uniqueName);

      const stream = createReadStream();
      const out = fs.createWriteStream(uploadPath);
      stream.pipe(out);

      await new Promise((resolve, reject) => {
        out.on('finish', resolve);
        out.on('error', reject);
      });

      const fileUrl = `http://192.168.1.134:3000/uploads/${uniqueName}`;
      return fileUrl;
    },
  },
};

export default uploadResolver;
