<template>
  <div v-if="visible" class="modal-overlay" @click.self="handleClose">
    <div class="modal template-manager-modal">
      <div class="modal-header">
        <h3>📋 模板管理</h3>
        <div class="header-stats">
          <span class="stat-item">共 {{ templateCount }} 个模板</span>
          <span v-if="incompleteCount > 0" class="stat-item warning">
            ⚠ {{ incompleteCount }} 个信息不完整
          </span>
        </div>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <div class="modal-body">
        <div class="manager-toolbar">
          <div class="search-box">
            <input 
              v-model="searchKeyword" 
              type="text" 
              class="search-input" 
              placeholder="🔍 搜索模板名称或主料..."
              @input="handleSearch"
            />
          </div>
          <div class="filter-group">
            <select v-model="localFilters.taste" class="filter-select" @change="applyFilters">
              <option value="">全部口味</option>
              <option v-for="taste in TASTE_TYPES" :key="taste.value" :value="taste.value">
                {{ taste.label }}
              </option>
            </select>
            <select v-model="localFilters.proteinSource" class="filter-select" @change="applyFilters">
              <option value="">全部蛋白来源</option>
              <option v-for="protein in PROTEIN_SOURCES" :key="protein.value" :value="protein.value">
                {{ protein.label }}
              </option>
            </select>
            <select v-model="sortBy" class="filter-select" @change="applySort">
              <option value="usage">按使用次数</option>
              <option value="recent">按最近使用</option>
              <option value="name">按名称</option>
              <option value="created">按创建时间</option>
            </select>
          </div>
          <button class="btn btn-primary" @click="openCreateForm">
            + 新建模板
          </button>
        </div>

        <div class="template-grid" v-if="displayTemplates.length > 0">
          <div 
            v-for="template in displayTemplates" 
            :key="template.id"
            class="template-card"
            :class="{ incomplete: !isTemplateComplete(template) }"
          >
            <div class="template-card-header">
              <h4 class="template-name">{{ template.name || '未命名模板' }}</h4>
              <span v-if="!isTemplateComplete(template)" class="incomplete-badge" :title="getIssuesText(template)">
                ⚠ 信息不完整
              </span>
            </div>

            <div v-if="!isTemplateComplete(template)" class="template-warning">
              <div class="warning-title">⚠ 信息缺失</div>
              <ul class="warning-list">
                <li v-for="(issue, idx) in getTemplateCompletionInfo(template).issues" :key="idx">
                  {{ issue }}
                </li>
              </ul>
            </div>

            <div class="template-info">
              <div class="info-row">
                <span v-if="template.taste" class="info-tag taste-tag" :style="{ backgroundColor: getTasteColor(template.taste) + '20', color: getTasteColor(template.taste) }">
                  {{ getTasteLabel(template.taste) }}
                </span>
                <span v-if="template.proteinSource" class="info-tag">
                  🥩 {{ getProteinLabel(template.proteinSource) }}
                </span>
              </div>
              <div class="info-row">
                <span v-if="template.servings" class="info-meta">🍽️ {{ template.servings }}份</span>
                <span v-if="template.prepTime" class="info-meta">⏱️ {{ template.prepTime }}分钟</span>
                <span v-if="template.calories" class="info-meta">🔥 {{ template.calories }}千卡</span>
              </div>
            </div>

            <div class="template-ingredients" v-if="template.ingredients && template.ingredients.length > 0">
              <div class="ingredients-title">主料清单</div>
              <div class="ingredients-list">
                <div 
                  v-for="(ing, idx) in template.ingredients" 
                  :key="idx" 
                  class="ingredient-item"
                  :class="{ 'incomplete-ing': !ing.name || !ing.name.trim() }"
                >
                  <span class="ing-name">{{ ing.name || '未命名' }}</span>
                  <span class="ing-amount" v-if="ing.amount">
                    {{ ing.amount }}{{ ing.unit || '' }}
                  </span>
                  <span v-else class="ing-missing">缺数量</span>
                </div>
              </div>
            </div>
            <div v-else class="no-ingredients">
              暂无主料信息
            </div>

            <div class="template-stats">
              <span class="stat">使用次数：{{ template.usageCount || 0 }}</span>
              <span v-if="template.lastUsedAt" class="stat">
                最近使用：{{ formatDate(template.lastUsedAt) }}
              </span>
            </div>

            <div class="template-actions">
              <button class="action-btn edit" @click="openEditForm(template)">
                ✏️ 编辑
              </button>
              <button class="action-btn delete" @click="handleDelete(template)">
                🗑️ 删除
              </button>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <div class="empty-icon">📭</div>
          <p>暂无模板</p>
          <p class="empty-hint">点击上方"新建模板"按钮添加第一个模板</p>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="handleClose">关闭</button>
      </div>
    </div>
  </div>

  <div v-if="showEditForm" class="modal-overlay" @click.self="showEditForm = false">
    <div class="modal edit-template-modal">
      <div class="modal-header">
        <h3>{{ editingTemplate ? '编辑模板' : '新建模板' }}</h3>
        <button class="close-btn" @click="showEditForm = false">×</button>
      </div>

      <div class="modal-body">
        <div class="form-row">
          <label class="form-label">菜名 <span class="required">*</span></label>
          <input 
            v-model="editForm.name" 
            type="text" 
            class="form-input" 
            placeholder="请输入菜名"
          />
        </div>

        <div class="form-row two-col">
          <div class="form-col">
            <label class="form-label">口味类型</label>
            <select v-model="editForm.taste" class="form-select">
              <option value="">请选择</option>
              <option v-for="taste in TASTE_TYPES" :key="taste.value" :value="taste.value">
                {{ taste.label }}
              </option>
            </select>
          </div>
          <div class="form-col">
            <label class="form-label">蛋白来源</label>
            <select v-model="editForm.proteinSource" class="form-select">
              <option value="">请选择</option>
              <option v-for="protein in PROTEIN_SOURCES" :key="protein.value" :value="protein.value">
                {{ protein.label }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-row two-col">
          <div class="form-col">
            <label class="form-label">预计份数</label>
            <input 
              v-model.number="editForm.servings" 
              type="number" 
              class="form-input" 
              min="1"
              placeholder="份"
            />
          </div>
          <div class="form-col">
            <label class="form-label">准备时长(分钟)</label>
            <input 
              v-model.number="editForm.prepTime" 
              type="number" 
              class="form-input" 
              min="1"
              placeholder="分钟"
            />
          </div>
        </div>

        <div class="form-row">
          <label class="form-label">热量估计(千卡/份)</label>
          <input 
            v-model.number="editForm.calories" 
            type="number" 
            class="form-input" 
            min="0"
            placeholder="千卡"
          />
        </div>

        <div class="form-row">
          <label class="form-label">适用餐次</label>
          <select v-model="editForm.mealType" class="form-select">
            <option value="">不限</option>
            <option v-for="meal in MEAL_TYPES" :key="meal.value" :value="meal.value">
              {{ meal.label }}
            </option>
          </select>
        </div>

        <div class="form-row">
          <label class="form-label">主料清单</label>
          <div class="ingredients-editor">
            <div 
              v-for="(ing, idx) in editForm.ingredients" 
              :key="idx" 
              class="ingredient-row"
            >
              <input 
                v-model="ing.name" 
                type="text" 
                class="form-input ing-name" 
                placeholder="主料名称"
              />
              <input 
                v-model="ing.amount" 
                type="text" 
                class="form-input ing-amount" 
                placeholder="数量"
              />
              <input 
                v-model="ing.unit" 
                type="text" 
                class="form-input ing-unit" 
                placeholder="单位"
              />
              <button 
                class="btn-remove-ing" 
                @click="removeEditIngredient(idx)"
                type="button"
              >×</button>
            </div>
            <button class="btn-add-ing" @click="addEditIngredient" type="button">
              + 添加主料
            </button>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="showEditForm = false">取消</button>
        <button class="btn btn-primary" @click="saveTemplate">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { 
  MEAL_TYPES, 
  TASTE_TYPES, 
  PROTEIN_SOURCES, 
  getTasteLabel, 
  getTasteColor, 
  getProteinLabel 
} from '../constants.js'
import { useDishTemplates } from '../useDishTemplates.js'

const props = defineProps({
  visible: Boolean
})

const emit = defineEmits(['close'])

const {
  templates,
  templateCount,
  incompleteCount,
  isTemplateComplete,
  getTemplateCompletionInfo,
  addTemplate,
  updateTemplate,
  deleteTemplate,
  setTemplateFilter,
  resetTemplateFilters
} = useDishTemplates()

const searchKeyword = ref('')
const sortBy = ref('usage')
const showEditForm = ref(false)
const editingTemplate = ref(null)

const localFilters = reactive({
  taste: '',
  proteinSource: ''
})

const editForm = reactive({
  name: '',
  taste: '',
  proteinSource: '',
  servings: 3,
  prepTime: 30,
  calories: null,
  mealType: '',
  ingredients: []
})

const handleSearch = () => {
  setTemplateFilter('keyword', searchKeyword.value)
}

const applyFilters = () => {
  setTemplateFilter('taste', localFilters.taste)
  setTemplateFilter('proteinSource', localFilters.proteinSource)
}

const applySort = () => {
}

const displayTemplates = computed(() => {
  let result = [...templates.value]

  if (localFilters.taste) {
    result = result.filter(t => t.taste === localFilters.taste)
  }
  if (localFilters.proteinSource) {
    result = result.filter(t => t.proteinSource === localFilters.proteinSource)
  }
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.trim().toLowerCase()
    result = result.filter(t => {
      if (t.name.toLowerCase().includes(keyword)) return true
      return (t.ingredients || []).some(
        ing => ing.name && ing.name.toLowerCase().includes(keyword)
      )
    })
  }

  switch (sortBy.value) {
    case 'usage':
      result.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      break
    case 'recent':
      result.sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
      break
    case 'name':
      result.sort((a, b) => a.name.localeCompare(b.name))
      break
    case 'created':
      result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      break
  }

  return result
})

