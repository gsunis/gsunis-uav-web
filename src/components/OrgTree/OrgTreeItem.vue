<script setup>
const emit = defineEmits(['select', 'update:modelValue'])
const props = defineProps({
  level: { type: Number, default: 0 },
  options: { type: Array, default: () => [] },
  modelValue: { type: Array, default: () => [] }
})

function handleNodeClick(item) {
  emit('select', item)
  emit('update:modelValue', item.nodePath.split('.').map(Number).slice(1))
}

function isItemSelected(id) {
  return props.modelValue.includes(id)
}
</script>

<template>
  <div :key="item.id" v-for="item in options" class="org_tree">
    <div
      @click="handleNodeClick(item)"
      :class="['item', props.modelValue.at(-1) === item.id ? 'selected' : '']"
      :style="{ paddingLeft: `${(item?.children.length > 0 ? 8 : 2) + props.level * 20}px` }"
    >
      <template v-if="item?.children.length > 0">
        <caret-down-outlined v-show="isItemSelected(item.id)" />
        <caret-right-outlined v-show="!isItemSelected(item.id)" />
      </template>
      <span style="margin: 0 2px 0 8px">{{ item.orgName }}</span>
      <span v-if="item?.children.length > 0">[{{ item.children.length }}]</span>
    </div>
    <template v-if="item?.children.length > 0 && isItemSelected(item.id)">
      <org-tree-item
        :modelValue="modelValue"
        :options="item.children"
        :level="props.level + 1"
        @select="emit('select', $event)"
        @update:modelValue="emit('update:modelValue', $event)"
      />
    </template>
  </div>
</template>

<style lang="less">
.org_tree {
  overflow-y: auto;

  .item {
    cursor: pointer;
    padding: 5px 8px;
    line-height: 22px;
    user-select: none;
    margin-bottom: 8px;
    background-color: rgba(80, 100, 160, 0.12);

    &:hover,
    &.selected {
      background: linear-gradient(90deg, rgba(68, 138, 255, 0.8) 0%, rgba(68, 138, 255, 0) 100%),
        rgba(80, 100, 160, 0.12);
    }
  }
}
</style>
