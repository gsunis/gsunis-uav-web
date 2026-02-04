<script setup>
import JSZip from 'jszip'
import { chunk } from 'lodash-es'
import { message } from 'ant-design-vue'
import { XMLParser } from 'fast-xml-parser'
import { objectStringToNumber } from '@/utils'
import ActionForm from './components/ActionForm.vue'
import { useCesiumModel } from '@/composables/useCesiumModel'
import AirwayContainer from './components/AirwayContainer.vue'
import { useThrottleFn, useElementHover, onKeyDown } from '@vueuse/core'
import { useWaypointFlightControl } from '@/composables/useWaypointFlightControl'
import { flyTo, isCreateWaypointRequire, computePointDistance, getAltitudeFromCoordinates } from '@/utils/cesium'
import {
  ORG_OPTIONS,
  ACTION_OPTIONS,
  TURN_MODE_OPTIONS,
  CLIMB_MODE_OPTIONS,
  ALGORITHM_TYPE_OPTIONS,
  AIRWAY_HEIGHT_MODE_OPTIONS
} from '@/mock'

const zip = new JSZip()
const activeKey = ref(0)
const alertBtnRef = ref()
const activeHangar = ref()
const loading = ref(false)
const activeWaypoint = ref()
const actionEditData = ref()
const hangarOptions = ref([])
const formStateSortsRef = ref()
const isActionVisible = ref(false)
const tempPointSpeedList = ref([])
const tempPointAltitudeList = ref([])
const emit = defineEmits(['ok', 'org'])
const { activeOrg } = inject('activeOrg', {})
const { airwayType } = inject('airwayType', {})
const props = defineProps(['edit', 'geofence'])
const { cesiumViewer } = inject('cesiumViewer')
const isAlertInfoHover = useElementHover(alertBtnRef)
const latitudeRegex = /^(-?[0-8]?[0-9]|-?90)(\.[0-9]{1,20})?$/
const isDjHangar = computed(() => activeHangar.value?.type?.includes('dj'))
const longitudeRegex = /^(-?1[0-7][0-9]|-?[0-9]?[0-9]|-?180)(\.[0-9]{1,20})?$/
const { updateAirwayWarningMsgOptions } = inject('updateAirwayWarningMsgOptions', {})
const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: true, trimValues: true })
const waypointCondition1 = useThrottleFn(() => message.warning('第一个航点需要距离机场 20 米以上'), 2000)
const waypointCondition2 = useThrottleFn(() => message.warning('最后一个航点需要距离机场 50 米以上'), 2000)
const waypointCondition3 = useThrottleFn(
  () => message.warning('两个航点之间的距离不能小于 0.1 米，不能大于 10000 米'),
  2000
)
const {
  createAirway,
  updateAirway,
  removeWaypoint,
  createWaypoint,
  updateWaypoint,
  removeAllAirway,
  createHangarScope,
  removeHangarPoint,
  removeAllWaypoint,
  removeHangarScope,
  createHangarPoint,
  updateWaypointColor
} = useCesiumModel()

const defaultPointListData = {
  speed: 5,
  sorts: 1,
  altitude: 100,
  actionList: [],
  lon: undefined,
  lat: undefined,
  routeSpeed: true,
  pointName: '航点1',
  routeAltitude: true,
  routePointMethod: true,
  pointMethodName: '直线飞行，飞行器到点停',
  pointMethod: 'toPointAndStopWithDiscontinuityCurvature'
}
const formState = ref({
  sorts: [{ pointList: { ...defaultPointListData } }],
  routeList: {
    name: '',
    orgId: [],
    aiType: [],
    routeModel: 2,
    aiTypeName: [],
    globalSpeed: 5,
    predictTime: 0,
    safeAltitude: 20,
    globalHeight: 100,
    predictMileage: 0,
    returnAltitude: 100,
    hangarId: undefined,
    climbMode: 'safely',
    type: airwayType.value,
    globalHeightModeName: '相对起飞点高度',
    globalHeightMode: 'relativeToStartPoint',
    globalPointMethodName: '直线飞行，飞行器到点停',
    globalPointMethod: 'toPointAndStopWithDiscontinuityCurvature'
  }
})
const tempGlobalSpeed = ref(formState.value.routeList.globalSpeed)
const tempGlobalHeight = ref(formState.value.routeList.globalHeight)
const tempSafeAltitude = ref(formState.value.routeList.safeAltitude)
const tempReturnAltitude = ref(formState.value.routeList.returnAltitude)
const ACTION_COLUMNS = [
  {
    width: 80,
    title: '序号',
    align: 'center',
    dataIndex: 'actOrder',
    customRender: ({ index }) => index + 1
  },
  {
    width: 120,
    title: '动作类型',
    align: 'center',
    dataIndex: 'actModeName'
  },
  {
    title: '动作值',
    ellipsis: true,
    align: 'center',
    dataIndex: 'actValue'
  },
  {
    width: 150,
    title: '操作',
    align: 'center',
    dataIndex: 'operates'
  }
]

const formatTitle = computed(() => {
  if (props.edit) {
    if (props.edit.type === 'edit') {
      return '编辑'
    } else {
      return '复制'
    }
  } else {
    return '新增'
  }
})

// 创建一个方便监听表单的计算属性，根据状态同步增删改查 Cesium 中的实体
const flightModelStatus = computed(() => {
  const { sorts, routeList } = formState.value
  const { climbMode, globalSpeed, globalHeight, safeAltitude, returnAltitude, globalHeightMode } = routeList
  const keys = sorts.map(({ pointList }) => {
    const { lon, lat, speed, altitude, pointName } = pointList

    return { lon, lat, speed, altitude, pointName }
  })

  return {
    climbMode,
    globalSpeed,
    sorts: keys,
    safeAltitude,
    globalHeight,
    returnAltitude,
    globalHeightMode
  }
})

function handleActionSubmit(formData) {
  const { actOrder, dictCode } = formData
  const pointList = formState.value.sorts[activeKey.value].pointList

  // 判断全景动作与其它动作不能共存
  if (pointList.actionList) {
    if (dictCode === 'panoShot') {
      if (pointList.actionList.length > 0) {
        message.warning('当前航点已存在动作，无法选择全景拍照')
        return
      }
    } else {
      for (let i = 0; i < pointList.actionList.length; i++) {
        if (pointList.actionList[i].dictCode === 'panoShot') {
          message.warning('当前航点已存在全景拍照，无法选择其它动作')
          return
        }
      }
    }
  }

  // 编辑
  if (actOrder) {
    pointList.actionList.forEach((item) => {
      if (item.actOrder === actOrder) {
        pointList.actionList[actOrder - 1] = formData
      }
    })
  } else {
    // 新增
    !pointList.actionList && (pointList.actionList = [])
    pointList.actionList.push({ ...formData, actOrder: pointList.actionList.length + 1 })
  }

  isActionVisible.value = false
}

// 判断导入的航点是否全部满足飞行要求
// 1. 全部的点需要在飞行范围内
// 2. 两个航点之间的距离不能小于 0.1 米，不能大于 10000 米
// 3. 第一个航点必须距离机场 20 米以上，最后一个航点距离机场 50 米以上(大疆机场没有此要求)
function isWaypointsInHangarRange(coordinates) {
  const waypoints = chunk(coordinates, 3)
  const {
    workRadius,
    altitude: hangarAltitude,
    latitude: hangarLatitude,
    longitude: hangarLongitude
  } = activeHangar.value
  const hangarPoint = [hangarLongitude, hangarLatitude, hangarAltitude]

  const isAllRange = waypoints.every(([longitude, latitude, altitude]) => {
    const pointAltitude =
      formState.value.routeList.globalHeightMode === 'relativeToStartPoint' ? hangarAltitude + altitude : altitude
    const distanceInMeters = computePointDistance(hangarPoint, [longitude, latitude, pointAltitude])

    return distanceInMeters <= workRadius
  })

  const isDistanceBetweenTwoPoints = () => {
    for (let index = 0; index < waypoints.length - 1; index++) {
      const distanceInMeters = computePointDistance(waypoints[index], waypoints[index + 1])

      if (distanceInMeters < 0.1 || distanceInMeters > 10000) {
        return true
      }
    }

    return false
  }
  const isFirstPoint = computePointDistance(waypoints[0], hangarPoint)
  const isLastPoint = computePointDistance(waypoints.at(-1), hangarPoint)

  if (!isAllRange) {
    message.warning('导入航线失败，航点超出飞行范围')
    return false
  } else if (isDistanceBetweenTwoPoints()) {
    message.warning('两个航点之间的距离不能小于 0.1 米，不能大于 10000 米')
    return false
  } else if (!isDjHangar.value && (isFirstPoint < 20 || isLastPoint < 50)) {
    message.warning('第一个航点必须距离机场 20 米以上，最后一个航点距离机场 50 米以上')
    return false
  } else {
    return true
  }
}

