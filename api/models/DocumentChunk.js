const mongoose = require('mongoose');

const documentChunkSchema = new mongoose.Schema(
  {
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: false, // 임베딩은 선택적으로 저장
    },
    metadata: {
      page: Number,
      chunkIndex: Number,
      startChar: Number,
      endChar: Number,
      fileName: String,
      uploadedBy: String,
    },
    chunkSize: {
      type: Number,
      default: 1000,
    },
    overlap: {
      type: Number,
      default: 200,
    },
  },
  {
    timestamps: true,
  }
);

// 텍스트 검색을 위한 인덱스
documentChunkSchema.index({ content: 'text' });
documentChunkSchema.index({ 'metadata.fileName': 1 });
documentChunkSchema.index({ 'metadata.uploadedBy': 1 });

module.exports = mongoose.model('DocumentChunk', documentChunkSchema);