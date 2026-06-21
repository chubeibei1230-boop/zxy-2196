<template>
  <div v-if="visible" class="modal-overlay" @click.self="handleClose">
    <div class="modal dish-form-modal">
      <div class="modal-header">
        <h3>{{ isEdit ? '编辑菜品' : '新增菜品' }}</h3>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <div class="form-mode-tabs" v-if="!isEdit">
        <button 
          class="mode-tab" 
          :class="{ active: formMode === 'manual' }"
          @click="formMode = 'manual'"
        >
          ✏️ 手动输入
        </button>
        <button 
          class="mode-tab" 
          :class="{ active: formMode === 'template' }"
          @click="formMode = 'template'"
        >
          📋 从模板选择
        </button>
      </div>
      
      <div class="modal-body">
        <TemplateSelector 
          v-if="!isEdit && formMode === 'template'"
          :default-meal-type="defaultMeal"
          @select="handleTemplateSelect"
        />

        <div v-if="isEdit || formMode === 'manual'">
        <div class="form-row">
          <label class="form-label">餐次</label>
          <select v-model="formData.mealType" class="form-select">
            <option v-for="meal in MEAL_TYPES" :key="meal.value" :value="meal.value">
              {{ meal.label }}
            </option>
          </select>
        </div>

        <div class="form-row">
          <label class="form-label">菜名 <span class="required">*</span></label>
          <input 
            v-model="formData.name" 
            type="text" 
            class="form-input" 
            placeholder="请输入菜名"
          />
        </div>

        <div class="form-row two-col">
          <div class="form-col">
            <label class="form-label">口味类型</label>
            <select v-model="formData.taste" class="form-select">
              <option value="">请选择</option>
              <option v-for="taste in TASTE_TYPES" :key="taste.value" :value="taste.value">
                {{ taste.label }}
              </option>
            </select>
          </div>
          <div class="form-col">
            <label class="form-label">蛋白来源</label>
            <select v-model="formData.proteinSource" class="form-select">
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
              v-model.number="formData.servings" 
              type="number" 
              class="form-input" 
              min="1"
              placeholder="份"
            />
          </div>
          <div class="form-col">
            <label class="form-label">准备时长(分钟)</label>
            <input 
              v-model.number="formData.prepTime" 
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
            v-model.number="formData.calories" 
            type="number" 
            class="form-input" 
            min="0"
            placeholder="千卡"
          />
        </div>

        <div class="form-row">
          <label class="form-label">状态</label>
          <select v-model="formData.status" class="form-select">
            <option v-for="status in DISH_STATUSES" :key="status.value" :value="status.value">
              {{ status.label }}
            </option>
          </select>
        </div>

        <div class="form-row">
          <label class="form-label">主料清单</label>
          <div class="ingredients-editor">
            <div 
              v-for="(ing, idx) in formData.ingredients" 
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
                @click="removeIngredient(idx)"
                type="button"
              >×</button>
            </div>
            <button class="btn-add-ing" @click="addIngredient" type="button">
              + 添加主料
            </button>
          </div>
        </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="handleClose">取消</button>
        <button class="btn btn-primary" @click="handleSubmit">确认</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, reactive } from 'vue'
import { MEAL_TYPES, TASTE_TYPES, PROTEIN_SOURCES, DISH_STATUSES } from '../constants.js'
import TemplateSelector from './TemplateSelector.vue'
import { useDishTemplates } from '../useDishTemplates.js'

const props = defineProps({
  visible: Boolean,
  dish: Object,
  defaultDay: Number,
  defaultMeal: String
})

const emit = defineEmits(['close', 'submit'])

const formData = reactive({
  name: '',
  mealType: 'dinner',
  taste: '',
  proteinSource: '',
  servings: 3,
  prepTime: 30,
  calories: null,
  status: 'pending',
  ingredients: []
})

const { isTemplateComplete, getTemplateCompletionInfo, recordUsage } = useDishTemplates()

const isEdit = ref(false)
const formMode = ref('manual')
const selectedTemplateId = ref(null)

watch(() => props.visible, (val) => {
  if (val) {
    selectedTemplateId.value = null
    if (props.dish) {
      isEdit.value = true
      formMode.value = 'manual'
      Object.assign(formData, {
        name: props.dish.name || '',
        mealType: props.dish.mealType || props.defaultMeal || 'dinner',
        taste: props.dish.taste || '',
        proteinSource: props.dish.proteinSource || '',
        servings: props.dish.servings || 3,
        prepTime: props.dish.prepTime || 30,
        calories: props.dish.calories || null,
        status: props.dish.status || 'pending',
        ingredients: JSON.parse(JSON.stringify(props.dish.ingredients || []))
      })
    } else {
      isEdit.value = false
      formMode.value = 'template'
      Object.assign(formData, {
        name: '',
        mealType: props.defaultMeal || 'dinner',
        taste: '',
        proteinSource: '',
        servings: 3,
        prepTime: 30,
        calories: null,
        status: 'pending',
        ingredients: []
      })
    }
  }
})

const handleTemplateSelect = (template) => {
  selectedTemplateId.value = template.id
  
  const complete = isTemplateComplete(template)
  if (!complete) {
    const info = getTemplateCompletionInfo(template)
    const confirmed = confirm(
      `该模板信息不完整：${info.issues.join('；')}\n\n是否仍然使用此模板？`
    )
    if (!confirmed) return
  }

  Object.assign(formData, {
    name: template.name || '',
    mealType: props.defaultMeal || template.mealType || 'dinner',
    taste: template.taste || '',
    proteinSource: template.proteinSource || '',
    servings: template.servings || 3,
    prepTime: template.prepTime || 30,
    calories: template.calories || null,
    status: 'pending',
    ingredients: JSON.parse(JSON.stringify(template.ingredients || []))
  })

  recordUsage(template.id)
  formMode.value = 'manual'
}

const addIngredient = () => {
  formData.ingredients.push({ name: '', amount: '', unit: '' })
}

const removeIngredient = (idx) => {
  formData.ingredients.splice(idx, 1)
}

const handleClose = () => {
  emit('close')
}

const handleSubmit = () => {
  if (!formData.name.trim()) {
    alert('请输入菜名')
    return
  }
  
  const data = {
    ...formData,
    name: formData.name.trim(),
    ingredients: formData.ingredients.filter(i => i.name.trim())
  }
  
  emit('submit', {
    data,
    isEdit: isEdit.value,
    dishId: props.dish?.id
  })
}
</script>
