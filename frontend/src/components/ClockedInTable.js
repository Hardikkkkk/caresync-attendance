import { Table, Button } from 'antd';

function ClockedInTable({ data, onViewHistory }) {
  const columns = [
    {
      title: 'Staff Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button type="link" onClick={() => onViewHistory(record.id)}>
          View History
        </Button>
      ),
    },
  ];

  return <Table dataSource={data} columns={columns} rowKey="id" pagination={false} />;
}

export default ClockedInTable;
