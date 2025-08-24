import { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, DatePicker, Select, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

interface InterviewData {
  id: number
  candidateName: string
  position: string
  department: string
  interviewer: string
  date: string
  status: string
  score: number
}

const { Option } = Select

const Interviews = () => {
  const [data, setData] = useState<InterviewData[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState<InterviewData | null>(null)
  const [form] = Form.useForm()

  const columns: ColumnsType<InterviewData> = [
    {
      title: '候选人',
      dataIndex: 'candidateName',
      key: 'candidateName',
    },
    {
      title: '职位',
      dataIndex: 'position',
      key: 'position',
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: '面试官',
      dataIndex: 'interviewer',
      key: 'interviewer',
    },
    {
      title: '面试日期',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <span style={{
          color: status === '通过' ? '#52c41a' : status === '待定' ? '#faad14' : '#ff4d4f'
        }}>
          {status}
        </span>
      ),
    },
    {
      title: '评分',
      dataIndex: 'score',
      key: 'score',
      render: (score: number) => `${score}/100`,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ]

  const fetchData = async () => {
    setLoading(true)
    try {
      // 这里调用后端API获取数据
      // const response = await axios.get('/api/interviews')
      // setData(response.data)

      // 暂时使用模拟数据
      const mockData: InterviewData[] = [
        {
          id: 1,
          candidateName: '张三',
          position: '前端工程师',
          department: '技术部',
          interviewer: '李经理',
          date: '2024-01-15',
          status: '通过',
          score: 85,
        },
        {
          id: 2,
          candidateName: '李四',
          position: '后端工程师',
          department: '技术部',
          interviewer: '王总监',
          date: '2024-01-16',
          status: '待定',
          score: 78,
        },
      ]
      setData(mockData)
    } catch (error) {
      message.error('获取数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAdd = () => {
    setEditingRecord(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (record: InterviewData) => {
    setEditingRecord(record)
    form.setFieldsValue(record)
    setIsModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      // 本地更新列表，保证参数被实际使用
      setData(prev => prev.filter(item => item.id !== id))
      message.success('删除成功')
      // 真实项目中可改为调用后端并再刷新
      // fetchData()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()
      if (editingRecord) {
        // 本地更新，演示使用表单值
        setData(prev => prev.map(item => {
          if (item.id !== (editingRecord as InterviewData).id) return item
          const formattedDate = values.date?.format ? values.date.format('YYYY-MM-DD') : values.date
          return {
            ...item,
            ...values,
            date: formattedDate ?? item.date,
            score: Number(values.score ?? item.score),
          }
        }))
        message.success('更新成功')
      } else {
        // 本地新增，演示使用表单值
        const newId = data.length ? Math.max(...data.map(d => d.id)) + 1 : 1
        const formattedDate = values.date?.format ? values.date.format('YYYY-MM-DD') : values.date
        const newItem: InterviewData = {
          id: newId,
          candidateName: values.candidateName,
          position: values.position,
          department: values.department,
          interviewer: values.interviewer,
          date: formattedDate ?? '',
          status: values.status,
          score: Number(values.score ?? 0),
        }
        setData(prev => [...prev, newItem])
        message.success('添加成功')
      }
      setIsModalVisible(false)
      // 真实项目中可改为刷新后端数据
      // fetchData()
    } catch (error) {
      message.error('操作失败')
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增面试记录
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
      />

      <Modal
        title={editingRecord ? '编辑面试记录' : '新增面试记录'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="candidateName"
            label="候选人姓名"
            rules={[{ required: true, message: '请输入候选人姓名' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="position"
            label="应聘职位"
            rules={[{ required: true, message: '请输入应聘职位' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="department"
            label="应聘部门"
            rules={[{ required: true, message: '请输入应聘部门' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="interviewer"
            label="面试官"
            rules={[{ required: true, message: '请输入面试官姓名' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="date"
            label="面试日期"
            rules={[{ required: true, message: '请选择面试日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="status"
            label="面试结果"
            rules={[{ required: true, message: '请选择面试结果' }]}
          >
            <Select>
              <Option value="通过">通过</Option>
              <Option value="待定">待定</Option>
              <Option value="拒绝">拒绝</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="score"
            label="评分"
            rules={[{ required: true, message: '请输入评分' }]}
          >
            <Input type="number" min={0} max={100} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Interviews
