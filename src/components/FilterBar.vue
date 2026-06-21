<template>
  <div class="filter-bar">
    <div class="filter-group">
      <label class="filter-label">餐次：</label>
      <select v-model="localFilters.mealType" class="filter-select" @change="emitFilter">
        <option value="">全部</option>
        <option v-for="meal in MEAL_TYPES" :key="meal.value" :value="meal.value">
          {{ meal.label }}
        </option>
      </select>
    </div>

    <div class="filter-group">
      <label class="filter-label">口味：</label>
      <select v-model="localFilters.taste" class="filter-select" @change="emitFilter">
        <option value="">全部</option>
        <option v-for="taste in TASTE_TYPES" :key="taste.value" :value="taste.value">
          {{ taste.label }}
        </option>
      </select>
    </div>

    <div class="filter-group">
      <label class="filter-label">准备时长：</label>
      <select v-model="localFilters.prepTime" class="filter-select" @change="emitFilter">
        <option value="">全部</option>
        <option value="fast">快速 (&lt;20分)</option>
        <option value="medium">中等 (20-45分)</option>
        <option value="slow">慢炖 (&gt;45分)</option>
      </select>
    </div>

    <div class="filter-group">
      <label class="filter-label">蛋白来源：</label>
      <select v-model="localFilters.proteinSource" class="filter-select" @change="emitFilter">
        <option value="">全部</option>
        <option v-for="protein in PROTEIN_SOURCES" :key="protein.value" :value="protein.value">
          {{ protein.label }}
        </option>
      </select>
    </div>

    <div class="filter-group">
      <label class="filter-label">状态：</label>
      <select v-model="localFilters.status" class="filter-select" @change="emitFilter">
        <option value="">全部</option>
        <option v-for="status in DISH_STATUSES" :key="status.value" :value="status.value">
          {{ status.label }}
        </option>
      </select>
    </div>

    <button class="btn btn-reset" @click="resetFilters">重置</button>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'
import { MEAL_TYPES, TASTE_TYPES, PROTEIN_SOURCES, DISH_STATUSES } from '../constants.js'
import { useMenuStore } from '../useMenuStore.js'

const { filters, setFilter, resetFilters: storeResetFilters } = useMenuStore()

const localFilters = reactive({
  mealType: '',
  taste: '',
  prepTime: '',
  proteinSource: '',
  status: ''
})

watch(filters, (val) => {
  Object.assign(localFilters, val)
}, { deep: true, immediate: true })

const emitFilter = () => {
  setFilter('mealType', localFilters.mealType)
  setFilter('taste', localFilters.taste)
  setFilter('prepTime', localFilters.prepTime)
  setFilter('proteinSource', localFilters.proteinSource)
  setFilter('status', localFilters.status)
}

const resetFilters = () => {
  localFilters.mealType = ''
  localFilters.taste = ''
  localFilters.prepTime = ''
  localFilters.proteinSource = ''
  localFilters.status = ''
  storeResetFilters()
}
</script>
