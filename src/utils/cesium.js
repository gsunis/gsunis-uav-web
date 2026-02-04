import { createApp } from 'vue'
import * as Cesium from 'cesium'
import { chunk } from 'lodash-es'
import { message } from 'ant-design-vue'
import { point, polygon, booleanPointInPolygon } from '@turf/turf'
import {
  Ray,
  Color,
  defined,
  LabelStyle,
  Cartesian2,
  Cartesian3,
  Cartographic,
  VerticalOrigin,
  HorizontalOrigin,
  Math as CesiumMath,
  DistanceDisplayCondition,
  sampleTerrainMostDetailed
} from 'cesium'

// 1. 模块级状态标记：记录“地形清除逻辑是否已执行”，初始未执行
let hasDisabledTerrain = false

// 生成自定义覆盖物
export function createCustomOverlay(viewer, component, props = {}, emits = {}) {
  const scratch = new Cartesian2()
  const container = document.createElement('div')
  const { longitude, latitude, elementId, targetNode } = props
  // 2. 关闭地形（只执行一次）
  if (
    viewer && // 确保viewer存在（容错）
    // !hasDisabledTerrain && // 关键：只在未执行过时进入
    viewer.terrainProvider // 确保地形提供者存在
  ) {
    viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider()
    viewer.scene.globe.depthTestAgainstTerrain = false // 允许穿透地形渲染
    hasDisabledTerrain = true // 执行后标记为“已执行”，后续不再进入
  }
  const app = createApp(h(component, emits), { options: props, viewer })
  app.mount(container)
  targetNode.appendChild(container)

  function listener() {
    const htmlOverlay = document.getElementById(elementId)
    const position = Cartesian3.fromDegrees(longitude, latitude)
    const canvasPosition = viewer.scene.cartesianToCanvasCoordinates(position, scratch)

    if (defined(canvasPosition) && htmlOverlay) {
      const elementWidth = htmlOverlay.offsetWidth
      const elementHeight = htmlOverlay.offsetHeight

      htmlOverlay.style.top = `${canvasPosition.y - elementHeight / 2}px`
      htmlOverlay.style.left = `${canvasPosition.x - elementWidth / 2}px`

      if (props.rotate) {
        htmlOverlay.style.transform = `rotate(${props.rotate}deg)`
      }
    }
  }

  viewer?.scene.preRender.addEventListener(listener)

  return listener
}

// 更新自定义覆盖物
export function updateCustomOverlay(viewer, htmlOverlay, options) {
  const scratch = new Cartesian2()
  const { longitude, latitude, rotate } = options

  function listener() {
    const position = Cartesian3.fromDegrees(longitude, latitude)
    const canvasPosition = viewer.scene.cartesianToCanvasCoordinates(position, scratch)

    if (defined(canvasPosition) && htmlOverlay) {
      const elementWidth = htmlOverlay.offsetWidth
      const elementHeight = htmlOverlay.offsetHeight

      htmlOverlay.style.transform = `rotate(${rotate}deg)`
      htmlOverlay.style.top = `${canvasPosition.y - elementHeight / 2}px`
      htmlOverlay.style.left = `${canvasPosition.x - elementWidth / 2}px`
    }
  }

  viewer.scene.preRender.addEventListener(listener)

  return listener
}

// 生成自定义范围
export function createCustomScope(viewer, options) {
  const {
    id,
    longitude,
    latitude,
    workRadius,
    material = 'rgba(23, 255, 255, 0.06)',
    outlineColor = 'rgba(23, 255, 255, 1)'
  } = options

  viewer.entities.add({
    id,
    position: Cartesian3.fromDegrees(longitude, latitude, 0),
    ellipse: {
      height: 0.0,
      outline: true,
      semiMinorAxis: workRadius,
      semiMajorAxis: workRadius,
      material: new Color.fromCssColorString(material),
      outlineColor: new Color.fromCssColorString(outlineColor)
    }
  })
}

// 根据经纬度定位地图点
export function flyTo(viewer, options) {
  const {
    longitude,
    latitude,
    duration = 0,
    height = 10000,
    directionX = 0,
    directionY = 0,
    directionZ = -1,
    upX = 0,
    upY = 1,
    upZ = 0
  } = options

  // 1. 构造原始向量
  let direction = new Cartesian3(directionX, directionY, directionZ)
  let up = new Cartesian3(upX, upY, upZ)

  viewer?.camera.flyTo({
    duration,
    destination: Cartesian3.fromDegrees(longitude, latitude, height)
    // orientation: { direction, up }
  })
}

