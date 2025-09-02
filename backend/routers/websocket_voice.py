"""
实时语音分析WebSocket路由模块
统一的WebSocket连接支持：
1. 音频流实时接收
2. FunASR语音转文字结果实时返回
3. 语音分析结果实时返回（如需要）
所有功能通过单一WebSocket连接实现
"""

import asyncio
import json
import logging
from typing import Dict, List, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
import pyaudio
import wave
import io
import threading
from datetime import datetime
from services.funasr_service import FunASRService, funasr_manager

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()



# WebSocket连接管理器
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.client_funasr_services: Dict[str, FunASRService] = {}
        
    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"客户端 {client_id} 已连接")
        
    async def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            
        # 清理FunASR服务
        if client_id in self.client_funasr_services:
            await self.client_funasr_services[client_id].disconnect()
            del self.client_funasr_services[client_id]
            
        logger.info(f"客户端 {client_id} 已断开连接")
        
    async def get_or_create_funasr_service(self, client_id: str) -> FunASRService:
        """获取或创建FunASR服务实例"""
        if client_id not in self.client_funasr_services:
            # 创建新的FunASR服务
            # 注意：这里使用本地模拟服务器地址，实际部署时需要更改
            service = await funasr_manager.create_service(
                session_id=client_id,
                host="localhost",  # 修改为实际的FunASR服务器地址
                port=10096,        # 修改为实际的FunASR服务器端口
                use_ssl=False,     # 根据实际情况设置
                mode="2pass"       # 使用2pass模式以获得最佳识别效果
            )
            
            # 设置回调函数
            service.set_recognition_callback(
                lambda result: self._on_recognition_result(client_id, result)
            )
            service.set_error_callback(
                lambda error: self._on_funasr_error(client_id, error)
            )
            
            self.client_funasr_services[client_id] = service
            
        return self.client_funasr_services[client_id]
    
    async def _on_recognition_result(self, client_id: str, result: dict):
        """FunASR识别结果回调"""
        try:
            # 打印FunASR识别结果到控制台
            recognition_text = result.get("text", "").strip()
            confidence = result.get("confidence", 0.9)
            mode = result.get("mode", "2pass")
            is_final = result.get("is_final", True)
            
            if recognition_text:  # 只打印非空文本结果
                print(f"🎙️ FunASR识别结果 [客户端: {client_id}]")
                print(f"   文本: {recognition_text}")
                print(f"   置信度: {confidence:.2f}")
                print(f"   模式: {mode}")
                print(f"   最终结果: {is_final}")
                print(f"   时间: {datetime.now().strftime('%H:%M:%S')}")
                print("─" * 50)
            
                        # 只返回2pass-offline结果
            if mode != "2pass-offline":
                print(f"🔄 跳过非离线结果 [客户端: {client_id}] - 模式: {mode}")
                return
                
            # 发送转录结果
            transcription_message = json.dumps({
                "type": "transcription",
                "data": {
                    "text": result["text"],
                    "timestamp": result.get("timestamp", datetime.now().isoformat()),
                    "confidence": result.get("confidence", 0.9),
                    "is_final": result.get("is_final", True),
                    "mode": result.get("mode", "2pass")
                }
            })
            
            await self.send_personal_message(transcription_message, client_id)
                
        except Exception as e:
            logger.error(f"处理识别结果失败: {e}")
    
    async def _on_funasr_error(self, client_id: str, error: str):
        """FunASR错误回调"""
        error_message = json.dumps({
            "type": "error",
            "message": f"语音识别服务错误: {error}",
            "timestamp": datetime.now().isoformat()
        })
        await self.send_personal_message(error_message, client_id)
            
    async def send_personal_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)
            
    async def broadcast(self, message: str):
        for connection in self.active_connections.values():
            await connection.send_text(message)

manager = ConnectionManager()



