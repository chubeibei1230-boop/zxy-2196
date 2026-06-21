<template>
  <div v-if="visible" class="modal-overlay" @click.self="handleClose">
    <div class="modal recommend-modal">
      <div class="modal-header">
        <h3>🔄 本周复用推荐 · {{ dayLabel }}</h3>
        <div class="header-tip">
          <span class="tip-dot"></span>
          <span>优先推荐主料可复用、营养均衡的菜品</span>
        </div>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <div class="modal-body">
        <div class="recommend-meal-tabs">
          <button
            v-for="meal in MEAL_TYPES"
            :key="meal.value"
            class="meal-tab-btn"
            :class="{ active: selectedMeal === meal.value }"
            @click="selectedMeal = meal.value"
          >
            {{ meal.label }}
            <span class="meal-count" v-if="getMealCount(meal.value) > 0">
              {{ getMealCount(meal.value) }}道
            </span>
          </button>
        </div>

        <div class="toast" :class="{ show: toast.show }">
          {{ toast.message }}
        </div>

        <div v-if="currentRecommendations.recommended.length > 0" class="recommend-list">
          <div class="recommend-section-title">
            ✅ 推荐加入 {{ currentMealLabel }}
            <span class="section-count">{{ currentRecommendations.recommended.length }}个候选</span>
          </div>
          <div
            v-for="item in currentRecommendations.recommended"
            :key="item.template.id"
            class="recommend-card"
            :class="{ added: addedIds.has(item.template.id) }"
          >
            <div class="recommend-card-header">
              <span class="recommend-name">
                {{ item.template.name }}
                <span v-if="item.template.mealType && item.template.mealType !== selectedMeal" class="cross-meal-tag">
                  (通常为{{ getMealLabel(item.template.mealType) }})
                </span>
              </span>
              <span class="recommend-score">{{ item.score.toFixed(0) }}分</span>
            </div>

            <div class="recommend-card-info">
              <span v-if="item.template.taste" class="info-tag taste-tag" :style="{ backgroundColor: getTasteColor(item.template.taste) + '20', color: getTasteColor(item.template.taste) }">
                {{ getTasteLabel(item.template.taste) }}
              </span>
              <span v-if="item.template.proteinSource" class="info-tag protein-tag">
                🥩 {{ getProteinLabel(item.template.proteinSource) }}
              </span>
              <span class="info-tag">
                ⏱️ {{ item.template.prepTime || 0 }}分
              </span>
              <span v-if="item.template.servings" class="info-tag">
                🍽️ {{ item.template.servings }}份
              </span>
              <span v-if="item.template.usageCount > 0" class="info-tag usage-tag">
                📊 常用x{{ item.template.usageCount }}
              </span>
            </div>

            <div class="recommend-reasons">
              <span
                v-for="(reason, idx) in item.reasons"
                :key="idx"
                class="reason-tag"
                :class="{ positive: reason.positive, negative: !reason.positive }"
              >
                <i v-if="reason.positive" class="reason-icon">✓</i>
                <i v-else class="reason-icon">!</i>
                {{ reason.label }}
              </span>
            </div>

            <div v-if="item.template.ingredients && item.template.ingredients.length > 0" class="recommend-ingredients">
              <span
                v-for="(ing, idx) in item.template.ingredients.filter(i => i.name && i.name.trim()).slice(0, 5)"
                :key="idx"
                class="ing-tag"
                :class="{
                  reused: isIngredientReused(ing.name),
                  'high-reuse': getIngredientReuseLevel(ing.name) >= 2,
                  'shopping-hot': isShoppingHot(ing.name)
                }"
                :title="getIngredientTooltip(ing.name)"
              >
                {{ ing.name }}
                <span v-if="isIngredientReused(ing.name)" class="reused-icon">♻️</span>
                <span v-if="isShoppingHot(ing.name)" class="hot-icon">🔥</span>
              </span>
              <span v-if="item.template.ingredients.filter(i => i.name && i.name.trim()).length > 5" class="ing-more">
                +{{ item.template.ingredients.filter(i => i.name && i.name.trim()).length - 5 }}
              </span>
            </div>

            <div class="recommend-actions">
              <button
                class="btn btn-primary btn-sm add-btn"
                :class="{ loading: loadingIds.has(item.template.id), added: addedIds.has(item.template.id) }"
                :disabled="loadingIds.has(item.template.id) || addedIds.has(item.template.id)"
                @click="handleAdd(item)"
              >
                <span v-if="loadingIds.has(item.template.id)">加入中...</span>
                <span v-else-if="addedIds.has(item.template.id)">✓ 已加入{{ getMealLabel(addedMeals.get(item.template.id)) }}</span>
                <span v-else>一键加入{{ currentMealLabel }}</span>
              </button>
            </div>
          </div>
        </div>

        <div v-if="currentRecommendations.recommended.length === 0 && currentRecommendations.emptyReason" class="recommend-empty">
          <div class="empty-icon">{{ getEmptyIcon(currentRecommendations.emptyReason.type) }}</div>
          <p class="empty-main">{{ getEmptyTitle(currentRecommendations.emptyReason.type) }}</p>
          <p class="empty-reason">{{ currentRecommendations.emptyReason.message }}</p>
          <div v-if="currentRecommendations.emptyReason.action === 'open-templates'" class="empty-action">
            <button class="btn btn-primary btn-sm" @click="$emit('open-templates')">
              📋 前往模板管理
            </button>
            <button class="btn btn-sm" @click="$emit('add-dish-manual', { day: props.day, mealType: selectedMeal })">
              ➕ 手动添加菜品
            </button>
          </div>
          <div v-else-if="currentRecommendations.emptyReason.type === 'time_full'" class="empty-action">
            <button class="btn btn-sm" @click="$emit('open-settings')">
              ⚙️ 调整可用时长
            </button>
          </div>
          <div v-else-if="currentRecommendations.emptyReason.type === 'partial_blocked' || currentRecommendations.emptyReason.type === 'all_blocked'" class="empty-action">
            <button class="btn btn-sm" @click="$emit('add-dish-manual', { day: props.day, mealType: selectedMeal })">
              ➕ 忽略限制手动添加
            </button>
            <button class="btn btn-sm" @click="$emit('open-settings')">
              ⚙️ 调整约束条件
            </button>
          </div>
        </div>

        <div v-if="currentRecommendations.blocked.length > 0" class="recommend-blocked">
          <div class="recommend-section-title blocked-title">
            🚫 不推荐（{{ currentRecommendations.blocked.length }}个模板受限）
          </div>
          <div
            v-for="item in currentRecommendations.blocked"
            :key="item.template.id"
            class="blocked-card"
          >
            <div class="blocked-header">
              <span class="blocked-name">{{ item.template.name }}</span>
              <span v-if="item.score > 0" class="blocked-score">潜力{{ item.score.toFixed(0) }}分</span>
            </div>
            <div class="blocked-reasons">
              <span v-for="(reason, idx) in item.blockReasons" :key="idx" class="blocked-reason-tag">
                {{ reason }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <div class="footer-stats" v-if="statsInfo">
          <span>📦 完整模板: {{ statsInfo.totalComplete }}个</span>
          <span>✨ 符合条件: {{ currentRecommendations.recommended.length }}个</span>
          <span>🚫 受限: {{ currentRecommendations.blocked.length }}个</span>
        </div>
        <button class="btn btn-secondary" @click="handleClose">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { MEAL_TYPES, DAYS_OF_WEEK, getTasteLabel, getTasteColor, getProteinLabel, getMealLabel } from '../constants.js'
import { useWeeklyRecommend } from '../useWeeklyRecommend.js'
import { useDishTemplates } from '../useDishTemplates.js'

const props = defineProps({
  visible: Boolean,
  day: { type: Number, default: 0 }
})

const emit = defineEmits(['close', 'add-dish', 'open-templates', 'open-settings', 'add-dish-manual'])

const { templateCount, incompleteCount } = useDishTemplates()
const selectedMeal = ref('lunch')
const addedIds = ref(new Set())
const addedMeals = ref(new Map())
const loadingIds = ref(new Set())
const toast = ref({ show: false, message: '' })

const { getRecommendationsForDayWithMeal, touchRecommendations, shoppingIngredientMap } = useWeeklyRecommend()

const dayLabel = computed(() => {
  const day = DAYS_OF_WEEK.find(d => d.value === props.day)
  return day ? day.label : ''
})

const currentRecommendations = computed(() => {
  return getRecommendationsForDayWithMeal(props.day, selectedMeal.value) || { recommended: [], blocked: [], emptyReason: null }
})

const currentMealLabel = computed(() => {
  return getMealLabel(selectedMeal.value)
})

const statsInfo = computed(() => {
  const total = templateCount.value || 0
  const incomplete = incompleteCount.value || 0
  return {
    totalComplete: total - incomplete,
    total,
    incomplete
  }
})

const getMealCount = (mealType) => {
  const recs = getRecommendationsForDayWithMeal(props.day, mealType)
  return recs.recommended?.length || 0
}

const isIngredientReused = (name) => {
  if (!name || !name.trim()) return false
  const key = name.trim().toLowerCase()
  const recommendations = currentRecommendations.value
  const item = recommendations.recommended.find(r =>
    r.reusedIngredients && r.reusedIngredients.includes(key)
  )
  return !!item
}

const getIngredientReuseLevel = (name) => {
  if (!name || !name.trim()) return 0
  const key = name.trim().toLowerCase()
  const shopInfo = shoppingIngredientMap.value[key]
  return shopInfo?.dishCount || 0
}

const isShoppingHot = (name) => {
  if (!name || !name.trim()) return false
  const key = name.trim().toLowerCase()
  const shopInfo = shoppingIngredientMap.value[key]
  return shopInfo && shopInfo.dishCount >= 2
}

const getIngredientTooltip = (name) => {
  if (!name || !name.trim()) return ''
  const key = name.trim().toLowerCase()
  const shopInfo = shoppingIngredientMap.value[key]
  const tips = []
  if (shopInfo?.dishCount) {
    tips.push(`本周已有${shopInfo.dishCount}道菜使用`)
  }
  if (shopInfo?.warning) {
    tips.push(shopInfo.warning)
  }
  return tips.join(' | ')
}

const showToast = (message, duration = 2000) => {
  toast.value = { show: true, message }
  setTimeout(() => {
    toast.value.show = false
  }, duration)
}

const handleAdd = async (item) => {
  const template = item.template
  if (loadingIds.value.has(template.id) || addedIds.value.has(template.id)) return

  loadingIds.value.add(template.id)

  try {
    await new Promise(resolve => setTimeout(resolve, 150))

    emit('add-dish', {
      day: props.day,
      mealType: selectedMeal.value,
      template
    })

    addedIds.value.add(template.id)
    addedMeals.value.set(template.id, selectedMeal.value)
    touchRecommendations()

    const mealLabel = getMealLabel(selectedMeal.value)
    const dayLabelText = dayLabel.value
    showToast(`✓ 已将"${template.name}"加入${dayLabelText}${mealLabel}`)
  } finally {
    loadingIds.value.delete(template.id)
  }
}

const getEmptyIcon = (type) => {
  const icons = {
    'no_templates': '📋',
    'all_incomplete': '📝',
    'time_full': '⏰',
    'well_balanced': '✨',
    'no_match': '🔍',
    'partial_blocked': '⚠️',
    'all_blocked': '🚫',
    'all_duplicate': '🔁'
  }
  return icons[type] || '🔍'
}

const getEmptyTitle = (type) => {
  const titles = {
    'no_templates': '还没有菜品模板',
    'all_incomplete': '模板信息需要完善',
    'time_full': '准备时长已满',
    'well_balanced': '当天搭配已均衡',
    'no_match': '暂无合适推荐',
    'partial_blocked': '推荐条件有限制',
    'all_blocked': '条件冲突',
    'all_duplicate': '模板均已使用'
  }
  return titles[type] || '暂无推荐菜品'
}

const handleClose = () => {
  emit('close')
}

watch(() => props.visible, (val) => {
  if (val) {
    selectedMeal.value = 'lunch'
    addedIds.value = new Set()
    addedMeals.value = new Map()
    loadingIds.value = new Set()
  }
})
</script>