// 根据经纬度生成自定义点坐标
export function createCustomPoint(viewer, position, options = {}) {
  const { longitude, latitude, height = 0 } = position
  const location = new Cartographic(CesiumMath.toRadians(longitude), CesiumMath.toRadians(latitude), height)
  const worldPosition = Cartesian3.fromRadians(location.longitude, location.latitude, location.height)
  // 默认阈值（3公里内显示）
  const maxShowDistance = options.maxShowDistance ?? 3000
  return viewer.entities.add({
    id: options.id,
    position: worldPosition,
    point: {
      pixelSize: 12,
      outlineWidth: 4,
      color: Color.fromCssColorString('#ffffff'),
      outlineColor: Color.fromCssColorString('#00e676'),
      ...options
    },
    label: {
      outlineWidth: 2,
      show: options?.label,
      text: options?.label,
      style: LabelStyle.FILL,
      font: '13pt Source Han Sans CN',
      verticalOrigin: VerticalOrigin.CENTER,
      pixelOffset: new Cartesian2(-15, -30),
      horizontalOrigin: HorizontalOrigin.LEFT,
      fillColor: options?.outlineColor || Color.fromCssColorString('#00e676'),
      distanceDisplayCondition: new DistanceDisplayCondition(0, maxShowDistance)
    }
  })
}

// 根据经纬度生成自定义线（修复虚线版本）
export function createCustomLine(viewer, positions, options = {}) {
  // 转换初始坐标
  const cartesians = positions.map((p) => Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, p.height || 0))

  // 创建几何实例
  const geometry = new Cesium.PolylineGeometry({
    positions: cartesians,
    width: options.width || 4,
    vertexFormat: Cesium.PolylineMaterialAppearance.VERTEX_FORMAT
  })

  // 支持虚线材质（修复）
  const material = options.dash ? createDashMaterial(options.color) : createSolidMaterial(options.color)

  // 创建高性能Primitive
  const primitive = new Cesium.Primitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry,
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromCssColorString(options.color))
      }
    }),
    appearance: new Cesium.PolylineMaterialAppearance({
      material,
      translucent: material.uniforms.color.alpha < 1.0 // 根据材质透明度设置
    }),
    // 关键性能优化参数
    asynchronous: false, // 同步加载
    cull: true, // 视锥裁剪
    allowPicking: false, // 禁用拾取
    compressVertices: true, // 顶点压缩
    releaseGeometryInstances: false, // 保留引用用于更新
    sortOrder: -100, // 数值越小越先渲染
    depthTest: true, // 启用深度测试
    depthMask: true // 允许写入深度缓冲
  })

  const primitiveRef = viewer.scene.primitives.add(primitive)

  // 添加更新方法
  primitiveRef.updatePositions = (newPositions) => {
    // 直接修改顶点数组的值
    for (let i = 0; i < newPositions.length; i++) {
      const p = newPositions[i]
      cartesians[i] = Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, p.height || 0)
    }

    // 调整数组长度
    if (newPositions.length < cartesians.length) {
      cartesians.length = newPositions.length
    }

    // 标记顶点缓冲已更新
    if (primitive?.geometryInstances?.geometry?.attributes?.position) {
      primitive.geometryInstances.geometry.attributes.position.value = cartesians
      primitive.geometryInstances.geometry.attributes.position.computeChanged = true
    }
  }

  // 添加视锥体检测方法
  primitiveRef.isInView = () => {
    const boundingSphere = Cesium.BoundingSphere.fromPoints(cartesians)
    return viewer.scene.camera.frustum.contains(boundingSphere) !== Cesium.Intersect.OUTSIDE
  }

  return primitiveRef
}

// 虚线材质创建函数（修正版）
function createDashMaterial(color) {
  return new Cesium.Material({
    fabric: {
      type: 'CustomDash',
      uniforms: {
        color: Cesium.Color.fromCssColorString(color),
        dashPattern: 0xf0f0 // 16位二进制虚线模式
      },
      source: `
        uniform vec4 color;
        uniform float dashPattern;

        czm_material czm_getMaterial(czm_materialInput materialInput) {
          czm_material material = czm_getDefaultMaterial(materialInput);
          float dist = fract(materialInput.st.s * 100.0); // 调整密度
          int patternIndex = int(floor(dist * 16.0));
          bool isVisible = bool((int(dashPattern) & (1 << patternIndex)) != 0);
          material.alpha = isVisible ? color.a : 0.0;
          material.diffuse = color.rgb;
          return material;
        }
      `
    }
  })
}

