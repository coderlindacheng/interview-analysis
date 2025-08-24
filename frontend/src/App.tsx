import { Layout, Menu } from 'antd'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import {
  HomeOutlined,
  FileTextOutlined,
  BarChartOutlined,
  SettingOutlined
} from '@ant-design/icons'
import Home from './pages/Home'
import Interviews from './pages/Interviews'
import Analysis from './pages/Analysis'
import Settings from './pages/Settings'
import './App.css'

const { Header, Content, Sider } = Layout

const menuItems = [
  {
    key: '/',
    icon: <HomeOutlined />,
    label: <Link to="/">首页</Link>,
  },
  {
    key: '/interviews',
    icon: <FileTextOutlined />,
    label: <Link to="/interviews">面试记录</Link>,
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
  const location = useLocation()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible>
        <div className="logo">
          <h2 style={{ color: 'white', textAlign: 'center', margin: '16px 0' }}>
            面试分析系统
          </h2>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: '#fff' }} />
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/interviews" element={<Interviews />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

export default App
