<template>
  <div v-if="visible" class="modal-overlay" @click.self="handleClose">
    <div class="modal settings-modal">
      <div class="modal-header">
        <h3>系统设置</h3>
        <button class="close-btn" @click="handleClose">×</button>
      </div>
      
      <div class="modal-body">
        <div class="form-row">
          <label class="form-label">家庭人数</label>
          <input 
            v-model.number="localSettings.familySize" 
            type="number" 
            class="form-input" 
            min="1"
            max="20"
          />
          <div class="form-hint">用于检查菜品份数是否足够</div>
        </div>

        <div class="form-row two-col">
          <div class="form-col">
            <label class="form-label">工作日可用时间(分钟)</label>
            <input 
              v-model.number="localSettings.availablePrepTime.weekday" 
              type="number" 
              class="form-input" 
              min="10"
            />
          </div>
          <div class="form-col">
            <label class="form-label">周末可用时间(分钟)</label>
            <input 
              v-model.number="localSettings.availablePrepTime.weekend" 
              type="number" 
              class="form-input" 
              min="10"
            />
          </div>
        </div>

        <div class="form-row">
          <label class="form-label">每日最少蛋白来源种类</label>
          <input 
            v-model.number="localSettings.minProteinSourcesPerDay" 
            type="number" 
            class="form-input" 
            min="1"
            max="8"
          />
          <div class="form-hint">低于此数量会触发营养不足警告</div>
        </div>

        <div class="form-row">
          <label class="form-label">每日同口味最多菜品数</label>
          <input 
            v-model.number="localSettings.maxSameTastePerDay" 
            type="number" 
            class="form-input" 
            min="1"
            max="10"
          />
          <div class="form-hint">超过此数量会触发口味重复警告</div>
        </div>

        <div class="form-row danger-zone">
          <div class="danger-title">数据管理</div>
          <button class="btn btn-danger" @click="handleClearAll">
            清空所有数据
          </button>
          <div class="form-hint">此操作不可恢复，请谨慎操作</div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="handleClose">取消</button>
        <button class="btn btn-primary" @click="handleSave">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'
import { useMenuStore } from '../useMenuStore.js'

const props = defineProps({
  visible: Boolean
})

const emit = defineEmits(['close'])

const { settings } = useMenuStore()

const localSettings = reactive({
  familySize: 3,
  availablePrepTime: {
    weekday: 60,
    weekend: 120
  },
  minProteinSourcesPerDay: 2,
  maxSameTastePerDay: 2
})

watch(() => props.visible, (val) => {
  if (val) {
    Object.assign(localSettings, JSON.parse(JSON.stringify(settings.value)))
  }
})

const handleClose = () => {
  emit('close')
}

const handleSave = () => {
  Object.assign(settings.value, JSON.parse(JSON.stringify(localSettings)))
  emit('close')
}

const handleClearAll = () => {
  if (confirm('确定要清空所有菜谱数据吗？此操作不可恢复！')) {
    localStorage.clear()
    location.reload()
  }
}
</script>
