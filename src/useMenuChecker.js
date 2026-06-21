import { computed } from 'vue'
import { DAYS_OF_WEEK, MEAL_TYPES, getTasteLabel, getProteinLabel, getStatusLabel } from './constants.js'
import { useMenuStore } from './useMenuStore.js'

export function useMenuChecker() {
  const { getDayDishes, settings } = useMenuStore()

  const checkDay = (day) => {
    const allDishes = getDayDishes(day)
    const activeDishes = allDishes.filter(dish => dish.status !== 'canceled')
    const warnings = []

    const tasteCount = {}
    const proteinSources = new Set()
    let totalPrepTime = 0
    let minServings = Infinity
    let hasEmptyIngredients = false

    activeDishes.forEach(dish => {
      if (dish.taste) {
        tasteCount[dish.taste] = (tasteCount[dish.taste] || 0) + 1
      }

      if (dish.proteinSource) {
        proteinSources.add(dish.proteinSource)
      }

      if (dish.prepTime) {
        totalPrepTime += parseInt(dish.prepTime) || 0
      }

      if (dish.servings !== undefined && dish.servings !== null) {
        minServings = Math.min(minServings, parseInt(dish.servings) || 0)
      }

      if (!dish.ingredients || dish.ingredients.length === 0) {
        hasEmptyIngredients = true
      }
    })

    const maxSameTaste = settings.value.maxSameTastePerDay || 2
    for (const [taste, count] of Object.entries(tasteCount)) {
      if (count > maxSameTaste) {
        warnings.push({
          type: 'taste_repeat',
          severity: 'warning',
          message: `${getTasteLabel(taste)}口味菜品过多（${count}道），建议口味多样化`
        })
      }
    }

    const minProtein = settings.value.minProteinSourcesPerDay || 2
    if (activeDishes.length > 0 && proteinSources.size < minProtein) {
      warnings.push({
        type: 'protein_insufficient',
        severity: 'error',
        message: `蛋白来源不足（${proteinSources.size}种），建议至少${minProtein}种`
      })
    }

    const isWeekend = day >= 5
    const availableTime = isWeekend 
      ? (settings.value.availablePrepTime?.weekend || 120)
      : (settings.value.availablePrepTime?.weekday || 60)
    
    if (activeDishes.length > 0 && totalPrepTime > availableTime) {
      warnings.push({
        type: 'prep_time_exceed',
        severity: 'error',
        message: `准备时长超出可用时间（${totalPrepTime}分钟 > ${availableTime}分钟）`
      })
    }

    const familySize = settings.value.familySize || 3
    if (activeDishes.length > 0 && minServings < familySize) {
      warnings.push({
        type: 'servings_insufficient',
        severity: 'error',
        message: `部分菜品份数低于家庭人数（最少${minServings}份 < ${familySize}人）`
      })
    }

    if (hasEmptyIngredients) {
      warnings.push({
        type: 'empty_ingredients',
        severity: 'warning',
        message: '存在未填写主料的菜品'
      })
    }

    return warnings
  }

  const allWarnings = computed(() => {
    const result = {}
    for (let day = 0; day < 7; day++) {
      result[day] = checkDay(day)
    }
    return result
  })

  const hasAnyWarning = computed(() => {
    for (let day = 0; day < 7; day++) {
      if (allWarnings.value[day].length > 0) return true
    }
    return false
  })

  const getDayWarnings = (day) => {
    return allWarnings.value[day] || []
  }

  return {
    allWarnings,
    hasAnyWarning,
    checkDay,
    getDayWarnings
  }
}