# 音频处理类
class AudioProcessor:
    def __init__(self):
        self.sample_rate = 16000
        self.channels = 1
        self.chunk_size = 1024
        self.format = pyaudio.paInt16
        
    def process_audio_chunk(self, audio_data: bytes) -> Optional[bytes]:
        """处理音频块数据"""
        try:
            # 这里可以添加音频预处理逻辑
            # 比如降噪、音量调整等
            # 记录音频数据大小到控制台
            return audio_data
        except Exception as e:
            logger.error(f"音频处理错误: {e}")
            return None
            
    def is_silence(self, audio_data: bytes, threshold: float = 0.01) -> bool:
        """检测是否为静音"""
        try:
            # 简单检测：基于音频数据长度和非零字节数量
            if len(audio_data) < 1000:  # 太短认为是静音
                return True
            
            # 统计非零字节的比例
            non_zero_count = sum(1 for byte in audio_data if byte != 0)
            non_zero_ratio = non_zero_count / len(audio_data)
            
            return non_zero_ratio < threshold
        except Exception as e:
            logger.error(f"静音检测错误: {e}")
            return False

audio_processor = AudioProcessor()

@router.websocket("/ws/voice/stream/{client_id}")
async def websocket_voice_stream(websocket: WebSocket, client_id: str):
    """
    统一WebSocket接口: 音频流处理与语音识别
    功能包括：
    1. 接收前端发送的音频字节流
    2. 通过FunASR进行实时语音识别
    3. 将语音转文字结果实时返回给前端
    4. 支持语音分析结果返回（可扩展）
    """
    await manager.connect(websocket, client_id)
    funasr_service = None
    
    try:
        # 发送连接成功消息
        await websocket.send_text(json.dumps({
            "type": "connection_status",
            "status": "connected",
            "message": "音频流连接已建立"
        }))
        
        # 获取或创建FunASR服务
        funasr_service = await manager.get_or_create_funasr_service(client_id)
        
        # 尝试连接FunASR服务
        if not await funasr_service.connect():
            # FunASR连接失败，直接返回错误
            await websocket.send_text(json.dumps({
                "type": "service_status", 
                "status": "funasr_failed",
                "message": "FunASR服务连接失败"
            }))
            await websocket.close(code=1011, reason="FunASR服务不可用")
            return
            
        # 启动识别会话
        await funasr_service.start_recognition_session(f"session_{client_id}")
        
        await websocket.send_text(json.dumps({
            "type": "service_status",
            "status": "funasr_connected",
            "message": "FunASR语音识别服务已连接"
        }))
        
        while True:
            # 接收音频数据
            data = await websocket.receive_bytes()
            
            # 处理音频数据
            processed_audio = audio_processor.process_audio_chunk(data)
            if processed_audio:
                # 使用FunASR进行实时识别
                success = await funasr_service.send_audio_chunk(processed_audio)
                if not success:
                    logger.error("发送音频到FunASR失败")
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "语音识别服务异常",
                        "timestamp": datetime.now().isoformat()
                    }))
                    break
                
    except WebSocketDisconnect:
        await manager.disconnect(client_id)
        logger.info(f"客户端 {client_id} 断开连接")
    except Exception as e:
        logger.error(f"WebSocket错误: {e}")
        await manager.disconnect(client_id)



# 健康检查接口
@router.get("/voice/health")
async def voice_health_check():
    """统一语音服务健康检查"""
    return {
        "status": "healthy",
        "service_type": "unified_websocket",
        "active_connections": len(manager.active_connections),
        "funasr_sessions": len(manager.client_funasr_services),
        "features": ["audio_stream", "speech_to_text", "real_time_analysis"],
        "timestamp": datetime.now().isoformat()
    }

# 获取连接状态
@router.get("/voice/connections")
async def get_voice_connections():
    """获取当前活跃的WebSocket连接状态"""
    return {
        "connection_type": "unified_websocket",
        "active_connections": list(manager.active_connections.keys()),
        "total_count": len(manager.active_connections),
        "description": "单一WebSocket连接处理所有语音功能",
        "timestamp": datetime.now().isoformat()
    }
