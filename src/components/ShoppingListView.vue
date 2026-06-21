<template>
  <div class="shopping-view">
    <div class="shopping-header">
      <h2>采购汇总</h2>
      <div class="shopping-stats">
        <span class="stat-item">共 {{ totalIngredientsCount }} 种主料</span>
        <span class="stat-item warning" v-if="warningCount > 0">
          {{ warningCount }} 项需注意
        </span>
      </div>
      <button class="btn btn-primary" @click="handleExport">导出CSV</button>
    </div>

    <div class="shopping-list-container">
      <table class="shopping-table">
        <thead>
          <tr>
            <th class="col-status">状态</th>
            <th class="col-name">主料名称</th>
            <th class="col-amount">总需求量</th>
            <th class="col-unit">单位</th>
            <th class="col-dishes">涉及菜品</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="item in shoppingList" 
            :key="item.name"
            :class="`severity-${item.severity}`"
          >
            <td class="col-status">
              <span 
                v-if="item.severity !== 'normal'" 
                class="status-badge"
                :class="item.severity"
              >
                {{ item.warning }}
              </span>
              <span v-else class="status-ok">正常</span>
            </td>
            <td class="col-name">{{ item.name }}</td>
            <td class="col-amount">{{ item.totalAmount || '-' }}</td>
            <td class="col-unit">{{ item.unit || '-' }}</td>
            <td class="col-dishes">
              <div class="dish-tags">
                <span 
                  v-for="dish in item.dishes.slice(0, 3)" 
                  :key="dish.id" 
                  class="dish-tag"
                  :title="dish.amount ? `${dish.amount}${dish.unit}` : ''"
                >
                  {{ dish.name }}
                </span>
                <span v-if="item.dishes.length > 3" class="more-dishes">
                  +{{ item.dishes.length - 3 }}
                </span>
              </div>
            </td>
          </tr>
          <tr v-if="shoppingList.length === 0">
            <td colspan="5" class="empty-row">
              暂无采购数据，请先添加菜品和主料
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="shopping-legend">
      <div class="legend-item">
        <span class="legend-dot error"></span>
        <span>可能不足 / 需重点关注</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot warning"></span>
        <span>单位不一致</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot info"></span>
        <span>多道菜使用</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useShoppingList } from '../useShoppingList.js'
import { useMenuStore } from '../useMenuStore.js'

const { shoppingList, totalIngredientsCount, warningCount } = useShoppingList()
const { exportIngredientsCSV } = useMenuStore()

const handleExport = () => {
  exportIngredientsCSV(shoppingList.value)
}
</script>