async function importAirway({ file }) {
  try {
    let kmlContent = file
    const waypoints = []
    const coordinates = []
    const fileType = file.name.match(/\.([^.]+)$/)[1]

    if (fileType !== 'kml' && fileType !== 'kmz') {
      message.warning('导入航线失败，文件格式不正确')
      return
    }

    if (fileType === 'kmz') {
      const zipData = await zip.loadAsync(file)

      for (const fileName in zipData.files) {
        if (fileName.endsWith('.kml')) {
          kmlContent = await zipData.files[fileName].async('string')
          break
        }
      }
    } else {
      kmlContent = await file.text()
    }

    const result = parser.parse(kmlContent)

    // 如果是 APP 自定义 kmz 文件则需要删除第一个航点（机场航点）
    if (result.kml.Document?.['wpml:author'] === 'gsunis') {
      result.kml.Document.Folder.Placemark.shift()
    }

    // 全局高度
    const { 'wpml:globalHeight': globalHeight = 100 } = result.kml.Document.Folder

    formState.value.routeList.globalHeight = Math.round(globalHeight)

    // 全局速度
    const { 'wpml:autoFlightSpeed': globalSpeed = 15 } = result.kml.Document.Folder

    if (globalSpeed >= 1 && globalSpeed <= 15) {
      formState.value.routeList.globalSpeed = globalSpeed
    }

    // 全局过点方式
    const {
      'wpml:globalUseStraightLine': globalUseStraightLine,
      'wpml:globalWaypointTurnMode': globalWaypointTurnMode = 'toPointAndStopWithDiscontinuityCurvature'
    } = result.kml.Document.Folder

    if (globalUseStraightLine === 1 && globalWaypointTurnMode === 'toPointAndPassWithContinuityCurvature') {
      TURN_MODE_OPTIONS.forEach((item) => {
        if (item.dictCode === 'toPointAndPassWithContinuityCurvature1') {
          formState.value.routeList.globalPointMethod = item.dictCode
          formState.value.routeList.globalPointMethodName = item.dictName
        }
      })
    } else {
      TURN_MODE_OPTIONS.forEach((item) => {
        if (item.dictCode === globalWaypointTurnMode) {
          formState.value.routeList.globalPointMethod = item.dictCode
          formState.value.routeList.globalPointMethodName = item.dictName
        }
      })
    }

    // 全局高度模式
    const { 'wpml:heightMode': globalHeightMode } = result.kml.Document.Folder['wpml:waylineCoordinateSysParam']

    AIRWAY_HEIGHT_MODE_OPTIONS.forEach((item) => {
      if (item.dictCode === globalHeightMode) {
        formState.value.routeList.globalHeightMode = item.dictCode
        formState.value.routeList.globalHeightModeName = item.dictName
      }
    })

    // 全局返航高度
    const { 'wpml:globalRTHHeight': globalRTHHeight = 100 } = result.kml.Document['wpml:missionConfig']

    if (globalRTHHeight >= 20 && globalRTHHeight <= 500) {
      formState.value.routeList.returnAltitude = globalRTHHeight
    }

    // 全局安全起飞高度
    const { 'wpml:takeOffSecurityHeight': takeOffSecurityHeight = 20 } = result.kml.Document['wpml:missionConfig']

    if (takeOffSecurityHeight >= 20 && takeOffSecurityHeight <= 500) {
      formState.value.routeList.safeAltitude = takeOffSecurityHeight
    }

    // 全局爬升模式
    const { 'wpml:flyToWaylineMode': flyToWaylineMode = 'safely' } = result.kml.Document['wpml:missionConfig']

    formState.value.routeList.climbMode = flyToWaylineMode

    // 航点数据
    for (let i = 0; i < result.kml.Document.Folder.Placemark.length; i++) {
      let speed = 0
      let altitude = 0
      const placemark = result.kml.Document.Folder.Placemark[i]
      const lon = parseFloat(placemark.Point.coordinates.split(',')[0])
      const lat = parseFloat(placemark.Point.coordinates.split(',')[1])
      const { 'wpml:action': action } = placemark?.['wpml:actionGroup'] || {}
      const { globalHeight, globalPointMethod, globalSpeed } = formState.value.routeList

      // 航点高度
      if (placemark?.['wpml:height']) {
        const height = Math.round(placemark['wpml:height'])

        altitude = height
      } else {
        altitude = globalHeight
      }

      // 航点速度
      if (placemark?.['wpml:waypointSpeed']) {
        const rate = Math.round(placemark['wpml:waypointSpeed'])

        if (rate >= 1 && rate <= 15) {
          speed = rate
        } else {
          speed = globalSpeed
        }
      } else {
        speed = globalSpeed
      }

      let pointMethod = placemark?.['wpml:waypointTurnParam']?.['wpml:waypointTurnMode'] || globalPointMethod
      const pointUseStraightLine = placemark?.['wpml:useStraightLine']

      if (pointMethod === 'toPointAndPassWithContinuityCurvature' && pointUseStraightLine === 1) {
        pointMethod = 'toPointAndPassWithContinuityCurvature1'
      }

      const pointMethodName = TURN_MODE_OPTIONS.find((item) => item.dictCode === pointMethod).dictName
      const routeSpeed = speed === globalSpeed
      const routeAltitude = altitude === globalHeight
      const routePointMethod = pointMethod === globalPointMethod
      const aboveSeaLevel = await getAltitudeFromCoordinates(cesiumViewer.value, lon, lat)

      waypoints.push(lon, lat, altitude)
      coordinates.push({
        lon,
        lat,
        speed,
        action,
        altitude,
        routeSpeed,
        pointMethod,
        routeAltitude,
        pointMethodName,
        routePointMethod,
        aboveSeaLevel: Math.round(aboveSeaLevel[0].height)
      })
    }

    if (isWaypointsInHangarRange(waypoints)) {
      const tmp = []

      // 删除之前创建的航线模型
      removeAllAirway(cesiumViewer.value)
      removeAllWaypoint(cesiumViewer.value)

      coordinates.forEach((item, index) => {
        const actionList = []
        const sorts = index + 1
        const {
          lon,
          lat,
          speed,
          action,
          altitude,
          routeSpeed,
          pointMethod,
          aboveSeaLevel,
          routeAltitude,
          pointMethodName,
          routePointMethod
        } = item

        if (action) {
          function setActionList(element, actOrder) {
            ACTION_OPTIONS.forEach((item) => {
              if (item.dictCode === element['wpml:actionActuatorFunc']) {
                const { id: actMode, dictCode, dictName: actModeName } = item
                const params = { actMode, dictCode, actModeName, actOrder }

                if (item.self) {
                  const { max, min, default: preset } = JSON.parse(item.self)
                  let actValue = preset

                  switch (dictCode) {
                    // 根据上云 API（https://developer.dji.com/doc/cloud-api-tutorial/cn/api-reference/dji-wpml/common-element.html#gimbalrotate）文档
                    // 云台偏航角和俯仰角共同使用 wpml:actionActuatorFunc 类型中的 gimbalRotate 字段
                    // 两者区别在于当 wpml:gimbalYawRotateEnable = 1 时，表示启用云台偏航角控制， 当 wpml:gimbalPitchRotateEnable = 1 时，表示启用云台俯仰角控制
                    case 'gimbalRotate':
                      const {
                        'wpml:gimbalYawRotateAngle': yawValue,
                        'wpml:gimbalPitchRotateAngle': pitchValue,
                        'wpml:gimbalYawRotateEnable': isYawEnable,
                        'wpml:gimbalPitchRotateEnable': isPitchEnable
                      } = element['wpml:actionActuatorFuncParam']

                      // 为了兼容旧数据，这里针对偏航角做了处理
                      if (isYawEnable === 1) {
                        ACTION_OPTIONS.forEach(({ id, dictCode, self, dictName }) => {
                          if (dictCode === 'cloud-yaw-angle') {
                            const { max, min, default: preset } = JSON.parse(self)

                            params.actMode = id
                            params.dictCode = dictCode
                            params.actModeName = dictName
                            if (yawValue >= min && yawValue <= max) {
                              actValue = yawValue
                            } else {
                              actValue = preset
                            }
                          }
                        })
                      }

                      if (isPitchEnable === 1 && pitchValue >= min && pitchValue <= max) {
                        actValue = pitchValue
                      }

                      break

                    case 'zoom':
                      const { 'wpml:focalLength': focalLength } = element['wpml:actionActuatorFuncParam']
                      const zoom = Math.round(focalLength / 24)

                      if (zoom >= min && zoom <= max) {
                        actValue = zoom
                      }

                      break

                    case 'hover':
                      const { 'wpml:hoverTime': hoverTime } = element['wpml:actionActuatorFuncParam']

                      if (hoverTime >= min && hoverTime <= max) {
                        actValue = hoverTime
                      }

                      break

                    case 'rotateYaw':
                      const { 'wpml:aircraftHeading': aircraftHeading } = element['wpml:actionActuatorFuncParam']

                      if (aircraftHeading >= min && aircraftHeading <= max) {
                        actValue = aircraftHeading
                      }

                      break
                  }

                  params.actValue = actValue
                }

                actionList.push(params)
              }
            })
          }
          // 单个或多个动作
          if (Array.isArray(action)) {
            action.forEach((item, index) => setActionList(item, index + 1))
          } else {
            setActionList(action, 1)
          }
        }

        tmp.push({
          pointList: {
            ...defaultPointListData,
            lon,
            lat,
            sorts,
            speed,
            altitude,
            actionList,
            routeSpeed,
            pointMethod,
            aboveSeaLevel,
            routeAltitude,
            pointMethodName,
            routePointMethod,
            pointName: `航点${sorts}`
          }
        })
      })

      formState.value.sorts = tmp
      activeKey.value = formState.value.sorts.length - 1
      message.success('导入航线成功')
    }
  } catch (error) {
    message.warning('导入航线失败, 请检查文件是否正确')
  }
}

