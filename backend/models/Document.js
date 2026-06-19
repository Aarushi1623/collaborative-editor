import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    content: {
      type: String,
      default: '',
    },
    language: {
      type: String,
      default: 'javascript',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Document', documentSchema);
