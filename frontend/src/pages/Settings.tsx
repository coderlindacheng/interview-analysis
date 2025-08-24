import { Card, Form, Input, Button, Switch, Divider, message } from 'antd'

const Settings = () => {
  const [form] = Form.useForm()

  const handleSave = async (values: any) => {
    try {
      // 这里可以调用后端API保存设置
      console.log('Settings saved:', values)
      message.success('设置保存成功')
    } catch (error) {
      message.error('设置保存失败')
    }
  }

  return (
    <div>
      <h1>系统设置</h1>

      <Card title="基本设置" style={{ marginBottom: 24 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            systemName: '面试分析系统',
            enableNotifications: true,
            enableAutoBackup: true,
            backupFrequency: 'daily',
          }}
        >
          <Form.Item
            label="系统名称"
            name="systemName"
            rules={[{ required: true, message: '请输入系统名称' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="启用通知" name="enableNotifications" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item label="启用自动备份" name="enableAutoBackup" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item label="备份频率" name="backupFrequency">
            <Input placeholder="daily/weekly/monthly" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              保存设置
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="API配置">
        <Form layout="vertical">
          <Form.Item label="后端API地址">
            <Input defaultValue="http://localhost:8000" />
          </Form.Item>

          <Form.Item label="超时时间（秒）">
            <Input type="number" defaultValue={30} />
          </Form.Item>

          <Form.Item>
            <Button type="primary">
              测试连接
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Divider />

      <Card title="系统信息">
        <p><strong>版本：</strong>1.0.0</p>
        <p><strong>前端框架：</strong>React 18 + TypeScript + Vite</p>
        <p><strong>UI库：</strong>Ant Design 5.12.8</p>
        <p><strong>后端框架：</strong>FastAPI</p>
        <p><strong>数据库：</strong>SQLite</p>
      </Card>
    </div>
  )
}

export default Settings
