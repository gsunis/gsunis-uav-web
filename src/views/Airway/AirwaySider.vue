<script setup>
import { ORG_OPTIONS } from '@/mock'

const orgList = ref([])
const selectedKeys = ref([])
const { updateActiveOrg } = inject('activeOrg', {})

function setUserSelectedKeys(item) {
  updateActiveOrg(item)

  selectedKeys.value = item.nodePathc.split('.').map(Number)
}

async function getOrgList() {
  orgList.value = ORG_OPTIONS
  setUserSelectedKeys(orgList.value[0])
}

onMounted(() => getOrgList())
</script>

<template>
  <div class="airway-sider">
    <box-container style="padding: 16px">
      <org-tree :options="orgList" v-model="selectedKeys" @select="setUserSelectedKeys" />
    </box-container>
  </div>
</template>

<style scoped>
.airway-sider {
  width: 320px;
  flex-shrink: 0;
  margin-right: 16px;
}
</style>
