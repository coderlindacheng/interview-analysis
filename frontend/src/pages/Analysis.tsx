import { Card, Row, Col, Statistic, Progress, Table } from 'antd'
import { UserOutlined, FileTextOutlined, TrophyOutlined } from '@ant-design/icons'

const Analysis = () => {
  // 模拟数据
  const departmentData = [
    { department: '技术部', count: 45, passRate: 78 },
    { department: '产品部', count: 32, passRate: 85 },
    { department: '设计部', count: 28, passRate: 82 },
    { department: '运营部', count: 23, passRate: 70 },
  ]

  const positionData = [
    { position: '前端工程师', count: 25, avgScore: 82 },
    { position: '后端工程师', count: 20, avgScore: 85 },
    { position: '产品经理', count: 15, avgScore: 78 },
    { position: 'UI设计师', count: 18, avgScore: 88 },
  ]

  const columns = [
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: '面试人数',
      dataIndex: 'count',
      key: 'count',
    },
    {
      title: '通过率',
      dataIndex: 'passRate',
      key: 'passRate',
      render: (rate: number) => (
        <Progress percent={rate} size="small" />
      ),
    },
  ]

  const positionColumns = [
    {
      title: '职位',
      dataIndex: 'position',
      key: 'position',
    },
    {
      title: '面试人数',
      dataIndex: 'count',
      key: 'count',
    },
    {
      title: '平均分',
      dataIndex: 'avgScore',
      key: 'avgScore',
      render: (score: number) => (
        <span style={{ color: score >= 80 ? '#52c41a' : score >= 70 ? '#faad14' : '#ff4d4f' }}>
          {score}/100
        </span>
      ),
    },
  ]

  return (
    <div>
      <h1>数据分析</h1>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总面试数"
              value={128}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="通过率"
              value={78.9}
              prefix={<TrophyOutlined />}
              suffix="%"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均分"
              value={82.3}
              suffix="/100"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月新增"
              value={23}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="各部门统计" bordered={false}>
            <Table
              columns={columns}
              dataSource={departmentData}
              rowKey="department"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="职位统计" bordered={false}>
            <Table
              columns={positionColumns}
              dataSource={positionData}
              rowKey="position"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Analysis
