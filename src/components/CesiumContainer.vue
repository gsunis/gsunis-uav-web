<script setup>
window.CESIUM_BASE_URL = "/cesium"

import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { Camera, Viewer, Rectangle, ScreenSpaceEventType } from 'cesium'

const viewer = ref()
const emit = defineEmits(['ready', 'geofence'])
const props = defineProps({
  orgId: Number,
  idName: {
    type: String,
    default: 'cesium-container'
  }
})

async function initCesium() {
  if (viewer.value) {
    viewer.value.destroy()
  }

  Camera.DEFAULT_VIEW_RECTANGLE = new Rectangle.fromDegrees(75.0, 0.0, 140.0, 60.0) // 默认定位到中国上空

  viewer.value = new Viewer(props.idName, {
    geocoder: false, // 搜索框
    infoBox: false, //信息面板
    homeButton: false, // home按钮
    timeline: false, // 底部的时间轴
    shouldAnimate: false, // 控制模型动画
    baseLayerPicker: false, // 图层选择按钮
    selectionIndicator: false, // 选择指示器
    animation: false, // 左下角的动画控件的显示
    sceneModePicker: false, // 3d 模式切换按钮
    imageryProvider: false, // 关闭加载默认底图
    fullscreenButton: false, // 右下角的全屏按钮
    navigationHelpButton: false, //右上角的帮助按钮
    showRenderLoopErrors: false, // 关闭渲染错误提示
    maximumRenderTimeChange: Infinity,
    contextOptions: {
      webgl: {
        alpha: false, // 提高渲染效率
        antialias: false, // 关闭抗锯齿提高性能
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance'
      }
    }
  })
  // 隐藏星空、太阳、月亮
  viewer.value.scene.sun.show = false
  viewer.value.scene.moon.show = false
  viewer.value.scene.skyBox.show = false
  // 限制滚轮/触摸缩放的最大最小距离（米）
  viewer.value.scene.screenSpaceCameraController.maximumZoomDistance = 2570314 // 最大缩放高度（能看到甘肃省全貌）
  viewer.value.scene.globe.depthTestAgainstTerrain = false // 关闭深度检测
  viewer.value.cesiumWidget.creditContainer.style.display = 'none' //隐藏logo版权
  viewer.value.scene.backgroundColor = Cesium.Color.fromCssColorString('#324696') // 设置天空背景颜色
  viewer.value.scene.light = new Cesium.DirectionalLight({ direction: new Cesium.Cartesian3(0, 0, -1) }) // 设置环境光
  viewer.value.cesiumWidget.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK) // 禁用左键双击事件
  // 限制帧率，优化加载速度
  viewer.value.clock.multiplier = 1
  viewer.value.clock.shouldAnimate = false
  viewer.value.useDefaultRenderLoop = true
  viewer.value.targetFrameRate = 30 // 限制到30FPS
  viewer.value.scene.textureCompression = true // 使用压缩纹理
  viewer.value.scene.globe.preloadSiblings = true // 预加载相邻地形块
  viewer.value.scene.globe.enableLighting = false // 关闭地球的光照计算
  viewer.value.resolutionScale = window.devicePixelRatio // 使用设备像素比
  viewer.value.scene.postProcessStages.bloom.enabled = false // 禁用不必要的后期效果
  // 简化着色器
  viewer.value.scene.moon.show = false
  viewer.value.scene.skyAtmosphere.show = false
  // 开启抗锯齿
  viewer.value.scene.fxaa = true
  viewer.value.scene.postProcessStages.fxaa.enabled = true

  emit('ready', viewer.value)
}

onMounted(() => initCesium())
</script>

<template>
  <div :id="props.idName" class="cesium-container">
    <cesium-navigation :viewer="viewer" v-if="viewer" />
  </div>
</template>

<style lang="less" scoped>
.cesium-container {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>
