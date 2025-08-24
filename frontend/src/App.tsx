import { useState } from 'react'
import { Layout, Menu, Button, Typography } from 'antd'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import {
  BarChartOutlined,
  SettingOutlined,
  AudioOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined
} from '@ant-design/icons'
import Analysis from './pages/Analysis'
import Settings from './pages/Settings'
import VoiceAnalysis from './pages/VoiceAnalysis'
import './App.css'

const { Header, Content, Sider } = Layout
const { Title } = Typography

const menuItems = [
  {
    key: '/voice-analysis',
    icon: <AudioOutlined />,
    label: <Link to="/voice-analysis">实时语音分析</Link>,
  },
  {
    key: '/analysis',
    icon: <BarChartOutlined />,
    label: <Link to="/analysis">数据分析</Link>,
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: <Link to="/settings">设置</Link>,
  },
]

function App() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  // 获取当前页面标题
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/voice-analysis':
        return '实时语音分析'
      case '/analysis':
        return '数据分析'
      case '/settings':
        return '设置'
      default:
        return '实时语音分析'
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        width={250}
        collapsedWidth={80}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div className="logo">
          <h2>
            {collapsed ? '面试' : '面试分析系统'}
          </h2>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ border: 'none' }}
        />
      </Sider>
      
      <Layout style={{ marginLeft: collapsed ? 80 : 250, transition: 'margin-left 0.2s' }}>
        <Header className="main-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{ marginRight: 16 }}
              />
              <Title level={4} style={{ margin: 0, color: '#001529' }}>
                {getPageTitle()}
              </Title>
            </div>
            <div style={{ color: '#666' }}>
              欢迎使用面试分析系统
            </div>
          </div>
        </Header>
        
        <Content 
          style={{ 
            margin: '24px 24px 0',
            overflow: 'initial',
            minHeight: 'calc(100vh - 112px)'
          }}
        >
          <div className="main-content" style={{ padding: 24 }}>
            <Routes>
              <Route path="/" element={<VoiceAnalysis />} />
              <Route path="/voice-analysis" element={<VoiceAnalysis />} />
              <Route path="/analysis" element={<Analysis />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default App
