import { useState, useCallback } from 'react'
import { Upload, FileText, Briefcase, Sparkles, ChevronRight, CheckCircle, Loader2, X, Image, AlertCircle, Building2 } from 'lucide-react'

type AnalysisResult = {
  matchScore: number
  strengths: string[]
  gaps: string[]
  suggestions: string[]
  optimizedContent?: string
}

// 检测是否在微信内置浏览器
function isWeixinBrowser() {
  return /MicroMessenger/i.test(navigator.userAgent)
}

// 关注按钮组件（复用）
function FollowButton({ className = '' }: { className?: string }) {
  const handleClick = () => {
    if (isWeixinBrowser()) {
      window.location.href = 'https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=MzkxMjMyOTg4Ng==#wechat_redirect'
    } else {
      window.location.href = 'weixin://dl/officialaccounts?search=陶瓷精英网'
      setTimeout(() => {
        alert('请使用微信打开本页面，或搜索「陶瓷精英网」关注公众号')
      }, 3000)
    }
  }
  
  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-full font-medium hover:from-red-600 hover:to-rose-600 transition-all shadow-sm hover:shadow-md ${className}`}
    >
      <Building2 className="w-4 h-4" />
      关注陶瓷精英网
    </button>
  )
}

// 关注公众号弹窗组件
function FollowDialog({ onClose }: { onClose: () => void }) {
  const inWeixin = isWeixinBrowser()
  
  // 在微信外点击关注按钮
  const handleFollowClick = () => {
    if (inWeixin) {
      // 在微信内，直接跳转
      window.location.href = 'https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=MzkxMjMyOTg4Ng==#wechat_redirect'
    } else {
      // 在微信外，尝试唤起微信
      window.location.href = 'weixin://dl/officialaccounts?search=陶瓷精英网'
      // 如果唤起失败，3秒后提示
      setTimeout(() => {
        alert('请使用微信打开本页面，或搜索「陶瓷精英网」关注公众号')
      }, 3000)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-fade-in">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-red-500 to-rose-500 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-xl font-bold mb-1">分析报告已生成 🎉</h3>
          <p className="text-white/90 text-sm">关注公众号，获取更多求职干货</p>
        </div>

        {/* 关注区域 */}
        <div className="p-6 text-center">
          {inWeixin ? (
            <>
              <p className="text-gray-600 text-sm mb-4">点击下方按钮关注「陶瓷精英网」</p>
              <button
                onClick={handleFollowClick}
                className="block w-full py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium mb-3"
              >
                立即关注公众号
              </button>
              <p className="text-gray-400 text-xs">关注后按手机返回键即可回到本页面</p>
            </>
          ) : (
            <>
              <p className="text-gray-600 text-sm mb-2">检测到您正在微信外浏览</p>
              <p className="text-gray-500 text-xs mb-4">点击按钮唤起微信关注，或截图在微信中识别</p>
              <button
                onClick={handleFollowClick}
                className="block w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium mb-3"
              >
                打开微信关注
              </button>
              <p className="text-gray-400 text-xs">若无法唤起，请手动搜索「陶瓷精英网」</p>
            </>
          )}
          

          
          <p className="text-gray-400 text-xs mt-4">已有 10万+ 求职者关注</p>
        </div>
      </div>
    </div>
  )
}

// 根据环境自动选择 API 地址
const getApiUrl = () => {
  // 生产环境使用 Render 后端地址
  if (import.meta.env.PROD) {
    return 'https://ai-resume-optimizer-api.onrender.com'
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:3001'
}

const API_URL = getApiUrl()

function App() {
  const [resumeText, setResumeText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [showFollowDialog, setShowFollowDialog] = useState(false)
  const [parseError, setParseError] = useState('')

  // 处理文件上传（PDF / Word / 图片）—— 统一发到后端解析
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 重置状态
    setParseError('')
    setResumeText('')
    setUploadedFileName('')
    setIsParsing(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_URL}/api/parse-resume`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        setParseError(data.error || '文件解析失败')
        return
      }

      setUploadedFileName(file.name)
      setResumeText(data.text)
    } catch {
      setParseError('无法连接到后端服务，请确保后端已启动（端口 3001）')
    } finally {
      setIsParsing(false)
      // 重置 input，允许重新上传同一文件
      e.target.value = ''
    }
  }, [])

  // 调用后端 API 进行真实 AI 分析
  const handleAnalyze = useCallback(async () => {
    if (!resumeText || !jobDescription) {
      alert('请上传简历并填写职位描述')
      return
    }

    setIsAnalyzing(true)
    
    try {
      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeText,
          jobDescription
        })
      })
      
      if (!response.ok) {
        throw new Error('分析失败')
      }
      
      const data = await response.json()
      setResult(data)
      // 分析完成后延迟1秒弹出关注公众号对话框
      setTimeout(() => setShowFollowDialog(true), 1000)
    } catch (error) {
      alert('分析失败，请确保后端服务已启动')
      console.error(error)
    } finally {
      setIsAnalyzing(false)
    }
  }, [resumeText, jobDescription])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 关注公众号弹窗 */}
      {showFollowDialog && <FollowDialog onClose={() => setShowFollowDialog(false)} />}
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-900">AI简历优化</h1>
          </div>
            <div className="flex flex-col items-end gap-0.5">
            <div className="text-sm text-gray-600">陶瓷精英网 帮你拿到更多面试机会</div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* 步骤指示器 */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${resumeText ? 'text-green-600' : 'text-indigo-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${resumeText ? 'bg-green-100' : 'bg-indigo-100'}`}>
                {resumeText ? <CheckCircle className="w-5 h-5" /> : <span className="font-semibold">1</span>}
              </div>
              <span className="font-medium">上传简历</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
            <div className={`flex items-center gap-2 ${jobDescription ? 'text-green-600' : 'text-gray-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${jobDescription ? 'bg-green-100' : 'bg-gray-100'}`}>
                {jobDescription ? <CheckCircle className="w-5 h-5" /> : <span className="font-semibold">2</span>}
              </div>
              <span className="font-medium">填写JD</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
            <div className={`flex items-center gap-2 ${result ? 'text-green-600' : 'text-gray-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${result ? 'bg-green-100' : 'bg-gray-100'}`}>
                {result ? <CheckCircle className="w-5 h-5" /> : <span className="font-semibold">3</span>}
              </div>
              <span className="font-medium">获取报告</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* 左侧：输入区 */}
          <div className="space-y-6">
            {/* 简历上传 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold">上传简历</h2>
              </div>
              
              <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isParsing ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-500'
              }`}>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="resume-upload"
                  disabled={isParsing}
                />
                <label htmlFor="resume-upload" className={`cursor-pointer block ${isParsing ? 'pointer-events-none' : ''}`}>
                  {isParsing ? (
                    <>
                      <Loader2 className="w-10 h-10 text-indigo-500 mx-auto mb-3 animate-spin" />
                      <p className="text-indigo-600 font-medium mb-1">正在解析文件...</p>
                      <p className="text-sm text-indigo-400">图片识别可能需要 10-30 秒</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 mb-1 font-medium">点击上传简历文件</p>
                      <div className="flex items-center justify-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full">
                          <FileText className="w-3 h-3" /> PDF
                        </span>
                        <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                          <FileText className="w-3 h-3" /> Word
                        </span>
                        <span className="flex items-center gap-1 text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full">
                          <Image className="w-3 h-3" /> 图片
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">支持 PDF · Word (.docx) · 图片截图 (JPG/PNG)</p>
                    </>
                  )}
                </label>
              </div>

              {/* 解析错误提示 */}
              {parseError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-red-700">{parseError}</span>
                </div>
              )}
              
              {/* 解析成功提示 */}
              {uploadedFileName && !parseError && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">{uploadedFileName} 解析成功</span>
                  <button
                    onClick={() => { setUploadedFileName(''); setResumeText(''); setParseError(''); }}
                    className="ml-auto text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              {/* 手动粘贴区 */}
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-2">
                  {uploadedFileName ? '或修改解析后的内容：' : '或手动粘贴简历内容：'}
                </p>
                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="请粘贴你的简历内容，或上传文件自动解析..."
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                />
              </div>
            </div>

            {/* 职位描述 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold">目标职位描述</h2>
              </div>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="请粘贴你想申请的职位描述（JD）..."
                className="w-full h-48 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
              />
            </div>

            {/* 分析按钮 */}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !resumeText || !jobDescription}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  AI 分析中...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  免费获取匹配度分析
                </>
              )}
            </button>
            
            {/* AI 模型说明 */}
            <p className="text-center text-xs text-gray-400 mt-3">
              AI 分析模型由 DeepSeek 提供技术支持
            </p>
          </div>

          {/* 右侧：结果区 */}
          <div className="space-y-6">
            {!result ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-10 h-10 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">准备开始分析</h3>
                <p className="text-gray-600">上传简历并填写职位描述后，AI 将为你生成专业的匹配度分析报告</p>
              </div>
            ) : (
              <>
                {/* 匹配度分数 */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4">简历匹配度</h3>
                  <div className="flex items-center gap-4">
                    <div className="relative w-24 h-24">
                      <svg className="w-24 h-24 transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="#e5e7eb"
                          strokeWidth="8"
                          fill="none"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke={result.matchScore >= 70 ? '#22c55e' : result.matchScore >= 50 ? '#f59e0b' : '#ef4444'}
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${result.matchScore * 2.51} 251`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold">{result.matchScore}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-600">
                        {result.matchScore >= 70 
                          ? '匹配度较高，有较大面试机会' 
                          : result.matchScore >= 50 
                            ? '匹配度一般，建议优化后再投递'
                            : '匹配度较低，需要大幅优化简历'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 优势分析 */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4 text-green-700">简历优势</h3>
                  <ul className="space-y-2">
                    {result.strengths.map((strength, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 改进建议 */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4">优化建议</h3>
                  <ul className="space-y-2 mb-4">
                    {result.suggestions.map((suggestion, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{suggestion}</span>
                      </li>
                    ))}
                  </ul>

                  {result.optimizedContent && (
                    <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
                      <h4 className="font-semibold text-indigo-900 mb-2">AI 优化版本示例</h4>
                      <p className="text-sm text-indigo-800 whitespace-pre-wrap">{result.optimizedContent}</p>
                    </div>
                  )}

                  {/* 关注公众号引导 */}
                  <div className="mt-5 border-t pt-4 text-center">
                    <p className="text-sm text-gray-500 mb-3">觉得有用？关注公众号获取更多求职技巧 📚</p>
                    <FollowButton />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer - 关注公众号 */}
      <footer className="py-4 text-center">
        <button
          onClick={() => {
            if (isWeixinBrowser()) {
              window.location.href = 'https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=MzkxMjMyOTg4Ng==#wechat_redirect'
            } else {
              window.location.href = 'weixin://dl/officialaccounts?search=陶瓷精英网'
              setTimeout(() => {
                alert('请使用微信打开本页面，或搜索「陶瓷精英网」关注公众号')
              }, 3000)
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 rounded-full border border-red-100 hover:bg-red-100 transition-colors"
        >
          <Building2 className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-600 font-medium tracking-wide">
            陶瓷精英网
          </span>
        </button>
        <p className="text-xs text-gray-400 mt-2">点击关注公众号，获取更多求职技巧</p>
      </footer>
    </div>
  )
}

export default App
