import { computed, ref } from 'vue'
import { MEAL_TYPES, TASTE_TYPES, PROTEIN_SOURCES } from './constants.js'
import { useMenuStore } from './useMenuStore.js'
import { useDishTemplates } from './useDishTemplates.js'
import { useShoppingList } from './useShoppingList.js'
import { useMenuChecker } from './useMenuChecker.js'

const lastAddedAt = ref(0)

export function useWeeklyRecommend() {
  const { getAllDishes, getDayDishes, getDishesByDayAndMeal, settings } = useMenuStore()
  const { templates, isTemplateComplete, getTemplateCompletionInfo } = useDishTemplates()
  const { shoppingList } = useShoppingList()
  const { getDayWarnings } = useMenuChecker()

  const shoppingIngredientMap = computed(() => {
    const map = {}
    shoppingList.value.forEach(item => {
      const key = (item.name || '').trim().toLowerCase()
      if (key) {
        map[key] = {
          dishCount: item.dishCount || 0,
          severity: item.severity || 'normal',
          warning: item.warning || ''
        }
      }
    })
    return map
  })

  const weekIngredientSet = computed(() => {
    const names = new Set()
    getAllDishes.value.forEach(dish => {
      if (dish.status === 'canceled') return
      ;(dish.ingredients || []).forEach(ing => {
        if (ing.name && ing.name.trim()) {
          names.add(ing.name.trim().toLowerCase())
        }
      })
    })
    return names
  })

  const weekDishNameDayMap = computed(() => {
    const map = {}
    getAllDishes.value.forEach(dish => {
      if (dish.status === 'canceled') return
      if (dish.name) {
        const key = dish.name.trim().toLowerCase()
        if (!map[key]) map[key] = []
        if (!map[key].includes(dish.day)) {
          map[key].push(dish.day)
        }
      }
    })
    return map
  })

  const touchRecommendations = () => {
    lastAddedAt.value = Date.now()
  }

  const getDayTasteCount = (day) => {
    const count = {}
    const dishes = getDayDishes(day).filter(d => d.status !== 'canceled')
    dishes.forEach(d => {
      if (d.taste) count[d.taste] = (count[d.taste] || 0) + 1
    })
    return count
  }

  const getDayProteinSources = (day) => {
    const sources = new Set()
    const dishes = getDayDishes(day).filter(d => d.status !== 'canceled')
    dishes.forEach(d => {
      if (d.proteinSource) sources.add(d.proteinSource)
    })
    return sources
  }

  const getDayUsedPrepTime = (day) => {
    const dishes = getDayDishes(day).filter(d => d.status !== 'canceled')
    return dishes.reduce((sum, d) => sum + (parseInt(d.prepTime) || 0), 0)
  }

  const getAvailablePrepTime = (day) => {
    const isWeekend = day >= 5
    return isWeekend
      ? (settings.value.availablePrepTime?.weekend || 120)
      : (settings.value.availablePrepTime?.weekday || 60)
  }

  const getMealDishes = (day, mealType) => {
    return getDishesByDayAndMeal(day, mealType).filter(d => d.status !== 'canceled')
  }

  const getMealExistingDishNames = (day, mealType) => {
    const names = new Set()
    getMealDishes(day, mealType).forEach(d => {
      if (d.name) names.add(d.name.trim().toLowerCase())
    })
    return names
  }

  const getDayExistingDishNames = (day) => {
    const names = new Set()
    getDayDishes(day).filter(d => d.status !== 'canceled').forEach(d => {
      if (d.name) names.add(d.name.trim().toLowerCase())
    })
    return names
  }

  const isMealMatch = (template, mealType) => {
    if (!template.mealType || template.mealType === '') return true
    if (template.mealType === mealType) return true
    const mealOrder = { breakfast: 0, lunch: 1, dinner: 2 }
    const templateOrder = mealOrder[template.mealType]
    const targetOrder = mealOrder[mealType]
    if (templateOrder === 0 && targetOrder === 1) return true
    if (templateOrder === 1 && (targetOrder === 0 || targetOrder === 2)) return true
    if (templateOrder === 2 && targetOrder === 1) return true
    return false
  }

  const getIncompleteReasons = (template) => {
    const info = getTemplateCompletionInfo(template)
    if (info.isComplete) return []
    return info.issues
  }

  const scoreTemplateForDay = (template, day, mealType = null) => {
    let score = 0
    const reasons = []
    const blockReasons = []
    const reusedIngredients = []

    const incompleteReasons = getIncompleteReasons(template)
    if (incompleteReasons.length > 0) {
      blockReasons.push(incompleteReasons.join('、'))
      return { score: 0, reasons, blockReasons, template, reusedIngredients }
    }

    const tName = (template.name || '').trim().toLowerCase()
    const dayNames = getDayExistingDishNames(day)
    if (dayNames.has(tName)) {
      blockReasons.push('当天已有相同菜品')
      return { score: 0, reasons, blockReasons, template, reusedIngredients }
    }

    if (mealType) {
      const mealNames = getMealExistingDishNames(day, mealType)
      if (mealNames.has(tName)) {
        blockReasons.push('该餐次已有相同菜品')
        return { score: 0, reasons, blockReasons, template, reusedIngredients }
      }
    }

    const weekInfo = weekDishNameDayMap.value[tName]
    if (weekInfo && weekInfo.length > 0) {
      const usedOnOtherDays = weekInfo.filter(d => d !== day).length
      if (usedOnOtherDays > 0) {
        score -= 15
        const dayLabel = usedOnOtherDays >= 3 ? '多天' : `${usedOnOtherDays}天`
        reasons.push({ type: 'week_duplicate', label: `本周已在${dayLabel}出现`, positive: false })
      }
    }

    if (mealType) {
      if (!isMealMatch(template, mealType)) {
        const mealItem = MEAL_TYPES.find(m => m.value === template.mealType)
        const mealLabel = mealItem ? mealItem.label : template.mealType
        score -= 10
        reasons.push({ type: 'meal_mismatch', label: `通常为${mealLabel}`, positive: false })
      } else if (template.mealType === mealType) {
        score += 5
        reasons.push({ type: 'meal_match', label: '餐次匹配', positive: true })
      }
    }

    const ingredientReuseCount = (template.ingredients || []).filter(ing => {
      if (!ing.name || !ing.name.trim()) return false
      const key = ing.name.trim().toLowerCase()
      const isReused = weekIngredientSet.value.has(key)
      if (isReused) reusedIngredients.push(key)
      return isReused
    }).length
    const totalIngredients = (template.ingredients || []).filter(
      ing => ing.name && ing.name.trim()
    ).length

    if (totalIngredients > 0 && ingredientReuseCount > 0) {
      const reuseRatio = ingredientReuseCount / totalIngredients
      score += reuseRatio * 40

      let shoppingBonus = 0
      reusedIngredients.forEach(key => {
        const shopInfo = shoppingIngredientMap.value[key]
        if (shopInfo) {
          if (shopInfo.dishCount >= 3) {
            shoppingBonus += 8
            if (!reasons.some(r => r.type === 'shopping_hot')) {
              reasons.push({ type: 'shopping_hot', label: '主料采购高复用', positive: true })
            }
          } else if (shopInfo.dishCount >= 2) {
            shoppingBonus += 5
            if (!reasons.some(r => r.type === 'shopping_reuse')) {
              reasons.push({ type: 'shopping_reuse', label: '主料采购可复用', positive: true })
            }
          }
        }
      })
      score += Math.min(shoppingBonus, 15)

      if (ingredientReuseCount >= 3) {
        reasons.push({ type: 'ingredient_reuse', label: `主料高复用${ingredientReuseCount}项`, positive: true })
      } else if (ingredientReuseCount >= 2) {
        reasons.push({ type: 'ingredient_reuse', label: `主料复用${ingredientReuseCount}项`, positive: true })
      } else {
        reasons.push({ type: 'ingredient_reuse', label: '部分主料可复用', positive: true })
      }
    }

    const dayProteins = getDayProteinSources(day)
    const minProtein = settings.value.minProteinSourcesPerDay || 2
    if (template.proteinSource && !dayProteins.has(template.proteinSource)) {
      score += 25
      if (dayProteins.size < minProtein) {
        score += 10
        reasons.push({ type: 'protein_diversity', label: '改善蛋白来源单一', positive: true })
      } else {
        reasons.push({ type: 'protein_diversity', label: '增加蛋白多样性', positive: true })
      }
    } else if (template.proteinSource && dayProteins.has(template.proteinSource)) {
      const proteinCount = getDayDishes(day)
        .filter(d => d.status !== 'canceled' && d.proteinSource === template.proteinSource)
        .length
      if (proteinCount >= 2) {
        score -= 15
        blockReasons.push('蛋白来源重复过多')
      }
    }

    const tasteCount = getDayTasteCount(day)
    const maxSameTaste = settings.value.maxSameTastePerDay || 2
    if (template.taste && tasteCount[template.taste] && tasteCount[template.taste] >= maxSameTaste) {
      score -= 30
      const tasteLabel = getTasteLabelById(template.taste) || ''
      blockReasons.push(`${tasteLabel}口味过度重复`)
    } else if (template.taste && tasteCount[template.taste]) {
      score += 5
      reasons.push({ type: 'taste_ok', label: '口味可搭配', positive: true })
    } else if (template.taste && !tasteCount[template.taste]) {
      score += 10
      reasons.push({ type: 'taste_new', label: '增加口味多样性', positive: true })
    }

    const usedTime = getDayUsedPrepTime(day)
    const availableTime = getAvailablePrepTime(day)
    const templatePrepTime = parseInt(template.prepTime) || 0
    if (usedTime + templatePrepTime > availableTime) {
      blockReasons.push(`准备时长超限(还需${templatePrepTime}分钟，剩余${availableTime - usedTime}分钟)`)
      score -= 50
    } else if (templatePrepTime <= 20) {
      score += 8
      reasons.push({ type: 'quick_prep', label: '准备时间短', positive: true })
    } else if (availableTime - usedTime - templatePrepTime >= 30) {
      reasons.push({ type: 'time_ok', label: '时间充裕', positive: true })
    }

    const usageCount = template.usageCount || 0
    if (usageCount > 0) {
      score += Math.min(usageCount * 2, 10)
      reasons.push({ type: 'used_before', label: `历史使用${usageCount}次`, positive: true })
    }
    if (template.lastUsedAt) {
      const daysSince = Math.floor((Date.now() - template.lastUsedAt) / (1000 * 60 * 60 * 24))
      if (daysSince >= 7 && daysSince <= 30) {
        score += 5
        reasons.push({ type: 'recent_used', label: `${daysSince}天前用过`, positive: true })
      }
    }

    return { score: Math.max(score, 0), reasons, blockReasons, template, reusedIngredients }
  }

  function getTasteLabelById(value) {
    const item = TASTE_TYPES.find(t => t.value === value)
    return item ? item.label : value
  }

  const getRecommendationsForDay = (day, mealType = null) => {
    const scored = templates.value
      .map(t => scoreTemplateForDay(t, day, mealType))
      .filter(item => item.score > 0 || item.blockReasons.length > 0)
      .sort((a, b) => b.score - a.score)

    const recommended = scored.filter(item => item.score > 0 && item.blockReasons.length === 0)
    const blocked = scored.filter(item => item.blockReasons.length > 0)

    return { recommended: recommended.slice(0, 6), blocked: blocked.slice(0, 5) }
  }

  const getEmptyReasonForDay = (day, mealType = null) => {
    const incompleteTemplates = templates.value.filter(t => !isTemplateComplete(t))
    const incompleteCount = incompleteTemplates.length
    const completeTemplates = templates.value.filter(t => isTemplateComplete(t))
    const dayDishes = getDayDishes(day).filter(d => d.status !== 'canceled')
    const mealItem = mealType ? MEAL_TYPES.find(m => m.value === mealType) : null
    const mealLabel = mealItem ? mealItem.label : ''

    if (templates.value.length === 0) {
      return { type: 'no_templates', message: '暂无模板数据，请先在模板管理中创建菜品模板', action: 'open-templates' }
    }
    if (incompleteCount === templates.value.length) {
      const sampleIssues = incompleteTemplates.slice(0, 2).map(t => {
        const info = getTemplateCompletionInfo(t)
        return `"${t.name}"${info.issues.join('、')}`
      })
      const detail = sampleIssues.length > 0 ? `（如${sampleIssues.join('；')}）` : ''
      return { type: 'all_incomplete', message: `所有模板信息不完整${detail}，请补充关键信息后重试`, action: 'open-templates' }
    }

    const usedTime = getDayUsedPrepTime(day)
    const availableTime = getAvailablePrepTime(day)
    if (usedTime >= availableTime) {
      return { type: 'time_full', message: `当天准备时长已满(${usedTime}/${availableTime}分钟)，无法再添加菜品` }
    }

    const minProtein = settings.value.minProteinSourcesPerDay || 2
    const maxSameTaste = settings.value.maxSameTastePerDay || 2
    const tasteCount = getDayTasteCount(day)
    const dayProteins = getDayProteinSources(day)

    const timeBlocked = completeTemplates.filter(t => {
      const prep = parseInt(t.prepTime) || 0
      return usedTime + prep > availableTime
    }).length

    const tasteBlocked = completeTemplates.filter(t => {
      return t.taste && tasteCount[t.taste] && tasteCount[t.taste] >= maxSameTaste
    }).length

    const proteinBlocked = completeTemplates.filter(t => {
      if (!t.proteinSource) return false
      const proteinCount = getDayDishes(day)
        .filter(d => d.status !== 'canceled' && d.proteinSource === t.proteinSource)
        .length
      return proteinCount >= 2
    }).length

    const dayNames = getDayExistingDishNames(day)
    const dayDupBlocked = completeTemplates.filter(t =>
      dayNames.has((t.name || '').trim().toLowerCase())
    ).length

    const blockingReasons = []
    if (timeBlocked > 0) blockingReasons.push(`${timeBlocked}个模板时长超限`)
    if (tasteBlocked > 0) blockingReasons.push(`${tasteBlocked}个模板口味重复`)
    if (proteinBlocked > 0) blockingReasons.push(`${proteinBlocked}个模板蛋白重复`)
    if (dayDupBlocked > 0) blockingReasons.push(`${dayDupBlocked}个当天已有`)
    if (incompleteCount > 0) blockingReasons.push(`${incompleteCount}个模板信息不完整`)

    if (dayDishes.length > 0) {
      const allDayNames = getDayExistingDishNames(day)
      const nonDupComplete = completeTemplates.filter(t =>
        !allDayNames.has((t.name || '').trim().toLowerCase())
      )
      if (nonDupComplete.length === 0 && dayDupBlocked === completeTemplates.length) {
        return { type: 'all_duplicate', message: '当天已包含所有可用模板菜品，可尝试添加新菜品模板', action: 'open-templates' }
      }
    }

    const allProteinsCovered = completeTemplates.every(t => {
      if (!t.proteinSource) return true
      return dayProteins.has(t.proteinSource)
    })
    if (allProteinsCovered && dayProteins.size >= minProtein && blockingReasons.length === 0) {
      return { type: 'well_balanced', message: '当天菜品搭配已较均衡，暂无更优推荐' }
    }

    if (blockingReasons.length > 0) {
      const actionHint = mealLabel ? `${mealLabel}暂` : '暂'
      return { type: 'partial_blocked', message: `${actionHint}无完全匹配的推荐，主要原因：${blockingReasons.join('、')}。可尝试调整约束或手动添加` }
    }

    return { type: 'no_match', message: '当前模板库中没有满足条件的推荐菜品，建议丰富模板库或调整约束条件', action: 'open-templates' }
  }

  const getAllRecommendations = computed(() => {
    void lastAddedAt.value
    const result = {}
    for (let day = 0; day < 7; day++) {
      const dayRecs = getRecommendationsForDay(day)
      result[day] = {
        ...dayRecs,
        emptyReason: dayRecs.recommended.length === 0
          ? getEmptyReasonForDay(day)
          : null
      }
    }
    return result
  })

  const getRecommendationsForDayWithMeal = (day, mealType) => {
    void lastAddedAt.value
    const recs = getRecommendationsForDay(day, mealType)
    return {
      ...recs,
      emptyReason: recs.recommended.length === 0
        ? getEmptyReasonForDay(day, mealType)
        : null
    }
  }

  return {
    getAllRecommendations,
    getRecommendationsForDay,
    getRecommendationsForDayWithMeal,
    getEmptyReasonForDay,
    touchRecommendations,
    shoppingIngredientMap
  }
}
