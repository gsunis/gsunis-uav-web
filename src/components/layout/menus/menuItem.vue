<template>
  <template v-if="Array.isArray(menus)">
    <template v-for="(menu, index) in menus" :key="index">
      <a-sub-menu v-if="menu.children && menu.children.length > 0" :key="menu.path" popupClassName="top_sub_menu">
        <template #icon><icon-font :type="menu.icon" style="font-size: 16px" /></template>
        <template #title>{{ menu.name }}</template>
        <MenuItem :menus="menu.children" />
      </a-sub-menu>
      <a-menu-item v-else :key="menu.path" @click="toPath(menu)">
        <template #icon><icon-font :type="menu.icon" style="font-size: 16px" /></template>
        <span>{{ menu.name }}</span>
      </a-menu-item>
    </template>
  </template>
  <template v-else>
    <a-menu-item :key="menus.path" @click="toPath(menus)">
      <template #icon><icon-font :type="menus.icon" style="font-size: 16px" /></template>
      <span>{{ menus.name }}</span>
    </a-menu-item>
  </template>
</template>

<script setup>
import { verifyUrl } from '@/utils/index'
import { notification } from 'ant-design-vue'

defineProps({
  menus: {
    type: Array,
    required: true,
    default: () => []
  }
})
const router = useRouter()
const addHistory = () => {}
const toPath = (item) => {
  try {
    addHistory(item)
    const { origin } = window.location
    if (item.isLink == 0) {
      if (verifyUrl(item.links)) {
        window.open(item.links)
      } else {
        window.open(`${origin}/${item.path}`)
      }
    } else {
      router.push(item.path)
    }
  } catch (err) {
    notification.error({
      message: '菜单跳转失败!',
      description: err
    })
  }
}
</script>

<style lang="less" scoped></style>