// 创建实线材质
function createSolidMaterial(color) {
  return new Cesium.Material({
    fabric: {
      type: 'Color',
      uniforms: {
        color: Cesium.Color.fromCssColorString(color)
      }
    }
  })
}

// 批量更新多个线段
export function batchUpdateLines(lines, positionsArray) {
  requestAnimationFrame(() => {
    lines.forEach((line, index) => {
      if (positionsArray[index] && line.isInView()) {
        line.updatePositions(positionsArray[index])
      }
    })
  })
}

/**
 * 计算两个经纬度坐标之间的距离（单位：米）
 * @param {Number} longitude1 第一个坐标的经度
 * @param {Number} latitude1 第一个坐标的纬度
 * @param {Number} longitude2 第二个坐标的经度
 * @param {Number} latitude2 第二个坐标的纬度
 * @returns {Number} 两个坐标之间的距离（米）
 */
export function calculateDistanceBetweenCoordinates(longitude1, latitude1, longitude2, latitude2) {
  // 将经纬度坐标转换为笛卡尔空间坐标
  const cartographic1 = Cartographic.fromDegrees(longitude1, latitude1)
  const cartographic2 = Cartographic.fromDegrees(longitude2, latitude2)
  const cartesian1 = Cartographic.toCartesian(cartographic1)
  const cartesian2 = Cartographic.toCartesian(cartographic2)

  // 计算两个笛卡尔空间坐标之间的距离
  const distance = Cartesian3.distance(cartesian1, cartesian2)

  return distance
}

// 使用 Turf.js 计算点是否在多边形内部(多个多边形)
export function calculatePointInPolygon(earthPosition, polygonList) {
  const cartographic = Cartographic.fromCartesian(earthPosition)
  const longitude = CesiumMath.toDegrees(cartographic.longitude) // 经度
  const latitude = CesiumMath.toDegrees(cartographic.latitude) // 纬度
  const Turfpoint = point([longitude, latitude])
  let isPointInsidePolygon = false
  for (let index = 0; index < polygonList.length; index++) {
    const polygonItem = polygonList[index]
    let polygonData = []
    polygonData = polygonItem.map((item) => {
      return [item.lng, item.lat]
    })
    const Turfpolygon = polygon([polygonData])
    isPointInsidePolygon = booleanPointInPolygon(Turfpoint, Turfpolygon)
    if (isPointInsidePolygon) {
      break
    }
  }
  return isPointInsidePolygon
}

// 根据经纬度计算海拔高度
export async function getAltitudeFromCoordinates(viewer, longitude, latitude) {
  const positions = [Cartographic.fromDegrees(longitude, latitude)]
  return await sampleTerrainMostDetailed(viewer.terrainProvider, positions)
}

export function offsetToLatLon(longitude, latitude, offsetE, offsetS) {
  // 创建初始的 Cartographic 位置
  let cartographic = Cesium.Cartographic.fromDegrees(longitude, latitude)

  // 将 Cartographic 位置转换为笛卡尔坐标
  let cartesian = Cesium.Cartographic.toCartesian(cartographic)

  // 计算地球表面的局部切线平面上的单位矢量
  let surfaceNormal = new Cesium.Cartesian3()
  Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(cartesian, surfaceNormal)

  // 计算东向单位矢量
  let eastVector = new Cesium.Cartesian3()
  Cesium.Cartesian3.cross(Cesium.Cartesian3.UNIT_Z, surfaceNormal, eastVector)
  Cesium.Cartesian3.normalize(eastVector, eastVector)

  // 计算北向单位矢量
  let northVector = new Cesium.Cartesian3()
  Cesium.Cartesian3.cross(eastVector, surfaceNormal, northVector)
  Cesium.Cartesian3.normalize(northVector, northVector)

  // 计算沿东向和北向的偏移矢量
  let offsetVectorX = Cesium.Cartesian3.multiplyByScalar(eastVector, offsetE, new Cesium.Cartesian3())
  let offsetVectorY = Cesium.Cartesian3.multiplyByScalar(northVector, offsetS, new Cesium.Cartesian3())

  // 计算总的偏移矢量
  let offsetVector = Cesium.Cartesian3.add(offsetVectorX, offsetVectorY, new Cesium.Cartesian3())

  // 将原始笛卡尔坐标与偏移矢量相加，得到新的笛卡尔坐标
  let newCartesian = Cesium.Cartesian3.add(cartesian, offsetVector, new Cesium.Cartesian3())

  // 将新的笛卡尔坐标转换回 Cartographic（经纬度）
  let newCartographic = Cesium.Cartographic.fromCartesian(newCartesian)

  // 提取新的经度和纬度
  let newLongitude = Cesium.CesiumMath.toDegrees(newCartographic.longitude)
  let newLatitude = Cesium.CesiumMath.toDegrees(newCartographic.latitude)

  // 返回新的经纬度
  return {
    latitude: newLatitude,
    longitude: newLongitude
  }
}

