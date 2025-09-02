import { message } from 'antd'
import { 
  voiceWebSocketService, 
  parseSenseVoiceTags,
  type TranscriptionResult, 
  type VoiceAnalysisResult 
} from './websocketService'

// 工具函数
export const extractKeywords = (text: string): string[] => {
  const words = text.replace(/[，。！？；：""''（）【】\s]/g, ' ').split(/\s+/).filter(word => word.length > 1)
  return words.slice(0, 5)
}

export const calculateFluency = (text: string): number => {
  if (!text.trim()) return 0
  const sentences = text.split(/[。！？]/).filter(s => s.trim())
  const avgLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length
  const punctuationCount = (text.match(/[，。！？；：]/g) || []).length
  const fluency = Math.min(100, (avgLength / 10) * 20 + (punctuationCount / text.length) * 100 * 50)
  return Math.round(fluency)
}

export const calculatePace = (text: string): number => {
  if (!text.trim()) return 0
  const estimatedSeconds = text.length * 0.3
  const pace = (text.length / estimatedSeconds) * 60
  return Math.round(pace)
}

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 文件操作相关
export const requestDirectoryAccess = async (): Promise<{ success: boolean; handle: FileSystemDirectoryHandle | null }> => {
  try {
    if ('showDirectoryPicker' in window) {
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'desktop'
      })
      return { success: true, handle: dirHandle }
    } else {
      message.info('浏览器不支持文件系统访问，将使用下载方式保存文件')
      return { success: false, handle: null }
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      message.info('已取消目录选择，将使用下载方式保存录音文件')
    } else {
      message.warning('无法获取目录访问权限，将使用下载方式保存文件')
    }
    return { success: false, handle: null }
  }
}

export const saveRecordingFile = async (audioBlob: Blob, directoryHandle: FileSystemDirectoryHandle | null = null): Promise<void> => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = `recording_${timestamp}.webm`
  
  try {
    if (directoryHandle) {
      const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(audioBlob)
      await writable.close()
      message.success(`录音已保存: ${fileName}`)
    } else {
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
    message.error('保存录音文件失败')
  }
}

// 时间戳处理
export const handleWithTimestamp = (text: string, timestamp: any): string => {
  if (!timestamp || timestamp === "undefined" || !text.trim()) {
    return text
  }
  
  const cleanText = text.replace(/[。？，、\?\.\s]/g, ",")
  const words = cleanText.split(",").filter(word => word.trim())
  
  try {
    const timeData = JSON.parse(timestamp)
    let charIndex = 0
    let textWithTime = ""
    
    for (const word of words) {
      if (word === "undefined" || !word.trim()) {
        continue
      }
      
      if (/^[a-zA-Z]+$/.test(word)) {
        textWithTime += `${(timeData[charIndex][0] / 1000).toFixed(2)}:${word}\n`
        charIndex += 1
      } else {
        textWithTime += `${(timeData[charIndex][0] / 1000).toFixed(2)}:${word}\n`
        charIndex += word.length
      }
    }
    
    return textWithTime
  } catch (error) {
    return text
  }
}

// 录制服务管理类
export class VoiceRecordingService {
  private recorder: any = null
  private sampleBuffer: Int16Array = new Int16Array()
  private mediaRecorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private timer: number | undefined
  private directoryHandle: FileSystemDirectoryHandle | null = null
  private recordingChunks: Blob[] = []
  private isRecordingFlag = false

  // 回调函数
  private onAudioLevel?: (level: number) => void
  private onRecordingTime?: (time: number) => void
  private onRecordingStateChange?: (isRecording: boolean) => void
  private onConnectionStatusChange?: (status: string) => void

  constructor() {
    this.setupWebSocketCallbacks()
  }

  setCallbacks(callbacks: {
    onAudioLevel?: (level: number) => void
    onRecordingTime?: (time: number) => void
    onRecordingStateChange?: (isRecording: boolean) => void
    onConnectionStatusChange?: (status: string) => void
  }) {
    this.onAudioLevel = callbacks.onAudioLevel
    this.onRecordingTime = callbacks.onRecordingTime
    this.onRecordingStateChange = callbacks.onRecordingStateChange
    this.onConnectionStatusChange = callbacks.onConnectionStatusChange
  }

  private setupWebSocketCallbacks() {
    voiceWebSocketService.setCallbacks({
      onConnectionStatus: (status: string) => {
        let frontendStatus = status
        if (status === 'funasr_connected') {
          frontendStatus = 'service_ready'
        } else if (status === 'funasr_failed') {
          frontendStatus = 'service_fallback'
        }
        
        this.onConnectionStatusChange?.(frontendStatus)
        
        const statusMessages: Record<string, string> = {
          'connected': 'WebSocket连接成功',
          'funasr_connected': '语音识别服务已连接',
          'funasr_failed': '语音识别服务连接失败，使用备用服务',
          'disconnected': '连接已断开'
        }
        
        const messageType: 'success' | 'warning' | 'info' = status === 'funasr_failed' ? 'warning' : 
                           status === 'disconnected' ? 'info' : 'success'
        
        if (statusMessages[status]) {
          message[messageType](statusMessages[status])
        }
      },
      
      onError: (error: string) => {
        message.error(`实时分析错误: ${error}`)
      }
    })
  }

