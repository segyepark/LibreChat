const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { DocumentChunk } = require('~/models');
const { logger } = require('@librechat/data-schemas');

class DocumentProcessor {
  constructor() {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', ' ', ''],
    });
  }

  /**
   * PDF 파일에서 텍스트를 추출합니다
   */
  async extractTextFromPDF(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (error) {
      logger.error('Error extracting text from PDF:', error);
      throw new Error('PDF 텍스트 추출에 실패했습니다.');
    }
  }

  /**
   * 텍스트 파일에서 내용을 읽습니다
   */
  async extractTextFromFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return content;
    } catch (error) {
      logger.error('Error reading text file:', error);
      throw new Error('텍스트 파일 읽기에 실패했습니다.');
    }
  }

  /**
   * 파일 확장자에 따라 텍스트를 추출합니다
   */
  async extractText(filePath, mimeType) {
    const ext = path.extname(filePath).toLowerCase();
    
    switch (ext) {
      case '.pdf':
        return await this.extractTextFromPDF(filePath);
      case '.txt':
      case '.md':
      case '.doc':
      case '.docx':
        return await this.extractTextFromFile(filePath);
      default:
        throw new Error(`지원하지 않는 파일 형식입니다: ${ext}`);
    }
  }

  /**
   * 텍스트를 청크로 분할합니다
   */
  async splitText(text) {
    try {
      const chunks = await this.textSplitter.splitText(text);
      return chunks;
    } catch (error) {
      logger.error('Error splitting text:', error);
      throw new Error('텍스트 분할에 실패했습니다.');
    }
  }

  /**
   * 파일을 처리하고 청크를 데이터베이스에 저장합니다
   */
  async processFile(file, uploadedBy) {
    try {
      logger.info(`Processing file: ${file.filename} by ${uploadedBy}`);
      
      // 텍스트 추출
      const text = await this.extractText(file.filepath, file.mimetype);
      
      if (!text || text.trim().length === 0) {
        throw new Error('파일에서 텍스트를 추출할 수 없습니다.');
      }

      // 텍스트 분할
      const chunks = await this.splitText(text);
      
      if (chunks.length === 0) {
        throw new Error('텍스트 청크 생성에 실패했습니다.');
      }

      // 청크들을 데이터베이스에 저장
      const documentChunks = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const startChar = i === 0 ? 0 : chunks.slice(0, i).join('').length;
        const endChar = startChar + chunk.length;

        const documentChunk = new DocumentChunk({
          fileId: file._id,
          content: chunk,
          metadata: {
            chunkIndex: i,
            startChar,
            endChar,
            fileName: file.filename,
            uploadedBy,
          },
          chunkSize: 1000,
          overlap: 200,
        });

        await documentChunk.save();
        documentChunks.push(documentChunk);
      }

      logger.info(`Successfully processed ${chunks.length} chunks for file: ${file.filename}`);
      return documentChunks;
      
    } catch (error) {
      logger.error('Error processing file:', error);
      throw error;
    }
  }

  /**
   * 파일과 관련된 모든 청크를 삭제합니다
   */
  async deleteFileChunks(fileId) {
    try {
      const result = await DocumentChunk.deleteMany({ fileId });
      logger.info(`Deleted ${result.deletedCount} chunks for file: ${fileId}`);
      return result;
    } catch (error) {
      logger.error('Error deleting file chunks:', error);
      throw error;
    }
  }

  /**
   * 텍스트 검색을 수행합니다
   */
  async searchChunks(query, limit = 10) {
    try {
      const chunks = await DocumentChunk.find(
        { $text: { $search: query } },
        { score: { $meta: 'textScore' } }
      )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .populate('fileId', 'filename mimetype');

      return chunks;
    } catch (error) {
      logger.error('Error searching chunks:', error);
      throw error;
    }
  }
}

module.exports = new DocumentProcessor();