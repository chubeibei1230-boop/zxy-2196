import { ref, computed, watch } from 'vue'
import { generateId, DAYS_OF_WEEK, MEAL_TYPES } from './constants.js'

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
    weekPlan.value[key].push(newDish)
    return newDish
  }

  const updateDish = (dishId, dishData) => {
    for (let day = 0; day < 7; day++) {
      for (const meal of MEAL_TYPES) {
        const key = `${day}_${meal.value}`
        const dishes = weekPlan.value[key]
        if (dishes) {
          const idx = dishes.findIndex(d => d.id === dishId)
          if (idx !== -1) {
            dishes[idx] = { ...dishes[idx], ...dishData }
            return dishes[idx]
          }
        }
      }
    }
    return null
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
    exportIngredientsCSV
  }
}
