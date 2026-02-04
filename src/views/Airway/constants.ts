export const AIRWAY_OPTIONS = [
  {
    title: '航点飞行',
    disabled: false
  },
  {
    title: '线状巡视',
    disabled: true
  },
  {
    title: '全景采集',
    disabled: true
  }
]

export const ACTION_COLUMNS = [
  {
    width: 80,
    title: '序号',
    align: 'center',
    dataIndex: 'actOrder'
  },
  {
    width: 150,
    title: '动作类型',
    align: 'center',
    dataIndex: 'actModeName'
  },
  {
    title: '动作值',
    ellipsis: true,
    align: 'center',
    dataIndex: 'actValue'
  }
]
