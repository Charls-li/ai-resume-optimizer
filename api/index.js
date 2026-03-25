const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { createWorker } = require('tesseract.js');

const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// 文件上传配置：存储到内存
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});

// 文件解析接口
app.post('/parse-resume', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传文件' });
    }

    const { mimetype, buffer, originalname } = req.file;
    let extractedText = '';

    if (mimetype === 'application/pdf') {
      const data = await pdfParse(buffer);
      extractedText = data.text;
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mimetype)) {
      const worker = await createWorker(['chi_sim', 'eng'], 1);
      const { data: { text } } = await worker.recognize(buffer);
      await worker.terminate();
      extractedText = text;
    }

    extractedText = extractedText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

    if (!extractedText || extractedText.length < 50) {
      return res.status(422).json({ error: '文件解析成功但未能提取到有效文字' });
    }

    res.json({ text: extractedText, charCount: extractedText.length, fileName: originalname });
  } catch (error) {
    console.error('解析失败:', error);
    res.status(500).json({ error: '文件解析失败' });
  }
});

// 简历分析接口
app.post('/analyze', async (req, res) => {
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

请按以下 JSON 格式输出分析结果：
{
  "matchScore": 0-100的数字,
  "strengths": ["优势1", "优势2", "优势3"],
  "gaps": ["差距1", "差距2", "差距3"],
  "suggestions": ["具体建议1", "具体建议2", "具体建议3", "具体建议4"],
  "optimizedContent": "根据职位要求优化后的简历核心段落"
}`;

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API KEY 未配置' });
    }

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
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    const aiResponse = response.data.choices[0].message.content;
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI 返回格式错误');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    res.json(result);
  } catch (error) {
    console.error('分析失败:', error.message);
    res.status(500).json({ error: '分析失败，请稍后重试' });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = app;
