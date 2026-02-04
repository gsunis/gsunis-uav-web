<script setup>
const actionType = ref()
const formState = ref({})
const actionFormRef = ref()
const selectOptions = ref([])
const emit = defineEmits(['update:modelValue', 'submit'])
const props = defineProps(['modelValue', 'actions', 'edit'])

function handleActionChange(_, option) {
  const { dictCode, dictName: actModeName } = option

  actionType.value = null
  formState.value = { ...formState.value, dictCode, actModeName, actValue: undefined }
}

async function handleSubmit() {
  await actionFormRef.value.validateFields()
  emit('submit', { ...formState.value })
}

function cleanForm() {
  formState.value = {}
  actionType.value = null
}

function initData() {
  if (props.edit) {
    formState.value = { ...props.edit }

    props.actions.forEach((item) => {
      if (item.id === props.edit.actMode) {
        const params = { ...item }

        if (item.self) {
          const self = JSON.parse(item.self)

          params.self = self
        }

        actionType.value = params
      }
    })
  }
}

watch(
  () => props.modelValue,
  (value) => {
    value ? initData() : cleanForm()
  }
)
</script>

<template>
  <a-modal
    ok-text="保存"
    @ok="handleSubmit"
    :visible="modelValue"
    @cancel="$emit('update:modelValue', false)"
    :title="`${props.edit ? '编辑' : '新建'}动作`"
  >
    <a-form :model="formState" layout="vertical" ref="actionFormRef">
      <a-form-item label="动作类型" name="actMode" :rules="[{ required: true, message: '请选择动作类型!' }]">
        <a-select
          :options="actions"
          placeholder="请选择动作类型"
          @change="handleActionChange"
          v-model:value="formState.actMode"
          :field-names="{ label: 'dictName', value: 'id' }"
        />
      </a-form-item>
      <a-form-item
        name="actValue"
        v-if="actionType?.self.component_type === 'slider'"
        :rules="[{ required: true, message: `请检查数据格式!` }]"
      >
        <template v-slot:label>
          <div class="container">
            <span>{{ actionType.dictName }}:</span>
            <a-input-number
              size="small"
              :precision="0"
              :controls="false"
              style="width: 100px"
              :max="actionType.self.max"
              :min="actionType.self.min"
              v-model:value="formState.actValue"
              :addon-after="actionType.self.unit"
            />
          </div>
        </template>
        <a-form-item-rest>
          <a-slider
            :max="actionType.self.max"
            :min="actionType.self.min"
            v-model:value="formState.actValue"
            :marks="{ [actionType.self.min]: actionType.self.min, [actionType.self.max]: actionType.self.max }"
          />
        </a-form-item-rest>
      </a-form-item>
      <a-form-item
        name="actValue"
        :label="actionType.dictName"
        v-if="actionType?.self.component_type === 'select'"
        :rules="[{ required: true, message: `请选择${actionType.dictName}!` }]"
      >
        <a-select
          :options="selectOptions"
          v-model:value="formState.actValue"
          :field-names="actionType.self.field_names"
          :placeholder="`请选择${actionType.dictName}`"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<style lang="less" scoped>
:deep(.ant-form-item-required) {
  width: 100%;

  .container {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}
</style>
