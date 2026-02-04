import * as Cesium from 'cesium'
import hangarPointImage from '@/assets/images/dashboard-normal-hangar.png'
import uavPointImage from '@/assets/images/dashboard-single-hangar.png'
import xfjPointImage from '@/assets/images/dashboard-single-xfj-hangar.png'
import alternatePointImage from '@/assets/images/alternate-point-icon.png'
import {
  Color,
  defined,
  Transforms,
  Cartesian2,
  Cartesian3,
  LabelStyle,
  ShadowMode,
  NearFarScalar,
  VerticalOrigin,
  HeightReference,
  HeadingPitchRoll,
  HorizontalOrigin,
  CallbackProperty,
  Math as CesiumMath,
  DistanceDisplayCondition,
  TextureMinificationFilter,
  TextureMagnificationFilter,
  PolylineDashMaterialProperty
} from 'cesium'

export function useCesiumModel() {
  const hangarDatas = []
  // 1. 机场点击事件处理器（核心修改：通过回调通知父组件）
  let clickHandler = null
  function initHangarClickHandler(viewer, { onHangarClick }) {
    if (!viewer || clickHandler) return

    // 创建 Cesium 点击事件
    clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

    // 监听左键点击机场实体
    clickHandler.setInputAction((clickEvent) => {
      const pickedObject = viewer.scene.pick(clickEvent.position)
      if (!Cesium.defined(pickedObject) || !pickedObject.id) {
        // 点击空白处：可选择隐藏弹框（根据需求）
        return
      }

      const targetEntity = pickedObject.id
      // 判断是否为机场实体（与原逻辑一致）
      const isHangarEntity =
        targetEntity.properties?.type?.getValue() === 'hangar' && targetEntity.id?.startsWith('hangar-point-')

      if (isHangarEntity) {
        // 获取机场详情，通过回调通知父组件显示弹框
        const hangarDetail = targetEntity.properties.hangarDetail.getValue()
        onHangarClick(hangarDetail, targetEntity.position)
      } else {
        console.error('非机场实体，无法处理点击事件', targetEntity)

        // 点击其他实体：隐藏弹框
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
  }

  // 5. 销毁点击事件（组件卸载时调用，防止内存泄漏）
  function destroyHangarClickHandler() {
    if (clickHandler) {
      clickHandler.destroy()
      clickHandler = null
    }
  }

  // 初始化机场点聚合配置
  function initHangarClustering(viewer, clusterOptions = {}) {
    if (!viewer) return
    // 移除旧的智能设施数据源
    for (let i = viewer.dataSources.length - 1; i >= 0; i--) {
      const tdataSource = viewer.dataSources.get(i)
      if (tdataSource.name === 'hangars') {
        viewer.dataSources?.remove(tdataSource)
        break
      }
    }

    // 同时清理viewer.entities中可能存在的直接添加的实体（兼容性处理）
    if (viewer && viewer.entities) {
      // 筛选出所有 hangar-point-xxx 前缀的实体，批量删除
      const hangarEntities = viewer.entities.values.filter(
        (entity) => entity.id && entity.id.startsWith('hangar-point-')
      )
      hangarEntities.forEach((entity) => viewer.entities.remove(entity))
    }

    viewer.scene.globe.depthTestAgainstTerrain = false

    const dataSource = new Cesium.CustomDataSource('hangars')
    // 分批加载
    const loadDataInBatches = async (allData, batchSize = 100, batchInterval = 100) => {
      const totalBatches = Math.ceil(allData.length / batchSize)
      for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize
        const end = Math.min(start + batchSize, allData.length)
        const batch = allData.slice(start, end)
        // 加载当前批次
        loadBatch(batch)
        console.log(`加载进度: ${(((i + 1) / totalBatches) * 100).toFixed(1)}%`)
        // 让出主线程，避免UI卡顿
        await new Promise((resolve) => setTimeout(resolve, batchInterval))
      }
    }
    const loadBatch = (batchData) => {
      batchData.forEach((hangar) => {
        dataSource.entities.add(hangar)
      })
    }

    // 4. 极简聚合样式
    const customStyle = () => {
      // 绑定聚合事件（直接添加，无多余移除逻辑）
      dataSource.clustering.clusterEvent.addEventListener((clusteredEntities, cluster) => {
        cluster.label.id = 'hangar_cluster'
        cluster.label.show = true
        // cluster.label.distanceDisplayCondition = new Cesium.DistanceDisplayCondition(3000.0, distance)
        cluster.label.text = clusteredEntities.length.toString()
        cluster.label.font = '18px Helvetica'
        cluster.label.pixelOffset = new Cesium.Cartesian2(0, -20)
        cluster.label.showBackground = true
        cluster.label.backgroundPadding = new Cesium.Cartesian2(7, 7)
        cluster.label.backgroundColor = Cesium.Color.fromCssColorString('#00E676').withAlpha(0.7)
        cluster.label.fillColor = Cesium.Color.WHITE
        cluster.label.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND

        cluster.label.verticalOrigin = Cesium.VerticalOrigin.BOTTOM
        cluster.label.horizontalOrigin = Cesium.HorizontalOrigin.CENTER

        cluster.billboard.show = true
        cluster.billboard.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND
        cluster.billboard.id = cluster.label.id
        cluster.billboard.image = uavPointImage
        cluster.billboard.scale = 0.3
        cluster.billboard.textureMinificationFilter = Cesium.TextureMinificationFilter.NEAREST_MIPMAP_LINEAR
        cluster.billboard.textureMagnificationFilter = Cesium.TextureMagnificationFilter.LINEAR
      })
    }

    const dataSourcePromise = viewer.dataSources.add(dataSource)
    dataSourcePromise.then(function (dataSource) {
      dataSource.clustering.enabled = true //是否聚合
      dataSource.clustering.pixelRange = 20 // 实体间像素距离小于15的时候 开始聚合
      dataSource.clustering.minimumClusterSize = 3 // 最小的聚合数量， 至少有3个时候可以聚合
      dataSource.clustering.show = true

      customStyle()
    })

    loadDataInBatches(hangarDatas)
  }

  async function createDataHangarPoint(options) {
    const { id, name, viewer, longitude, latitude, altitude, hangarInfo = {} } = options

    // 校验核心参数是否为有效数字
    if (!Cesium.defined(viewer)) throw new Error('viewer未定义')
    if (typeof longitude !== 'number' || isNaN(longitude)) throw new Error(`无效的经度: ${longitude}`)
    if (typeof latitude !== 'number' || isNaN(latitude)) throw new Error(`无效的纬度: ${latitude}`)
    if (typeof altitude !== 'number' || isNaN(altitude)) throw new Error(`无效的高度: ${altitude}`)

    const targetId = `hangar-point-${id}`

    // 🔴 修复：用 getById 判断实体是否存在（替换 containsById）
    const existingEntity = viewer?.entities.getById(targetId)

    // 存在重复实体：先清理视图层（实体）和数据层（数组）
    if (existingEntity) {
      // 删除视图中的重复实体

      return
    }
    // 删除数据数组中的重复项
    const existingIndex = hangarDatas.findIndex((item) => item.id === targetId)
    if (existingIndex !== -1) {
      return
    }

    // 生成有效坐标
    const position = Cartesian3.fromDegrees(longitude, latitude, altitude)
    if (!(position instanceof Cesium.Cartesian3) || Cartesian3.equals(position, Cartesian3.ZERO)) {
      throw new Error('生成的坐标无效（可能经纬度超出范围）')
    }
    if (hangarInfo.uavList && hangarInfo.uavList.length > 0) {
      hangarInfo.grade = hangarInfo.uavList[0]?.grade
    }
    const hangarDetail = {
      id,
      name,
      longitude: typeof longitude === 'number' ? longitude.toFixed(6) : '未知', // 容错处理
      latitude: typeof latitude === 'number' ? latitude.toFixed(6) : '未知',
      altitude: typeof altitude === 'number' ? `${altitude} 米` : '未知',
      ...hangarInfo // 接收外部自定义字段（如address、runwayCount、code等）
    }
    const styleCache = {
      xfjPoint: {
        topColor: 'rgba(80, 250, 255, 0.8)', // 渐变顶部：60%不透明
        bottomColor: 'rgba(14, 19, 25, 0.8)', // 渐变底部：60%不透明
        borderColor: 'rgba(80, 250, 255, 1)' // 边框：80%不透明
      },
      uavPoint: {
        topColor: 'rgba(0, 230, 118, 0.8)', // 绿色系：60%不透明
        bottomColor: 'rgba(14, 19, 25, 0.8)',
        borderColor: 'rgba(0, 230, 118, 1)'
      },
      hangarPoint: {
        topColor: 'rgba(0, 230, 118, 0.8)',
        bottomColor: 'rgba(14, 19, 25, 0.8)',
        borderColor: 'rgba(0, 230, 118, 1)'
      }
    }
    const styleKey =
      hangarInfo.grade == 1 && (hangarDetail.type == 'CS' || hangarDetail.type == 'DB')
        ? 'xfjPoint'
        : hangarDetail.type == 'CS' || hangarDetail.type == 'DB'
        ? 'uavPoint'
        : 'hangarPoint'

    const loadImage = () => {
      return new Promise((resolve) => {
        const img = new Image()
        img.src =
          hangarInfo.grade == 1 && (hangarDetail.type == 'CS' || hangarDetail.type == 'DB')
            ? xfjPointImage
            : hangarDetail.type == 'CS' || hangarDetail.type == 'DB'
            ? uavPointImage
            : hangarPointImage
        img.onload = () => resolve(img)
      })
    }
    const cameraImage = await loadImage()

    const createLabelCanvas = (text, style) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      ctx.font = '14px sans-serif'

      const textMetrics = ctx.measureText(text)
      const textWidth = textMetrics.width
      const padding = 20
      const rectWidth = textWidth + padding * 2
      const rectHeight = 30
      const cornerRadius = 5
      const gap = 5
      const imageWidth = 40
      const imageHeight = 40
      // 动态设置canvas尺寸，确保能容纳所有内容
      canvas.width = rectWidth + padding // 设置canvas宽度为背景矩形宽度
      canvas.height = 100
      ctx.font = '14px sans-serif'
      // 重新计算绘制位置
      const rectX = 0 // canvas宽度已调整为rectWidth，所以从0开始
      const rectY = 20
      const imageTop = rectY + rectHeight + gap
      const imageCenterX = canvas.width / 2 - gap // 画布中心就是图片中心

      const gradient = ctx.createLinearGradient(0, rectY, 0, rectY + rectHeight)
      gradient.addColorStop(0, style.topColor)
      gradient.addColorStop(1, style.bottomColor)
      ctx.beginPath()
      ctx.moveTo(rectX + cornerRadius, rectY)
      ctx.lineTo(rectX + rectWidth - cornerRadius, rectY)
      ctx.arcTo(rectX + rectWidth, rectY, rectX + rectWidth, rectY + cornerRadius, cornerRadius)
      ctx.lineTo(rectX + rectWidth, rectY + rectHeight - cornerRadius)
      ctx.arcTo(
        rectX + rectWidth,
        rectY + rectHeight,
        rectX + rectWidth - cornerRadius,
        rectY + rectHeight,
        cornerRadius
      )
      ctx.lineTo(rectX + cornerRadius, rectY + rectHeight)
      ctx.arcTo(rectX, rectY + rectHeight, rectX, rectY + rectHeight - cornerRadius, cornerRadius)
      ctx.lineTo(rectX, rectY + cornerRadius)
      ctx.arcTo(rectX, rectY, rectX + cornerRadius, rectY, cornerRadius)
      ctx.closePath()
      ctx.fillStyle = gradient
      ctx.fill()
      ctx.strokeStyle = style.borderColor
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = 'white'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, rectX + rectWidth / 2, rectY + rectHeight / 2)
      // 绘制图片
      ctx.drawImage(cameraImage, imageCenterX - imageWidth / 2, imageTop + gap, imageWidth, imageHeight)
      return canvas
    }
    const style = styleCache[styleKey]
    const labelCanvas = createLabelCanvas(name, style)

    hangarDatas.push({
      id: `hangar-point-${id}`,
      position: position,
      // 绑定机场信息到实体（点击时可获取）
      properties: {
        type: 'hangar', // 标记实体类型，用于后续判断
        hangarDetail // 机场详情
      },
      billboard: {
        width: labelCanvas.width,
        height: labelCanvas.height,
        image: labelCanvas,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        textureMinificationFilter: Cesium.TextureMinificationFilter.NEAREST_MIPMAP_LINEAR,
        textureMagnificationFilter: Cesium.TextureMagnificationFilter.LINEAR,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    })
  }

  function removeDataHangarPoint(id, viewer) {
    const targetId = `hangar-point-${id}`

    // 清理数据层（数组）
    const tindex = hangarDatas.findIndex((hangar) => hangar.id === targetId)
    if (tindex !== -1) {
      hangarDatas.splice(tindex, 1)
    }
  }

  async function createHangarPoint(options) {
    const { id, name, viewer, longitude, latitude, altitude, hangarInfo = {} } = options
    // 校验核心参数是否为有效数字
    if (!defined(viewer)) throw new Error('viewer未定义')
    if (typeof longitude !== 'number' || isNaN(longitude)) throw new Error(`无效的经度: ${longitude}`)
    if (typeof latitude !== 'number' || isNaN(latitude)) throw new Error(`无效的纬度: ${latitude}`)
    if (typeof altitude !== 'number' || isNaN(altitude)) throw new Error(`无效的高度: ${altitude}`)

    // 生成有效坐标
    const position = Cartesian3.fromDegrees(longitude, latitude, altitude)
    if (!(position instanceof Cesium.Cartesian3) || Cartesian3.equals(position, Cartesian3.ZERO)) {
      throw new Error('生成的坐标无效（可能经纬度超出范围）')
    }
    if (hangarInfo.uavList && hangarInfo.uavList.length > 0) {
      hangarInfo.grade = hangarInfo.uavList[0]?.grade
    }
    const hangarDetail = {
      id,
      name,
      longitude: typeof longitude === 'number' ? longitude.toFixed(6) : '未知', // 容错处理
      latitude: typeof latitude === 'number' ? latitude.toFixed(6) : '未知',
      altitude: typeof altitude === 'number' ? `${altitude} 米` : '未知',
      ...hangarInfo // 接收外部自定义字段（如address、runwayCount、code等）
    }
    const styleCache = {
      xfjPoint: {
        topColor: 'rgba(80, 250, 255, 0.8)', // 渐变顶部：60%不透明
        bottomColor: 'rgba(14, 19, 25, 0.8)', // 渐变底部：60%不透明
        borderColor: 'rgba(80, 250, 255, 1)' // 边框：80%不透明
      },
      uavPoint: {
        topColor: 'rgba(0, 230, 118, 0.8)', // 绿色系：60%不透明
        bottomColor: 'rgba(14, 19, 25, 0.8)',
        borderColor: 'rgba(0, 230, 118, 1)'
      },
      hangarPoint: {
        topColor: 'rgba(0, 230, 118, 0.8)',
        bottomColor: 'rgba(14, 19, 25, 0.8)',
        borderColor: 'rgba(0, 230, 118, 1)'
      }
    }
    const styleKey =
      hangarInfo.grade == 1 && (hangarDetail.type == 'CS' || hangarDetail.type == 'DB')
        ? 'xfjPoint'
        : hangarDetail.type == 'CS' || hangarDetail.type == 'DB'
        ? 'uavPoint'
        : 'hangarPoint'
    const loadImage = () => {
      return new Promise((resolve) => {
        const img = new Image()
        img.src =
          hangarInfo.grade == 1 && (hangarDetail.type == 'CS' || hangarDetail.type == 'DB')
            ? xfjPointImage
            : hangarDetail.type == 'CS' || hangarDetail.type == 'DB'
            ? uavPointImage
            : hangarPointImage
        img.onload = () => resolve(img)
      })
    }
    const cameraImage = await loadImage()
    const createLabelCanvas = (text, style) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      ctx.font = '14px sans-serif'

      const textMetrics = ctx.measureText(text)
      const textWidth = textMetrics.width
      const padding = 20
      const rectWidth = textWidth + padding * 2
      const rectHeight = 30
      const cornerRadius = 5
      const gap = 5
      const imageWidth = 40
      const imageHeight = 40
      // 动态设置canvas尺寸，确保能容纳所有内容
      canvas.width = rectWidth + padding // 设置canvas宽度为背景矩形宽度
      canvas.height = 100
      ctx.font = '14px sans-serif'
      // 重新计算绘制位置
      const rectX = 0 // canvas宽度已调整为rectWidth，所以从0开始
      const rectY = 20
      const imageTop = rectY + rectHeight + gap
      const imageCenterX = canvas.width / 2 - gap // 画布中心就是图片中心

      const gradient = ctx.createLinearGradient(0, rectY, 0, rectY + rectHeight)
      gradient.addColorStop(0, style.topColor)
      gradient.addColorStop(1, style.bottomColor)
      ctx.beginPath()
      ctx.moveTo(rectX + cornerRadius, rectY)
      ctx.lineTo(rectX + rectWidth - cornerRadius, rectY)
      ctx.arcTo(rectX + rectWidth, rectY, rectX + rectWidth, rectY + cornerRadius, cornerRadius)
      ctx.lineTo(rectX + rectWidth, rectY + rectHeight - cornerRadius)
      ctx.arcTo(
        rectX + rectWidth,
        rectY + rectHeight,
        rectX + rectWidth - cornerRadius,
        rectY + rectHeight,
        cornerRadius
      )
      ctx.lineTo(rectX + cornerRadius, rectY + rectHeight)
      ctx.arcTo(rectX, rectY + rectHeight, rectX, rectY + rectHeight - cornerRadius, cornerRadius)
      ctx.lineTo(rectX, rectY + cornerRadius)
      ctx.arcTo(rectX, rectY, rectX + cornerRadius, rectY, cornerRadius)
      ctx.closePath()
      ctx.fillStyle = gradient
      ctx.fill()
      ctx.strokeStyle = style.borderColor
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = 'white'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, rectX + rectWidth / 2, rectY + rectHeight / 2)
      // 绘制图片
      ctx.drawImage(cameraImage, imageCenterX - imageWidth / 2, imageTop + gap, imageWidth, imageHeight)
      return canvas
    }
    const style = styleCache[styleKey]
    const labelCanvas = createLabelCanvas(name, style)
    viewer.entities.add({
      id: `hangar-point-${id}`,
      position: position,
      // 绑定机场信息到实体（点击时可获取）
      properties: {
        type: 'hangar', // 标记实体类型，用于后续判断
        hangarDetail // 机场详情
      },
      billboard: {
        image: labelCanvas,
        width: labelCanvas.width,
        height: labelCanvas.height,
        verticalOrigin: VerticalOrigin.BOTTOM,
        horizontalOrigin: HorizontalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        heightReference: HeightReference.CLAMP_TO_GROUND,
        textureMagnificationFilter: TextureMagnificationFilter.LINEAR,
        textureMinificationFilter: TextureMinificationFilter.NEAREST_MIPMAP_LINEAR
      }
    })
  }

  function removeHangarPoint(id, viewer) {
    viewer.entities.removeById(`hangar-point-${id}`)
  }

  function createHangarScope(options) {
    const {
      id,
      viewer,
      altitude,
      latitude,
      longitude,
      workRadius,
      material = 'rgba(23, 255, 255, 0.2)',
      outlineColor = 'rgba(23, 255, 255, 1)'
    } = options

    viewer.entities.add({
      id: `hangar-scope-${id}`,
      position: Cartesian3.fromDegrees(longitude, latitude, altitude),
      ellipse: {
        fill: true,
        outline: true,
        outlineWidth: 2,
        semiMinorAxis: workRadius,
        semiMajorAxis: workRadius,
        material: new Color.fromCssColorString(material),
        outlineColor: new Color.fromCssColorString(outlineColor)
      }
    })
  }

  function removeHangarScope(id, viewer) {
    viewer.entities.removeById(`hangar-scope-${id}`)
  }

  function createAlternatePoint(options) {
    const { id, viewer, longitude, latitude, altitude } = options

    viewer.entities.add({
      id: `alternate-point-${id}`,
      position: Cartesian3.fromDegrees(longitude, latitude, altitude),
      billboard: {
        scale: 0.5,
        image: alternatePointImage,
        heightReference: HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    })
  }

  function removeAlternatePoint(id, viewer) {
    viewer.entities.removeById(`alternate-point-${id}`)
  }

  function createUavModel(options) {
    const { id, viewer, longitude, latitude, altitude, heading = 0, pitch = 0, roll = 0 } = options
    const rollRadians = CesiumMath.toRadians(roll)
    const pitchRadians = CesiumMath.toRadians(pitch)
    const headingRadians = CesiumMath.toRadians(heading)
    const hpr = new HeadingPitchRoll(headingRadians + Math.PI / 2, pitchRadians, rollRadians)
    const position = Cartesian3.fromDegrees(longitude, latitude, altitude)
    const orientation = Transforms.headingPitchRollQuaternion(position, hpr)

    viewer.entities.add({
      id: `uav-model-${id}`,
      position,
      orientation,
      model: {
        show: true,
        scale: 0.1,
        uri: `/model/uav.gltf`,
        shadows: ShadowMode.ENABLED,
        heightReference: HeightReference.NONE
      }
    })
  }

  function updateUavModel(options) {
    const { id, viewer, longitude, latitude, altitude, heading = 0, pitch = 0, roll = 0 } = options
    const rollRadians = CesiumMath.toRadians(roll)
    const pitchRadians = CesiumMath.toRadians(pitch)
    const headingRadians = CesiumMath.toRadians(heading)
    const hpr = new HeadingPitchRoll(headingRadians + Math.PI / 2, pitchRadians, rollRadians)
    const uavModel = viewer.entities.getById(`uav-model-${id}`)
    const position = Cartesian3.fromDegrees(longitude, latitude, altitude)
    const orientation = Transforms.headingPitchRollQuaternion(position, hpr)

    uavModel.position = position
    uavModel.orientation = orientation
  }

  function removeUavModel(id, viewer) {
    viewer.entities.removeById(`uav-model-${id}`)
  }

  function createWaypoint(options) {
    const { id, name, index, viewer, isActive, longitude, latitude, groundAltitude, flightAltitude } = options

    // 创建航点底部圆球和航点圆盘（可拖动点）
    viewer.entities.add({
      id: `waypoint-point-ellipse-${id}-${index}`,
      position: Cartesian3.fromDegrees(longitude, latitude, groundAltitude),
      point: {
        pixelSize: 8,
        color: isActive ? Color.YELLOW : Color.WHITE
      },
      ellipse: {
        semiMinorAxis: 8,
        semiMajorAxis: 8,
        height: flightAltitude,
        material: isActive ? Color.YELLOW : Color.WHITE
      }
    })

    // 创建航点高度垂直线
    viewer.entities.add({
      id: `waypoint-polyline-${id}-${index}`,
      polyline: {
        width: 2,
        material: isActive ? Color.YELLOW : Color.WHITE,
        positions: [
          Cartesian3.fromDegrees(longitude, latitude, groundAltitude),
          Cartesian3.fromDegrees(longitude, latitude, flightAltitude)
        ]
      }
    })

    // 创建航点名称
    viewer.entities.add({
      id: `waypoint-label-${id}-${index}`,
      position: Cartesian3.fromDegrees(longitude, latitude, flightAltitude + 10),
      label: {
        scale: 0.5,
        text: name,
        font: '30px Helvetica',
        pixelOffset: new Cartesian2(0, -20),
        fillColor: Color.fromCssColorString('#00e676'),
        distanceDisplayCondition: new DistanceDisplayCondition(0, 3000)
      }
    })
  }

  function updateWaypoint(options) {
    const { id, name, index, viewer, isActive, longitude, latitude, groundAltitude, flightAltitude } = options
    const waypointLabel = viewer.entities.getById(`waypoint-label-${id}-${index}`)
    const waypointPolyline = viewer.entities.getById(`waypoint-polyline-${id}-${index}`)
    const waypointPointEllipse = viewer.entities.getById(`waypoint-point-ellipse-${id}-${index}`)

    waypointLabel.label.text = name
    waypointPointEllipse.ellipse.height = flightAltitude
    waypointPointEllipse.point.color = isActive ? Color.YELLOW : Color.WHITE
    waypointPolyline.polyline.material = isActive ? Color.YELLOW : Color.WHITE
    waypointPointEllipse.ellipse.material = isActive ? Color.YELLOW : Color.WHITE
    waypointLabel.position = Cartesian3.fromDegrees(longitude, latitude, flightAltitude + 10)
    waypointPointEllipse.position = Cartesian3.fromDegrees(longitude, latitude, groundAltitude)
    waypointPolyline.polyline.positions = [
      Cartesian3.fromDegrees(longitude, latitude, groundAltitude),
      Cartesian3.fromDegrees(longitude, latitude, flightAltitude)
    ]
  }

  function updateWaypointColor(id, index, viewer, isActive = false) {
    const waypointPolyline = viewer.entities.getById(`waypoint-polyline-${id}-${index}`)
    const waypointPointEllipse = viewer.entities.getById(`waypoint-point-ellipse-${id}-${index}`)

    waypointPolyline.polyline.material = isActive ? Color.YELLOW : Color.WHITE
    waypointPointEllipse.ellipse.material = isActive ? Color.YELLOW : Color.WHITE
  }

  function removeWaypoint(id, index, viewer) {
    viewer.entities.removeById(`waypoint-label-${id}-${index}`)
    viewer.entities.removeById(`waypoint-polyline-${id}-${index}`)
    viewer.entities.removeById(`waypoint-point-ellipse-${id}-${index}`)
  }

  function removeWaypointById(id, viewer) {
    const entitiesToRemove1 = viewer.entities.values.filter(
      (entity) => entity.id && entity.id.startsWith(`waypoint-label-${id}-`)
    )
    const entitiesToRemove2 = viewer.entities.values.filter(
      (entity) => entity.id && entity.id.startsWith(`waypoint-polyline-${id}-`)
    )
    const entitiesToRemove3 = viewer.entities.values.filter(
      (entity) => entity.id && entity.id.startsWith(`waypoint-point-ellipse-${id}-`)
    )

    entitiesToRemove1.forEach((entity) => viewer.entities.remove(entity))
    entitiesToRemove2.forEach((entity) => viewer.entities.remove(entity))
    entitiesToRemove3.forEach((entity) => viewer.entities.remove(entity))
  }

  function removeAllWaypoint(viewer) {
    const entitiesToRemove = viewer.entities.values.filter((entity) => entity.id && entity.id.includes('waypoint'))

    entitiesToRemove.forEach((entity) => viewer.entities.remove(entity))
  }

  function createAirway(options) {
    const positions = []
    const { id, viewer, coordinates = [] } = options

    coordinates.forEach(({ longitude, latitude, altitude }) => {
      positions.push(Cartesian3.fromDegrees(longitude, latitude, altitude))
    })

    viewer.entities.add({
      id: `airway-${id}`,
      polyline: {
        width: 4,
        positions,
        material: new PolylineDashMaterialProperty({ color: Color.fromCssColorString('#00e676') })
      }
    })

    createAirwayLabel(id, viewer, positions)
  }

  function createAirwayLabel(id, viewer, positions) {
    for (let i = 0; i < positions.length - 1; i++) {
      const startPos = positions[i]
      const endPos = positions[i + 1]
      // 计算中点位置
      const midPoint = Cartesian3.midpoint(startPos, endPos, new Cartesian3())
      // 计算两点距离
      const distance = Cartesian3.distance(startPos, endPos)
      const distanceText = `${Math.round(distance)} 米`

      viewer.entities.add({
        id: `airway-label-${id}-${i}`,
        position: midPoint,
        label: {
          scale: 0.5,
          outlineWidth: 2,
          text: distanceText,
          showBackground: true,
          font: '26px Helvetica',
          fillColor: Color.WHITE,
          style: LabelStyle.FILL,
          pixelOffset: new Cartesian2(0, -20),
          verticalOrigin: VerticalOrigin.CENTER,
          backgroundPadding: new Cartesian2(12, 8),
          horizontalOrigin: HorizontalOrigin.CENTER,
          backgroundColor: Color.BLACK.withAlpha(0.6),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new NearFarScalar(1.5e2, 1.0, 8.0e6, 0.0),
          distanceDisplayCondition: new DistanceDisplayCondition(0, 3000)
        }
      })
    }
  }

  function updateAirway(options) {
    const list = []
    const positions = []
    const { id, viewer, coordinates = [] } = options
    const airway = viewer.entities.getById(`airway-${id}`)

    if (airway) {
      const existingLabels = viewer.entities.values.filter(
        (entity) => entity.id && entity.id.startsWith(`airway-label-${id}-`)
      )

      coordinates.forEach(({ longitude, latitude, altitude }) => {
        positions.push(longitude, latitude, altitude)
        list.push(Cartesian3.fromDegrees(longitude, latitude, altitude))
      })
      airway.polyline.positions = new CallbackProperty(() => Cartesian3.fromDegreesArrayHeights(positions), false)
      // 移除旧的标签
      existingLabels.forEach((label) => viewer.entities.remove(label))
      createAirwayLabel(id, viewer, list)
    }
  }

  function removeAirway(id, viewer) {
    const entitiesToRemove = viewer.entities.values.filter(
      (entity) => entity.id && entity.id.startsWith(`airway-label-`)
    )

    viewer.entities.removeById(`airway-${id}`)
    entitiesToRemove.forEach((entity) => viewer.entities.remove(entity))
  }

  function createRealTimeAirway(options) {
    const positions = []
    const { id, viewer, show = true, coordinates = [] } = options

    coordinates.forEach(({ longitude, latitude, altitude }) => {
      positions.push(Cartesian3.fromDegrees(longitude, latitude, altitude))
    })

    viewer.entities.add({
      show,
      id: `real-time-airway-${id}`,
      polyline: {
        width: 4,
        positions,
        material: Color.fromCssColorString('#00e676')
      }
    })
  }

  function updateRealTimeAirway(options) {
    const list = []
    const positions = []
    const { id, viewer, coordinates = [] } = options
    const airway = viewer.entities.getById(`real-time-airway-${id}`)

    if (airway) {
      coordinates.forEach(({ longitude, latitude, altitude }) => {
        positions.push(longitude, latitude, altitude)
        list.push(Cartesian3.fromDegrees(longitude, latitude, altitude))
      })

      airway.polyline.positions = new CallbackProperty(() => Cartesian3.fromDegreesArrayHeights(positions), true)
    }
  }

  function removeRealTimeAirway(id, viewer) {
    const entitiesToRemove = viewer.entities.values.filter(
      (entity) => entity.id && entity.id.startsWith(`real-time-airway-${id}`)
    )
    entitiesToRemove.forEach((entity) => viewer.entities.remove(entity))
  }

  function removeAllAirway(viewer) {
    const entitiesToRemove = viewer.entities.values.filter((entity) => entity.id && entity.id.includes('airway'))

    entitiesToRemove.forEach((entity) => viewer.entities.remove(entity))
  }

  return {
    createAlternatePoint,
    removeAlternatePoint,
    createRealTimeAirway,
    updateRealTimeAirway,
    removeRealTimeAirway,
    updateWaypointColor,
    createHangarPoint,
    removeHangarPoint,
    createHangarScope,
    removeHangarScope,
    removeAllWaypoint,
    createAirwayLabel,
    removeAllAirway,
    createWaypoint,
    createUavModel,
    updateUavModel,
    removeUavModel,
    updateWaypoint,
    removeWaypoint,
    removeWaypointById,
    createAirway,
    updateAirway,
    removeAirway,
    initHangarClickHandler, // 初始化点击监听
    destroyHangarClickHandler, // 销毁点击监听
    initHangarClustering, // 新增：初始化聚合配置
    createDataHangarPoint, // 新增：创建数据机库图标
    removeDataHangarPoint
  }
}
