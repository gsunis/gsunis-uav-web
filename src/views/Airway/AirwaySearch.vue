<template>
  <div class="airway-search">
    <box-container>
      <div class="airway-search__container">
        <a-form layout="inline" :model="formState" ref="formRef">
          <a-form-item label="机场名称" name="hangarName">
            <a-select
              allow-clear
              placeholder="请选择机场"
              :options="hangarOptions"
              v-model:value="formState.hangarName"
              :field-names="{ label: 'name', value: 'name' }"
            />
          </a-form-item>

          <a-form-item label="航线名称" name="name">
            <a-input allow-clear v-model:value.trim="formState.name" placeholder="请输入航线名称" />
          </a-form-item>

          <a-form-item label="航线类型" name="type">
            <a-select
              allow-clear
              placeholder="请选择航线类型"
              :options="airwayTypeOptions"
              v-model:value="formState.type"
              :field-names="{ label: 'dictName', value: 'dictCode' }"
            />
          </a-form-item>

          <a-form-item label="算法类型" name="aiTypeName">
            <a-select
              allow-clear
              placeholder="请选择算法类型"
              :options="algorithmOptions"
              v-model:value="formState.aiTypeName"
              :field-names="{ label: 'name', value: 'name' }"
            />
          </a-form-item>

          <a-form-item label="创建时间" name="time">
            <a-range-picker style="width: 240px" v-model:value="formState.time" value-format="YYYY-MM-DD" />
          </a-form-item>

          <a-form-item>
            <a-space>
              <a-button type="primary">查询</a-button>
              <a-button type="primary" ghost>清空</a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </div>
    </box-container>
  </div>
</template>

<script setup>
const formRef = ref()
const formState = ref({})
const algorithmOptions = ref([])
const airwayTypeOptions = ref([])
const { activeOrg } = inject('activeOrg', {})
const emit = defineEmits(['search', 'reset'])
const hangarOptions = computed(() => activeOrg.value?.hangarList || [])

async function getAlgorithmOptions() {
  algorithmOptions.value = [
    {
      id: 1941995588,
      name: '违规构筑检测',
      type: 2,
      status: 0,
      parentId: 1941995562,
      code: 'uav_illegalConstruction',
      disposeMethod: 'ScreenShot',
      confidence: 0.5,
      alarmThreshold: 1,
      orgId: 408,
      tenantId: 122,
      createBy: '21224',
      createTime: '2026-01-06 14:37:53',
      remark: '',
      actualName: '测试人员',
      orgName: '测试机构',
      disposeMethodName: '截图'
    }
  ]
}

async function getAirwayTypeOptions() {
  airwayTypeOptions.value = [
    {
      id: 1837,
      dictName: '航点航线',
      dictCode: 'waypoint',
      type: 478,
      isDel: '0',
      state: 0,
      level: 0,
      tenantId: 0,
      remark: '',
      createUser: 21192,
      createTime: '2025-11-05 16:22:57',
      updateUser: 21192,
      updateTime: '2025-12-03 15:37:18',
      self: 'icon-hangdianhangxianicon'
    }
  ]
}

watch(activeOrg, () => formRef.value.resetFields())

onMounted(() => {
  getAlgorithmOptions()
  getAirwayTypeOptions()
})
</script>

<style lang="less" scoped>
.airway-search {
  height: 116px;
  margin-bottom: 16px;

  .ant-select {
    width: 180px;
  }

  &__container {
    height: 100%;
    padding: 16px;

    .ant-form-item {
      padding-bottom: 16px;
    }
  }
}
</style>
