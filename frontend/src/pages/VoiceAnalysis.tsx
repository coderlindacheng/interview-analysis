import { useState, useEffect, useRef } from 'react'
import { Button, Card, Row, Col, Typography, Space, Alert, Progress, Tag, Divider, message } from 'antd'
import { 
  AudioOutlined, 
  StopOutlined,
  SoundOutlined,
  BulbOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

// File System Access API 类型补充
declare global {
  interface Window {
    showDirectoryPicker: (options?: {
      mode?: 'read' | 'readwrite'
      startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos'
    }) => Promise<FileSystemDirectoryHandle>
  }
}

interface VoiceAnalysisResult {
  timestamp: string
  confidence: number
  emotion: string
  sentiment: string
  keywords: string[]
  fluency: number
  pace: number
}

const VoiceAnalysis = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [transcriptText, setTranscriptText] = useState('')
  const [analysisResults, setAnalysisResults] = useState<VoiceAnalysisResult[]>([])
  const [currentAnalysis, setCurrentAnalysis] = useState<VoiceAnalysisResult | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const [recordingTime, setRecordingTime] = useState(0)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number>()
  const timerRef = useRef<number>()
  const streamRef = useRef<MediaStream | null>(null)
  const directoryHandleRef = useRef<FileSystemDirectoryHandle | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])

  // 检查并请求文件系统访问权限
  const requestDirectoryAccess = async () => {
    try {
      // 检查是否支持 File System Access API
      if ('showDirectoryPicker' in window) {
        // 请求用户选择保存目录
        const dirHandle = await window.showDirectoryPicker({
          mode: 'readwrite',
          startIn: 'desktop'
        })
        
        // 直接使用用户选择的目录
        directoryHandleRef.current = dirHandle
        message.success('录音保存目录选择成功')
        return true
      } else {
        message.info('浏览器不支持文件系统访问，将使用下载方式保存文件')
        return false
      }
    } catch (error: any) {
      // 用户取消选择目录不应该显示为错误
      if (error.name === 'AbortError') {
        message.info('已取消目录选择，将使用下载方式保存录音文件')
        console.log('用户取消了目录选择')
      } else {
        console.warn('无法获取目录访问权限:', error)
        message.warning('无法获取目录访问权限，将使用下载方式保存文件')
      }
      return false
    }
  }



  // 保存录音文件
  const saveRecordingFile = async (audioBlob: Blob) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `recording_${timestamp}.webm`
    
    try {
      if (directoryHandleRef.current) {
        // 使用 File System Access API 保存到指定目录
        const fileHandle = await directoryHandleRef.current.getFileHandle(fileName, { create: true })
        const writable = await fileHandle.createWritable()
        await writable.write(audioBlob)
        await writable.close()
        message.success(`录音已保存: ${fileName}`)
      } else {
        // 降级到下载方式
        const url = URL.createObjectURL(audioBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        message.success(`录音已下载: ${fileName}`)
      }
    } catch (error) {
      console.error('保存录音文件失败:', error)
      message.error('保存录音文件失败')
    }
  }

  // 模拟语音识别
  const mockSpeechRecognition = () => {
    const mockTexts = [
      "你好，我是来应聘前端开发工程师的",
      "我有三年的React开发经验",
      "我熟悉TypeScript和现代前端框架",
      "我对这个职位很感兴趣",
      "我希望能够加入你们团队"
    ]
    
    const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)]
    setTranscriptText(prev => prev + (prev ? ' ' : '') + randomText)
    
    // 模拟分析结果
    const mockAnalysis: VoiceAnalysisResult = {
      timestamp: new Date().toLocaleTimeString(),
      confidence: Math.random() * 0.3 + 0.7, // 70-100%
      emotion: ['自信', '紧张', '兴奋', '平静'][Math.floor(Math.random() * 4)],
      sentiment: ['积极', '中性', '消极'][Math.floor(Math.random() * 3)],
      keywords: ['技术', '经验', '团队', '开发', '项目'].slice(0, Math.floor(Math.random() * 3) + 1),
      fluency: Math.random() * 30 + 70, // 70-100
      pace: Math.random() * 40 + 80 // 80-120 wpm
    }
    
    setCurrentAnalysis(mockAnalysis)
    setAnalysisResults(prev => [...prev, mockAnalysis])
  }

  // 音频级别检测
  const detectAudioLevel = () => {
    if (!analyserRef.current) return
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length
    setAudioLevel(average)
    
    animationFrameRef.current = requestAnimationFrame(detectAudioLevel)
  }

  // 开始录音
  const startRecording = async () => {
    try {
      // 1. 选择录音保存目录（可选，失败不影响录音）
      message.loading('请选择录音保存目录...', 1)
      const hasDirectoryAccess = await requestDirectoryAccess()
      
      // 2. 获取麦克风音频
      message.loading('获取麦克风权限...', 1)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100
        } 
      })
      streamRef.current = stream
      
      // 3. 创建音频上下文用于检测音频级别
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      
      // 4. 创建媒体录制器
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      // 5. 重置录音数据
      recordingChunksRef.current = []
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorderRef.current.onstop = async () => {
        // 录音结束时保存文件
        const recordingBlob = new Blob(recordingChunksRef.current, { type: 'audio/webm' })
        await saveRecordingFile(recordingBlob)
      }
      
      mediaRecorderRef.current.start(1000) // 每秒触发一次 dataavailable
      setIsRecording(true)
      setRecordingTime(0)
      setTranscriptText('')
      setAnalysisResults([])
      
      // 开始检测音频级别
      detectAudioLevel()
      
      // 开始计时
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
      // 模拟语音识别（每3-5秒触发一次）
      const mockInterval = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mockSpeechRecognition()
        } else {
          clearInterval(mockInterval)
        }
      }, 3000)
      
      // 显示录音状态
      const saveStatus = hasDirectoryAccess ? '保存到所选目录' : '自动下载'
      message.success(`录音开始！录制麦克风音频，${saveStatus}`)
      
    } catch (error) {
      console.error('录音启动失败:', error)
      message.error('录音启动失败，请检查权限设置')
    }
  }

  // 停止录音
  const stopRecording = () => {
    // 停止录制器
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    
    // 停止音频流
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    // 关闭音频上下文
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
    
    // 清理动画和计时器
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
    }
    
    setIsRecording(false)
    setAudioLevel(0)
    
    message.success('录音已停止并保存')
  }

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopRecording()
    }
  }, [])

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div>
      <Title level={2}>实时语音分析</Title>
      <Paragraph type="secondary">
        点击开始按钮开始录音，并选择你的录音保存目录，系统将录制麦克风音频，实时分析您的语音内容、情感和表达质量。
      </Paragraph>

      {/* 控制区域 */}
      <Card style={{ marginBottom: 24 }}>
        <Space size="large" align="center">
          <Button 
            type={isRecording ? "default" : "primary"}
            size="large"
            icon={isRecording ? <StopOutlined /> : <AudioOutlined />}
            onClick={isRecording ? stopRecording : startRecording}
            danger={isRecording}
          >
            {isRecording ? '停止分析' : '开始分析录音'}
          </Button>
          
          {isRecording && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClockCircleOutlined />
                <Text strong>{formatTime(recordingTime)}</Text>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SoundOutlined />
                <Progress 
                  percent={Math.min(audioLevel / 2, 100)} 
                  size="small" 
                  style={{ width: 100 }}
                  strokeColor="#52c41a"
                />
              </div>
              

            </>
          )}
        </Space>
      </Card>

      <Row gutter={24}>
        {/* 实时语音转文字视窗 */}
        <Col span={12}>
          <Card 
            title={
              <Space>
                <SoundOutlined />
                实时语音转文字
              </Space>
            }
            style={{ height: 400 }}
          >
            <div 
              style={{ 
                height: 320, 
                overflow: 'auto', 
                padding: 16,
                backgroundColor: '#fafafa',
                border: '1px solid #d9d9d9',
                borderRadius: 6,
                fontSize: 14,
                lineHeight: 1.6
              }}
            >
              {transcriptText ? (
                <Text>{transcriptText}</Text>
              ) : (
                <Text type="secondary">
                  {isRecording ? '正在监听...' : '点击"开始分析录音"开始语音识别'}
                </Text>
              )}
            </div>
          </Card>
        </Col>

        {/* 语音实时分析结果视窗 */}
        <Col span={12}>
          <Card 
            title={
              <Space>
                <BulbOutlined />
                实时分析结果
              </Space>
            }
            style={{ height: 400 }}
          >
            <div style={{ height: 320, overflow: 'auto' }}>
              {currentAnalysis ? (
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>
                    <Text strong>当前分析 ({currentAnalysis.timestamp})</Text>
                    <Divider style={{ margin: '8px 0' }} />
                  </div>
                  
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text type="secondary">置信度:</Text>
                      <br />
                      <Progress 
                        percent={Math.round(currentAnalysis.confidence * 100)} 
                        size="small"
                        strokeColor="#1890ff"
                      />
                    </Col>
                    <Col span={12}>
                      <Text type="secondary">流畅度:</Text>
                      <br />
                      <Progress 
                        percent={Math.round(currentAnalysis.fluency)} 
                        size="small"
                        strokeColor="#52c41a"
                      />
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Text type="secondary">情感状态:</Text>
                      <br />
                      <Tag color="blue">{currentAnalysis.emotion}</Tag>
                    </Col>
                    <Col span={12}>
                      <Text type="secondary">情感倾向:</Text>
                      <br />
                      <Tag color={
                        currentAnalysis.sentiment === '积极' ? 'green' : 
                        currentAnalysis.sentiment === '消极' ? 'red' : 'orange'
                      }>
                        {currentAnalysis.sentiment}
                      </Tag>
                    </Col>
                  </Row>

                  <div>
                    <Text type="secondary">关键词:</Text>
                    <br />
                    <Space wrap>
                      {currentAnalysis.keywords.map((keyword, index) => (
                        <Tag key={index} color="purple">{keyword}</Tag>
                      ))}
                    </Space>
                  </div>

                  <div>
                    <Text type="secondary">语速: {Math.round(currentAnalysis.pace)} 词/分钟</Text>
                  </div>
                </Space>
              ) : (
                <Alert 
                  message="等待分析结果"
                  description={isRecording ? "正在分析您的语音..." : "开始录音后将显示实时分析结果"}
                  type="info"
                  showIcon
                />
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 历史分析结果 */}
      {analysisResults.length > 0 && (
        <Card title="分析历史" style={{ marginTop: 24 }}>
          <div style={{ maxHeight: 200, overflow: 'auto' }}>
            {analysisResults.slice().reverse().map((result, index) => (
              <div key={index} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Text type="secondary">{result.timestamp}</Text>
                <Text style={{ marginLeft: 16 }}>
                  情感: <Tag color="blue">{result.emotion}</Tag>
                  置信度: <Tag color="green">{Math.round(result.confidence * 100)}%</Tag>
                  流畅度: <Tag color="orange">{Math.round(result.fluency)}%</Tag>
                </Text>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export default VoiceAnalysis