  private recProcess = (buffer: any[], powerLevel: number, bufferDuration: number, bufferSampleRate: number) => {
    if (!this.isRecordingFlag) return
    
    this.onAudioLevel?.(powerLevel)
    this.onRecordingTime?.(Math.floor(bufferDuration / 1000))
    
    const data_latest = buffer[buffer.length - 1]
    if (!data_latest) return
    
    let data_16k = data_latest
    if (bufferSampleRate !== 16000) {
      const array_source = new Array(data_latest)
      data_16k = (window as any).Recorder.SampleData(array_source, bufferSampleRate, 16000).data
    }
    
    const newSampleBuf = Int16Array.from([...this.sampleBuffer, ...data_16k])
    this.sampleBuffer = newSampleBuf
    
    const chunk_size = 960
    while (this.sampleBuffer.length >= chunk_size) {
      const sendBuf = this.sampleBuffer.slice(0, chunk_size)
      this.sampleBuffer = this.sampleBuffer.slice(chunk_size)
      voiceWebSocketService.sendAudioData(sendBuf.buffer)
    }
  }

  async startRecording(): Promise<boolean> {
    try {
      message.loading('连接语音识别服务...', 1)
      const connected = await voiceWebSocketService.connect()
      if (!connected) {
        message.error('无法连接到语音识别服务')
        return false
      }
      
      message.loading('请选择录音保存目录...', 1)
      const directoryResult = await requestDirectoryAccess()
      this.directoryHandle = directoryResult.success ? directoryResult.handle : null
      
      if (!(window as any).Recorder) {
        message.error('Recorder库未加载')
        return false
      }
      
      this.sampleBuffer = new Int16Array()
      
      this.recorder = (window as any).Recorder({
        type: "pcm",
        bitRate: 16,
        sampleRate: 16000,
        onProcess: this.recProcess
      })
      
      message.loading('获取麦克风权限...', 1)
      
      return new Promise((resolve) => {
        this.recorder.open(
          async () => {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                  echoCancellation: false,
                  noiseSuppression: false,
                  autoGainControl: false,
                  sampleRate: 16000
                } 
              })
              this.stream = stream
              
              this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
              })
              
              this.recordingChunks = []
              
              this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                  this.recordingChunks.push(event.data)
                }
              }
              
              this.mediaRecorder.onstop = async () => {
                const recordingBlob = new Blob(this.recordingChunks, { type: 'audio/webm' })
                await saveRecordingFile(recordingBlob, this.directoryHandle)
              }
              
              this.mediaRecorder.start(1000)
            } catch (streamError) {
              // MediaRecorder失败不影响主要功能
            }
            
            this.recorder.start()
            this.isRecordingFlag = true
            this.onRecordingStateChange?.(true)
            this.onRecordingTime?.(0)
            
            const saveStatus = this.directoryHandle ? '保存到所选目录' : '自动下载'
            message.success(`录音开始！已连接语音识别服务，${saveStatus}`)
            resolve(true)
          },
          (errMsg: string, isUserNotAllow: boolean) => {
            if (isUserNotAllow) {
              message.error('用户拒绝了录音权限')
            } else {
              message.error(`录音启动失败: ${errMsg}`)
            }
            voiceWebSocketService.disconnect()
            resolve(false)
          }
        )
      })
      
    } catch (error) {
      message.error('录音启动失败，请检查权限设置')
      voiceWebSocketService.disconnect()
      return false
    }
  }

  stopRecording(): void {
    if (this.recorder) {
      this.recorder.stop(
        () => {
          if (this.sampleBuffer.length > 0) {
            voiceWebSocketService.sendAudioData(this.sampleBuffer.buffer)
            this.sampleBuffer = new Int16Array()
          }
          
          this.recorder.close()
          this.recorder = null
        },
        () => {}
      )
    }
    
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop()
    }
    
    voiceWebSocketService.disconnect()
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }
    
    if (this.timer) {
      window.clearInterval(this.timer)
    }
    
    this.isRecordingFlag = false
    this.onRecordingStateChange?.(false)
    this.onAudioLevel?.(0)
    this.onConnectionStatusChange?.('disconnected')
    
    message.success('录音已停止并保存')
  }

  isRecording(): boolean {
    return this.isRecordingFlag
  }

  cleanup(): void {
    this.stopRecording()
  }
}

// 单例实例
export const voiceRecordingService = new VoiceRecordingService()
