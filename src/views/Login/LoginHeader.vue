<template>
  <div class="tw-top-0 tw-left-0 tw-z-50 tw-flex tw-items-center tw-w-full tw-fixed">
    <img class="tw-w-96 tw-ml-4 tw-mt-4" :src="logoUrl" alt="logo" />
  </div>
</template>
<script setup>
defineProps({
  logoUrl: {
    type: String,
    default: ''
  }
})
</script>
