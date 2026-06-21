import { computed } from 'vue'
import { useMenuStore } from './useMenuStore.js'

export function useShoppingList() {
  const { getAllDishes, settings } = useMenuStore()

  const shoppingList = computed(() => {
    const ingredientMap = {}
    const dishIngredientMap = {}

    getAllDishes.value.forEach(dish => {
      if (dish.status === 'canceled') return
      if (!dish.ingredients || dish.ingredients.length === 0) return

      dish.ingredients.forEach(ing => {
        if (!ing.name) return

        const key = ing.name.trim().toLowerCase()
        const amount = parseFloat(ing.amount) || 0
        const unit = ing.unit || ''

        if (!ingredientMap[key]) {
          ingredientMap[key] = {
            name: ing.name,
            totalAmount: 0,
            unit: unit,
            dishes: [],
            unitMismatch: false
          }
        }

        if (unit && ingredientMap[key].unit && unit !== ingredientMap[key].unit) {
          ingredientMap[key].unitMismatch = true
        }

        if (!ingredientMap[key].unit && unit) {
          ingredientMap[key].unit = unit
        }

        if (unit === ingredientMap[key].unit || !ingredientMap[key].unit) {
          ingredientMap[key].totalAmount += amount
        }

        if (!dishIngredientMap[key]) {
          dishIngredientMap[key] = new Set()
        }
        dishIngredientMap[key].add(dish.id)

        if (!ingredientMap[key].dishes.find(d => d.id === dish.id)) {
          ingredientMap[key].dishes.push({
            id: dish.id,
            name: dish.name,
            amount: ing.amount,
            unit: unit
          })
        }
      })
    })

    const result = Object.values(ingredientMap).map(item => {
      const dishCount = dishIngredientMap[item.name.trim().toLowerCase()]?.size || 0
      let warning = ''
      let severity = 'normal'

      const familySize = settings.value.familySize || 3
      if (item.totalAmount > 0 && item.totalAmount < familySize * 0.1) {
        warning = '可能不足'
        severity = 'error'
      }

      if (item.unitMismatch) {
        warning = warning ? warning + '、单位不一致' : '单位不一致'
        severity = severity === 'error' ? 'error' : 'warning'
      }

      if (dishCount > 3) {
        warning = warning ? warning + '、重复采购' : '多道菜使用'
        severity = severity === 'normal' ? 'info' : severity
      }

      return {
        ...item,
        dishCount,
        warning,
        severity
      }
    })

    result.sort((a, b) => {
      const severityOrder = { error: 0, warning: 1, info: 2, normal: 3 }
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity]
      }
      return b.dishCount - a.dishCount
    })

    return result
  })

  const totalIngredientsCount = computed(() => shoppingList.value.length)

  const warningCount = computed(() => 
    shoppingList.value.filter(i => i.severity === 'warning' || i.severity === 'error').length
  )

  return {
    shoppingList,
    totalIngredientsCount,
    warningCount
  }
}
