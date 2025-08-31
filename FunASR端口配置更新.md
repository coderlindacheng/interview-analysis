# FunASR端口配置更新

## 📝 更新说明

**更新时间**: 2024-08-31  
**更新内容**: 将FunASR服务端口从 `10095` 更新为 `10096`

## 🔧 修改的文件

### 1. backend/config.py
```python
# FunASR配置
funasr_host: str = "localhost"
funasr_port: int = 10096  # 已更新
funasr_use_ssl: bool = False
```

### 2. backend/routers/websocket_voice.py
```python
service = await funasr_manager.create_service(
    session_id=client_id,
    host="localhost",
    port=10096,  # 已更新
    use_ssl=False,
    mode="2pass"
)
```

### 3. backend/services/funasr_service.py
```python
def __init__(self, 
             host: str = "localhost", 
             port: int = 10096,  # 已更新
             use_ssl: bool = True,
             # ...
)

async def create_service(self, 
                       session_id: str,
                       host: str = "localhost",
                       port: int = 10096,  # 已更新
                       **kwargs) -> FunASRService:
```

## ✅ 验证结果

- ✅ **配置文件**: `localhost:10096`
- ✅ **模块导入**: 所有模块正常导入
- ✅ **无端口冲突**: 已移除所有 `10095` 引用
- ✅ **代码一致性**: 所有FunASR配置统一使用 `10096`

## 🚀 生效情况

由于后端服务支持热重载，配置更改将在下次连接FunASR服务时自动生效。

## 📋 注意事项

1. **FunASR服务**: 确保FunASR服务运行在端口 `10096`
2. **防火墙**: 如需要，请开放端口 `10096`
3. **网络配置**: 确保应用能够访问 `localhost:10096`

## 🔗 相关文件

- `/backend/config.py` - 主配置文件
- `/backend/routers/websocket_voice.py` - WebSocket路由
- `/backend/services/funasr_service.py` - FunASR服务封装
