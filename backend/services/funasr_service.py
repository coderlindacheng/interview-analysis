"""
FunASR语音识别服务封装
基于FunASR WebSocket客户端，提供语音识别API
"""

import asyncio
import json
import logging
from math import fabs
import ssl
import websockets
from typing import Optional, Callable, Dict, Any
from datetime import datetime
import numpy as np

logger = logging.getLogger(__name__)

class FunASRService:
    """FunASR语音识别服务类"""
    
    def __init__(self, 
                 host: str = "localhost", 
                 port: int = 10096,
                 use_ssl: bool = False,
                 chunk_size: list = [5, 10, 5],
                 chunk_interval: int = 10,
                 hotwords: str = "",
                 use_itn: bool = True,
                 mode: str = "2pass"):
        """
        初始化FunASR服务
        
        Args:
            host: FunASR服务器地址
            port: FunASR服务器端口
            use_ssl: 是否使用SSL连接
            chunk_size: 音频块大小配置
            chunk_interval: 音频块间隔
            hotwords: 热词文件路径或热词字符串
            use_itn: 是否使用逆文本归一化
            mode: 识别模式 (online, offline, 2pass)
        """
        self.host = host
        self.port = port
        self.use_ssl = use_ssl
        self.chunk_size = chunk_size
        self.chunk_interval = chunk_interval
        self.hotwords = hotwords
        self.use_itn = use_itn
        self.mode = mode
        
        self.websocket = None
        self.is_connected = False
        self.recognition_callback: Optional[Callable] = None
        self.error_callback: Optional[Callable] = None
        
        # 音频参数
        self.sample_rate = 16000
        self.channels = 1
        
    async def connect(self) -> bool:
        """连接到FunASR服务器"""
        try:
            # 配置WebSocket连接
            if self.use_ssl:
                ssl_context = ssl.SSLContext()
                ssl_context.check_hostname = False
                ssl_context.verify_mode = ssl.CERT_NONE
                uri = f"wss://{self.host}:{self.port}"
            else:
                ssl_context = None
                uri = f"ws://{self.host}:{self.port}"
                
            logger.info(f"连接到FunASR服务器: {uri}")
            
            # 建立WebSocket连接
            self.websocket = await websockets.connect(
                uri, 
                subprotocols=["binary"], 
                ping_interval=None, 
                ssl=ssl_context
            )
            
            self.is_connected = True
            logger.info("FunASR连接成功")
            return True
            
        except Exception as e:
            logger.error(f"连接FunASR服务器失败: {e}")
            self.is_connected = False
            if self.error_callback:
                await self.error_callback(f"连接失败: {e}")
            return False
    
    async def disconnect(self):
        """断开连接"""
        if self.websocket and self.is_connected:
            await self.websocket.close()
            self.is_connected = False
            logger.info("已断开FunASR连接")
    
    def set_recognition_callback(self, callback: Callable):
        """设置识别结果回调函数"""
        self.recognition_callback = callback
        
    def set_error_callback(self, callback: Callable):
        """设置错误回调函数"""
        self.error_callback = callback
    
    async def start_recognition_session(self, session_name: str = "session"):
        """开始识别会话"""
        if not self.is_connected or not self.websocket:
            await self.connect()
            
        if not self.is_connected:
            return False
            
        try:
            # 处理热词
            hotword_msg = ""
            if self.hotwords.strip():
                # 如果是文件路径
                if self.hotwords.endswith('.txt') or '/' in self.hotwords:
                    try:
                        with open(self.hotwords, 'r', encoding='utf-8') as f:
                            hot_lines = f.readlines()
                            fst_dict = {}
                            for line in hot_lines:
                                words = line.strip().split(" ")
                                if len(words) >= 2:
                                    try:
                                        fst_dict[" ".join(words[:-1])] = int(words[-1])
                                    except ValueError:
                                        continue
                            hotword_msg = json.dumps(fst_dict)
                    except FileNotFoundError:
                        logger.warning(f"热词文件未找到: {self.hotwords}")
                else:
                    # 直接使用热词字符串
                    hotword_msg = self.hotwords
            
            # 发送初始配置消息
            config_message = json.dumps({
                "mode": self.mode,
                "chunk_size": self.chunk_size,
                "chunk_interval": self.chunk_interval,
                "wav_name": session_name,
                "is_speaking": True,
                "hotwords": hotword_msg,
                "itn": self.use_itn,
                "audio_fs": self.sample_rate
            })
            
            await self.websocket.send(config_message)
            logger.info(f"已启动识别会话: {session_name}")
            
            # 启动消息接收任务
            asyncio.create_task(self._message_receiver())
            
            return True
            
        except Exception as e:
            logger.error(f"启动识别会话失败: {e}")
            if self.error_callback:
                await self.error_callback(f"启动会话失败: {e}")
            return False
    
    async def send_audio_chunk(self, audio_data: bytes):
        """发送音频数据块"""
        if not self.is_connected or not self.websocket:
            logger.warning("未连接到FunASR服务器")
            return False
            
        try:
            await self.websocket.send(audio_data)
            return True
        except Exception as e:
            logger.error(f"发送音频数据失败: {e}")
            if self.error_callback:
                await self.error_callback(f"发送音频失败: {e}")
            return False
    
    async def end_audio_stream(self):
        """结束音频流"""
        if not self.is_connected or not self.websocket:
            return
            
        try:
            # 发送结束标志
            end_message = json.dumps({"is_speaking": False})
            await self.websocket.send(end_message)
            logger.info("音频流已结束")
        except Exception as e:
            logger.error(f"结束音频流失败: {e}")
    
    async def _message_receiver(self):
        """消息接收器"""
        try:
            while self.is_connected and self.websocket:
                message = await self.websocket.recv()
                await self._process_recognition_result(message)
                
        except websockets.exceptions.ConnectionClosed:
            logger.info("FunASR连接已关闭")
            self.is_connected = False
        except Exception as e:
            logger.error(f"接收消息失败: {e}")
            self.is_connected = False
            if self.error_callback:
                await self.error_callback(f"接收消息失败: {e}")
    
    async def _process_recognition_result(self, message: str):
        """处理识别结果"""
        try:
            result = json.loads(message)
            
            # 提取关键信息
            text = result.get("text", "")
            wav_name = result.get("wav_name", "")
            timestamp = result.get("timestamp", "")
            is_final = result.get("is_final", False)
            mode = result.get("mode", self.mode)
            
            # 打印FunASR原始结果到控制台
            if text.strip():  # 只打印非空文本结果
                print(f"📡 FunASR原始结果接收")
                print(f"   原始文本: {text}")
                print(f"   会话名称: {wav_name}")
                print(f"   时间戳: {timestamp if timestamp else '无'}")
                print(f"   识别模式: {mode}")
                print(f"   是否最终: {is_final}")
                print(f"   原始数据: {result}")
                print("=" * 50)
            
            # 构造结果对象
            recognition_result = {
                "text": text,
                "wav_name": wav_name,
                "timestamp": timestamp,
                "is_final": is_final,
                "mode": mode,
                "confidence": 0.9,  # FunASR可能不提供置信度，使用默认值
                "raw_result": result
            }
            
            # 调用回调函数
            if self.recognition_callback and text.strip():
                await self.recognition_callback(recognition_result)
                
        except json.JSONDecodeError as e:
            logger.error(f"解析识别结果JSON失败: {e}")
        except Exception as e:
            logger.error(f"处理识别结果失败: {e}")


