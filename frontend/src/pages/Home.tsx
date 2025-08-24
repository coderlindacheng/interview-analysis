import { Card, Row, Col, Statistic, Progress } from 'antd'
import { UserOutlined, FileTextOutlined, BarChartOutlined } from '@ant-design/icons'

const Home = () => {
  return (
    <div>
      <h1>欢迎使用面试分析系统</h1>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="总面试数"
              value={1128}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="本月面试数"
              value={89}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="分析完成率"
              value={94.2}
              prefix={<BarChartOutlined />}
              suffix="%"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="面试进度" bordered={false}>
            <Progress percent={75} status="active" />
            <p style={{ marginTop: 16 }}>本月面试进度：75%</p>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="系统状态" bordered={false}>
            <p>✅ 后端服务正常</p>
            <p>✅ 数据库连接正常</p>
            <p>✅ 数据分析服务正常</p>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Home
