<script setup>
import orgTreeItem from './OrgTreeItem.vue'

const orgList = ref([])
const searchValue = ref()
const selectedKeys = ref([])
const emit = defineEmits(['select', 'update:modelValue'])
const props = defineProps({
  options: { type: Array, default: () => [] },
  modelValue: { type: Array, default: () => [] }
})

function findOrgByName(data, keyword) {
  const result = []

  function recursiveSearch(items) {
    for (const item of items) {
      if (item.orgName && item.orgName.includes(keyword)) {
        result.push({ ...item, children: [] })
      }

      if (item.children && item.children.length > 0) {
        recursiveSearch(item.children)
      }
    }
  }

  recursiveSearch(data)

  return result
}

function handleOrgChange() {
  let item

  if (searchValue.value.trim()) {
    const res = findOrgByName(props.options, searchValue.value.trim())

    if (res.length > 0) {
      item = res[0]
      orgList.value = res
    } else {
      return false
    }
  } else {
    orgList.value = props.options
    item = orgList.value[0]
  }

  emit('select', item)
  emit('update:modelValue', item.nodePathc.split('.').map(Number))
}

function setUserSelectedKeys(item) {
  emit('select', item)
  emit('update:modelValue', item.nodePathc.split('.').map(Number))
}

watch(
  () => props.options,
  (value) => {
    orgList.value = value
  }
)

watch(
  () => props.modelValue,
  (value) => {
    selectedKeys.value = value
  }
)
</script>

<template>
  <a-input
    allow-clear
    @change="handleOrgChange"
    style="margin-bottom: 8px"
    placeholder="请输入机构名称"
    v-model:value="searchValue"
  />
  <org-tree-item :options="orgList" v-model="selectedKeys" @select="setUserSelectedKeys" />
</template>