// 计算两点间距离
export function computePointDistance(startPoint, endPoint) {
  return Cartesian3.distance(Cartesian3.fromDegrees(...startPoint), Cartesian3.fromDegrees(...endPoint))
}

// 判断航点间是否有遮挡
export function checkLineOfSight(viewer, coordinates) {
  const options = []
  const objectsToExclude = []
  const prefixesToExclude = ['uav', 'airway', 'waypoint', 'hangar-scope']

  // 获取所有需要排除射线拾取的对象
  viewer.entities.values.forEach((entity) => {
    if (prefixesToExclude.some((prefix) => entity.id.includes(prefix))) {
      objectsToExclude.push(entity)
    }
  })

  for (let i = 0; i < coordinates.length - 1; i++) {
    const startPoint = Cartesian3.fromDegrees(...coordinates[i])
    const endPoint = Cartesian3.fromDegrees(...coordinates[i + 1])
    const airwayDistance = Cartesian3.distance(startPoint, endPoint)
    const direction = Cartesian3.normalize(
      Cartesian3.subtract(endPoint, startPoint, new Cartesian3()),
      new Cartesian3()
    )
    const ray = new Ray(startPoint, direction)
    const result = viewer.scene.pickFromRay(ray, objectsToExclude)

    if (result) {
      const collisionDistance = Cartesian3.distance(startPoint, result.position)

      // 遮挡位置必须处在航线上
      if (collisionDistance <= airwayDistance) {
        options.push({ type: 'occlusion', index: i })
      }
    }
  }

  return options
}

// 判断创建的航点是否满足要求
// 1. 全部的点需要在飞行范围内
// 2. 两个航点之间的距离不能小于 0.1 米，不能大于 10000 米
// 3. 第一个航点需要距离机场 20 米以上，最后一个航点距离机场 50 米以上(大疆机场无此要求)
export function isCreateWaypointRequire(options) {
  const { workRadius, hangarWaypoint, isDjHangar } = options
  const waypointList = chunk(options.waypointList, 3)

  for (let i = 0; i < waypointList.length; i++) {
    const distanceInMeters = computePointDistance(waypointList[i], hangarWaypoint)

    // 1. 全部的点需要在飞行范围内
    if (distanceInMeters > workRadius) {
      message.warning('请在机场范围内添加航点')
      return false
    }

    // 2. 两个航点之间的距离不能小于 0.1 米，不能大于 10000 米
    if (waypointList[i + 1] !== undefined) {
      const distanceInMeters = computePointDistance(waypointList[i], waypointList[i + 1])

      if (distanceInMeters < 0.1 || distanceInMeters > 10000) {
        message.warning('两个航点之间的距离不能小于 0.1 米，不能大于 10000 米')
        return false
      }
    }

    // 3. 第一个航点需要距离机场 20 米以上，最后一个航点距离机场 50 米以上
    if (!isDjHangar && i === 0 && waypointList[i + 1] !== undefined) {
      if (distanceInMeters < 20) {
        message.warning('第一个航点需要距离机场 20 米以上')
        return false
      }
    }

    if (!isDjHangar && i === waypointList.length - 1) {
      if (distanceInMeters < 50) {
        message.warning('最后一个航点需要距离机场 50 米以上')
        return false
      }
    }
  }

  return true
}