function handleRemoveWaypoint(index) {
  if (index === 0) {
    message.warning('不能删除当前航点')
  } else {
    // 航点是按索引创建的，删除后需要重新排序和创建
    formState.value.sorts.forEach((_, index) => {
      removeWaypoint(activeHangar.value.id, index, cesiumViewer.value)
    })
    formState.value.sorts.splice(index, 1)
    activeKey.value = index - 1
    formState.value.sorts.forEach(({ pointList }, index) => {
      pointList.sorts = index + 1
    })
  }
}

async function handleTabsEdit(targetKey, action) {
  if (action === 'add') {
    await formStateSortsRef.value.validateFields([
      ['sorts', activeKey.value, 'pointList', 'lon'],
      ['sorts', activeKey.value, 'pointList', 'lat']
    ])
    const { sorts, routeList } = formState.value
    const { globalSpeed, globalHeight, globalPointMethod, globalPointMethodName } = routeList

    activeKey.value = sorts.length
    sorts.push({
      pointList: {
        ...defaultPointListData,
        lon: '',
        lat: '',
        actionList: [],
        speed: globalSpeed,
        altitude: globalHeight,
        sorts: sorts.length + 1,
        pointMethod: globalPointMethod,
        pointName: `航点${sorts.length + 1}`,
        pointMethodName: globalPointMethodName
      }
    })
  } else {
    handleRemoveWaypoint(targetKey)
  }
}

function handleDeleteActionItem({ actOrder }) {
  const pointList = formState.value.sorts[activeKey.value].pointList
  pointList.actionList = pointList.actionList.filter((item) => item.actOrder !== actOrder)
  pointList.actionList.forEach((item, index) => {
    item.actOrder = index + 1
  })
}

function handleAddActionItem() {
  actionEditData.value = null
  isActionVisible.value = true
}

function handleEditActionItem(item) {
  actionEditData.value = item
  isActionVisible.value = true
}

async function handleTabsChange(index) {
  const { id } = activeHangar.value

  await formStateSortsRef.value.validateFields([
    ['sorts', activeKey.value, 'pointList', 'lon'],
    ['sorts', activeKey.value, 'pointList', 'lat']
  ])

  updateWaypointColor(id, activeKey.value, cesiumViewer.value)
  updateWaypointColor(id, index, cesiumViewer.value, true)
  activeKey.value = index
}

function handleGlobalSpeedChange(value) {
  formState.value.routeList.globalSpeed = value
  formState.value.sorts.forEach((item) => {
    if (item.pointList.routeSpeed) {
      item.pointList.speed = value || 0
    }
  })
}

function handleHangarChange(_, options) {
  // 不重复生成机场模型
  if (activeHangar.value.id !== options.id) {
    removeAllModel()
    objectStringToNumber(options, ['longitude', 'latitude', 'altitude', 'workRadius'])
    const { id, name, longitude, latitude, altitude, workRadius } = options

    activeKey.value = 0
    activeHangar.value = options
    formState.value.routeList = {
      aiType: [],
      routeModel: 2,
      aiTypeName: [],
      globalSpeed: 5,
      predictTime: 0,
      safeAltitude: 20,
      globalHeight: 100,
      predictMileage: 0,
      climbMode: 'safely',
      returnAltitude: 100,
      hangarId: options.id,
      id: formState.value.routeList.id,
      globalHeightModeName: '相对起飞点高度',
      name: formState.value.routeList.name,
      orgId: formState.value.routeList.orgId,
      globalHeightMode: 'relativeToStartPoint',
      globalPointMethodName: '直线飞行，飞行器到点停',
      globalPointMethod: 'toPointAndStopWithDiscontinuityCurvature'
    }
    formState.value.sorts = [{ pointList: { ...defaultPointListData } }]

    createHangarPoint({ id, name, viewer: cesiumViewer.value, longitude, latitude, altitude })
    createHangarScope({ id, name, viewer: cesiumViewer.value, longitude, latitude, altitude, workRadius })
    flyTo(cesiumViewer.value, { ...options, height: 3000 })
  }
}

async function handleGlobalHeightChange(value) {
  formState.value.routeList.globalHeight = value
  formState.value.sorts.forEach(({ pointList }) => {
    if (pointList.routeAltitude) {
      pointList.altitude = value
    }
  })
}

function handleTurnMode(value, option) {
  formState.value.routeList.globalPointMethodName = option.dictName
  formState.value.sorts.forEach((item) => {
    if (item.pointList.routePointMethod) {
      item.pointList.pointMethod = value
      item.pointList.pointMethodName = option.dictName
    }
  })
}

function handleReturn() {
  emit('ok')
}

async function handleLeftClick(tapLongitude, tapLatitude, altitude, picked) {
  if (picked && picked.id) {
    const { id: pickedId } = picked.id

    // 创建航点
    if (pickedId.includes('hangar-scope')) {
      let tapAltitude
      const waypointList = []
      const { sorts, routeList } = formState.value
      const { globalHeight, globalHeightMode } = routeList
      const {
        lat: activeLatitude,
        lon: activeLongitude,
        altitude: activeAltitude,
        aboveSeaLevel: activeAboveSeaLevel
      } = sorts[activeKey.value].pointList
      const {
        workRadius,
        altitude: hangarAltitude,
        latitude: hangarLatitude,
        longitude: hangarLongitude
      } = activeHangar.value

      // 判断是否是新加点还是填充点(新加点按全局高度添加，填充点按当前点高度添加)
      if (globalHeightMode === 'EGM96') {
        if (!activeLongitude || !activeLatitude) {
          tapAltitude = activeAltitude
        } else {
          tapAltitude = globalHeight
        }
      } else if (globalHeightMode === 'relativeToStartPoint') {
        if (!activeLongitude || !activeLatitude) {
          tapAltitude = hangarAltitude + activeAltitude
        } else {
          tapAltitude = hangarAltitude + globalHeight
        }
      } else {
        if (!activeLongitude || !activeLatitude) {
          tapAltitude = (activeAboveSeaLevel ? activeAboveSeaLevel : Math.round(altitude)) + activeAltitude
        } else {
          tapAltitude = Math.round(altitude) + globalHeight
        }
      }

      if (tapAltitude <= altitude) {
        message.warning('该航点高度过低，请重新设置航点高度后再打点')
        return
      }

      // 判断所有航点是否满足要求
      for (const { pointList } of sorts) {
        let { lon, lat, altitude, aboveSeaLevel } = pointList

        // 相对起飞点模式
        if (formState.value.routeList.globalHeightMode === 'relativeToStartPoint') {
          altitude = hangarAltitude + altitude
        }

        // 相对地形模式
        if (formState.value.routeList.globalHeightMode === 'aboveGroundLevel') {
          altitude = aboveSeaLevel + altitude
        }

        lon && lat && altitude && waypointList.push(lon, lat, altitude)
      }

      waypointList.push(tapLongitude, tapLatitude, tapAltitude)

      const isWaypointRequirements = isCreateWaypointRequire({
        workRadius,
        waypointList,
        isDjHangar: isDjHangar.value,
        type: activeHangar.value.type,
        hangarWaypoint: [hangarLongitude, hangarLatitude, hangarAltitude]
      })

      // 插入航点数据
      if (isWaypointRequirements) {
        const { pointList } = sorts[activeKey.value]
        const { globalSpeed, globalPointMethod, globalPointMethodName } = routeList

        // 判断表单当前航点经纬度是否为空
        if (!pointList.lon || !pointList.lat) {
          // 填充当前航点
          pointList.lat = tapLatitude
          pointList.lon = tapLongitude
          pointList.altitude = globalHeight
          pointList.aboveSeaLevel = Math.round(altitude)
        } else {
          // 新增航点
          if (activeKey.value === formState.value.sorts.length - 1) {
            activeKey.value = activeKey.value + 1
            formState.value.sorts.push({
              pointList: {
                ...defaultPointListData,
                actionList: [],
                lat: tapLatitude,
                lon: tapLongitude,
                speed: globalSpeed,
                altitude: globalHeight,
                sorts: sorts.length + 1,
                pointMethod: globalPointMethod,
                pointName: `航点${sorts.length + 1}`,
                aboveSeaLevel: Math.round(altitude),
                pointMethodName: globalPointMethodName
              }
            })
          } else {
            // 插入航点
            const insertPoint = {
              pointList: {
                ...defaultPointListData,
                sorts: 0,
                actionList: [],
                lat: tapLatitude,
                lon: tapLongitude,
                speed: globalSpeed,
                pointName: '新插入的点',
                altitude: globalHeight,
                pointMethod: globalPointMethod,
                aboveSeaLevel: Math.round(altitude),
                pointMethodName: globalPointMethodName
              }
            }
            // 航点是按索引创建的，删除后需要重新排序和创建
            formState.value.sorts.forEach((_, index) => {
              removeWaypoint(activeHangar.value.id, index, cesiumViewer.value)
            })
            formState.value.sorts.splice(activeKey.value + 1, 0, insertPoint)
            formState.value.sorts.forEach(({ pointList }, index) => {
              pointList.sorts = index + 1
            })
            activeKey.value = activeKey.value + 1
          }
        }
      }
    }
  } else {
    message.warning('请在机场范围内添加航点')
  }
}

