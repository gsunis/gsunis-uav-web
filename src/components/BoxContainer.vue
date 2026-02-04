<script lang="ts" setup>
const props = defineProps({
  size: {
    type: String,
    default: 'default'
  },
  isHeader: {
    type: Boolean,
    default: false
  }
})

const initSize = computed(() => {
  return props.size === 'default' ? '12px' : '4px'
})
</script>

<template>
  <div class="box-container-header" v-if="isHeader">
    <div class="box">
      <slot></slot>
    </div>
  </div>
  <div class="box-container" v-else>
    <div class="box">
      <slot></slot>
    </div>
    <div class="horn top-left"></div>
    <div class="horn top-right"></div>
    <div class="horn bottom-left"></div>
    <div class="horn bottom-right"></div>
  </div>
</template>

<style lang="less" scoped>
.box-container {
  height: 100%;
  position: relative;
  box-sizing: border-box;
  border: 1px solid #1e3e60;
  background-color: rgba(14, 19, 25, 0.4);

  .box {
    width: 100%;
    height: 100%;
    overflow-y: auto;
  }

  .top-left {
    top: -1px;
    left: -1px;
    border-top: 1px solid;
    border-left: 1px solid;
  }

  .top-right {
    top: -1px;
    right: -1px;
    border-top: 1px solid;
    border-right: 1px solid;
  }

  .bottom-left {
    left: -1px;
    bottom: -1px;
    border-left: 1px solid;
    border-bottom: 1px solid;
  }

  .bottom-right {
    right: -1px;
    bottom: -1px;
    border-right: 1px solid;
    border-bottom: 1px solid;
  }

  .horn {
    position: absolute;
    box-sizing: border-box;
    border-color: #6e83c8;
    width: v-bind(initSize);
    height: v-bind(initSize);
  }
}

.box-container-header {
  height: 100%;
  background: url('@/assets/images/box-container-bg.png') center center / 100% 100% no-repeat;

  .box {
    width: 100%;
    height: 100%;
    overflow-y: auto;
  }
}
</style>
