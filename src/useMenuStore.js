import { ref, computed, watch } from 'vue'
import { generateId, DAYS_OF_WEEK, MEAL_TYPES, getMealLabel } from './constants.js'

const STORAGE_KEY = 'family-menu-planner-data'
const SETTINGS_KEY = 'family-menu-planner-settings'

const defaultSettings = {
  familySize: 3,
  availablePrepTime: {
    weekday: 60,
    weekend: 120
  },
  minProteinSourcesPerDay: 2,
  maxSameTastePerDay: 2
}

function loadFromStorage(key, defaultValue) {
  try {
    const stored = localStorage.getItem(key)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load from localStorage:', e)
  }
  return defaultValue
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('Failed to save to localStorage:', e)
  }
}

const weekPlan = ref(loadFromStorage(STORAGE_KEY, {}))
const settings = ref(loadFromStorage(SETTINGS_KEY, defaultSettings))
const selectedDishes = ref([])
const filters = ref({
  mealType: '',
  taste: '',
  prepTime: '',
  proteinSource: '',
  status: ''
})

watch(weekPlan, (val) => {
  saveToStorage(STORAGE_KEY, val)
}, { deep: true })

watch(settings, (val) => {
  saveToStorage(SETTINGS_KEY, val)
}, { deep: true })

