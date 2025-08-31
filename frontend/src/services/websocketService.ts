/**
 * WebSocket 语音分析服务
 * 负责与后端WebSocket接口的通信
 */

import { 
  SENSEVOICE_EMOTION_MAP,
  SENSEVOICE_LANGUAGE_MAP,
  SENSEVOICE_EVENT_MAP
} from './sensevoiceTags'

export interface TranscriptionResult {
  text: string;
  timestamp: string;
  confidence: number;
  is_final: boolean;
  mode?: string;
  raw_text?: string; // 包含SenseVoice标签的原始文本
  emotion_tag?: string; // 解析出的情感标签
}

export interface VoiceAnalysisResult {
  timestamp: string;
  confidence: number;
  emotion: string;
  sentiment: string;
  language: string;
  event: string;
  keywords: string[];
  fluency: number;
  pace: number;
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
  status?: string;
  timestamp?: string;
}



/**
 * 解析SenseVoice标签（情感、语言、事件）
 */
export function parseSenseVoiceTags(text: string): {
  cleanText: string;
  emotionTag: string | null;
  emotion: string;
  sentiment: string;
  languageTag: string | null;
  language: string;
  eventTag: string | null;
  event: string;
} {
  let cleanText = text;
  let emotionTag: string | null = null;
  let languageTag: string | null = null;
  let eventTag: string | null = null;
  
  // 匹配SenseVoice标签格式: <|TAG|>
  const tagMatches = text.match(/<\|([A-Za-z_]+)\|>/g);
  
  if (tagMatches) {
    for (const tagMatch of tagMatches) {
      const tag = tagMatch.replace(/<\||\|>/g, '');
      
      // 检查是否为情感标签
      if (SENSEVOICE_EMOTION_MAP[tag]) {
        emotionTag = tag;
        cleanText = cleanText.replace(tagMatch, '').trim();
      }
      // 检查是否为语言标签
      else if (SENSEVOICE_LANGUAGE_MAP[tag]) {
        languageTag = tag;
        cleanText = cleanText.replace(tagMatch, '').trim();
      }
      // 检查是否为事件标签
      else if (SENSEVOICE_EVENT_MAP[tag]) {
        eventTag = tag;
        cleanText = cleanText.replace(tagMatch, '').trim();
      }
    }
  }
  
  const emotionInfo = emotionTag ? SENSEVOICE_EMOTION_MAP[emotionTag] : { emotion: '中性', sentiment: '中性' };
  const language = languageTag ? SENSEVOICE_LANGUAGE_MAP[languageTag] : '未知语言';
  const event = eventTag ? SENSEVOICE_EVENT_MAP[eventTag] : '无事件';
  
  return {
    cleanText,
    emotionTag,
    emotion: emotionInfo.emotion,
    sentiment: emotionInfo.sentiment,
    languageTag,
    language,
    eventTag,
    event
  };
}

/**
 * 解析SenseVoice情感标签（保持向后兼容）
 */
export function parseSenseVoiceEmotion(text: string): {
  cleanText: string;
  emotionTag: string | null;
  emotion: string;
  sentiment: string;
} {
  const result = parseSenseVoiceTags(text);
  return {
    cleanText: result.cleanText,
    emotionTag: result.emotionTag,
    emotion: result.emotion,
    sentiment: result.sentiment
  };
}

export class VoiceWebSocketService {
  private audioStreamWs: WebSocket | null = null;
  private clientId: string;
  private baseUrl: string;
  private isConnected: boolean = false;
  
  // 回调函数
  private onTranscriptionCallback?: (result: TranscriptionResult) => void;
  private onAnalysisCallback?: (result: VoiceAnalysisResult) => void;
  private onConnectionStatusCallback?: (status: string) => void;
  private onErrorCallback?: (error: string) => void;

