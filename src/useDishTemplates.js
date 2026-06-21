import { ref, computed, watch } from 'vue'
import { generateId } from './constants.js'

const STORAGE_KEY = 'family-menu-templates'

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

const templates = ref(loadFromStorage(STORAGE_KEY, []))

watch(templates, (val) => {
  saveToStorage(STORAGE_KEY, val)
}, { deep: true })

export function useDishTemplates() {
  const filters = ref({
    taste: '',
    proteinSource: '',
    mealType: '',
    keyword: ''
  })

  const isTemplateComplete = (template) => {
    if (!template.name || !template.name.trim()) return false
    if (!template.ingredients || template.ingredients.length === 0) return false
    const validIngredients = template.ingredients.filter(
      ing => ing.name && ing.name.trim()
    )
    return validIngredients.length > 0
  }

  const getTemplateCompletionInfo = (template) => {
    const issues = []
    if (!template.name || !template.name.trim()) {
      issues.push('缺少菜名')
    }
    if (!template.ingredients || template.ingredients.length === 0) {
      issues.push('缺少主料清单')
    } else {
      const validCount = template.ingredients.filter(
        ing => ing.name && ing.name.trim()
      ).length
      if (validCount === 0) {
        issues.push('主料清单为空')
      }
      const incompleteCount = template.ingredients.filter(
        ing => ing.name && ing.name.trim() && (!ing.amount || !ing.amount.trim())
      ).length
      if (incompleteCount > 0) {
        issues.push(`${incompleteCount}项主料缺少数量`)
      }
    }
    return {
      isComplete: issues.length === 0,
      issues
    }
  }

  const addTemplate = (dishData, overwrite = false) => {
    const existing = templates.value.find(
      t => t.name.trim().toLowerCase() === (dishData.name || '').trim().toLowerCase()
    )
    if (existing && !overwrite) {
      return { success: false, message: '同名模板已存在', existing }
    }

    if (existing && overwrite) {
      Object.assign(existing, {
        taste: dishData.taste || '',
        proteinSource: dishData.proteinSource || '',
        servings: dishData.servings || 3,
        prepTime: dishData.prepTime || 30,
        calories: dishData.calories || null,
        ingredients: JSON.parse(JSON.stringify(dishData.ingredients || [])),
        mealType: dishData.mealType || ''
      })
      return { success: true, template: existing, overwritten: true }
    }

    const newTemplate = {
      id: generateId(),
      name: dishData.name || '',
      taste: dishData.taste || '',
      proteinSource: dishData.proteinSource || '',
      servings: dishData.servings || 3,
      prepTime: dishData.prepTime || 30,
      calories: dishData.calories || null,
      ingredients: JSON.parse(JSON.stringify(dishData.ingredients || [])),
      mealType: dishData.mealType || '',
      usageCount: 0,
      lastUsedAt: null,
      createdAt: Date.now()
    }
    templates.value.push(newTemplate)
    return { success: true, template: newTemplate }
  }

  const updateTemplate = (templateId, templateData) => {
    const idx = templates.value.findIndex(t => t.id === templateId)
    if (idx === -1) return null

    const updated = {
      ...templates.value[idx],
      ...templateData,
      id: templateId
    }
    templates.value[idx] = updated
    return updated
  }

  const deleteTemplate = (templateId) => {
    const idx = templates.value.findIndex(t => t.id === templateId)
    if (idx !== -1) {
      templates.value.splice(idx, 1)
      return true
    }
    return false
  }

  const getTemplateById = (templateId) => {
    return templates.value.find(t => t.id === templateId) || null
  }

  const recordUsage = (templateId) => {
    const template = templates.value.find(t => t.id === templateId)
    if (template) {
      template.usageCount = (template.usageCount || 0) + 1
      template.lastUsedAt = Date.now()
    }
  }

  const createDishFromTemplate = (templateId) => {
    const template = getTemplateById(templateId)
    if (!template) return null

    recordUsage(templateId)

    return {
      name: template.name,
      taste: template.taste,
      proteinSource: template.proteinSource,
      servings: template.servings,
      prepTime: template.prepTime,
      calories: template.calories,
      ingredients: JSON.parse(JSON.stringify(template.ingredients)),
      status: 'pending'
    }
  }

  const matchesFilters = (template) => {
    if (filters.value.taste && template.taste !== filters.value.taste) return false
    if (filters.value.proteinSource && template.proteinSource !== filters.value.proteinSource) return false
    if (filters.value.mealType && template.mealType !== filters.value.mealType) return false
    if (filters.value.keyword) {
      const keyword = filters.value.keyword.trim().toLowerCase()
      if (!template.name.toLowerCase().includes(keyword)) {
        const ingredientMatch = (template.ingredients || []).some(
          ing => ing.name && ing.name.toLowerCase().includes(keyword)
        )
        if (!ingredientMatch) return false
      }
    }
    return true
  }

  const filteredTemplates = computed(() => {
    return templates.value.filter(t => matchesFilters(t))
  })

  const sortedTemplates = computed(() => {
    return [...filteredTemplates.value].sort((a, b) => {
      const countA = a.usageCount || 0
      const countB = b.usageCount || 0
      if (countA !== countB) return countB - countA
      return (b.lastUsedAt || 0) - (a.lastUsedAt || 0)
    })
  })

  const setTemplateFilter = (key, value) => {
    filters.value[key] = value
  }

  const resetTemplateFilters = () => {
    filters.value = {
      taste: '',
      proteinSource: '',
      mealType: '',
      keyword: ''
    }
  }

  const templateCount = computed(() => templates.value.length)
  const incompleteCount = computed(() => 
    templates.value.filter(t => !isTemplateComplete(t)).length
  )

  return {
    templates,
    filters,
    filteredTemplates,
    sortedTemplates,
    templateCount,
    incompleteCount,
    isTemplateComplete,
    getTemplateCompletionInfo,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplateById,
    recordUsage,
    createDishFromTemplate,
    matchesFilters,
    setTemplateFilter,
    resetTemplateFilters
  }
}
