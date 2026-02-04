<template>
  <div class="top_menu">
    <a-menu v-model:selectedKeys="selectedKeys" mode="horizontal">
      <template v-for="(menu, index) in userStore.sideMenu" :key="index">
        <a-sub-menu
          v-if="menu.children && menu.children.length > 0 && menu.type !== 0"
          :key="menu.path"
          popupClassName="top_sub_menu"
          :popupOffset="[-25, 10]"
        >
          <template #icon><icon-font :type="menu.icon" style="font-size: 16px" /></template>
          <template #title>{{ menu.name }}</template>
          <MenuItem :menus="menu.children" />
        </a-sub-menu>
        <MenuItem :menus="menu.children" v-else-if="menu.children && menu.children.length > 0 && menu.type === 0" />
        <MenuItem :menus="menu" v-else />
      </template>
    </a-menu>
  </div>
</template>

<script setup>
const route = useRoute()
const selectedKeys = ref([''])

onMounted(() => {
  selectedKeys.value = [route.path]
})
// 监听当前路由
watch(
  () => route.path,
  (newValue) => {
    selectedKeys.value = [newValue]
  }
)
</script>

<style lang="less" scoped>
.top_menu {
  :deep(.ant-menu) {
    max-width: calc(100vw - 888px);
    color: @main-text-color;
    background: transparent;
    border: none;
  }

  :deep(.ant-menu-horizontal:not(.ant-menu-dark) .ant-menu-item-selected) {
    color: #5fc4f3;

    .ant-menu-title-content {
      color: transparent;
      font-size: 18px !important;
      font-weight: bold;
      background: linear-gradient(180deg, #ffffff 0%, #32ade6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      color: transparent;
    }

    svg {
      fill: #5fc4f3;
    }
  }

  :deep(.ant-menu-horizontal:not(.ant-menu-dark) .ant-menu-submenu-selected) {
    color: #5fc4f3;

    .ant-menu-title-content {
      color: transparent;
      font-size: 18px !important;
      font-weight: bold;
      background: linear-gradient(180deg, #ffffff 0%, #32ade6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      color: transparent;
    }

    svg {
      fill: #5fc4f3;
    }
  }

  :deep(.ant-menu-horizontal:not(.ant-menu-dark) .ant-menu-submenu-open:not(.ant-menu-submenu-selected)) {
    color: @main-text-color;
    svg {
      fill: @main-text-color;
    }
  }

  :deep(.ant-menu-horizontal:not(.ant-menu-dark) .ant-menu-submenu-active:not(.ant-menu-submenu-selected)) {
    color: @main-text-color;

    svg {
      fill: @main-text-color;
    }
  }

  :deep(.ant-menu-horizontal:not(.ant-menu-dark) .ant-menu-item:not(.ant-menu-item-selected):hover) {
    color: @main-text-color;
    background-image: url('@/assets/images/menu_border_bottom.png');
    background-repeat: repeat-x;
    background-size: contain;
    background-position-y: bottom;

    .ant-menu-title-content {
      color: @main-text-color;
    }

    svg {
      fill: @main-text-color;
    }

    &::after {
      border: none;
    }
  }

  :deep(.ant-menu-horizontal:not(.ant-menu-dark) .ant-menu-submenu:not(.ant-menu-submenu-selected):hover) {
    color: @main-text-color;

    .ant-menu-title-content {
      color: @main-text-color;
    }

    svg {
      fill: @main-text-color;
    }

    &::after {
      border: none;
    }

    .ant-menu-submenu-title {
      background-image: url('@/assets/images/menu_border_bottom.png');
      background-repeat: repeat-x;
      background-size: contain;
      background-position-y: bottom;
    }
  }

  :deep(.ant-menu-horizontal:not(.ant-menu-dark) .ant-menu-submenu-selected::after) {
    border: none;
  }

  :deep(.ant-menu-horizontal:not(.ant-menu-dark) .ant-menu-item-selected::after) {
    border: none;
  }

  :deep(.ant-menu-horizontal:not(.ant-menu-dark) .ant-menu-item::after) {
    border: none;
  }

  :deep(.ant-menu-horizontal:not(.ant-menu-dark) .ant-menu-submenu::after) {
    border: none;
  }

  :deep(.ant-menu-horizontal:not(.ant-menu-dark) .ant-menu-submenu-selected .ant-menu-submenu-title) {
    background-image: url('@/assets/images/menu_border_bottom.png');
    background-repeat: repeat-x;
    background-size: contain;
    background-position-y: bottom;
  }

  :deep(.ant-menu-horizontal:not(.ant-menu-dark) .ant-menu-item-selected) {
    background-image: url('@/assets/images/menu_border_bottom.png');
    background-repeat: repeat-x;
    background-size: contain;
    background-position-y: bottom;
  }
}
</style>
