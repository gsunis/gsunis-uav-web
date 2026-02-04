<template>
  <div class="tw-w-full tw-h-full tw-flex tw-justify-center tw-items-center">
    <a-result>
      <template #icon>
        <img src="@/assets/images/qq.jpg" style="width: 340px;" />
      </template>
    </a-result>
  </div>
</template>

<script setup>
</script>
<style lang="less" scoped>
:deep(.ant-result-title) {
  color: rgba(62, 62, 62, 0.85);
  font-size: 24px;
  line-height: 1.8;
  text-align: center;
}
:deep(.ant-result-subtitle) {
  color: rgb(168 32 32 / 60%);
  font-size: 14px;
  line-height: 1.6;
  text-align: center;
}
</style>
