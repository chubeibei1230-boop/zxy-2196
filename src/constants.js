export const MEAL_TYPES = [
  { value: 'breakfast', label: '早餐' },
  { value: 'lunch', label: '午餐' },
  { value: 'dinner', label: '晚餐' }
]

export const TASTE_TYPES = [
  { value: 'light', label: '清淡', color: '#67c23a' },
  { value: 'spicy', label: '辛辣', color: '#f56c6c' },
  { value: 'sweet', label: '甜口', color: '#e6a23c' },
  { value: 'sour', label: '酸口', color: '#909399' },
  { value: 'salty', label: '咸鲜', color: '#409eff' },
  { value: 'umami', label: '鲜香', color: '#8e44ad' }
]

export const PROTEIN_SOURCES = [
  { value: 'pork', label: '猪肉' },
  { value: 'beef', label: '牛肉' },
  { value: 'chicken', label: '鸡肉' },
  { value: 'fish', label: '鱼肉' },
  { value: 'seafood', label: '海鲜' },
  { value: 'egg', label: '蛋类' },
  { value: 'bean', label: '豆制品' },
  { value: 'dairy', label: '乳制品' }
]

export const DISH_STATUSES = [
  { value: 'pending', label: '待准备', color: '#e6a23c' },
  { value: 'ready', label: '已准备', color: '#67c23a' },
  { value: 'replace', label: '需替换', color: '#f56c6c' },
  { value: 'canceled', label: '临时取消', color: '#909399' }
]

export const PREP_TASK_TYPES = [
  { value: 'advance', label: '提前准备', color: '#409eff' },
  { value: 'dayOf', label: '当天处理', color: '#e6a23c' }
]

export const PREP_TASK_STATUSES = [
  { value: 'todo', label: '待处理', color: '#909399' },
  { value: 'done', label: '已完成', color: '#67c23a' },
  { value: 'postponed', label: '暂缓', color: '#e6a23c' }
]

export const getPrepTypeLabel = (value) => {
  const item = PREP_TASK_TYPES.find(t => t.value === value)
  return item ? item.label : value
}

export const getPrepTypeColor = (value) => {
  const item = PREP_TASK_TYPES.find(t => t.value === value)
  return item ? item.color : '#999'
}

export const getPrepStatusLabel = (value) => {
  const item = PREP_TASK_STATUSES.find(s => s.value === value)
  return item ? item.label : value
}

export const getPrepStatusColor = (value) => {
  const item = PREP_TASK_STATUSES.find(s => s.value === value)
  return item ? item.color : '#999'
}

export const DAYS_OF_WEEK = [
  { value: 0, label: '周一' },
  { value: 1, label: '周二' },
  { value: 2, label: '周三' },
  { value: 3, label: '周四' },
  { value: 4, label: '周五' },
  { value: 5, label: '周六' },
  { value: 6, label: '周日' }
]

export const getTasteLabel = (value) => {
  const item = TASTE_TYPES.find(t => t.value === value)
  return item ? item.label : value
}

export const getTasteColor = (value) => {
  const item = TASTE_TYPES.find(t => t.value === value)
  return item ? item.color : '#999'
}

export const getProteinLabel = (value) => {
  const item = PROTEIN_SOURCES.find(p => p.value === value)
  return item ? item.label : value
}

export const getStatusLabel = (value) => {
  const item = DISH_STATUSES.find(s => s.value === value)
  return item ? item.label : value
}

export const getStatusColor = (value) => {
  const item = DISH_STATUSES.find(s => s.value === value)
  return item ? item.color : '#999'
}

export const getMealLabel = (value) => {
  const item = MEAL_TYPES.find(m => m.value === value)
  return item ? item.label : value
}

export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}