function removeAllModel() {
  if (activeHangar.value) {
    const { id } = activeHangar.value

    removeAllAirway(cesiumViewer.value)
    removeAllWaypoint(cesiumViewer.value)
    removeHangarPoint(id, cesiumViewer.value)
    removeHangarScope(id, cesiumViewer.value)
  }
}

async function handleOrgChange(value, options) {
  // 不在创建重复的机场模型
  if (activeOrg.value.id !== options.id) {
    const viewer = cesiumViewer.value
    const { hangarList = [] } = options.at(-1)

    emit('org', options.at(-1).id)
    removeAllModel()

    if (hangarList.length > 0) {
      objectStringToNumber(hangarList[0], ['longitude', 'latitude', 'workRadius', 'altitude'])
      const { id, type } = hangarList[0]

      activeKey.value = 0
      hangarOptions.value = hangarList
      activeHangar.value = hangarList[0]
      formState.value.routeList.hangarId = id
      formState.value.sorts = [{ pointList: { ...defaultPointListData } }]
      props.edit && (formState.value.routeList.id = props.edit.routeList.id)
      type.includes('dj') && (formState.value.routeList.climbMode = 'safely') // 大疆机场不支持倾斜爬升模式

      createHangarPoint({ ...hangarList[0], viewer })
      createHangarScope({ ...hangarList[0], viewer })
      flyTo(viewer, { ...activeHangar.value, height: 3000 })
    } else {
      activeKey.value = 0
      hangarOptions.value = []
      activeHangar.value = undefined
      formState.value = {
        type: '新增',
        sorts: [{ pointList: { ...defaultPointListData } }],
        routeList: {
          name: '',
          aiType: [],
          orgId: value,
          routeModel: 2,
          aiTypeName: [],
          globalSpeed: 5,
          predictTime: 0,
          safeAltitude: 20,
          globalHeight: 100,
          predictMileage: 0,
          returnAltitude: 100,
          hangarId: undefined,
          climbMode: 'safely',
          globalHeightModeName: '相对起飞点高度',
          globalHeightMode: 'relativeToStartPoint',
          globalPointMethodName: '直线飞行，飞行器到点停',
          globalPointMethod: 'toPointAndStopWithDiscontinuityCurvature'
        }
      }
      message.warning('当前机构下暂无机场')
    }
  }
}

function handleLeftDown(picked) {
  // 选中当前航点(圆盘)
  if (picked?.id.id.includes('waypoint-point-ellipse')) {
    const { id: hangarId } = activeHangar.value
    const { id: pickedId } = picked.id
    const pickedList = pickedId.split('-')
    const index = Number(pickedList.at(-1))

    activeWaypoint.value = picked.id.id
    updateWaypointColor(hangarId, activeKey.value, cesiumViewer.value)
    updateWaypointColor(hangarId, index, cesiumViewer.value, true)
    activeKey.value = index
  }
}

function handleLeftUp() {
  activeWaypoint.value = undefined
}

function handleMouseMove(longitude, latitude, height) {
  const { globalHeightMode } = formState.value.routeList
  const index = Number(activeWaypoint.value.split('-').at(-1))
  const {
    workRadius,
    altitude: hangarAltitude,
    latitude: hangarLatitude,
    longitude: hangarLongitude
  } = activeHangar.value
  const distanceInMeters = computePointDistance(
    [longitude, latitude, height],
    [hangarLongitude, hangarLatitude, hangarAltitude]
  )

  // 1. 修改的航点需要在飞行范围内
  if (distanceInMeters > workRadius) {
    return false
  }

  // 2. 两个航点之间的距离不能小于 0.1 米，不能大于 10000 米
  for (let i = 0; i < formState.value.sorts.length; i++) {
    if (i !== index) {
      const lon = formState.value.sorts[i].pointList.lon
      const lat = formState.value.sorts[i].pointList.lat
      const aboveSeaLevel = formState.value.sorts[i].pointList.aboveSeaLevel
      let altitude = formState.value.sorts[i].pointList.altitude

      if (globalHeightMode === 'relativeToStartPoint') {
        altitude = Math.round(hangarAltitude + altitude)
      }

      if (globalHeightMode === 'aboveGroundLevel') {
        altitude = Math.round(aboveSeaLevel + altitude)
      }

      const distanceInMeters = computePointDistance([longitude, latitude, height], [lon, lat, altitude])

      if (distanceInMeters < 0.1 || distanceInMeters > 10000) {
        waypointCondition3()
        return false
      }
    }
  }

  // 3. 第一个航点需要距离机场 20 米以上，最后一个航点距离机场 50 米以上(大疆机场无此要求)
  if (!isDjHangar.value && index === 0 && formState.value.sorts[index + 1] !== undefined) {
    if (distanceInMeters < 20) {
      waypointCondition1()
      return false
    }
  }

  if (!isDjHangar.value && index === formState.value.sorts.length - 1) {
    if (distanceInMeters < 50) {
      waypointCondition2()
      return false
    }
  }

  formState.value.sorts[index].pointList.lat = latitude
  formState.value.sorts[index].pointList.lon = longitude
  formState.value.sorts[index].pointList.aboveSeaLevel = height
}

function initCesiumMouseControl() {
  useWaypointFlightControl(cesiumViewer.value, handleLeftClick, handleLeftDown, handleLeftUp, handleMouseMove)
}

async function validateLongitude(rule, value) {
  const waypointIndex = Number(rule.field.split('.')[1])
  const { globalHeightMode } = formState.value.routeList
  let { lat, altitude: waypointAltitude, aboveSeaLevel } = formState.value.sorts[waypointIndex].pointList
  const waypointLatitude = parseFloat(lat)
  const waypointLongitude = parseFloat(value)
  const isLatitudeRegex = latitudeRegex.test(waypointLatitude)
  const isLongitudeRegex = longitudeRegex.test(waypointLongitude)
  const {
    workRadius,
    altitude: hangarAltitude,
    latitude: hangarLatitude,
    longitude: hangarLongitude
  } = activeHangar.value

  if (globalHeightMode === 'relativeToStartPoint') {
    waypointAltitude = hangarAltitude + waypointAltitude
  }

  if (globalHeightMode === 'aboveGroundLevel') {
    waypointAltitude = aboveSeaLevel + waypointAltitude
  }

  if (isNaN(waypointLongitude) || waypointLongitude === '') {
    message.warning(`请输入航点${waypointIndex + 1}经度`)
    return Promise.reject('请输入经度')
  } else if (!isLongitudeRegex) {
    message.warning(`请检查航点${waypointIndex + 1}输入格式`)
    return Promise.reject('请检查输入格式')
  } else if (isLongitudeRegex && isLatitudeRegex && waypointAltitude) {
    const prevWaypoint = formState.value.sorts[waypointIndex - 1]
    const distanceInMeters = computePointDistance(
      [hangarLongitude, hangarLatitude, hangarAltitude],
      [waypointLongitude, waypointLatitude, waypointAltitude]
    )
    // 1. 全部的点需要在飞行范围内
    if (distanceInMeters > workRadius) {
      message.warning('请在机场范围内添加航点')
      return Promise.reject('请在机场范围内添加航点')
    }

    // 2. 两个航点之间的距离不能小于 0.1 米，不能大于 10000 米
    if (prevWaypoint) {
      const { lon, lat, altitude } = prevWaypoint.pointList
      const distanceInMeters = computePointDistance(
        [waypointLongitude, waypointLatitude, waypointAltitude],
        [parseFloat(lon), parseFloat(lat), parseFloat(altitude)]
      )
      if (distanceInMeters < 0.1 || distanceInMeters > 10000) {
        message.warning('两个航点之间的距离不能小于 0.1 米，不能大于 10000 米')
        return Promise.reject('两个航点之间的距离不能小于 0.1 米，不能大于 10000 米')
      }
    }

    // 3. 第一个航点需要距离机场 20 米以上
    if (formState.value.sorts.length > 2) {
      if (!isDjHangar.value && waypointIndex === 0 && distanceInMeters < 20) {
        message.warning('第一个航点需要距离机场 20 米以上')
        return Promise.reject('第一个航点需要距离机场 20 米以上')
      }

      // 4. 最后一个航点距离机场 50 米以上(大疆机场无此要求)
      if (!isDjHangar.value && waypointIndex === formState.value.sorts.length - 1 && distanceInMeters < 50) {
        message.warning('最后一个航点需要距离机场 50 米以上')
        return Promise.reject('最后一个航点需要距离机场 50 米以上')
      }
    }
    return Promise.resolve()
  } else {
    return Promise.resolve()
  }
}

