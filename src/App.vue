<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-left">
        <h1>🍳 家庭一周菜谱管理</h1>
        <p class="subtitle">营养搭配 · 采购估算 · 口味平衡</p>
      </div>
      <div class="header-right">
        <button class="btn btn-templates" @click="showTemplateManager = true">
          📋 模板管理
        </button>
        <button class="btn btn-settings" @click="showSettings = true">
          ⚙️ 设置
        </button>
      </div>
    </header>

    <div class="tab-bar">
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'week' }"
        @click="activeTab = 'week'"
      >
        📅 周视图
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'shopping' }"
        @click="activeTab = 'shopping'"
      >
        🛒 采购汇总
      </button>
    </div>

    <WarningsPanel v-if="activeTab === 'week'" />

    <div class="main-content">
      <div v-if="activeTab === 'week'" class="week-tab-content">
        <div class="toolbar">
          <FilterBar />
          <div class="toolbar-actions">
            <span class="selected-count" v-if="selectedDishes.length > 0">
              已选 {{ selectedDishes.length }} 项
            </span>
            <div class="batch-actions" v-if="selectedDishes.length > 0">
              <button class="btn btn-sm" @click="batchUpdate('pending')">
                标记待准备
              </button>
              <button class="btn btn-sm btn-success" @click="batchUpdate('ready')">
                标记已准备
              </button>
              <button class="btn btn-sm btn-warning" @click="batchUpdate('replace')">
                标记需替换
              </button>
              <button class="btn btn-sm btn-danger" @click="batchUpdate('canceled')">
                标记取消
              </button>
              <button class="btn btn-sm" @click="clearSelection">
                取消选择
              </button>
            </div>
            <button class="btn btn-primary" @click="exportCSV">
              📥 导出CSV
            </button>
          </div>
        </div>
        
        <WeekView 
          @add-dish="handleAddDish"
          @edit-dish="handleEditDish"
          @copy-dish="handleCopyDish"
          @save-template="handleSaveTemplate"
        />
      </div>

      <ShoppingListView v-else-if="activeTab === 'shopping'" />
    </div>

    <DishFormModal
      :visible="showDishForm"
      :dish="editingDish"
      :default-day="defaultDay"
      :default-meal="defaultMeal"
      @close="showDishForm = false"
      @submit="handleDishSubmit"
    />

    <CopyDishModal
      :visible="showCopyModal"
      :dish="copySourceDish"
      :source-day="copySourceDay"
      :source-meal="copySourceMeal"
      @close="showCopyModal = false"
      @confirm="handleCopyConfirm"
    />

    <SettingsModal
      :visible="showSettings"
      @close="showSettings = false"
    />

    <TemplateManager
      :visible="showTemplateManager"
      @close="showTemplateManager = false"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import WeekView from './components/WeekView.vue'
import ShoppingListView from './components/ShoppingListView.vue'
import FilterBar from './components/FilterBar.vue'
import DishFormModal from './components/DishFormModal.vue'
import CopyDishModal from './components/CopyDishModal.vue'
import SettingsModal from './components/SettingsModal.vue'
import WarningsPanel from './components/WarningsPanel.vue'
import TemplateManager from './components/TemplateManager.vue'
import { useMenuStore } from './useMenuStore.js'
import { useDishTemplates } from './useDishTemplates.js'

const {
  selectedDishes,
  addDish,
  updateDish,
  copyDish,
  bulkUpdateStatus,
  clearSelection,
  exportToCSV,
  getAllDishes
} = useMenuStore()

const activeTab = ref('week')
const showDishForm = ref(false)
const showCopyModal = ref(false)
const showSettings = ref(false)

const editingDish = ref(null)
const defaultDay = ref(0)
const defaultMeal = ref('dinner')
const showTemplateManager = ref(false)

const { addTemplate } = useDishTemplates()

const copySourceDish = ref(null)
const copySourceDay = ref(0)
const copySourceMeal = ref('dinner')

const handleAddDish = ({ day, mealType }) => {
  editingDish.value = null
  defaultDay.value = day
  defaultMeal.value = mealType
  showDishForm.value = true
}

const handleEditDish = (dish) => {
  editingDish.value = dish
  defaultDay.value = dish.day
  defaultMeal.value = dish.mealType
  showDishForm.value = true
}

const handleDishSubmit = ({ data, isEdit, dishId }) => {
  if (isEdit) {
    updateDish(dishId, data)
  } else {
    const mealType = data.mealType || defaultMeal.value
    const { mealType: _, ...dishData } = data
    addDish(defaultDay.value, mealType, dishData)
  }
  showDishForm.value = false
}

const handleCopyDish = ({ dish, day, mealType }) => {
  copySourceDish.value = dish
  copySourceDay.value = day
  copySourceMeal.value = mealType
  showCopyModal.value = true
}

const handleCopyConfirm = ({ dishId, targets }) => {
  targets.forEach(({ day, meal }) => {
    copyDish(dishId, day, meal)
  })
  showCopyModal.value = false
}

const handleSaveTemplate = (dish) => {
  const result = addTemplate(dish)
  if (result.success) {
    alert(`已将"${dish.name}"保存为模板`)
  } else {
    alert(result.message)
  }
}

const batchUpdate = (status) => {
  bulkUpdateStatus(selectedDishes.value, status)
  clearSelection()
}

const exportCSV = () => {
  exportToCSV()
}
</script>
