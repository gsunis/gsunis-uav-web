<script setup>
import * as Cesium from 'cesium'
import { IMAGERY_LAYERS_OPTIONS } from '@/mock'
import { WebMapTileServiceImageryProvider } from 'cesium'

const imageryLayers = ref(IMAGERY_LAYERS_OPTIONS)
const props = defineProps({
  viewer: {
    type: Object,
    default: () => {}
  }
})

function loadImageryLayer(classConfig) {
  if (!classConfig.maximumLevel || !classConfig.subdomains) {
    return
  }
  classConfig.maximumLevel = Number(classConfig.maximumLevel)
  classConfig.subdomains = Array.isArray(classConfig.subdomains)
    ? classConfig.subdomains
    : JSON.parse(classConfig.subdomains)

  const tMapImagery = new WebMapTileServiceImageryProvider({
    ...classConfig,
    url: `${classConfig.url}/${classConfig.layer}_w/wmts?tk=${import.meta.env.VITE_TIANDITU_KEY}`
  })

  props.viewer.imageryLayers.addImageryProvider(tMapImagery)
}

// 加载 Mars3D 地形服务
async function loadMars3DTerrainProvider(classConfig) {
  if (!classConfig.url) {
    return
  }
  props.viewer.terrainProvider = await Cesium.CesiumTerrainProvider.fromUrl(classConfig.url, classConfig)
}

// 如果 localStorage 中存在默认图层，则将其设置为默认图层
function setDefaultImageryLayers() {
  const { terrainProviderConfig, instantiatingImageryProviderClassConfig, bzInstantiatingImageryProviderClassConfig } =
    imageryLayers.value[0]

  loadMars3DTerrainProvider(terrainProviderConfig) // 地形
  loadImageryLayer(instantiatingImageryProviderClassConfig) // 底图
  loadImageryLayer(bzInstantiatingImageryProviderClassConfig) // 注记
}

onMounted(() => setDefaultImageryLayers())
</script>

<template>
  <div></div>
</template>
