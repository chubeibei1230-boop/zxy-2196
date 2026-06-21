<template>
  <div class="meal-prep-panel">
    <div class="prep-header">
      <h2>本周备餐计划</h2>
      <div class="prep-actions">
        <label class="show-only-todo">
          <input type="checkbox" v-model="showOnlyTodo" />
          <span>仅显示未完成</span>
        </label>
        <button class="btn btn-primary" @click="handleExport">导出备餐清单</button>
      </div>
    </div>

    <div class="prep-stats">
      <div class="stat-card">
        <div class="stat-number">{{ totalTodoCount }}</div>
        <div class="stat-label">待处理任务</div>
      </div>
      <div class="stat-card">
        <div class="stat-number done">{{ totalDoneCount }}</div>
        <div class="stat-label">已完成</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ totalMinutes }}分钟</div>
        <div class="stat-label">总备餐时长</div>
      </div>
      <div class="stat-card" :class="{ warning: overTimeDays > 0 }">
        <div class="stat-number">{{ overTimeDays }}天</div>
        <div class="stat-label">超出可用时间</div>
      </div>
    </div>

    <div class="day-filter">
      <button
        v-for="day in dayFilters"
        :key="day.value"
        class="day-filter-btn"
        :class="{ active: selectedDay === day.value }"
        @click="selectedDay = day.value"
      >
        {{ day.label }}
      </button>
    </div>

    <div class="prep-days-container">
      <div
        v-for="day in visibleDays"
        :key="day.value"
        class="day-section"
        :class="{ 'is-overtime': getDayStats(day.value).isOverTime }"
      >
        <div class="day-header">
          <h3>{{ day.label }}</h3>
          <div class="day-summary">
            <span class="summary-item">
              待处理: {{ getDayStats(day.value).todoCount }}
            </span>
            <span class="summary-item">
              总时长: {{ getDayStats(day.value).totalMinutes }}分钟
            </span>
            <span class="summary-item overtime-warning" v-if="getDayStats(day.value).isOverTime">
              超出{{ getDayStats(day.value).totalMinutes - getDayStats(day.value).availableTime }}分钟
            </span>
          </div>
        </div>

        <div class="task-groups">
          <div class="task-group" v-if="getAdvanceTasks(day.value).length > 0">
            <div class="group-title">
              <span class="group-dot advance"></span>
              提前准备
            </div>
            <div class="task-list">
              <div
                v-for="task in getAdvanceTasks(day.value)"
                :key="task.id"
                class="task-item"
                :class="`status-${task.status}`"
              >
                <div class="task-checkbox">
                  <input
                    type="checkbox"
                    :checked="task.status === 'done'"
                    @change="toggleTaskStatus(task)"
                  />
                </div>
                <div class="task-content">
                  <div class="task-title">{{ task.title }}</div>
                  <div class="task-meta">
                    <span class="task-dish">{{ task.dishName }}</span>
                    <span class="task-time">{{ task.estimatedMinutes }}分钟</span>
                    <span class="task-meal">{{ getMealLabel(task.mealType) }}</span>
                  </div>
                  <div class="task-note" v-if="task.note">
                    备注: {{ task.note }}
                  </div>
                </div>
                <div class="task-actions">
                  <select
                    class="status-select"
                    :value="task.status"
                    @change="changeTaskStatus(task, $event.target.value)"
                  >
                    <option value="todo">待处理</option>
                    <option value="done">已完成</option>
                    <option value="postponed">暂缓</option>
                  </select>
                  <button class="btn-note" @click="openNoteModal(task)">备注</button>
                </div>
              </div>
            </div>
          </div>

          <div class="task-group" v-if="getDayOfTasks(day.value).length > 0">
            <div class="group-title">
              <span class="group-dot dayOf"></span>
              当天处理
            </div>
            <div class="task-list">
              <div
                v-for="task in getDayOfTasks(day.value)"
                :key="task.id"
                class="task-item"
                :class="`status-${task.status}`"
              >
                <div class="task-checkbox">
                  <input
                    type="checkbox"
                    :checked="task.status === 'done'"
                    @change="toggleTaskStatus(task)"
                  />
                </div>
                <div class="task-content">
                  <div class="task-title">{{ task.title }}</div>
                  <div class="task-meta">
                    <span class="task-dish">{{ task.dishName }}</span>
                    <span class="task-time">{{ task.estimatedMinutes }}分钟</span>
                    <span class="task-meal">{{ getMealLabel(task.mealType) }}</span>
                  </div>
                  <div class="task-note" v-if="task.note">
                    备注: {{ task.note }}
                  </div>
                </div>
                <div class="task-actions">
                  <select
                    class="status-select"
                    :value="task.status"
                    @change="changeTaskStatus(task, $event.target.value)"
                  >
                    <option value="todo">待处理</option>
                    <option value="done">已完成</option>
                    <option value="postponed">暂缓</option>
                  </select>
                  <button class="btn-note" @click="openNoteModal(task)">备注</button>
                </div>
              </div>
            </div>
          </div>

          <div class="task-group" v-if="getPostponedTasks(day.value).length > 0">
            <div class="group-title">
              <span class="group-dot postponed"></span>
              暂缓
            </div>
            <div class="task-list">
              <div
                v-for="task in getPostponedTasks(day.value)"
                :key="task.id"
                class="task-item"
                :class="`status-${task.status}`"
              >
                <div class="task-checkbox">
                  <input
                    type="checkbox"
                    :checked="task.status === 'done'"
                    @change="toggleTaskStatus(task)"
                  />
                </div>
                <div class="task-content">
                  <div class="task-title">{{ task.title }}</div>
                  <div class="task-meta">
                    <span class="task-dish">{{ task.dishName }}</span>
                    <span class="task-time">{{ task.estimatedMinutes }}分钟</span>
                    <span class="task-meal">{{ getMealLabel(task.mealType) }}</span>
                  </div>
                  <div class="task-note" v-if="task.note">
                    备注: {{ task.note }}
                  </div>
                </div>
                <div class="task-actions">
                  <select
                    class="status-select"
                    :value="task.status"
                    @change="changeTaskStatus(task, $event.target.value)"
                  >
                    <option value="todo">待处理</option>
                    <option value="done">已完成</option>
                    <option value="postponed">暂缓</option>
                  </select>
                  <button class="btn-note" @click="openNoteModal(task)">备注</button>
                </div>
              </div>
            </div>
          </div>

          <div class="empty-day" v-if="getDayTasks(day.value).length === 0">
            当天暂无备餐任务
          </div>
        </div>
      </div>
    </div>

    <div class="note-modal" v-if="noteModalVisible" @click.self="closeNoteModal">
      <div class="modal-content">
        <h3>编辑备注</h3>
        <div class="modal-task-info">
          <strong>{{ editingTask?.title }}</strong>
          <span class="task-dish-name">{{ editingTask?.dishName }}</span>
        </div>
        <textarea
          v-model="noteText"
          placeholder="输入备注信息..."
          rows="4"
        ></textarea>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="closeNoteModal">取消</button>
          <button class="btn btn-primary" @click="saveNote">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMenuStore } from '../useMenuStore.js'