export function useMenuStore() {
  const getAllDishes = computed(() => {
    const dishes = []
    for (let day = 0; day < 7; day++) {
      for (const meal of MEAL_TYPES) {
        const key = `${day}_${meal.value}`
        const dayDishes = weekPlan.value[key] || []
        dayDishes.forEach(dish => {
          dishes.push({ ...dish, day, mealType: meal.value })
        })
      }
    }
    return dishes
  })

  const getDishesByDayAndMeal = (day, mealType) => {
    const key = `${day}_${mealType}`
    const dishes = weekPlan.value[key] || []
    return dishes.map(dish => ({ ...dish, day, mealType }))
  }

  const addDish = (day, mealType, dishData) => {
    const key = `${day}_${mealType}`
    if (!weekPlan.value[key]) {
      weekPlan.value[key] = []
    }
    const newDish = {
      id: generateId(),
      ...dishData,
      status: dishData.status || 'pending'
    }
    newDish.prepTasks = generateDefaultPrepTasks(newDish)
    weekPlan.value[key].push(newDish)
    return newDish
  }

  const updateDish = (dishId, dishData) => {
    let oldDay = -1
    let oldMeal = null
    let originalDish = null

    for (let day = 0; day < 7; day++) {
      for (const meal of MEAL_TYPES) {
        const key = `${day}_${meal.value}`
        const dishes = weekPlan.value[key]
        if (dishes) {
          const idx = dishes.findIndex(d => d.id === dishId)
          if (idx !== -1) {
            oldDay = day
            oldMeal = meal.value
            originalDish = dishes[idx]
            break
          }
        }
      }
      if (originalDish) break
    }

    if (!originalDish) return null

    const newDay = dishData.day !== undefined ? dishData.day : oldDay
    const newMeal = dishData.mealType || oldMeal

    const updatedDish = { ...originalDish, ...dishData }
    delete updatedDish.day
    delete updatedDish.mealType

    if (newDay === oldDay && newMeal === oldMeal) {
      const oldKey = `${oldDay}_${oldMeal}`
      const dishes = weekPlan.value[oldKey]
      const idx = dishes.findIndex(d => d.id === dishId)
      dishes[idx] = updatedDish
      return { ...updatedDish, day: newDay, mealType: newMeal }
    }

    const oldKey = `${oldDay}_${oldMeal}`
    const oldDishes = weekPlan.value[oldKey]
    const idx = oldDishes.findIndex(d => d.id === dishId)
    oldDishes.splice(idx, 1)

    const newKey = `${newDay}_${newMeal}`
    if (!weekPlan.value[newKey]) {
      weekPlan.value[newKey] = []
    }
    weekPlan.value[newKey].push(updatedDish)

    return { ...updatedDish, day: newDay, mealType: newMeal }
  }

  const deleteDish = (dishId) => {
    for (let day = 0; day < 7; day++) {
      for (const meal of MEAL_TYPES) {
        const key = `${day}_${meal.value}`
        const dishes = weekPlan.value[key]
        if (dishes) {
          const idx = dishes.findIndex(d => d.id === dishId)
          if (idx !== -1) {
            dishes.splice(idx, 1)
            return true
          }
        }
      }
    }
    return false
  }

  const copyDish = (dishId, targetDay, targetMeal) => {
    const sourceDish = getAllDishes.value.find(d => d.id === dishId)
    if (!sourceDish) return null
    
    const { id, day, mealType, ...dishData } = sourceDish
    return addDish(targetDay, targetMeal, { ...dishData })
  }

  const bulkUpdateStatus = (dishIds, status) => {
    dishIds.forEach(id => {
      updateDish(id, { status })
    })
  }

  const toggleSelect = (dishId) => {
    const idx = selectedDishes.value.indexOf(dishId)
    if (idx === -1) {
      selectedDishes.value.push(dishId)
    } else {
      selectedDishes.value.splice(idx, 1)
    }
  }

  const clearSelection = () => {
    selectedDishes.value = []
  }

  const selectAll = () => {
    selectedDishes.value = getAllDishes.value
      .filter(d => matchesFilters(d))
      .map(d => d.id)
  }

  const matchesFilters = (dish) => {
    if (filters.value.mealType && dish.mealType !== filters.value.mealType) return false
    if (filters.value.taste && dish.taste !== filters.value.taste) return false
    if (filters.value.proteinSource && dish.proteinSource !== filters.value.proteinSource) return false
    if (filters.value.status && dish.status !== filters.value.status) return false
    if (filters.value.prepTime) {
      const time = parseInt(dish.prepTime) || 0
      switch (filters.value.prepTime) {
        case 'fast': if (time > 20) return false; break
        case 'medium': if (time <= 20 || time > 45) return false; break
        case 'slow': if (time <= 45) return false; break
      }
    }
    return true
  }

  const filteredDishes = computed(() => {
    return getAllDishes.value.filter(d => matchesFilters(d))
  })

  const setFilter = (key, value) => {
    filters.value[key] = value
  }

  const resetFilters = () => {
    filters.value = {
      mealType: '',
      taste: '',
      prepTime: '',
      proteinSource: '',
      status: ''
    }
  }

  const getDayDishes = (day) => {
    const dishes = []
    for (const meal of MEAL_TYPES) {
      const key = `${day}_${meal.value}`
      const dayDishes = weekPlan.value[key] || []
      dayDishes.forEach(dish => {
        dishes.push({ ...dish, day, mealType: meal.value })
      })
    }
    return dishes
  }

  const exportToCSV = () => {
    const headers = ['日期', '餐次', '菜名', '主料', '蛋白来源', '口味', '份数', '准备时长(分钟)', '热量(千卡)', '状态']
    const rows = getAllDishes.value.map(dish => [
      DAYS_OF_WEEK.find(d => d.value === dish.day)?.label || '',
      MEAL_TYPES.find(m => m.value === dish.mealType)?.label || '',
      dish.name || '',
      (dish.ingredients || []).map(i => `${i.name}${i.amount ? '(' + i.amount + ')' : ''}`).join('; '),
      dish.proteinSource || '',
      dish.taste || '',
      dish.servings || '',
      dish.prepTime || '',
      dish.calories || '',
      dish.status || ''
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `一周菜谱_${new Date().toLocaleDateString()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportIngredientsCSV = (ingredientsList) => {
    const headers = ['主料名称', '总需求量', '单位', '状态']
    const rows = ingredientsList.map(item => [
      item.name,
      item.totalAmount,
      item.unit || '',
      item.warning || '正常'
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `采购清单_${new Date().toLocaleDateString()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const generateDefaultPrepTasks = (dish) => {
    const tasks = []
    const dishPrepTime = parseInt(dish.prepTime) || 30
    const dishName = dish.name || '菜品'

    tasks.push({
      id: generateId(),
      title: '采购' + dishName + '所需主料',
      type: 'advance',
      status: 'todo',
      note: '',
      estimatedMinutes: Math.round(dishPrepTime * 0.3)
    })

    tasks.push({
      id: generateId(),
      title: dishName + '预处理（洗菜/切配）',
      type: 'dayOf',
      status: 'todo',
      note: '',
      estimatedMinutes: Math.round(dishPrepTime * 0.4)
    })

    tasks.push({
      id: generateId(),
      title: '烹饪' + dishName,
      type: 'dayOf',
      status: 'todo',
      note: '',
      estimatedMinutes: Math.round(dishPrepTime * 0.3)
    })

    return tasks
  }

  const ensurePrepTasksForDish = (dishId) => {
    for (let day = 0; day < 7; day++) {
      for (const meal of MEAL_TYPES) {
        const key = day + '_' + meal.value
        const dishes = weekPlan.value[key]
        if (dishes) {
          const dish = dishes.find(d => d.id === dishId)
          if (dish) {
            if (!dish.prepTasks || !Array.isArray(dish.prepTasks) || dish.prepTasks.length === 0) {
              dish.prepTasks = generateDefaultPrepTasks(dish)
            }
            return dish.prepTasks
          }
        }
      }
    }
    return []
  }

  const getDishPrepTasks = (dishId) => {
    return ensurePrepTasksForDish(dishId)
  }

  const addPrepTask = (dishId, taskData) => {
    for (let day = 0; day < 7; day++) {
      for (const meal of MEAL_TYPES) {
        const key = day + '_' + meal.value
        const dishes = weekPlan.value[key]
        if (dishes) {
          const dish = dishes.find(d => d.id === dishId)
          if (dish) {
            ensurePrepTasksForDish(dishId)
            const newTask = {
              id: generateId(),
              title: taskData.title || '新任务',
              type: taskData.type || 'dayOf',
              status: taskData.status || 'todo',
              note: taskData.note || '',
              estimatedMinutes: taskData.estimatedMinutes || 10
            }
            dish.prepTasks.push(newTask)
            return newTask
          }
        }
      }
    }
    return null
  }

  const updateDishStatusByPrepTasks = (dish) => {
    if (!dish.prepTasks || dish.prepTasks.length === 0) return
    const allDone = dish.prepTasks.every(t => t.status === 'done')
    const hasTodo = dish.prepTasks.some(t => t.status === 'todo')
    if (allDone) {
      dish.status = 'ready'
    } else if (hasTodo) {
      dish.status = 'pending'
    }
  }

  const updatePrepTask = (dishId, taskId, taskData) => {
    for (let day = 0; day < 7; day++) {
      for (const meal of MEAL_TYPES) {
        const key = day + '_' + meal.value
        const dishes = weekPlan.value[key]
        if (dishes) {
          const dish = dishes.find(d => d.id === dishId)
          if (dish && dish.prepTasks) {
            const taskIndex = dish.prepTasks.findIndex(t => t.id === taskId)
            if (taskIndex !== -1) {
              dish.prepTasks[taskIndex] = { ...dish.prepTasks[taskIndex], ...taskData }
              updateDishStatusByPrepTasks(dish)
              return dish.prepTasks[taskIndex]
            }
          }
        }
      }
    }
    return null
  }

  const deletePrepTask = (dishId, taskId) => {
    for (let day = 0; day < 7; day++) {
      for (const meal of MEAL_TYPES) {
        const key = day + '_' + meal.value
        const dishes = weekPlan.value[key]
        if (dishes) {
          const dish = dishes.find(d => d.id === dishId)
          if (dish && dish.prepTasks) {
            const idx = dish.prepTasks.findIndex(t => t.id === taskId)
            if (idx !== -1) {
              dish.prepTasks.splice(idx, 1)
              return true
            }
          }
        }
      }
    }
    return false
  }

  const getDayPrepTasks = (day) => {
    const dayDishes = getDayDishes(day)
    const tasks = []
    dayDishes.forEach(dish => {
      const dishTasks = getDishPrepTasks(dish.id)
      dishTasks.forEach(task => {
        tasks.push({
          ...task,
          dishId: dish.id,
          dishName: dish.name,
          mealType: dish.mealType,
          day: day
        })
      })
    })
    return tasks
  }

  const getAllPrepTasks = computed(() => {
    const allTasks = []
    for (let day = 0; day < 7; day++) {
      const dayTasks = getDayPrepTasks(day)
      allTasks.push(...dayTasks)
    }
    return allTasks
  })

  const getDayPrepStats = (day) => {
    const dayTasks = getDayPrepTasks(day)
    const totalMinutes = dayTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0)
    const todoCount = dayTasks.filter(t => t.status === 'todo').length
    const doneCount = dayTasks.filter(t => t.status === 'done').length
    const postponedCount = dayTasks.filter(t => t.status === 'postponed').length
    const isWeekend = day >= 5
    const availableTime = isWeekend ? settings.value.availablePrepTime.weekend : settings.value.availablePrepTime.weekday
    const isOverTime = totalMinutes > availableTime

    return {
      totalMinutes,
      todoCount,
      doneCount,
      postponedCount,
      totalCount: dayTasks.length,
      availableTime,
      isOverTime
    }
  }

  const initAllPrepTasks = () => {
    const dishes = getAllDishes.value
    dishes.forEach(dish => {
      ensurePrepTasksForDish(dish.id)
    })
  }

  const exportMealPrepCSV = () => {
    const headers = ['日期', '餐次', '菜品', '任务名称', '任务类型', '状态', '预估时长(分钟)', '备注']
    const rows = []

    for (let day = 0; day < 7; day++) {
      const dayTasks = getDayPrepTasks(day)
      const dayLabel = DAYS_OF_WEEK.find(d => d.value === day)?.label || ''
      dayTasks.forEach(task => {
        rows.push([
          dayLabel,
          getMealLabel(task.mealType),
          task.dishName || '',
          task.title || '',
          task.type === 'advance' ? '提前准备' : '当天处理',
          task.status === 'todo' ? '待处理' : task.status === 'done' ? '已完成' : '暂缓',
          task.estimatedMinutes || '',
          task.note || ''
        ])
      })
    }

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(','))
      .join('\n')

    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '本周备餐计划_' + new Date().toLocaleDateString() + '.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return {
    weekPlan,
    settings,
    selectedDishes,
    filters,
    getAllDishes,
    filteredDishes,
    getDishesByDayAndMeal,
    getDayDishes,
    addDish,
    updateDish,
    deleteDish,
    copyDish,
    bulkUpdateStatus,
    toggleSelect,
    clearSelection,
    selectAll,
    matchesFilters,
    setFilter,
    resetFilters,
    exportToCSV,
    exportIngredientsCSV,
    getDishPrepTasks,
    addPrepTask,
    updatePrepTask,
    deletePrepTask,
    getDayPrepTasks,
    getAllPrepTasks,
    getDayPrepStats,
    initAllPrepTasks,
    exportMealPrepCSV,
    ensurePrepTasksForDish
  }
}
