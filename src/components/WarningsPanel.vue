<template>
  <div class="warnings-panel" v-if="hasAnyWarning">
    <div class="warnings-header">
      <span class="warnings-icon">⚠️</span>
      <span class="warnings-title">营养检查提醒</span>
      <button class="warnings-toggle" @click="expanded = !expanded">
        {{ expanded ? '收起' : '展开' }}
      </button>
    </div>
    
    <div class="warnings-body" v-show="expanded">
      <div 
        v-for="day in DAYS_OF_WEEK" 
        :key="day.value"
        class="day-warnings-section"
        v-if="getDayWarnings(day.value).length > 0"
      >
        <div class="day-label">{{ day.label }}</div>
        <ul class="warning-list">
          <li 
            v-for="(warning, idx) in getDayWarnings(day.value)" 
            :key="idx"
            :class="warning.severity"
          >
            <span class="warning-type-icon">
              {{ warning.severity === 'error' ? '❌' : '⚠️' }}
            </span>
            {{ warning.message }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { DAYS_OF_WEEK } from '../constants.js'
import { useMenuChecker } from '../useMenuChecker.js'

const { hasAnyWarning, getDayWarnings } = useMenuChecker()

const expanded = ref(false)
</script>