import { DAYS_OF_WEEK, getMealLabel } from '../constants.js'

const store = useMenuStore()

const showOnlyTodo = ref(false)
const selectedDay = ref(-1)
const noteModalVisible = ref(false)
const editingTask = ref(null)
const noteText = ref('')

const dayFilters = computed(() => {
  return [
    { value: -1, label: '全部' },
    ...DAYS_OF_WEEK
  ]
})

const visibleDays = computed(() => {
  if (selectedDay.value === -1) {
    return DAYS_OF_WEEK
  }
  return DAYS_OF_WEEK.filter(d => d.value === selectedDay.value)
})

const getDayTasks = (day) => {
  let tasks = store.getDayPrepTasks(day)
  if (showOnlyTodo.value) {
    tasks = tasks.filter(t => t.status !== 'done')
  }
  return tasks
}

const getAdvanceTasks = (day) => {
  return getDayTasks(day).filter(t => t.type === 'advance' && t.status !== 'postponed')
}

const getDayOfTasks = (day) => {
  return getDayTasks(day).filter(t => t.type === 'dayOf' && t.status !== 'postponed')
}

const getPostponedTasks = (day) => {
  return getDayTasks(day).filter(t => t.status === 'postponed')
}

const getDayStats = (day) => {
  return store.getDayPrepStats(day)
}

const totalTodoCount = computed(() => {
  let count = 0
  for (let day = 0; day < 7; day++) {
    count += getDayStats(day).todoCount
  }
  return count
})

const totalDoneCount = computed(() => {
  let count = 0
  for (let day = 0; day < 7; day++) {
    count += getDayStats(day).doneCount
  }
  return count
})

const totalMinutes = computed(() => {
  let total = 0
  for (let day = 0; day < 7; day++) {
    total += getDayStats(day).totalMinutes
  }
  return total
})