const getIssuesText = (template) => {
  const info = getTemplateCompletionInfo(template)
  return info.issues.join('；')
}

const formatDate = (timestamp) => {
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

const openCreateForm = () => {
  editingTemplate.value = null
  Object.assign(editForm, {
    name: '',
    taste: '',
    proteinSource: '',
    servings: 3,
    prepTime: 30,
    calories: null,
    mealType: '',
    ingredients: []
  })
  showEditForm.value = true
}

const openEditForm = (template) => {
  editingTemplate.value = template
  Object.assign(editForm, {
    name: template.name || '',
    taste: template.taste || '',
    proteinSource: template.proteinSource || '',
    servings: template.servings || 3,
    prepTime: template.prepTime || 30,
    calories: template.calories || null,
    mealType: template.mealType || '',
    ingredients: JSON.parse(JSON.stringify(template.ingredients || []))
  })
  showEditForm.value = true
}

const addEditIngredient = () => {
  editForm.ingredients.push({ name: '', amount: '', unit: '' })
}

const removeEditIngredient = (idx) => {
  editForm.ingredients.splice(idx, 1)
}

const saveTemplate = () => {
  if (!editForm.name.trim()) {
    alert('请输入菜名')
    return
  }

  const data = {
    ...editForm,
    name: editForm.name.trim(),
    ingredients: editForm.ingredients.filter(i => i.name.trim())
  }

  if (editingTemplate.value) {
    updateTemplate(editingTemplate.value.id, data)
  } else {
    const result = addTemplate(data)
    if (!result.success) {
      const confirmed = confirm(`模板"${data.name}"已存在，是否覆盖更新？`)
      if (confirmed) {
        addTemplate(data, true)
      } else {
        return
      }
    }
  }

  showEditForm.value = false
}

const handleDelete = (template) => {
  if (confirm(`确定要删除模板"${template.name}"吗？`)) {
    deleteTemplate(template.id)
  }
}

const handleClose = () => {
  resetTemplateFilters()
  searchKeyword.value = ''
  localFilters.taste = ''
  localFilters.proteinSource = ''
  emit('close')
}

watch(() => props.visible, (val) => {
  if (val) {
    resetTemplateFilters()
    searchKeyword.value = ''
    localFilters.taste = ''
    localFilters.proteinSource = ''
    sortBy.value = 'usage'
  }
})
</script>
