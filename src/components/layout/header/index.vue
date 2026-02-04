<script setup>
import navMenu from './components/navMenu.vue'
import UserInfo from './components/userInfo.vue'
</script>

<template>
  <a-layout-header class="layout-header">
    <nav-menu />
    <user-info />
  </a-layout-header>
</template>

<style lang="less" scoped>
.layout-header {
  padding: 0;
  width: 100%;
  height: 60px;
  z-index: 999;
  position: relative;
  background: url(@/assets/images/layout/header/bg.png) no-repeat;
  background-position: center center;
  background-size: 100% 100%;
}
</style>
