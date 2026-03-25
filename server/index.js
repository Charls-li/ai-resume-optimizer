const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { createWorker } = require('tesseract.js');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// 文件上传配置：存储到内存（不保存到磁盘）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB 限制
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型，请上传 PDF、Word 或图片文件'));
    }
  }
});

// ===== 文件解析接口 =====
app.post('/api/parse-resume', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传文件' });
    }

    const { mimetype, buffer, originalname } = req.file;
    let extractedText = '';

    console.log(`解析文件: ${originalname}, 类型: ${mimetype}, 大小: ${buffer.length} bytes`);

    // PDF 解析
    if (mimetype === 'application/pdf') {
      try {
        const data = await pdfParse(buffer);
        extractedText = data.text;
        console.log(`PDF 解析成功，提取到 ${extractedText.length} 个字符`);
      } catch (pdfErr) {
        console.error('PDF 解析错误:', pdfErr.message);
        return res.status(422).json({ 
          error: 'PDF 解析失败，可能是加密 PDF 或扫描版。请尝试 Word 文档或直接粘贴文字。',
          detail: pdfErr.message
        });
      }
    }

    // Word 文档解析（.docx）
    else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword'
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
        if (result.messages.length > 0) {
          console.warn('Word 解析警告:', result.messages);
        }
        console.log(`Word 解析成功，提取到 ${extractedText.length} 个字符`);
      } catch (docErr) {
        console.error('Word 解析错误:', docErr.message);
        return res.status(422).json({ 
          error: 'Word 文档解析失败，请尝试将文档另存为 .docx 格式后重试。',
          detail: docErr.message
        });
      }
    }

    // 图片 OCR 解析
    else if (['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mimetype)) {
      try {
        console.log('开始 OCR 识别，这可能需要 10-30 秒...');
        const worker = await createWorker(['chi_sim', 'eng'], 1, {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`OCR 进度: ${Math.round(m.progress * 100)}%`);
            }
          }
        });
        
        const { data: { text } } = await worker.recognize(buffer);
        await worker.terminate();
        
        extractedText = text;
        console.log(`OCR 识别成功，提取到 ${extractedText.length} 个字符`);
      } catch (ocrErr) {
        console.error('OCR 识别错误:', ocrErr.message);
        return res.status(422).json({ 
          error: '图片识别失败，建议使用高清截图或转换为 PDF/Word 格式后重试。',
          detail: ocrErr.message
        });
      }
    }

    // 清理提取的文本
    extractedText = extractedText
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!extractedText || extractedText.length < 50) {
      return res.status(422).json({ 
        error: '文件解析成功但未能提取到有效文字。如果是扫描件或图片版简历，请使用高清图片，或手动粘贴简历内容。'
      });
    }

    res.json({ 
      text: extractedText,
      charCount: extractedText.length,
      fileName: originalname
    });

  } catch (error) {
    console.error('文件解析失败:', error);
    res.status(500).json({ 
      error: '文件解析失败，请重试或手动粘贴简历内容',
      detail: error.message
    });
  }
});

// ===== 简历分析接口 =====
app.post('/api/analyze', async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;
    
    if (!resumeText || !jobDescription) {
      return res.status(400).json({ error: '请提供简历和职位描述' });
    }

    const prompt = `你是一位资深 HR 和简历优化专家。请分析以下简历与目标职位的匹配度，并给出专业建议。

【简历内容】
${resumeText.substring(0, 3000)}

【目标职位描述】
${jobDescription.substring(0, 2000)}

请按以下 JSON 格式输出分析结果（不要输出任何其他内容）：
{
  "matchScore": 0-100的数字,
  "strengths": ["优势1", "优势2", "优势3"],
  "gaps": ["差距1", "差距2", "差距3"],
  "suggestions": ["具体建议1", "具体建议2", "具体建议3", "具体建议4"],
  "optimizedContent": "根据职位要求优化后的简历核心段落（展示如何量化表达、匹配关键词）"
}

要求：
1. matchScore 客观评分，依据实际匹配程度
2. strengths 指出简历中符合职位要求的具体亮点
3. gaps 指出简历与 JD 不匹配的具体差距
4. suggestions 给出具体可执行的修改建议
5. optimizedContent 展示一段优化示例，体现量化表达`;

    const response = await axios.post('https://api.deepseek.com/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是专业的简历优化顾问。只输出 JSON，不要输出任何多余文字。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    const aiResponse = response.data.choices[0].message.content;
    
    // 提取 JSON 部分（有时 AI 会多输出一些文字）
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI 返回格式错误');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    res.json(result);
    
  } catch (error) {
    console.error('分析失败:', error.message);
    res.status(500).json({ 
      error: '分析失败，请稍后重试',
      details: error.message 
    });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✅ 后端服务已启动：http://localhost:${PORT}`);
  console.log(`   - 文件解析接口：POST /api/parse-resume`);
  console.log(`   - 简历分析接口：POST /api/analyze`);
});
