<script setup>
import { useElementHover } from '@vueuse/core'
import BaseDefault from '@/assets/images/Airway/base-default.png'
import frameDefault from '@/assets/images/Airway/frame-default.png'
import BaseActivation from '@/assets/images/Airway/base-activation.png'
import frameActivation from '@/assets/images/Airway/frame-activation.png'

const airwayTypeItemRef = ref(null)
const isHovered = useElementHover(airwayTypeItemRef)
const props = defineProps({ type: String, title: String, icon: String })
const setFrameImage = computed(() => (isHovered.value ? `url(${frameActivation})` : `url(${frameDefault})`))
const setBaseImage = computed(() => {
  if (isHovered.value) {
    return `url(${BaseActivation})`
  } else {
    return `url(${BaseDefault})`
  }
})
</script>

<template>
  <div ref="airwayTypeItemRef" class="airway-type__item">
    <div
      class="airway-type__item__frame"
      :style="{
        backgroundImage: setFrameImage,
        transform: isHovered ? 'translateY(-10px)' : ''
      }"
    >
      <icon-font :type="props.icon" />
      <h2>{{ props.title }}</h2>
    </div>
    <div
      class="airway-type__item__base"
      :style="{ backgroundImage: setBaseImage, height: isHovered ? '72px' : '24px' }"
    ></div>
  </div>
</template>

<style lang="less" scoped>
.airway-type__item {
  width: 80px;
  height: 155px;
  cursor: pointer;
  position: relative;

  &__frame {
    z-index: 1;
    height: 126px;
    text-align: center;
    background-size: 100% 100%;
    transition: transform 0.3s ease;

    span {
      margin: 18px 0;
      font-size: 36px;
    }

    h2 {
      margin: 0;
      color: #fff;
      font-size: 14px;
      line-height: 22px;
    }
  }

  &__base {
    bottom: 0;
    z-index: 2;
    width: 72px;
    height: 24px;
    margin: 0 4px;
    position: absolute;
    background: url('@/assets/images/Airway/base-default.png') center center / 100% 100% no-repeat;
  }
}
</style>