async function validateLatitude(rule, value) {
  const waypointIndex = Number(rule.field.split('.')[1])
  const { globalHeightMode } = formState.value.routeList
  let { lon, altitude: waypointAltitude, aboveSeaLevel } = formState.value.sorts[waypointIndex].pointList
  const waypointLongitude = parseFloat(lon)
  const waypointLatitude = parseFloat(value)
  const isLatitudeRegex = latitudeRegex.test(waypointLatitude)
  const isLongitudeRegex = longitudeRegex.test(waypointLongitude)
  const {
    workRadius,
    altitude: hangarAltitude,
    latitude: hangarLatitude,
    longitude: hangarLongitude
  } = activeHangar.value

  if (globalHeightMode === 'relativeToStartPoint') {
    waypointAltitude = hangarAltitude + waypointAltitude
  }

  if (globalHeightMode === 'aboveGroundLevel') {
    waypointAltitude = aboveSeaLevel + waypointAltitude
  }

  if (isNaN(waypointLatitude) || waypointLatitude === '') {
    message.warning(`请输入航点${waypointIndex + 1}纬度`)
    return Promise.reject('请输入纬度')
  } else if (!isLatitudeRegex) {
    message.warning(`请检查航点${waypointIndex + 1}输入格式`)
    return Promise.reject('请检查输入格式')
  } else if (isLongitudeRegex && isLatitudeRegex && waypointAltitude) {
    const prevWaypoint = formState.value.sorts[waypointIndex - 1]
    const distanceInMeters = computePointDistance(
      [hangarLongitude, hangarLatitude, hangarAltitude],
      [waypointLongitude, waypointLatitude, waypointAltitude]
    )
    // 1. 全部的点需要在飞行范围内
    if (distanceInMeters > workRadius) {
      message.warning('请在机场范围内添加航点')
      return Promise.reject('请在机场范围内添加航点')
    }

    // 2. 两个航点之间的距离不能小于 0.1 米，不能大于 10000 米
    if (prevWaypoint) {
      const { lon, lat, altitude } = prevWaypoint.pointList
      const distanceInMeters = computePointDistance(
        [waypointLongitude, waypointLatitude, waypointAltitude],
        [parseFloat(lon), parseFloat(lat), parseFloat(altitude)]
      )
      if (distanceInMeters < 0.1 || distanceInMeters > 10000) {
        message.warning('两个航点之间的距离不能小于 0.1 米，不能大于 10000 米')
        return Promise.reject('两个航点之间的距离不能小于 0.1 米，不能大于 10000 米')
      }
    }

    // 3. 第一个航点需要距离机场 20 米以上
    if (formState.value.sorts.length > 2) {
      if (!isDjHangar.value && waypointIndex === 0 && distanceInMeters < 20) {
        message.warning('第一个航点需要距离机场 20 米以上')
        return Promise.reject('第一个航点需要距离机场 20 米以上')
      }

      // 4. 最后一个航点距离机场 50 米以上(大疆机场无此要求)
      if (!isDjHangar.value && waypointIndex === formState.value.sorts.length - 1 && distanceInMeters < 50) {
        message.warning('最后一个航点需要距离机场 50 米以上')
        return Promise.reject('最后一个航点需要距离机场 50 米以上')
      }
    }
    return Promise.resolve()
  } else {
    return Promise.resolve()
  }
}

async function handlePointHeightChecked({ checked }, point) {
  if (checked) {
    point.altitude = formState.value.routeList.globalHeight
  }
}

function handleAIChange(_, label) {
  formState.value.routeList.aiTypeName = label
}

function handlePointSpeedChange(value, item, index) {
  item.pointList.speed = value
  delete tempPointSpeedList.value[index]
}

// 处理航线高度模式变更
async function handleGlobalHeightMode(value) {
  const { sorts, routeList } = formState.value

  AIRWAY_HEIGHT_MODE_OPTIONS.forEach((item) => {
    if (item.dictCode === value) {
      formState.value.routeList.globalHeightModeName = item.dictName
    }
  })

  if (value === 'EGM96') {
    routeList.globalHeight = Math.round(activeHangar.value.altitude + 100)
  } else {
    routeList.globalHeight = 100
  }

  for (const { pointList } of sorts) {
    pointList.routeAltitude = true

    if (value === 'EGM96') {
      pointList.altitude = Math.round(activeHangar.value.altitude + 100)
    } else {
      pointList.altitude = 100
    }
  }

  routeList.returnAltitude = 100
}

function handlePointListRoutePointMethod({ checked }, { pointList }) {
  if (checked) {
    const { globalPointMethod, globalPointMethodName } = formState.value.routeList

    pointList.pointMethod = globalPointMethod
    pointList.pointMethodName = globalPointMethodName
  }
}

function handlePointListRoutePointMethodNameChange({ dictName }, { pointList }) {
  pointList.pointMethodName = dictName
}

function handlePointSpeed({ checked }, { pointList }) {
  if (checked) {
    pointList.speed = formState.value.routeList.globalSpeed
  }
}

async function setDefaultParams() {
  if (props.edit) {
  } else {
    const viewer = cesiumViewer.value
    const { nodePathc, hangarList } = activeOrg.value

    formState.value.routeList.orgId = nodePathc.split('.').map(Number)
    if (hangarList.length > 0) {
      hangarOptions.value = hangarList
      objectStringToNumber(hangarList[0], ['longitude', 'latitude', 'workRadius', 'altitude'])
      activeHangar.value = hangarList[0]
      formState.value.routeList.hangarId = activeHangar.value.id
      createHangarPoint({ ...activeHangar.value, viewer })
      createHangarScope({ ...activeHangar.value, viewer })
      flyTo(viewer, { ...activeHangar.value, height: 3000 })
    } else {
      message.warning('当前机构下暂无机场')
    }
  }
}

function handleReturnAltitudeChange(value) {
  formState.value.routeList.returnAltitude = value
}

function handleSafeAltitudeChange(value) {
  formState.value.routeList.safeAltitude = value
}

function handlePointHeightChange(value, item, index) {
  item.pointList.altitude = value
  delete tempPointAltitudeList.value[index]
}

