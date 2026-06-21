<template>
  <div 
    class="dish-card"
    :class="{ 
      selected: isSelected,
      canceled: dish.status === 'canceled'
    }"
    @click="handleClick"
  >
    <div class="dish-card-header">
      <label class="dish-checkbox" @click.stop>
        <input type="checkbox" :checked="isSelected" @change="$emit('toggle-select', dish.id)" />
      </label>
      <span class="dish-name">{{ dish.name || '未命名菜品' }}</span>
      <span class="dish-status" :style="{ backgroundColor: statusColor }">{{ statusLabel }}</span>
    </div>
    
    <div class="dish-info">
      <div class="info-row" v-if="dish.proteinSource">
        <span class="info-label">蛋白：</span>
        <span class="info-value">{{ proteinLabel }}</span>
      </div>
      <div class="info-row" v-if="dish.taste">
        <span class="info-label">口味：</span>
        <span class="info-value taste-tag" :style="{ backgroundColor: tasteColor + '20', color: tasteColor }">
          {{ tasteLabel }}
        </span>
      </div>
    </div>

    <div class="dish-meta">
      <span v-if="dish.servings" class="meta-item">
        <span class="meta-icon">🍽️</span>{{ dish.servings }}份
      </span>
      <span v-if="dish.prepTime" class="meta-item">
        <span class="meta-icon">⏱️</span>{{ dish.prepTime }}分
      </span>
      <span v-if="dish.calories" class="meta-item">
        <span class="meta-icon">🔥</span>{{ dish.calories }}卡
      </span>
    </div>

    <div class="dish-ingredients" v-if="dish.ingredients && dish.ingredients.length > 0">
      <div class="ingredients-title">主料</div>
      <div class="ingredients-list">
        <span v-for="(ing, idx) in dish.ingredients.slice(0, 3)" :key="idx" class="ingredient-tag">
          {{ ing.name }}<template v-if="ing.amount"> {{ ing.amount }}{{ ing.unit }}</template>
        </span>
        <span v-if="dish.ingredients.length > 3" class="ingredient-more">
          +{{ dish.ingredients.length - 3 }}
        </span>
      </div>
    </div>

    <div class="dish-actions">
      <button class="action-btn edit" @click.stop="$emit('edit', dish)">编辑</button>
      <button class="action-btn copy" @click.stop="$emit('copy', dish)">复制</button>
      <button class="action-btn delete" @click.stop="$emit('delete', dish.id)">删除</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getTasteLabel, getTasteColor, getProteinLabel, getStatusLabel, getStatusColor } from '../constants.js'

const props = defineProps({
  dish: {
    type: Object,
    required: true
  },
  isSelected: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['edit', 'copy', 'delete', 'toggle-select', 'click'])

const tasteLabel = computed(() => getTasteLabel(props.dish.taste))
const tasteColor = computed(() => getTasteColor(props.dish.taste))
const proteinLabel = computed(() => getProteinLabel(props.dish.proteinSource))
const statusLabel = computed(() => getStatusLabel(props.dish.status))
const statusColor = computed(() => getStatusColor(props.dish.status))

const handleClick = () => {
  emit('click', props.dish)
}
</script>
