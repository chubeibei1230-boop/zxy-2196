<template>
  <div class="week-view">
    <div class="week-header">
      <div class="week-day-header" v-for="day in DAYS_OF_WEEK" :key="day.value">
        <span class="day-name">{{ day.label }}</span>
        <div class="day-warnings" v-if="getDayWarnings(day.value).length > 0">
          <span 
            class="warning-icon"
            :class="{ error: hasError(day.value) }"
            :title="getWarningsTooltip(day.value)"
          >
            ⚠ {{ getDayWarnings(day.value).length }}
          </span>
        </div>
      </div>
    </div>

    <div class="week-body">
      <div class="day-column" v-for="day in DAYS_OF_WEEK" :key="day.value">
        <div 
          v-for="meal in MEAL_TYPES" 
          :key="meal.value" 
          class="meal-section"
        >
          <div class="meal-header">
            <span class="meal-name">{{ meal.label }}</span>
            <button 
              class="btn-add-dish" 
              @click="openAddForm(day.value, meal.value)"
              title="添加菜品"
            >+</button>
          </div>
          
          <div class="dish-list">
            <DishCard
              v-for="dish in getDishes(day.value, meal.value)"
              :key="dish.id"
              :dish="dish"
              :is-selected="selectedDishes.includes(dish.id)"
              @edit="openEditForm(dish)"
              @copy="openCopyModal(dish, day.value, meal.value)"
              @delete="handleDelete(dish.id)"
              @toggle-select="toggleSelect"
              @save-template="handleSaveTemplate(dish)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import DishCard from './DishCard.vue'
import { DAYS_OF_WEEK, MEAL_TYPES } from '../constants.js'
import { useMenuStore } from '../useMenuStore.js'
import { useMenuChecker } from '../useMenuChecker.js'

const emit = defineEmits(['add-dish', 'edit-dish', 'copy-dish', 'save-template'])

const { 
  getDishesByDayAndMeal, 
  selectedDishes, 
  toggleSelect,
  deleteDish,
  matchesFilters
} = useMenuStore()

const { getDayWarnings } = useMenuChecker()

const getDishes = (day, mealType) => {
  const dishes = getDishesByDayAndMeal(day, mealType)
  return dishes.filter(d => matchesFilters(d))
}

const hasError = (day) => {
  return getDayWarnings(day).some(w => w.severity === 'error')
}

const getWarningsTooltip = (day) => {
  return getDayWarnings(day).map(w => w.message).join('\n')
}

const openAddForm = (day, mealType) => {
  emit('add-dish', { day, mealType })
}

const openEditForm = (dish) => {
  emit('edit-dish', dish)
}

const openCopyModal = (dish, day, mealType) => {
  emit('copy-dish', { dish, day, mealType })
}

const handleDelete = (dishId) => {
  if (confirm('确定要删除这道菜吗？')) {
    deleteDish(dishId)
  }
}

const handleSaveTemplate = (dish) => {
  emit('save-template', dish)
}
</script>