async function handleFlightModel() {
  let isReturnAltitude
  const tooLowMsgList = []
  const { sorts, routeList } = formState.value
  const { climbMode, safeAltitude, returnAltitude, globalHeightMode } = routeList
  const {
    id: hangarId,
    altitude: hangarAltitude,
    latitude: hangarLatitude,
    longitude: hangarLongitude
  } = activeHangar.value
  const isCreateAirway = cesiumViewer.value.entities.getById(`airway-${hangarId}`)
  const coordinates = [{ longitude: hangarLongitude, latitude: hangarLatitude, altitude: hangarAltitude }]
  const airwayParams = { id: hangarId, coordinates, viewer: cesiumViewer.value }
  const {
    lat: lastPointLatitude,
    lon: lastPointLongitude,
    altitude: lastPointAltitude,
    aboveSeaLevel: lastPointAboveSeaLevel
  } = sorts.at(-1).pointList
  const isCreateFlightModal = formState.value.sorts.every(
    ({ pointList }) => longitudeRegex.test(pointList.lon) && latitudeRegex.test(pointList.lat)
  )

  // 创建或更新飞行模型需要满足条件
  if (!isCreateFlightModal) {
    return false
  }

  // 根据高度模式判断是否显示最后一个航点至返航高度的航线
  if (globalHeightMode === 'EGM96') {
    isReturnAltitude = lastPointAltitude === Math.round(hangarAltitude + returnAltitude)
  } else if (globalHeightMode === 'relativeToStartPoint') {
    isReturnAltitude = lastPointAltitude === returnAltitude
  } else {
    isReturnAltitude = lastPointAboveSeaLevel + lastPointAltitude === Math.round(hangarAltitude + returnAltitude)
  }

  // 根据爬升模式确定机场上方航点位置
  const takeOffPointParams = { longitude: hangarLongitude, latitude: hangarLatitude, altitude: 0 }
  const { altitude: firstPointHeight, aboveSeaLevel: firstPointAboveSeaLevel } = formState.value.sorts[0].pointList

  // 垂直模式
  if (climbMode === 'safely') {
    if (globalHeightMode === 'EGM96') {
      takeOffPointParams.altitude = firstPointHeight
    } else if (globalHeightMode === 'relativeToStartPoint') {
      takeOffPointParams.altitude = hangarAltitude + firstPointHeight
    } else {
      takeOffPointParams.altitude = firstPointAboveSeaLevel + firstPointHeight
    }
  } else {
    // 倾斜模式
    takeOffPointParams.altitude = Math.round(hangarAltitude + parseFloat(safeAltitude))
  }

  // 机场上方航点
  coordinates.push(takeOffPointParams)

  // 更新航点
  for (const [index, { pointList: point }] of sorts.entries()) {
    const { lon: longitude, lat: latitude, altitude, aboveSeaLevel: groundAltitude, pointName } = point
    const isCreatePoint = cesiumViewer.value.entities.getById(`waypoint-point-ellipse-${hangarId}-${index}`)
    const pointParams = {
      index,
      latitude,
      longitude,
      id: hangarId,
      groundAltitude,
      viewer: cesiumViewer.value,
      name: pointName || `航点${index + 1}`,
      isActive: index === activeKey.value ? true : false
    }

    if (globalHeightMode === 'EGM96') {
      pointParams.flightAltitude = altitude
    } else if (globalHeightMode === 'relativeToStartPoint') {
      pointParams.flightAltitude = hangarAltitude + altitude
    } else {
      pointParams.flightAltitude = groundAltitude + altitude
    }

    // 判断航点是否过低
    if (pointParams.flightAltitude - groundAltitude < 30) {
      tooLowMsgList.push({ type: 'tooLow', index: index + 1 })
    }

    isCreatePoint ? updateWaypoint(pointParams) : createWaypoint(pointParams)
    coordinates.push({ latitude, longitude, altitude: pointParams.flightAltitude })
  }

  // 大疆机场不显示返航航线
  if (!isDjHangar.value) {
    // 如果最后一个航点高度与返航高度不一致，还需要显示这段里程
    if (!isReturnAltitude) {
      const returnPoint = {
        latitude: lastPointLatitude,
        longitude: lastPointLongitude,
        altitude: hangarAltitude + returnAltitude
      }

      coordinates.push(returnPoint)
    }

    if (hangarAltitude + returnAltitude - sorts.at(-1).pointList.aboveSeaLevel < 30) {
      tooLowMsgList.push({ type: 'tooLow', index: '返航航点' })
    }

    // 返航机场上方航点位置
    coordinates.push({
      latitude: hangarLatitude,
      longitude: hangarLongitude,
      altitude: coordinates.at(-1).altitude
    })

    // 机场位置
    coordinates.push({ longitude: hangarLongitude, latitude: hangarLatitude, altitude: hangarAltitude })
  }

  // 航线警告判断
  updateAirwayWarningMsgOptions(tooLowMsgList)

  // 计算航线里程及飞行时间
  // 返航速度按照 10m/s 计算
  // 机场上空到航点1采用全局速度
  // 航点间速度向后兼容，例如航点1速度实际上是航点1到航点2的速度以此类推
  // 因为每种无人机的起飞速度和降落速度都不一样，所以这里采用均值计算 3m/s
  // 无人机到达最后一个航点后，会先飞到返航高度，然后直径飞到机场上方（高度与返航高度一致）后下降（大疆机场没有采用此方法）
  routeList.predictTime = 0
  routeList.predictMileage = 0

  // 计算航线里程
  const pointList = coordinates.map(({ longitude, latitude, altitude }) => [longitude, latitude, altitude])
  for (let i = 0; i < pointList.length - 1; i++) {
    const startPoint = pointList[i]
    const endPoint = pointList[i + 1]
    const distance = computePointDistance(startPoint, endPoint)

    routeList.predictMileage = Math.round(routeList.predictMileage + distance)

    // 爬升和降落使用固定速度
    if (i === 0 || i === coordinates.length - 2) {
      routeList.predictTime = routeList.predictTime + distance / 3
    } else if (i === 1) {
      // 第一个点使用全局速度
      routeList.predictTime = routeList.predictTime + distance / formState.value.routeList.globalSpeed
    } else {
      if (formState.value.sorts[i - 1]) {
        routeList.predictTime = routeList.predictTime + distance / formState.value.sorts[i - 2].pointList.speed
      } else {
        routeList.predictTime = routeList.predictTime + distance / 10
      }
    }
  }

  // 计算航线时间
  routeList.predictTime = Number((routeList.predictTime / 60).toFixed(2)) // 单位分钟
  // 更新航线
  isCreateAirway ? updateAirway(airwayParams) : createAirway(airwayParams)
}

function getTempPointSpeed(index) {
  return tempPointSpeedList.value[index] ?? formState.value.sorts[index].pointList.speed
}

function getTempPointAltitude(index) {
  return tempPointAltitudeList.value[index] ?? formState.value.sorts[index].pointList.altitude
}

onKeyDown(['Delete'], () => handleRemoveWaypoint(activeKey.value), { dedupe: true })

// 监听表单数据变动，同步生成飞行模型和计算航线距离(只监听影响飞行变动的数据)
watch(flightModelStatus, () => activeHangar.value && handleFlightModel(), { deep: true })

watch(
  () => formState.value.routeList.globalSpeed,
  (value) => {
    tempGlobalSpeed.value = value
  }
)

watch(
  () => formState.value.routeList.globalHeight,
  (value) => {
    tempGlobalHeight.value = value
  }
)

watch(
  () => formState.value.routeList.returnAltitude,
  (value) => {
    tempReturnAltitude.value = value
  }
)

watch(
  () => formState.value.routeList.safeAltitude,
  (value) => {
    tempSafeAltitude.value = value
  }
)

onMounted(() => {
  setDefaultParams()
  initCesiumMouseControl()
})
</script>

