<script setup>
import AirwaySider from './AirwaySider.vue'
import AirwaySearch from './AirwaySearch.vue'
import AirwayContent from './AirwayContent.vue'

const activeOrg = ref()
const airwayType = ref(0)
const cesiumViewer = ref()
const airwaySearchData = ref({})

provide('activeOrg', { activeOrg, updateActiveOrg })
provide('airwayType', { airwayType, updateAirwayType })
provide('cesiumViewer', { cesiumViewer, updateCesiumViewer })

function updateAirwayType(value) {
  airwayType.value = value
}

function updateCesiumViewer(value) {
  cesiumViewer.value = value
}

function updateActiveOrg(value) {
  activeOrg.value = value
}

function handleAirwaySearch(value) {
  airwaySearchData.value = value
}

function handleAirwayReset() {
  airwaySearchData.value = {}
}
</script>

<template>
  <div class="airway">
    <airway-sider />
    <div class="airway__layout">
      <airway-search @search="handleAirwaySearch" @reset="handleAirwayReset" />
      <airway-content :search-data="airwaySearchData" />
    </div>
  </div>
</template>

<style lang="less" scoped>
.airway {
  width: 100%;
  padding: 16px;
  display: flex;
  margin-top: 60px;
  overflow: hidden;
  position: relative;
  height: calc(100vh - 60px);

  &__layout {
    flex: 1;
  }
}
</style>