class FunASRServiceManager:
    """FunASR服务管理器，支持多个并发会话"""
    
    def __init__(self):
        self.services: Dict[str, FunASRService] = {}
        
    async def create_service(self, 
                           session_id: str,
                           host: str = "localhost",
                           port: int = 10096,
                           **kwargs) -> FunASRService:
        """创建新的FunASR服务实例"""
        if session_id in self.services:
            await self.remove_service(session_id)
            
        service = FunASRService(host=host, port=port, **kwargs)
        self.services[session_id] = service
        
        return service
    
    async def get_service(self, session_id: str) -> Optional[FunASRService]:
        """获取服务实例"""
        return self.services.get(session_id)
    
    async def remove_service(self, session_id: str):
        """移除服务实例"""
        if session_id in self.services:
            service = self.services[session_id]
            await service.disconnect()
            del self.services[session_id]
            logger.info(f"已移除FunASR服务会话: {session_id}")
    
    async def cleanup_all(self):
        """清理所有服务实例"""
        for session_id in list(self.services.keys()):
            await self.remove_service(session_id)
        logger.info("已清理所有FunASR服务实例")
    
    def get_active_sessions(self) -> list:
        """获取活跃会话列表"""
        return list(self.services.keys())


# 全局服务管理器实例
funasr_manager = FunASRServiceManager()
