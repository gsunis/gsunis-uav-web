<template>
  <a-layout class="tw-w-full tw-h-full tw-z-10">
    <a-layout-content class="app-main" :style="bg">
      <router-view v-slot="{ Component, route }">
        <transition name="scale" mode="out-in">
          <keep-alive :include="useTags.tagsCaches" v-if="route.meta.keepAlive">
            <component :is="Component" :key="route.path" v-if="isRouterKeepAlive" />
          </keep-alive>
          <component :is="Component" :key="route.path" v-else />
        </transition>
      </router-view>
    </a-layout-content>
  </a-layout>
</template>

<script setup>
import { useTagsStore } from '@/store/modules/tags'
const useTags = useTagsStore()
const route = useRoute()
const isRouterKeepAlive = ref(true)
const reload = () => {
  isRouterKeepAlive.value = false
  nextTick(() => {
    isRouterKeepAlive.value = true
  })
}
const bg = computed(() => {
  if (route.path.indexOf('FlightControl') > -1 || route.path.indexOf('TrunkedDispatch') > -1) {
    return 'background: #042E64;'
  } else {
    return 'background: #042E64;'
  }
})
provide('refresh', reload)
</script>

<style lang="less" scoped>
.app-main {
  width: 100%;
  height: 100%;
  overflow: hidden;
  overflow-y: auto;
  z-index: 99;
  margin: -66px 0 0;
  padding: 0;
}

.scale-enter-active,
.scale-leave-active {
  transition: all 0.5s ease;
}

.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
