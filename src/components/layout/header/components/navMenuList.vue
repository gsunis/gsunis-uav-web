<template>
  <div>
    <a-menu-item :key="index" v-for="(item, index) in children">
      <a-dropdown
        :getPopupContainer="(triggerNode) => triggerNode.parentNode"
        placement="right"
        :align="{ offset: [16, 0] }"
      >
        <div
          class="nav-item"
          @click="handleNavItem"
          :class="item.path === route.path || route.path.includes(item.path) ? 'activeItem' : ''"
        >
          {{ item.name }}
          <right-outlined v-if="item.children && item.children.length > 0" />
        </div>
        <template #overlay v-if="item.children && item.children.length > 0">
          <a-menu>
            <nav-menu-list :children="item.children" />
          </a-menu>
        </template>
      </a-dropdown>
    </a-menu-item>

    <a-modal v-model:visible="visible" :footer="null" :width="400">
      <img src="@/assets/images/qq.jpg" style="width: 90%" />
    </a-modal>
  </div>
</template>

<script setup>
import navMenuList from './navMenuList.vue'
const route = useRoute()
const visible = ref(false)

function handleNavItem() {
  visible.value = true
}

defineProps(['children'])
</script>

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

.nav-item {
  width: 110px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.activeItem {
  color: #00b0ff;
}
</style>
