<template>
  <div v-if="visible" class="modal-overlay" @click.self="handleClose">
    <div class="modal copy-modal">
      <div class="modal-header">
        <h3>复制菜品到...</h3>
        <button class="close-btn" @click="handleClose">×</button>
      </div>
      
      <div class="modal-body">
        <div class="copy-source">
          <span class="source-label">源菜品：</span>
          <span class="source-name">{{ dish?.name }}</span>
          <span class="source-info">
            {{ sourceDayLabel }} - {{ sourceMealLabel }}
          </span>
        </div>

        <div class="copy-targets">
          <div class="target-section">
            <label class="section-label">选择日期</label>
            <div class="day-grid">
              <label 
                v-for="day in DAYS_OF_WEEK" 
                :key="day.value" 
                class="day-option"
                :class="{ selected: selectedDays.includes(day.value) }"
              >
                <input 
                  type="checkbox" 
                  :value="day.value" 
                  v-model="selectedDays"
                />
                <span>{{ day.label }}</span>
              </label>
            </div>
          </div>

          <div class="target-section">
            <label class="section-label">选择餐次</label>
            <div class="meal-grid">
              <label 
                v-for="meal in MEAL_TYPES" 
                :key="meal.value" 
                class="meal-option"
                :class="{ selected: selectedMeals.includes(meal.value) }"
              >
                <input 
                  type="checkbox" 
                  :value="meal.value" 
                  v-model="selectedMeals"
                />
                <span>{{ meal.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="copy-preview" v-if="selectedDays.length > 0 && selectedMeals.length > 0">
          <div class="preview-label">将复制到 {{ selectedDays.length * selectedMeals.length }} 个位置</div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="handleClose">取消</button>
        <button class="btn btn-primary" @click="handleConfirm" :disabled="!canSubmit">
          确认复制
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { DAYS_OF_WEEK, MEAL_TYPES, getMealLabel } from '../constants.js'

const props = defineProps({
  visible: Boolean,
  dish: Object,
  sourceDay: Number,
  sourceMeal: String
})

const emit = defineEmits(['close', 'confirm'])

const selectedDays = ref([])
const selectedMeals = ref([])

const sourceDayLabel = computed(() => {
  const day = DAYS_OF_WEEK.find(d => d.value === props.sourceDay)
  return day ? day.label : ''
})

const sourceMealLabel = computed(() => getMealLabel(props.sourceMeal))

const canSubmit = computed(() => {
  return selectedDays.value.length > 0 && selectedMeals.value.length > 0
})

watch(() => props.visible, (val) => {
  if (val) {
    selectedDays.value = []
    selectedMeals.value = []
  }
})

const handleClose = () => {
  emit('close')
}

const handleConfirm = () => {
  if (!canSubmit.value) return
  
  const targets = []
  for (const day of selectedDays.value) {
    for (const meal of selectedMeals.value) {
      targets.push({ day, meal })
    }
  }
  
  emit('confirm', {
    dishId: props.dish.id,
    targets
  })
}
</script>
