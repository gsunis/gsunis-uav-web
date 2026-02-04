<template>
  <a-layout class="tw-flex tw-items-center tw-w-full tw-h-full tw-relative">
    <Header />
    <a-layout class="tw-relative tw-w-full">
      <section class="tw-w-full tw-h-full tw-flex">
        <MainCon />
      </section>
    </a-layout>
  </a-layout>
</template>
<script setup>
import { NextLoading } from '@/utils/loading'

onMounted(async () => {
  NextLoading.finish()
})
</script>