<template>
  <div class="airway-form">
    <airway-container>
      <template #header>
        <div class="airway-form__header">
          <h1>
            <a-space>
              <span>{{ formatTitle }}航点航线</span>
              <div class="alert">
                <info-circle-outlined style="color: #999" ref="alertBtnRef" />
                <div class="info" v-show="isAlertInfoHover">
                  <div class="horn top-left"></div>
                  <div class="horn top-right"></div>
                  <div class="horn bottom-left"></div>
                  <div class="horn bottom-right"></div>
                  <h2>添加航线提示:</h2>
                  <ol>
                    <li>鼠标左键添加航点，需要添加在飞行范围内</li>
                    <li>可以点击任意航点拖动位置</li>
                    <li>点击选中任意航点后，可在后面添加航点，或者点击键盘 Delete 键删除航点</li>
                  </ol>
                </div>
              </div>
            </a-space>
          </h1>
          <a-space>
            <a-upload :max-count="1" :show-upload-list="false" accept=".kmz,.kml" :custom-request="importAirway">
              <a-button type="link" size="small">
                <template #icon><upload-outlined /></template>
                导入航线
              </a-button>
            </a-upload>
          </a-space>
        </div>
      </template>

      <div class="airway-form__body">
        <h2 class="title">航线设置:</h2>
        <div class="card">
          <a-form :model="formState" ref="formStateRef" layout="vertical">
            <a-form-item
              label="航线名称:"
              :name="['routeList', 'name']"
              :rules="{ required: true, message: '请输入航线名称!' }"
            >
              <a-input
                allow-clear
                :maxlength="100"
                placeholder="请输入航线名称"
                v-model:value="formState.routeList.name"
              />
            </a-form-item>
            <a-form-item
              label="所属机构:"
              :name="['routeList', 'orgId']"
              :rules="{ required: true, message: '请选择所属机构!' }"
            >
              <a-cascader
                change-on-select
                :allow-clear="false"
                :options="ORG_OPTIONS"
                @change="handleOrgChange"
                placeholder="请选择所属机构"
                v-model:value="formState.routeList.orgId"
                :field-names="{ label: 'orgName', value: 'id' }"
                :getPopupContainer="({ parentNode }) => parentNode"
              />
            </a-form-item>
            <a-form-item
              label="机场名称:"
              :name="['routeList', 'hangarId']"
              :rules="{ required: true, message: '请选择机场!' }"
            >
              <a-select
                placeholder="请选择机场"
                :options="hangarOptions"
                @select="handleHangarChange"
                v-model:value="formState.routeList.hangarId"
                :field-names="{ label: 'name', value: 'id' }"
                :getPopupContainer="({ parentNode }) => parentNode"
              />
            </a-form-item>
            <a-row :gutter="16">
              <a-col class="gutter-row" :span="12">
                <a-form-item :name="['routeList', 'globalSpeed']" :rules="{ required: true, message: '请输入速度!' }">
                  <template v-slot:label>
                    <div class="container">
                      <span>速度:</span>
                      <a-input-number
                        :min="1"
                        :max="15"
                        size="small"
                        addon-after="米/秒"
                        style="width: 120px"
                        @change="handleGlobalSpeedChange"
                        v-model:value="formState.routeList.globalSpeed"
                      />
                    </div>
                  </template>
                  <a-form-item-rest>
                    <a-slider
                      :min="1"
                      :max="15"
                      :value="tempGlobalSpeed"
                      @after-change="handleGlobalSpeedChange"
                      @change="
                        (value) => {
                          tempGlobalSpeed = value
                        }
                      "
                    />
                  </a-form-item-rest>
                </a-form-item>
              </a-col>
              <a-col class="gutter-row" :span="12">
                <a-form-item :name="['routeList', 'globalHeight']" :rules="{ required: true, message: '请输入高度!' }">
                  <template v-slot:label>
                    <div class="container">
                      <span>高度:</span>
                      <a-input-number
                        :step="5"
                        :min="30"
                        :max="3000"
                        size="small"
                        addon-after="米"
                        style="width: 120px"
                        @change="handleGlobalHeightChange"
                        v-model:value="formState.routeList.globalHeight"
                      />
                    </div>
                  </template>
                  <a-form-item-rest>
                    <a-slider
                      :step="5"
                      :min="30"
                      :max="3000"
                      :value="tempGlobalHeight"
                      @after-change="handleGlobalHeightChange"
                      @change="
                        (value) => {
                          tempGlobalHeight = value
                        }
                      "
                    />
                  </a-form-item-rest>
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="16">
              <a-col class="gutter-row" :span="12">
                <a-form-item
                  :name="['routeList', 'returnAltitude']"
                  :rules="{ required: true, message: '请输入返航高度!' }"
                >
                  <template v-slot:label>
                    <div class="container">
                      <span>返航高度:</span>
                      <a-input-number
                        :step="5"
                        :min="30"
                        :max="3000"
                        size="small"
                        addon-after="米"
                        style="width: 120px"
                        :disabled="isDjHangar"
                        v-model:value="formState.routeList.returnAltitude"
                      />
                    </div>
                  </template>
                  <a-form-item-rest>
                    <a-slider
                      :step="5"
                      :min="30"
                      :max="3000"
                      :disabled="isDjHangar"
                      :value="tempReturnAltitude"
                      @after-change="handleReturnAltitudeChange"
                      @change="
                        (value) => {
                          tempReturnAltitude = value
                        }
                      "
                    />
                  </a-form-item-rest>
                </a-form-item>
              </a-col>

              <a-col class="gutter-row" :span="12">
                <a-form-item
                  :name="['routeList', 'safeAltitude']"
                  :rules="{ required: true, message: '请输入安全起飞高度!' }"
                >
                  <template v-slot:label>
                    <div class="container">
                      <div>
                        <span style="margin-right: 4px">安全起飞高度</span>
                        <a-tooltip placement="top">
                          <template #title>
                            <p style="margin: 0">
                              安全起飞高度是相对起飞点的高度，飞行器起飞后，会先上升至"安全起飞高度"，再飞向航线起始点。
                            </p>
                          </template>
                          <info-circle-outlined style="color: #999" />
                        </a-tooltip>
                      </div>

                      <a-input-number
                        :step="5"
                        :min="20"
                        :max="500"
                        size="small"
                        addon-after="米"
                        style="width: 120px"
                        v-model:value="formState.routeList.safeAltitude"
                      />
                    </div>
                  </template>
                  <a-form-item-rest>
                    <a-slider
                      :min="20"
                      :max="500"
                      :step="5"
                      :value="tempSafeAltitude"
                      @after-change="handleSafeAltitudeChange"
                      @change="
                        (value) => {
                          tempSafeAltitude = value
                        }
                      "
                    />
                  </a-form-item-rest>
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="16">
              <a-col class="gutter-row" :span="12">
                <a-form-item
                  label="过点方式:"
                  :name="['routeList', 'globalPointMethod']"
                  :rules="{ required: true, message: '请选择过点方式!' }"
                >
                  <a-select
                    @change="handleTurnMode"
                    placeholder="请选择过点方式"
                    :options="TURN_MODE_OPTIONS"
                    :getPopupContainer="({ parentNode }) => parentNode"
                    v-model:value="formState.routeList.globalPointMethod"
                    :field-names="{ label: 'dictName', value: 'dictCode' }"
                  >
                    <template #option="{ id }">
                      <img src="@/assets/images/Airway/1738.png" v-if="id === 1738" style="width: 100%" />
                      <img src="@/assets/images/Airway/1739.png" v-if="id === 1739" style="width: 100%" />
                      <img src="@/assets/images/Airway/1740.png" v-if="id === 1740" style="width: 100%" />
                      <img src="@/assets/images/Airway/1741.png" v-if="id === 1741" style="width: 100%" />
                      <img src="@/assets/images/Airway/1826.png" v-if="id === 1826" style="width: 100%" />
                    </template>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col class="gutter-row" :span="12">
                <a-form-item
                  :name="['routeList', 'globalHeightMode']"
                  :rules="{ required: true, message: '请选择航线高度模式!' }"
                >
                  <template v-slot:label>
                    <span style="margin-right: 4px">航线高度模式</span>
                    <a-tooltip placement="top">
                      <template #title>
                        <p>海拔高度 = 机场海拔高度 + 航点飞行高度</p>
                        <p>相对起飞点高度 = 航点飞行高度</p>
                        <p>相对地形高度 = 航点海拔高度 + 航点飞行高度</p>
                        <p style="margin: 0">注意：修改航线高度模式会重新计算各航点高度</p>
                      </template>
                      <info-circle-outlined style="color: #999" />
                    </a-tooltip>
                  </template>
                  <a-select
                    placeholder="请选择航线高度模式"
                    @change="handleGlobalHeightMode"
                    :options="AIRWAY_HEIGHT_MODE_OPTIONS"
                    :getPopupContainer="({ parentNode }) => parentNode"
                    v-model:value="formState.routeList.globalHeightMode"
                    :field-names="{ label: 'dictName', value: 'dictCode' }"
                  >
                    <template #option="{ id }">
                      <img src="@/assets/images/Airway/1742.svg" v-if="id === 1742" style="width: 100%" />
                      <img src="@/assets/images/Airway/1743.svg" v-if="id === 1743" style="width: 100%" />
                      <img src="@/assets/images/Airway/1744.svg" v-if="id === 1744" style="width: 100%" />
                    </template>
                  </a-select>
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="16">
              <a-col class="gutter-row" :span="12">
                <a-form-item :name="['routeList', 'climbMode']" :rules="{ required: true, message: '请选择爬升模式!' }">
                  <template v-slot:label>
                    <span style="margin-right: 4px">爬升模式</span>
                    <a-tooltip placement="top">
                      <template #title><img src="@/assets/images/Airway/1745.svg" /></template>
                      <info-circle-outlined style="color: #999" />
                    </a-tooltip>
                  </template>
                  <a-select
                    placeholder="请选择爬升模式"
                    :options="CLIMB_MODE_OPTIONS"
                    v-model:value="formState.routeList.climbMode"
                    :getPopupContainer="({ parentNode }) => parentNode"
                    :field-names="{ label: 'dictName', value: 'dictCode' }"
                  />
                </a-form-item>
              </a-col>
              <a-col class="gutter-row" :span="12">
                <a-form-item label="AI算法类型:" :name="['routeList', 'aiType']">
                  <a-tree-select
                    allow-clear
                    tree-checkable
                    style="width: 100%"
                    @change="handleAIChange"
                    tree-node-filter-prop="name"
                    placeholder="请选择 AI 算法类型"
                    :tree-data="ALGORITHM_TYPE_OPTIONS"
                    v-model:value="formState.routeList.aiType"
                    :getPopupContainer="({ parentNode }) => parentNode"
                  />
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="16">
              <a-col class="gutter-row" :span="12">
                <a-form-item label="预估执飞里程:">
                  <a-input-number
                    disabled
                    addon-after="米"
                    style="width: 100%"
                    placeholder="依据航点设置自动计算"
                    v-model:value="formState.routeList.predictMileage"
                  />
                </a-form-item>
              </a-col>
              <a-col class="gutter-row" :span="12">
                <a-form-item label="预估执飞时间:">
                  <a-input-number
                    disabled
                    addon-after="分钟"
                    style="width: 100%"
                    placeholder="依据航点设置自动计算"
                    v-model:value="formState.routeList.predictTime"
                  />
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>
        </div>
        <h2 class="title">航点设置:</h2>
        <div class="tabs">
          <a-form :model="formState" layout="vertical" ref="formStateSortsRef">
            <a-tabs
              size="small"
              type="editable-card"
              @edit="handleTabsEdit"
              :activeKey="activeKey"
              @change="handleTabsChange"
            >
              <a-tab-pane
                :key="index"
                :closable="index !== 0"
                v-for="(item, index) in formState.sorts"
                :tab="item.pointList.pointName || `航点${index + 1}`"
              >
                <a-row :gutter="16">
                  <a-col class="gutter-row" :span="12">
                    <a-form-item
                      label="航点名称:"
                      :name="['sorts', index, 'pointList', 'pointName']"
                      :rules="{ required: true, message: '请输入航点名称!' }"
                    >
                      <a-input
                        allow-clear
                        :maxlength="10"
                        placeholder="请输入航点名称"
                        v-model:value="item.pointList.pointName"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col class="gutter-row" :span="12">
                    <a-form-item
                      :name="['sorts', index, 'pointList', 'pointMethod']"
                      :rules="{ required: true, message: '请选择过点方式!' }"
                    >
                      <template v-slot:label>
                        <div class="container">
                          <span>过点方式:</span>
                          <a-form-item-rest>
                            <a-checkbox
                              v-model:checked="item.pointList.routePointMethod"
                              @change="({ target }) => handlePointListRoutePointMethod(target, item)"
                              >跟随航线</a-checkbox
                            >
                          </a-form-item-rest>
                        </div>
                      </template>
                      <a-select
                        placeholder="请选择过点方式"
                        :options="TURN_MODE_OPTIONS"
                        v-model:value="item.pointList.pointMethod"
                        :disabled="item.pointList.routePointMethod"
                        :getPopupContainer="({ parentNode }) => parentNode"
                        :field-names="{ label: 'dictName', value: 'dictCode' }"
                        @change="(_, option) => handlePointListRoutePointMethodNameChange(option, item)"
                      >
                        <template #option="{ id }">
                          <img src="@/assets/images/Airway/1738.png" v-if="id === 1738" style="width: 100%" />
                          <img src="@/assets/images/Airway/1739.png" v-if="id === 1739" style="width: 100%" />
                          <img src="@/assets/images/Airway/1740.png" v-if="id === 1740" style="width: 100%" />
                          <img src="@/assets/images/Airway/1741.png" v-if="id === 1741" style="width: 100%" />
                          <img src="@/assets/images/Airway/1826.png" v-if="id === 1826" style="width: 100%" />
                        </template>
                      </a-select>
                    </a-form-item>
                  </a-col>
                </a-row>
                <a-row :gutter="16">
                  <a-col class="gutter-row" :span="12">
                    <a-form-item
                      :name="['sorts', index, 'pointList', 'speed']"
                      :rules="{ required: true, message: '请输入速度!' }"
                    >
                      <template v-slot:label>
                        <div class="container">
                          <span>速度:</span>
                          <div style="display: flex; align-items: center">
                            <a-input-number
                              :min="1"
                              :max="15"
                              size="small"
                              addon-after="米/秒"
                              style="width: 110px"
                              v-model:value="item.pointList.speed"
                              :disabled="item.pointList.routeSpeed"
                            />
                            <a-form-item-rest>
                              <a-checkbox
                                style="margin-left: 8px"
                                v-model:checked="item.pointList.routeSpeed"
                                @change="({ target }) => handlePointSpeed(target, item)"
                                >跟随航线</a-checkbox
                              >
                            </a-form-item-rest>
                          </div>
                        </div>
                      </template>
                      <a-form-item-rest>
                        <a-slider
                          :min="1"
                          :max="15"
                          :value="getTempPointSpeed(index)"
                          :disabled="item.pointList.routeSpeed"
                          @after-change="(value) => handlePointSpeedChange(value, item, index)"
                          @change="
                            (value) => {
                              tempPointSpeedList[index] = value
                            }
                          "
                        />
                      </a-form-item-rest>
                    </a-form-item>
                  </a-col>
                  <a-col class="gutter-row" :span="12">
                    <a-form-item
                      :name="['sorts', index, 'pointList', 'altitude']"
                      :rules="{ required: true, message: '请输入高度!' }"
                    >
                      <template v-slot:label>
                        <div class="container">
                          <span>高度:</span>
                          <div style="display: flex; align-items: center">
                            <a-input-number
                              :step="5"
                              :min="30"
                              :max="3000"
                              size="small"
                              addon-after="米"
                              style="width: 110px"
                              v-model:value="item.pointList.altitude"
                              :disabled="item.pointList.routeAltitude"
                            />
                            <a-form-item-rest>
                              <a-checkbox
                                style="margin-left: 8px"
                                v-model:checked="item.pointList.routeAltitude"
                                @change="({ target }) => handlePointHeightChecked(target, item.pointList)"
                                >跟随航线</a-checkbox
                              >
                            </a-form-item-rest>
                          </div>
                        </div>
                      </template>
                      <a-form-item-rest>
                        <a-slider
                          :step="5"
                          :min="30"
                          :max="3000"
                          :value="getTempPointAltitude(index)"
                          :disabled="item.pointList.routeAltitude"
                          @after-change="(value) => handlePointHeightChange(value, item, index)"
                          @change="
                            (value) => {
                              tempPointAltitudeList[index] = value
                            }
                          "
                        />
                      </a-form-item-rest>
                    </a-form-item>
                  </a-col>
                </a-row>
                <a-row :gutter="16">
                  <a-col class="gutter-row" :span="12">
                    <a-form-item
                      label="经度:"
                      :name="['sorts', index, 'pointList', 'lon']"
                      :rules="{ required: true, validator: validateLongitude }"
                    >
                      <a-input-number
                        string-mode
                        :controls="false"
                        style="width: 100%"
                        placeholder="请输入经度"
                        v-model:value.number="item.pointList.lon"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col class="gutter-row" :span="12">
                    <a-form-item
                      label="纬度:"
                      :name="['sorts', index, 'pointList', 'lat']"
                      :rules="{ required: true, validator: validateLatitude }"
                    >
                      <a-input-number
                        string-mode
                        :controls="false"
                        style="width: 100%"
                        placeholder="请输入纬度"
                        v-model:value.number="item.pointList.lat"
                      />
                    </a-form-item>
                  </a-col>
                </a-row>
                <h3>
                  <span
                    ><a-divider
                      type="vertical"
                      style="width: 2px; height: 18px; background-color: #448aff"
                    />动作详情</span
                  >
                  <a-button type="link" @click="handleAddActionItem">
                    <template #icon><plus-outlined /></template>
                    新建动作
                  </a-button>
                </h3>
                <a-table
                  bordered
                  size="small"
                  :pagination="false"
                  :columns="ACTION_COLUMNS"
                  :data-source="item.pointList.actionList"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.dataIndex === 'actValue'">
                      {{ record.actValue === undefined ? '-' : record.actValue }}
                    </template>
                    <template v-if="column.dataIndex === 'operates'">
                      <a-space>
                        <a-button type="link" @click="handleEditActionItem(record)">编辑</a-button>
                        <a-button type="text" danger @click="handleDeleteActionItem(record)">删除</a-button>
                      </a-space>
                    </template>
                  </template>
                </a-table>
              </a-tab-pane>
            </a-tabs>
          </a-form>
        </div>
      </div>

      <template #footer>
        <a-space>
          <a-button @click="handleReturn">取消</a-button>
          <a-button type="primary" :loading="loading" @click="handleReturn">保存</a-button>
        </a-space>
      </template>
    </airway-container>
    <action-form
      :edit="actionEditData"
      :actions="ACTION_OPTIONS"
      v-model="isActionVisible"
      @submit="handleActionSubmit"
    />
  </div>
