import { useState, useEffect } from 'react'
import { Button, Card, Row, Col, Typography, Space, Alert, Progress, Tag, Divider } from 'antd'
import { AudioOutlined, StopOutlined, SoundOutlined, BulbOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { 
  voiceWebSocketService, 
  parseSenseVoiceTags,
  type TranscriptionResult, 
  type VoiceAnalysisResult 
} from '../services/websocketService'
import { 
  voiceRecordingService,
  extractKeywords,
  calculateFluency,
  calculatePace,
  formatTime,
  handleWithTimestamp
} from '../services/voiceRecordingService'

// @ts-ignore
import '../services/recorder-core.js'
import '../services/pcm.js'
import '../services/wav.js'

const { Title, Text, Paragraph } = Typography

const VoiceAnalysis = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [transcriptText, setTranscriptText] = useState('')
  const [analysisResults, setAnalysisResults] = useState<VoiceAnalysisResult[]>([])
  const [currentAnalysis, setCurrentAnalysis] = useState<VoiceAnalysisResult | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const [recordingTime, setRecordingTime] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected')

  useEffect(() => {
    // 设置录制服务回调
    voiceRecordingService.setCallbacks({
      onAudioLevel: setAudioLevel,
      onRecordingTime: setRecordingTime,
      onRecordingStateChange: setIsRecording,
      onConnectionStatusChange: setConnectionStatus
    })

    // 设置WebSocket服务回调
    voiceWebSocketService.setCallbacks({
      onTranscription: (result: TranscriptionResult) => {
        const tagInfo = parseSenseVoiceTags(result.text)
        const cleanText = tagInfo.cleanText
        const asrMode = result.mode || '2pass'
        const isFinal = result.is_final
        const timestamp = result.timestamp
        
        if (asrMode === "2pass-offline" || asrMode === "offline") {
          const newOfflineText = handleWithTimestamp(cleanText, timestamp)
          setTranscriptText(prev => prev + newOfflineText)
        } else {
          setTranscriptText(prev => prev + cleanText)
        }
        
        if (tagInfo.emotionTag || tagInfo.languageTag || tagInfo.eventTag) {
          const analysisResult: VoiceAnalysisResult = {
            timestamp: result.timestamp,
            confidence: result.confidence,
            emotion: tagInfo.emotion,
            sentiment: tagInfo.sentiment,
            language: tagInfo.language,
            event: tagInfo.event,
            keywords: extractKeywords(tagInfo.cleanText),
            fluency: calculateFluency(tagInfo.cleanText),
            pace: calculatePace(tagInfo.cleanText)
          }
          
          setCurrentAnalysis(analysisResult)
          
          if (isFinal) {
            setAnalysisResults(prev => [...prev, analysisResult])
          }
        }
      },
      
      onAnalysis: (result: VoiceAnalysisResult) => {
        setCurrentAnalysis(result)
        setAnalysisResults(prev => [...prev, result])
      }
    })
    
    return () => {
      voiceRecordingService.cleanup()
    }
  }, [])

  const startRecording = async () => {
    clearTranscript()
    const success = await voiceRecordingService.startRecording()
    if (success) {
      setIsRecording(true)
    }
  }

  const stopRecording = () => {
    voiceRecordingService.stopRecording()
    setIsRecording(false)
  }

  const clearTranscript = () => {
    setTranscriptText('')
    setAnalysisResults([])
    setCurrentAnalysis(null)
  }

  return (
    <div>
      <Title level={2}>实时语音分析</Title>
      <Paragraph type="secondary">
        点击开始按钮开始录音，并选择你的录音保存目录，系统将录制麦克风音频，通过SenseVoice技术实时识别语音中的情感标签，自动分析您的情感状态、语音内容和表达质量。
      </Paragraph>

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
          
          <Button 
            type="default"
            size="large"
            onClick={clearTranscript}
            disabled={isRecording}
          >
            清空文本
          </Button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div 
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: connectionStatus === 'connected' ? '#52c41a' : 
                                connectionStatus === 'service_ready' ? '#1890ff' :
                                connectionStatus === 'service_fallback' ? '#faad14' : '#f5222d'
              }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {connectionStatus === 'connected' ? 'WebSocket已连接' :
               connectionStatus === 'service_ready' ? '语音识别已就绪' :
               connectionStatus === 'service_fallback' ? '使用备用服务' :
               connectionStatus === 'disconnected' ? '未连接' : '连接中...'}
            </Text>
          </div>
          
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
                <div>
                  <Text>{transcriptText}</Text>
                  {currentAnalysis && (
                    <div style={{ marginTop: 8, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        检测到情感: <Tag color="blue">{currentAnalysis.emotion}</Tag>
                        倾向: <Tag color={
                          currentAnalysis.sentiment === '积极' ? 'green' :
                          currentAnalysis.sentiment === '消极' ? 'red' : 'orange'
                        }>{currentAnalysis.sentiment}</Tag>
                        语言: <Tag color="purple">{currentAnalysis.language}</Tag>
                        事件: <Tag color="cyan">{currentAnalysis.event}</Tag>
                      </Text>
                    </div>
                  )}
                </div>
              ) : (
                <Text type="secondary">
                  {isRecording ? '正在监听...' : '点击"开始分析录音"开始语音识别'}
                </Text>
              )}
            </div>
          </Card>
        </Col>

        <Col span={12}>
          <Card 
            title={
              <Space>
                <BulbOutlined />
                实时分析
              </Space>
            }
            style={{ height: 400 }}
          >
            <div style={{ height: 320, overflow: 'auto' }}>
              {currentAnalysis ? (
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>
                    <Text strong>当前实时分析 ({currentAnalysis.timestamp})</Text>
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

                  <Row gutter={16}>
                    <Col span={12}>
                      <Text type="secondary">语言标签:</Text>
                      <br />
                      <Tag color="purple">{currentAnalysis.language}</Tag>
                    </Col>
                    <Col span={12}>
                      <Text type="secondary">事件标签:</Text>
                      <br />
                      <Tag color="cyan">{currentAnalysis.event}</Tag>
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

      {analysisResults.length > 0 && (
        <Card title="历史分析" style={{ marginTop: 24 }}>
          <div style={{ maxHeight: 200, overflow: 'auto' }}>
            {analysisResults.slice().reverse().map((result, index) => (
              <div key={index} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Text type="secondary">{result.timestamp}</Text>
                <Text style={{ marginLeft: 16 }}>
                  情感: <Tag color="blue">{result.emotion}</Tag>
                  语言: <Tag color="purple">{result.language}</Tag>
                  事件: <Tag color="cyan">{result.event}</Tag>
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
