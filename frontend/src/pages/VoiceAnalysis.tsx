import { useState, useEffect, useRef } from 'react'
import { Button, Card, Row, Col, Typography, Space, Alert, Progress, Tag, Divider } from 'antd'
import { 
  AudioOutlined, 
  StopOutlined,
  SoundOutlined,
  BulbOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // 创建音频上下文用于检测音频级别
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      
      // 创建媒体录制器
      mediaRecorderRef.current = new MediaRecorder(stream)
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        // 这里可以处理录音数据，发送到后端进行真实的语音识别
        console.log('录音数据:', event.data)
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
      
    } catch (error) {
      console.error('无法访问麦克风:', error)
      alert('无法访问麦克风，请检查权限设置')
    }
  }

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
    }
    
    setIsRecording(false)
    setAudioLevel(0)
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
        点击开始按钮开始录音，系统将实时分析您的语音内容、情感和表达质量
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
