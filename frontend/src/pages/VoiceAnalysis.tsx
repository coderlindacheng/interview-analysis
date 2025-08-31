import { useState, useEffect, useRef } from 'react'
import { Button, Card, Row, Col, Typography, Space, Alert, Progress, Tag, Divider, message } from 'antd'
import { 
  AudioOutlined, 
  StopOutlined,
  SoundOutlined,
  BulbOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import { 
  voiceWebSocketService, 
  parseSenseVoiceTags,
  type TranscriptionResult, 
  type VoiceAnalysisResult 
} from '../services/websocketService'

// 导入 recorder-core.js
// @ts-ignore
import '../services/recorder-core.js'
import '../services/pcm.js'
import '../services/wav.js'
// import '../services/wsconnecter.js'

// 声明全局 Recorder 类型
declare global {
  interface Window {
    Recorder: any;
    showDirectoryPicker: (options?: {
      mode?: 'read' | 'readwrite'
      startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos'
    }) => Promise<FileSystemDirectoryHandle>
  }
}

const { Title, Text, Paragraph } = Typography



// 移除本地接口定义，使用从websocketService导入的类型

// 提取关键词的简单函数
const extractKeywords = (text: string): string[] => {
  // 简单的中文关键词提取
  const words = text.replace(/[，。！？；：""''（）【】\s]/g, ' ').split(/\s+/).filter(word => word.length > 1);
  const keywords = words.slice(0, 5); // 取前5个词作为关键词
  return keywords;
};

// 计算流畅度（基于语句完整性和标点符号）
const calculateFluency = (text: string): number => {
  if (!text.trim()) return 0;
  
  const sentences = text.split(/[。！？]/).filter(s => s.trim());
  const avgLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
  const punctuationCount = (text.match(/[，。！？；：]/g) || []).length;
  
  // 基于句子长度和标点符号密度计算流畅度
  const fluency = Math.min(100, (avgLength / 10) * 20 + (punctuationCount / text.length) * 100 * 50);
  return Math.round(fluency);
};

// 计算语速（简单估算：字符数/时间）
const calculatePace = (text: string): number => {
  if (!text.trim()) return 0;
  
  // 假设每个字符需要0.3秒说出，估算语速
  const estimatedSeconds = text.length * 0.3;
  const pace = (text.length / estimatedSeconds) * 60; // 转换为每分钟字符数
  return Math.round(pace);
};

// VoiceAnalysis 语音分析主组件
const VoiceAnalysis = () => {
  // === 基础状态管理 ===
  const [isRecording, setIsRecording] = useState(false)          // 录音状态控制（用于UI渲染）
  const isRecordingRef = useRef(false)                          // 录音状态引用（用于recProcess函数）
  const [transcriptText, setTranscriptText] = useState('')       // 实时转录文本内容（类似html中的rec_text）
  const [offlineText, setOfflineText] = useState('')             // 离线识别结果（类似html中的offline_text）
  const [analysisResults, setAnalysisResults] = useState<VoiceAnalysisResult[]>([])  // 历史分析结果列表
  const [currentAnalysis, setCurrentAnalysis] = useState<VoiceAnalysisResult | null>(null)  // 当前分析结果
  const [audioLevel, setAudioLevel] = useState(0)               // 音频音量级别（0-100）
  const [recordingTime, setRecordingTime] = useState(0)          // 录音时长（秒）
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected')  // WebSocket连接状态
  
  // === 音频处理相关引用 ===
  const recorderRef = useRef<any>(null)                          // Recorder.js 录音器实例
  const sampleBufferRef = useRef<Int16Array>(new Int16Array())   // PCM音频采样缓冲区
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)    // 浏览器原生媒体录音器
  const timerRef = useRef<number>()                              // 录音计时器引用
  const streamRef = useRef<MediaStream | null>(null)             // 音频流引用
  const directoryHandleRef = useRef<FileSystemDirectoryHandle | null>(null)  // 文件系统目录句柄
  const recordingChunksRef = useRef<Blob[]>([])                  // 录音数据块缓存

  // 处理带时间戳的文本（类似html中的handleWithTimestamp函数）
  const handleWithTimestamp = (text: string, timestamp: any) => {
    if (!timestamp || timestamp === "undefined" || !text.trim()) {
      return text;
    }
    
    // 清理文本，将标点符号替换为逗号
    const cleanText = text.replace(/[。？，、\?\.\s]/g, ",");
    const words = cleanText.split(",").filter(word => word.trim());
    
    try {
      const timeData = JSON.parse(timestamp);
      let charIndex = 0;
      let textWithTime = "";
      
      for (const word of words) {
        if (word === "undefined" || !word.trim()) {
          continue;
        }
        
        // 检查是否为英文单词
        if (/^[a-zA-Z]+$/.test(word)) {
          // 英文：按单词计算时间戳
          textWithTime += `${(timeData[charIndex][0] / 1000).toFixed(2)}:${word}\n`;
          charIndex += 1;
        } else {
          // 中文：按字符计算时间戳
          textWithTime += `${(timeData[charIndex][0] / 1000).toFixed(2)}:${word}\n`;
          charIndex += word.length;
        }
      }
      
      return textWithTime;
    } catch (error) {
      console.warn('解析时间戳失败:', error);
      return text;
    }
  };

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

  // WebSocket回调函数设置
  useEffect(() => {
    // 设置WebSocket回调函数
    voiceWebSocketService.setCallbacks({
      onTranscription: (result: TranscriptionResult) => {
        // 解析SenseVoice标签（情感、语言、事件）
        const tagInfo = parseSenseVoiceTags(result.text);
        const cleanText = tagInfo.cleanText;
        const asrMode = result.mode || '2pass';
        const isFinal = result.is_final;
        const timestamp = result.timestamp;
        
        console.log("收到转录结果:", {
          originalText: result.text,
          cleanText: cleanText,
          emotionTag: tagInfo.emotionTag,
          emotion: tagInfo.emotion,
          sentiment: tagInfo.sentiment,
          languageTag: tagInfo.languageTag,
          language: tagInfo.language,
          eventTag: tagInfo.eventTag,
          event: tagInfo.event,
          mode: asrMode,
          isFinal,
          timestamp
        });
        
        // 参考html中的日志输出
        console.log("message:", cleanText);
        
        // 参考html中的2pass逻辑处理转录文本
        if (asrMode === "2pass-offline" || asrMode === "offline") {
          // 离线模式：累积带时间戳的文本到offline_text
          setOfflineText(prev => {
            const newOfflineText = prev + handleWithTimestamp(cleanText, timestamp);
            console.log("offline_text:", asrMode + "," + newOfflineText);
            // 将offline_text赋值给rec_text（显示文本）
            setTranscriptText(newOfflineText);
            return newOfflineText;
          });
        } else {
          // 在线模式：直接追加文本到rec_text
          setTranscriptText(prev => {
            const newText = prev + cleanText; // 参考html：rec_text=rec_text+rectxt
            console.log("rec_text:", newText);
            return newText;
          });
        }
        
        // 处理标签信息（无论是否为最终结果）
        if (tagInfo.emotionTag || tagInfo.languageTag || tagInfo.eventTag) {
          console.log("检测到标签:", {
            emotionTag: tagInfo.emotionTag,
            languageTag: tagInfo.languageTag,
            eventTag: tagInfo.eventTag
          });
          
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
          };
          
          // 更新情感分析结果
          setCurrentAnalysis(analysisResult);
          
          // 只有最终结果才添加到历史记录
          if (isFinal) {
            setAnalysisResults(prev => [...prev, analysisResult]);
          }
        }
        
        // 参考html中的文件模式处理逻辑
        // 注意：我们的应用主要是实时录音模式，所以这里不需要文件模式的处理
      },
      
      onAnalysis: (result: VoiceAnalysisResult) => {
        setCurrentAnalysis(result)
        setAnalysisResults(prev => [...prev, result])
      },
      
      onConnectionStatus: (status: string) => {
        // 将后端状态映射为通用的前端状态
        let frontendStatus = status
        if (status === 'funasr_connected') {
          frontendStatus = 'service_ready'
        } else if (status === 'funasr_failed') {
          frontendStatus = 'service_fallback'
        }
        
        setConnectionStatus(frontendStatus)
        
        if (status === 'connected') {
          message.success('WebSocket连接成功')
        } else if (status === 'funasr_connected') {
          message.success('语音识别服务已连接')
        } else if (status === 'funasr_failed') {
          message.warning('语音识别服务连接失败，使用备用服务')
        } else if (status === 'disconnected') {
          message.info('连接已断开')
        }
      },
      
      onError: (error: string) => {
        message.error(`实时分析错误: ${error}`)
        console.error('WebSocket错误:', error)
      }
    })
    
    // 组件卸载时清理连接
    return () => {
      voiceWebSocketService.disconnect()
    }
  }, [])

  // Recorder音频处理回调函数（类似main.js中的recProcess）
  const recProcess = (buffer: any[], powerLevel: number, bufferDuration: number, bufferSampleRate: number, _newBufferIdx: number, _asyncEnd?: () => void) => {
    if (!isRecordingRef.current) return
    
    // 更新音频级别和录音时间
    setAudioLevel(powerLevel)
    setRecordingTime(Math.floor(bufferDuration / 1000))
    
    // 获取最新的音频数据（类似main.js中的处理）
    const data_latest = buffer[buffer.length - 1]
    if (!data_latest) return
    
    // 转换采样率到16kHz（完全按照main.js的逻辑）
    let data_16k = data_latest
    if (bufferSampleRate !== 16000) {
      const array_source = new Array(data_latest)
      data_16k = window.Recorder.SampleData(array_source, bufferSampleRate, 16000).data
    }
    
    // 添加到采样缓冲区
    const newSampleBuf = Int16Array.from([...sampleBufferRef.current, ...data_16k])
    sampleBufferRef.current = newSampleBuf
    
    // 分块发送数据到WebSocket（严格按照main.js中的逻辑）
    const chunk_size = 960 // ASR chunk_size [5, 10, 5]
    while (sampleBufferRef.current.length >= chunk_size) {
      const sendBuf = sampleBufferRef.current.slice(0, chunk_size)
      sampleBufferRef.current = sampleBufferRef.current.slice(chunk_size)
      
      // 【修正】发送ArrayBuffer，后端期望bytes数据
      voiceWebSocketService.sendAudioData(sendBuf.buffer)
    }
  }

  // 开始录音
  const startRecording = async () => {
    try {
      // 1. 连接WebSocket服务
      message.loading('连接语音识别服务...', 1)
      const connected = await voiceWebSocketService.connect()
      if (!connected) {
        message.error('无法连接到语音识别服务')
        return
      }
      
      // 注意：不需要发送初始化配置，后端会自动管理FunASR连接
      
      // 3. 选择录音保存目录（可选，失败不影响录音）
      message.loading('请选择录音保存目录...', 1)
      const hasDirectoryAccess = await requestDirectoryAccess()
      
      // 4. 创建Recorder实例
      if (!window.Recorder) {
        message.error('Recorder库未加载')
        return
      }
      
      // 重置采样缓冲区
      sampleBufferRef.current = new Int16Array()
      
      // 创建录音对象，配置为PCM格式，16kHz采样率
      recorderRef.current = window.Recorder({
        type: "pcm",
        bitRate: 16,
        sampleRate: 16000,
        onProcess: recProcess  // 使用我们的处理函数
      })
      
      message.loading('获取麦克风权限...', 1)
      
      // 5. 打开录音并开始
      recorderRef.current.open(
        async () => {
          // 录音设备打开成功
          console.log('录音设备已打开')
          
          // 获取音频流用于本地保存（可选）
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
              audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                sampleRate: 16000
              } 
            })
            streamRef.current = stream
            
            // 创建媒体录制器用于本地保存
            mediaRecorderRef.current = new MediaRecorder(stream, {
              mimeType: 'audio/webm;codecs=opus'
            })
            
            // 重置录音数据
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
          } catch (streamError) {
            console.warn('无法创建MediaRecorder用于本地保存:', streamError)
            // 即使无法创建MediaRecorder，Recorder库的录音功能仍然可用
          }
          
          // 开始Recorder录音
          recorderRef.current.start()
          
          // 更新录音状态
          setIsRecording(true)
          isRecordingRef.current = true
          setRecordingTime(0)
          
          // 清空转录文本（参考html中的clear函数）
          clearTranscript()
          
          // 显示录音状态
          const saveStatus = hasDirectoryAccess ? '保存到所选目录' : '自动下载'
          message.success(`录音开始！已连接语音识别服务，${saveStatus}`)
          console.log(`录音开始！已连接语音识别服务，${isRecordingRef.current}`);
          
        },
        (errMsg: string, isUserNotAllow: boolean) => {
          // 录音设备打开失败
          console.error('录音设备打开失败:', errMsg)
          if (isUserNotAllow) {
            message.error('用户拒绝了录音权限')
          } else {
            message.error(`录音启动失败: ${errMsg}`)
          }
          voiceWebSocketService.disconnect()
        }
      )
      
    } catch (error) {
      console.error('录音启动失败:', error)
      message.error('录音启动失败，请检查权限设置')
      voiceWebSocketService.disconnect()
    }
  }

  // 停止录音
  const stopRecording = () => {
    // 停止Recorder录音
    if (recorderRef.current) {
      recorderRef.current.stop(
        (_blob: Blob, duration: number) => {
          // 录音停止成功回调
          console.log('Recorder录音已停止, 时长:', duration, 'ms')
          
          // 发送剩余的音频数据
          if (sampleBufferRef.current.length > 0) {
            voiceWebSocketService.sendAudioData(sampleBufferRef.current.buffer)
            sampleBufferRef.current = new Int16Array()
          }
          
          // 注意：不需要发送结束信号，后端会在WebSocket断开时自动清理
          
          // 关闭Recorder
          recorderRef.current.close()
          recorderRef.current = null
        },
        (errMsg: string) => {
          console.error('停止录音失败:', errMsg)
        }
      )
    }
    
    // 停止MediaRecorder（用于本地保存）
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    
    // 断开WebSocket连接
    voiceWebSocketService.disconnect()
    
    // 停止音频流
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    // 清理计时器
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
    }
    
    setIsRecording(false)
    isRecordingRef.current = false
    setAudioLevel(0)
    setConnectionStatus('disconnected')
    
    message.success('录音已停止并保存')
  }

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopRecording()
    }
  }, [])

  // 清空转录文本（参考html中的clear函数）
  const clearTranscript = () => {
    setTranscriptText('')
    setOfflineText('')
    setAnalysisResults([])
    setCurrentAnalysis(null)
  }

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
        点击开始按钮开始录音，并选择你的录音保存目录，系统将录制麦克风音频，通过SenseVoice技术实时识别语音中的情感标签，自动分析您的情感状态、语音内容和表达质量。
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
          
          <Button 
            type="default"
            size="large"
            onClick={clearTranscript}
            disabled={isRecording}
          >
            清空文本
          </Button>
          
          {/* 连接状态指示器 */}
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

        {/* 实时分析视窗 */}
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

      {/* 历史分析结果 */}
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
