<script setup>
import navMenuList from './navMenuList.vue'

const props = defineProps(['name', 'type', 'icon', 'path', 'children', 'id', 'code'])
</script>

<template>
  <div
    @click="children?.length === 1 && $router.push(children[0].path)"
    :class="['nav-menu-item', type]"
  >
    <a-dropdown
      :getPopupContainer="(triggerNode) => triggerNode.parentNode"
      placement="bottom"
      :align="{ offset: [0, 8] }"
    >
      <a-space :size="0">
        <img
          src="@/assets/images/layout/header/head-icon-1.png"
          style="height: 22px; margin-right: -2px"
          v-if="code === 'RoutesAndMissions'"
        />
        <img
          src="@/assets/images/layout/header/head-icon-2.png"
          style="height: 22px; margin-right: -3px"
          v-else-if="code === 'FlightControlAndActions'"
        />
        <img
          src="@/assets/images/layout/header/head-icon-3.png"
          style="height: 22px"
          v-else-if="code === 'HistoryAndEvents'"
        />
        <img src="@/assets/images/layout/header/head-icon-sys.png" style="height: 22px" v-else-if="type === 'system'" />
        <img src="@/assets/images/layout/header/head-icon-4.png" style="height: 22px" v-else />
        <template v-if="type !== 'system'">
          <span>{{ name }}</span>
          <caret-down-outlined v-if="children?.length > 1" />
        </template>
      </a-space>

      <template #overlay v-if="children?.length > 1">
        <a-menu>
          <nav-menu-list :children="children" />
        </a-menu>
      </template>
    </a-dropdown>
  </div>
</template>

<style lang="less" scoped>
:deep(.ant-dropdown-menu-title-content) {
  padding: 0 0 0 4px;
}

:deep(.ant-dropdown-menu) {
  background: linear-gradient(180deg, rgba(68, 138, 255, 0.4) 0%, rgba(68, 138, 255, 0) 100%), #001630;
  box-sizing: border-box;
  border: 1px solid transparent; /* 显式设为transparent，避免默认边框色干扰 */
  border-image: linear-gradient(0deg, rgba(68, 138, 255, 0.7981) 0%, rgba(67, 234, 255, 0.8) 99%);
  border-image-slice: 1; /* 关键：将渐变图像切片并应用到边框 */
  border-image-width: 1;
  border-image-outset: 0;
  border-image-repeat: stretch;
  box-shadow: 0px 8px 16px 0px rgba(14, 19, 25, 0.5), inset 0px 0px 12px 0px rgba(68, 138, 255, 0.8);
}

:deep(.ant-dropdown-menu-item:hover),
:deep(.ant-dropdown-menu-submenu-title:hover) {
  background: linear-gradient(90deg, transparent, #448aff 50%, transparent);
  position: relative;
}

.nav-menu-item {
  width: 145.5px;
  height: 32px;
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  font-family: PingFang SC;
  font-size: 14px;
  font-weight: 500;
  line-height: 22px;
  letter-spacing: 0px;
  color: #ffffff;
}

.left {
  background: url(@/assets/images/layout/header/nav-menu-item-left.png) center center / 100% 100% no-repeat;
  margin-left: -20px;
  &:hover,
  &.active {
    background: url(@/assets/images/layout/header/nav-menu-item-left-active.png) center center / 100% 100% no-repeat;
  }
}

.right {
  background: url(@/assets/images/layout/header/nav-menu-item-right.png) center center / 100% 100% no-repeat;
  margin-right: -20px;
  &:hover,
  &.active {
    background: url(@/assets/images/layout/header/nav-menu-item-right-active.png) center center / 100% 100% no-repeat;
  }
}

.system {
  width: 22px;
  transition: transform 0.3s ease-in-out;
  &:hover {
    transform: rotate(360deg);
  }
}

.activeItem {
  color: #00b0ff;
}
</style>