const overTimeDays = computed(() => {
  let count = 0
  for (let day = 0; day < 7; day++) {
    if (getDayStats(day).isOverTime) {
      count++
    }
  }
  return count
})

const toggleTaskStatus = (task) => {
  const newStatus = task.status === 'done' ? 'todo' : 'done'
  store.updatePrepTask(task.dishId, task.id, { status: newStatus })
}

const changeTaskStatus = (task, status) => {
  store.updatePrepTask(task.dishId, task.id, { status })
}

const openNoteModal = (task) => {
  editingTask.value = task
  noteText.value = task.note || ''
  noteModalVisible.value = true
}

const closeNoteModal = () => {
  noteModalVisible.value = false
  editingTask.value = null
  noteText.value = ''
}

const saveNote = () => {
  if (editingTask.value) {
    store.updatePrepTask(editingTask.value.dishId, editingTask.value.id, { note: noteText.value })
  }
  closeNoteModal()
}

const handleExport = () => {
  store.exportMealPrepCSV()
}

onMounted(() => {
  store.initAllPrepTasks()
})
</script>

<style scoped>
.meal-prep-panel {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.prep-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.prep-header h2 {
  margin: 0;
  font-size: 22px;
  color: #303133;
}

.prep-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.show-only-todo {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: #606266;
  font-size: 14px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.btn-primary {
  background: #409eff;
  color: #fff;
}

.btn-primary:hover {
  background: #66b1ff;
}

.btn-secondary {
  background: #909399;
  color: #fff;
}

.btn-secondary:hover {
  background: #a6a9ad;
}

.prep-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
  text-align: center;
}

.stat-card.warning {
  background: #fef0f0;
}

.stat-number {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
}

.stat-number.done {
  color: #67c23a;
}

.stat-card.warning .stat-number {
  color: #f56c6c;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.day-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.day-filter-btn {
  padding: 8px 16px;
  border: 1px solid #dcdfe6;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #606266;
  transition: all 0.3s;
}

.day-filter-btn:hover {
  color: #409eff;
  border-color: #409eff;
}

.day-filter-btn.active {
  background: #409eff;
  color: #fff;
  border-color: #409eff;
}

.prep-days-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.day-section {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
}

.day-section.is-overtime {
  border-color: #f56c6c;
}

.day-header {
  padding: 12px 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.day-section.is-overtime .day-header {
  background: #fef0f0;
  border-bottom-color: #fde2e2;
}

.day-header h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.day-summary {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #909399;
}

.summary-item {
  display: inline-block;
}

.overtime-warning {
  color: #f56c6c;
  font-weight: 500;
}

.task-groups {
  padding: 16px;
}

.task-group {
  margin-bottom: 16px;
}

.task-group:last-child {
  margin-bottom: 0;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 10px;
}

.group-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.group-dot.advance {
  background: #409eff;
}

.group-dot.dayOf {
  background: #e6a23c;
}

.group-dot.postponed {
  background: #909399;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px solid #ebeef5;
  transition: all 0.3s;
}

.task-item:hover {
  background: #f5f7fa;
}

.task-item.status-done {
  opacity: 0.6;
}

.task-item.status-done .task-title {
  text-decoration: line-through;
}

.task-checkbox {
  padding-top: 2px;
}

.task-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.task-content {
  flex: 1;
  min-width: 0;
}

.task-title {
  font-size: 14px;
  color: #303133;
  margin-bottom: 4px;
  font-weight: 500;
}

.task-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #909399;
}

.task-dish {
  color: #606266;
}

.task-note {
  margin-top: 6px;
  padding: 6px 10px;
  background: #ecf5ff;
  border-radius: 4px;
  font-size: 12px;
  color: #409eff;
}

.task-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-select {
  padding: 4px 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
  background: #fff;
  cursor: pointer;
}

.btn-note {
  padding: 4px 10px;
  border: 1px solid #dcdfe6;
  background: #fff;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-note:hover {
  color: #409eff;
  border-color: #409eff;
}

.empty-day {
  text-align: center;
  padding: 40px;
  color: #909399;
  font-size: 14px;
}

.note-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  width: 400px;
  max-width: 90%;
}

.modal-content h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: #303133;
}

.modal-task-info {
  margin-bottom: 16px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 14px;
}

.task-dish-name {
  color: #909399;
  margin-left: 8px;
  font-size: 13px;
}

.modal-content textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
}

.modal-content textarea:focus {
  outline: none;
  border-color: #409eff;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

@media (max-width: 768px) {
  .prep-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .day-summary {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .task-meta {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .task-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
