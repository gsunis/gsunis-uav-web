<script setup>
import {NAV_MENU_OPTIONS} from '@/mock'
import navMenuItem from './navMenuItem.vue'
</script>

<template>
  <div class="nav-menu">
    <div class="nav-menu__container">
      <nav-menu-item :key="index" v-bind="item" v-for="(item, index) in NAV_MENU_OPTIONS.slice(1, 3)" />
    </div>

    <img src="@/assets/images/logo.png" alt="logo" class="nav-menu__logo" />
    <div class="nav-menu__container">
      <nav-menu-item :key="index" v-bind="item" v-for="(item, index) in NAV_MENU_OPTIONS.slice(3, 5)" />
    </div>
  </div>
</template>

<style lang="less" scoped>
.nav-menu {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  &__logo {
    width: 300px;

    @media (max-width: 1399px) {
      margin: 0 1vw;
    }

    @media (min-width: 1400px) and (max-width: 1599px) {
      margin: 0 5vw;
    }

    @media (min-width: 1600px) {
      margin: 0 8vw;
    }
  }

  &__container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: flex-end;

    &:last-child {
      justify-content: flex-start;
    }
  }
}
</style>
