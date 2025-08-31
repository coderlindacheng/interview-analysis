# VoiceAnalysis.tsx 重构总结

## 重构目标
使用 `recorder-core.js` 库替换原有的 `MediaRecorder API` 和 `AudioProcessor` 来获取麦克风音频，参考 `main.js` 中的 `recProcess` 函数实现。

## 主要变更

### 1. 依赖导入变更
- **添加**: 导入 `recorder-core.js` 库
- **移除**: `AudioProcessor` 相关导入
- **添加**: 全局 `Recorder` 类型声明

### 2. 状态引用重构
- **替换**: `audioProcessorRef` → `recorderRef`
- **添加**: `sampleBufferRef` 用于缓存音频数据
- **移除**: `audioContextRef` 和 `analyserRef`（不再需要手动音频分析）

### 3. 音频处理逻辑重写

#### 原实现
```typescript
// 使用 AudioProcessor 和 MediaRecorder
audioProcessorRef.current = new AudioProcessor()
await audioProcessorRef.current.initializeAudioProcessor(stream, callback)
```

#### 新实现
```typescript
// 使用 recorder-core.js
recorderRef.current = window.Recorder({
  type: "pcm",
  bitRate: 16,
  sampleRate: 16000,
  onProcess: recProcess
})
```

### 4. recProcess 音频处理函数
参考 `main.js` 实现了音频实时处理：

```typescript
const recProcess = (buffer, powerLevel, bufferDuration, bufferSampleRate) => {
  // 1. 更新音频级别和录音时间
  setAudioLevel(powerLevel)
  setRecordingTime(Math.floor(bufferDuration / 1000))
  
  // 2. 获取最新音频数据
  const data_latest = buffer[buffer.length - 1]
  
  // 3. 采样率转换（如果需要）
  let data_16k = data_latest
  if (bufferSampleRate !== 16000) {
    data_16k = window.Recorder.SampleData([data_latest], bufferSampleRate, 16000).data
  }
  
  // 4. 分块发送到WebSocket
  const chunk_size = 960
  while (sampleBufferRef.current.length >= chunk_size) {
    const sendBuf = sampleBufferRef.current.slice(0, chunk_size)
    voiceWebSocketService.sendAudioData(sendBuf.buffer)
    sampleBufferRef.current = sampleBufferRef.current.slice(chunk_size)
  }
}
```

### 5. 录音生命周期管理

#### 开始录音
```typescript
// 1. 连接WebSocket服务
// 2. 选择录音保存目录
// 3. 创建Recorder实例
// 4. 打开录音设备并开始录音
recorderRef.current.open(successCallback, failCallback)
```

#### 停止录音
```typescript
// 1. 停止Recorder录音
recorderRef.current.stop(successCallback, failCallback)
// 2. 发送剩余音频数据
// 3. 关闭Recorder和其他资源
```

## 技术优势

### 1. 更好的音频处理
- **专业录音库**: `recorder-core.js` 是专门的录音库，提供更稳定的音频处理
- **自动采样率转换**: 库内置采样率转换功能
- **实时音频级别检测**: 通过 `powerLevel` 参数直接获取音频强度

### 2. 简化的代码结构
- **减少手动AudioContext管理**: 库自动处理AudioContext
- **统一的音频处理流程**: 所有音频处理逻辑集中在 `recProcess` 函数中
- **更好的错误处理**: 库提供完善的错误回调机制

### 3. 兼容性改进
- **跨浏览器兼容**: `recorder-core.js` 处理了浏览器兼容性问题
- **移动端优化**: 库对移动端录音有特殊优化

## 保留功能

1. **文件保存功能**: 仍使用 `MediaRecorder` 保存录音文件到本地
2. **WebSocket通信**: 保持原有的WebSocket音频数据传输
3. **SenseVoice情感分析**: 完整保留情感分析功能
4. **UI交互**: 保持原有的用户界面和交互逻辑

## 配置参数

- **音频格式**: PCM
- **采样率**: 16kHz
- **位深**: 16位
- **分块大小**: 960字节（符合ASR要求）

## 测试建议

1. **基本录音功能**: 测试开始/停止录音是否正常
2. **音频级别显示**: 检查音频强度指示器是否工作
3. **语音识别**: 验证WebSocket音频数据传输是否正常
4. **文件保存**: 确认录音文件能否正确保存
5. **错误处理**: 测试各种错误情况下的处理逻辑

## 潜在问题与解决方案

1. **库加载问题**: 确保 `recorder-core.js` 正确加载
2. **权限问题**: 处理麦克风权限被拒绝的情况
3. **浏览器兼容性**: 在不同浏览器中测试功能

这次重构使代码更加专业化和稳定，为后续的语音处理功能提供了更好的基础。
