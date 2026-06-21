<template>
  <div class="template-selector">
    <div class="selector-header">
      <h4 class="selector-title">📋 从模板快速创建</h4>
      <div class="selector-filters">
        <select v-model="localFilters.mealType" class="filter-select" @change="applyFilters">
          <option value="">全部餐次</option>
          <option v-for="meal in MEAL_TYPES" :key="meal.value" :value="meal.value">
            {{ meal.label }}
          </option>
        </select>
        <select v-model="localFilters.taste" class="filter-select" @change="applyFilters">
          <option value="">全部口味</option>
          <option v-for="taste in TASTE_TYPES" :key="taste.value" :value="taste.value">
            {{ taste.label }}
          </option>
        </select>
        <select v-model="localFilters.proteinSource" class="filter-select" @change="applyFilters">
          <option value="">全部蛋白</option>
          <option v-for="protein in PROTEIN_SOURCES" :key="protein.value" :value="protein.value">
            {{ protein.label }}
          </option>
        </select>
      </div>
    </div>

    <div class="template-list" v-if="sortedTemplates.length > 0">
      <div 
        v-for="template in sortedTemplates" 
        :key="template.id"
        class="template-item"
        :class="{ incomplete: !isTemplateComplete(template) }"
        @click="selectTemplate(template)"
      >
        <div class="template-item-header">
          <span class="template-name">{{ template.name }}</span>
          <span v-if="!isTemplateComplete(template)" class="incomplete-badge" :title="completionIssues(template)">
            ⚠ 信息不完整
          </span>
        </div>
        <div class="template-item-info">
          <span v-if="template.taste" class="info-tag taste-tag" :style="{ backgroundColor: getTasteColor(template.taste) + '20', color: getTasteColor(template.taste) }">
            {{ getTasteLabel(template.taste) }}
          </span>
          <span v-if="template.proteinSource" class="info-tag">
            🥩 {{ getProteinLabel(template.proteinSource) }}
          </span>
          <span v-if="template.prepTime" class="info-tag">
            ⏱️ {{ template.prepTime }}分
          </span>
          <span v-if="template.servings" class="info-tag">
            🍽️ {{ template.servings }}份
          </span>
        </div>
        <div class="template-item-ingredients" v-if="template.ingredients && template.ingredients.length > 0">
          <span class="ingredients-label">主料：</span>
          <span class="ingredients-text">
            {{ template.ingredients.filter(i => i.name).map(i => i.name).join('、') }}
          </span>
        </div>
        <div class="template-item-footer">
          <span class="usage-count">使用 {{ template.usageCount || 0 }} 次</span>
          <span v-if="template.lastUsedAt" class="last-used">
            上次：{{ formatLastUsed(template.lastUsedAt) }}
          </span>
        </div>
      </div>
    </div>

    <div v-else class="empty-templates">
      <div class="empty-icon">📭</div>
      <p>暂无模板</p>
      <p class="empty-hint">去模板管理中添加常用菜品模板吧</p>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'
import { MEAL_TYPES, TASTE_TYPES, PROTEIN_SOURCES, getTasteLabel, getTasteColor, getProteinLabel } from '../constants.js'
import { useDishTemplates } from '../useDishTemplates.js'

const props = defineProps({
  defaultMealType: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['select'])

const { 
  sortedTemplates, 
  isTemplateComplete, 
  getTemplateCompletionInfo,
  setTemplateFilter, 
  resetTemplateFilters 
} = useDishTemplates()

const localFilters = reactive({
  mealType: '',
  taste: '',
  proteinSource: ''
})

watch(() => props.defaultMealType, (val) => {
  if (val) {
    localFilters.mealType = val
    applyFilters()
  }
}, { immediate: true })

const applyFilters = () => {
  setTemplateFilter('mealType', localFilters.mealType)
  setTemplateFilter('taste', localFilters.taste)
  setTemplateFilter('proteinSource', localFilters.proteinSource)
}

const selectTemplate = (template) => {
  emit('select', template)
}

const completionIssues = (template) => {
  const info = getTemplateCompletionInfo(template)
  return info.issues.join('；')
}

const formatLastUsed = (timestamp) => {
  const now = Date.now()
  const diff = now - timestamp
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`
  return `${Math.floor(days / 30)}个月前`
}
</script>