  constructor(baseUrl: string = 'ws://localhost:8000') {
    this.baseUrl = baseUrl;
    this.clientId = this.generateClientId();
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 设置回调函数
   */
  setCallbacks(callbacks: {
    onTranscription?: (result: TranscriptionResult) => void;
    onAnalysis?: (result: VoiceAnalysisResult) => void;
    onConnectionStatus?: (status: string) => void;
    onError?: (error: string) => void;
  }) {
    this.onTranscriptionCallback = callbacks.onTranscription;
    this.onAnalysisCallback = callbacks.onAnalysis;
    this.onConnectionStatusCallback = callbacks.onConnectionStatus;
    this.onErrorCallback = callbacks.onError;
  }

  /**
   * 连接到WebSocket服务
   */
  async connect(): Promise<boolean> {
    try {
      // 连接主音频流WebSocket
      const audioStreamUrl = `${this.baseUrl}/api/ws/voice/stream/${this.clientId}`;
      this.audioStreamWs = new WebSocket(audioStreamUrl);

      return new Promise((resolve, reject) => {
        if (!this.audioStreamWs) {
          reject(new Error('WebSocket创建失败'));
          return;
        }

        this.audioStreamWs.onopen = () => {
          console.log('音频流WebSocket连接成功');
          this.isConnected = true;
          this.onConnectionStatusCallback?.('connected');
          resolve(true);
        };

        this.audioStreamWs.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.audioStreamWs.onclose = () => {
          console.log('音频流WebSocket连接关闭');
          this.isConnected = false;
          this.onConnectionStatusCallback?.('disconnected');
        };

        this.audioStreamWs.onerror = (error) => {
          console.error('音频流WebSocket错误:', error);
          this.isConnected = false;
          this.onErrorCallback?.('WebSocket连接错误');
          reject(error);
        };

        // 设置连接超时
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('WebSocket连接超时'));
          }
        }, 5000);
      });

    } catch (error) {
      console.error('WebSocket连接失败:', error);
      this.onErrorCallback?.(`连接失败: ${error}`);
      return false;
    }
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(data: string) {
    try {
      const message: WebSocketMessage = JSON.parse(data);
      
      switch (message.type) {
        case 'connection_status':
          this.onConnectionStatusCallback?.(message.status || 'unknown');
          break;
          
        case 'service_status':
          // 后端发送语音识别服务状态，前端不需要知道具体实现细节
          this.onConnectionStatusCallback?.(message.status || 'unknown');
          break;
          
        case 'transcription':
          if (message.data && this.onTranscriptionCallback) {
            this.onTranscriptionCallback(message.data as TranscriptionResult);
          }
          break;
          
        case 'analysis':
          if (message.data && this.onAnalysisCallback) {
            this.onAnalysisCallback(message.data as VoiceAnalysisResult);
          }
          break;
          
        case 'error':
          this.onErrorCallback?.(message.message || '未知错误');
          break;
          
        case 'heartbeat':
        case 'pong':
          // 心跳消息，可以用来检测连接状态
          break;
          
        default:
          console.log('收到未知消息类型:', message.type);
      }
    } catch (error) {
      console.error('解析WebSocket消息失败:', error);
    }
  }

  /**
   * 发送音频数据
   */
  sendAudioData(audioData: ArrayBuffer): boolean {
    if (!this.isConnected || !this.audioStreamWs) {
      console.warn('WebSocket未连接，无法发送音频数据');
      return false;
    }

    try {
      this.audioStreamWs.send(audioData);
      return true;
    } catch (error) {
      console.error('发送音频数据失败:', error);
      this.onErrorCallback?.('发送音频数据失败');
      return false;
    }
  }

  /**
   * 发送ping消息保持连接
   */
  sendPing() {
    if (this.isConnected && this.audioStreamWs) {
      const pingMessage = JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() });
      this.audioStreamWs.send(pingMessage);
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    this.isConnected = false;
    
    if (this.audioStreamWs) {
      this.audioStreamWs.close();
      this.audioStreamWs = null;
    }
    
    console.log('WebSocket连接已断开');
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * 获取客户端ID
   */
  getClientId(): string {
    return this.clientId;
  }
}

/**
 * 音频处理工具类
 */
export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor() {}

  /**
   * 初始化音频处理器
   */
  async initializeAudioProcessor(stream: MediaStream, onAudioData: (audioData: ArrayBuffer) => void): Promise<boolean> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.source = this.audioContext.createMediaStreamSource(stream);
      
      // 创建音频处理器节点
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // 转换为16位PCM数据
        const pcmData = this.convertToPCM16(inputData);
        onAudioData(pcmData.buffer as ArrayBuffer);
      };

      // 连接音频节点
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      return true;
    } catch (error) {
      console.error('初始化音频处理器失败:', error);
      return false;
    }
  }

  /**
   * 将Float32Array转换为16位PCM数据
   */
  private convertToPCM16(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  }

  /**
   * 停止音频处理器
   */
  stop() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// 导出单例实例
export const voiceWebSocketService = new VoiceWebSocketService();
