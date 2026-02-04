<script setup>
import AirwayTypeItem from './AirwayTypeItem.vue'

const props = defineProps(['modelValue', 'airwayType'])
const emit = defineEmits(['update:modelValue', 'select'])
const airwayTypeOptions = [
  {
    id: 1837,
    state: 0,
    level: 0,
    type: 478,
    isDel: '0',
    tenantId: 0,
    remark: '',
    createUser: 21192,
    updateUser: 21192,
    dictName: '航点航线',
    dictCode: 'waypoint',
    createTime: '2025-11-05 16:22:57',
    updateTime: '2025-12-03 15:37:18',
    self: 'icon-hangdianhangxianicon'
  }
]

function handleItemClick(value) {
  emit('select', value)
  emit('update:modelValue', false)
}
</script>

<template>
  <div class="airway-type" v-show="modelValue">
    <h1>请选择航线类型</h1>
    <close-outlined class="close" @click="$emit('update:modelValue', false)" />
    <div class="airway-type__list">
      <AirwayTypeItem
        :key="id"
        :icon="self"
        :type="dictCode"
        :title="dictName"
        @click="handleItemClick(dictCode)"
        v-for="{ id, self, dictName, dictCode } in airwayTypeOptions"
      />
    </div>
  </div>
</template>

<style lang="less" scoped>
.airway-type {
  top: 36%;
  left: 50%;
  z-index: 2;
  width: 670px;
  height: 308px;
  position: fixed;
  transform: translate(-50%, -50%);
  background: url('@/assets/images/Airway/modal-bg.png') center center / 100% 100% no-repeat;

  h1 {
    top: 29px;
    left: 50%;
    color: #fff;
    font-size: 16px;
    line-height: 24px;
    position: absolute;
    transform: translateX(-50%);
  }

  .close {
    top: 36px;
    right: 44px;
    cursor: pointer;
    position: absolute;
  }

  &__list {
    display: flex;
    margin: 90px 60px 0;
    justify-content: space-evenly;
  }
}
</style>