</template>

<style lang="less" scoped>
:deep(.ant-form-item-label) {
  & > label {
    width: 100%;

    .container {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
  }
}

:deep(.ant-tabs > .ant-tabs-nav) {
  margin: 0;
}

:deep(.ant-tabs-content) {
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-top: none;
}

.airway-form {
  h1,
  h2,
  h3 {
    margin: 0;
    color: #fff;
    font-size: 16px;
  }

  h1 {
    display: flex;
    align-items: center;
  }

  h3 {
    display: flex;
    font-size: 14px;
    align-items: center;
    margin-bottom: 8px;
    justify-content: space-between;
  }

  &__header {
    height: 100%;
    display: flex;
    font-weight: 500;
    align-items: center;
    padding: 0 16px 0 34px;
    justify-content: space-between;

    .anticon {
      cursor: pointer;
    }

    .alert {
      position: relative;

      .info {
        top: 0;
        left: 30px;
        z-index: 1;
        width: 400px;
        padding: 16px;
        position: absolute;
        box-sizing: border-box;
        background: rgba(14, 19, 25, 0.8);
        border: 1px solid rgba(68, 138, 255, 0.4);
        box-shadow: 0px 4px 12px 0px rgba(0, 0, 0, 0.5);

        .ant-btn {
          margin-right: 8px;
        }

        h2 {
          font-size: 14px;
          color: #448aff;
        }

        ol {
          margin: 0;
          font-size: 14px;
          padding-left: 2em;
          color: rgba(255, 255, 255, 0.8);
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
          bottom: -1px;
          left: -1px;
          border-bottom: 1px solid;
          border-left: 1px solid;
        }

        .bottom-right {
          bottom: -1px;
          right: -1px;
          border-bottom: 1px solid;
          border-right: 1px solid;
        }

        .horn {
          width: 4px;
          height: 4px;
          position: absolute;
          box-sizing: border-box;
          border-color: rgba(68, 138, 255);
        }
      }
    }
  }

  &__body {
    .card {
      padding: 16px 16px 0 16px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .title {
      margin: 8px 0;
    }

    .container {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .tabs {
      margin: 8px 0;
    }
  }
}
</style>
