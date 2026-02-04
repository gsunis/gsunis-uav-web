<script setup>
import { flyTo } from '@/utils/cesium'
import { ACTION_COLUMNS } from './constants'
import { AIRWAY_SORTS_OPTIONS } from '@/mock'
import { objectStringToNumber } from '@/utils'
import { useCesiumModel } from '@/composables/useCesiumModel'
import AirwayContainer from './components/AirwayContainer.vue'

const activeKey = ref(0)
const activeHangar = ref()
const emit = defineEmits(['ok'])
const props = defineProps(['show'])
const { activeOrg } = inject('activeOrg', {})
const { cesiumViewer } = inject('cesiumViewer', {})
const isDjHangar = computed(() => activeHangar.value?.type?.includes('dj'))
const { createAirway, createWaypoint, createHangarScope, createHangarPoint } = useCesiumModel()

function setActiveHangar() {
  function findHangarById(data, targetId) {
    if (data.hangarList && Array.isArray(data.hangarList)) {
      for (let hangar of data.hangarList) {
        if (hangar.id === targetId) {
          return hangar
        }
      }
    }

    if (data.children && Array.isArray(data.children)) {
      for (let child of data.children) {
        const result = findHangarById(child, targetId)
        if (result) {
          return result
        }
      }
    }
  }
  const hangar = findHangarById(activeOrg.value, props.show.routeList.hangarId)
  objectStringToNumber(hangar, ['longitude', 'latitude', 'altitude', 'workRadius'])
  activeHangar.value = hangar
}

function createHangarModel() {
  const { id, name, longitude, latitude, altitude, workRadius } = activeHangar.value

  createHangarPoint({ id, name, viewer: cesiumViewer.value, longitude, latitude, altitude })
  createHangarScope({ id, name, viewer: cesiumViewer.value, longitude, latitude, altitude, workRadius })
}

async function createFlightModel() {
  let isReturnAltitude
  const { sorts, routeList } = props.show
  const { climbMode, safeAltitude, returnAltitude, globalHeightMode } = routeList
  const {
    id: hangarId,
    altitude: hangarAltitude,
    latitude: hangarLatitude,
    longitude: hangarLongitude
  } = activeHangar.value
  const coordinates = [{ longitude: hangarLongitude, latitude: hangarLatitude, altitude: hangarAltitude }]
  const airwayParams = { id: hangarId, coordinates, viewer: cesiumViewer.value }
  const { lon: lastPointLongitude, lat: lastPointLatitude, altitude: lastPointAltitude } = sorts.at(-1).pointList

  // 根据爬升模式确定机库上方航点位置
  const { altitude: firstPointAltitude } = sorts[0].pointList
  const takeOffPointParams = { longitude: hangarLongitude, latitude: hangarLatitude, altitude: 0 }

  // 根据高度模式判断是否显示最后一个航点至返航高度的航线
  if (globalHeightMode === 'relativeToStartPoint') {
    isReturnAltitude = lastPointAltitude === returnAltitude
  } else {
    isReturnAltitude = lastPointAltitude === Math.floor(hangarAltitude + returnAltitude)
  }

  // 垂直模式
  if (climbMode === 'safely') {
    // 相对起飞点高度
    if (globalHeightMode === 'relativeToStartPoint') {
      takeOffPointParams.altitude = Math.round(hangarAltitude + firstPointAltitude)
    } else {
      takeOffPointParams.altitude = firstPointAltitude
    }
  } else {
    // 倾斜模式
    takeOffPointParams.altitude = Math.round(hangarAltitude + safeAltitude)
  }

  // 机库上方航点
  coordinates.push(takeOffPointParams)

  // 更新航点
  for (const [index, { pointList }] of sorts.entries()) {
    const { lon: longitude, lat: latitude, altitude, aboveSeaLevel: groundAltitude, pointName: name } = pointList

    const pointParams = {
      name,
      index,
      latitude,
      longitude,
      id: hangarId,
      groundAltitude,
      isActive: false,
      viewer: cesiumViewer.value
    }

    // 计算地图显示高度
    if (globalHeightMode === 'relativeToStartPoint') {
      pointParams.flightAltitude = hangarAltitude + altitude
    } else {
      pointParams.flightAltitude = altitude
    }

    // 计算表单显示高度(地形高度)
    if (globalHeightMode === 'aboveGroundLevel') {
      pointList.altitude = altitude - groundAltitude
    }

    // 创建航点
    createWaypoint(pointParams)

    coordinates.push({ longitude, latitude, altitude: pointParams.flightAltitude })
  }

  // 如果最后一个航点高度与返航高度不一致，还需要显示这段里程
  if (!isReturnAltitude) {
    const returnPoint = {
      latitude: lastPointLatitude,
      longitude: lastPointLongitude,
      altitude: hangarAltitude + returnAltitude
    }

    coordinates.push(returnPoint)
  }

  // 返航机场上方航点位置
  coordinates.push({
    latitude: hangarLatitude,
    longitude: hangarLongitude,
    altitude: coordinates.at(-1).altitude
  })

  // 机场位置
  coordinates.push({ longitude: hangarLongitude, latitude: hangarLatitude, altitude: hangarAltitude })

  // 创建航线
  createAirway(airwayParams)
}

function getAirwayWaypoint() {
  props.show.sorts = AIRWAY_SORTS_OPTIONS
}

onMounted(async () => {
  getAirwayWaypoint()
  setActiveHangar()
  createHangarModel()
  createFlightModel()
  flyTo(cesiumViewer.value, { ...activeHangar.value, height: 5000 })
})
</script>

<template>
  <div class="airway-detail">
    <airway-container>
      <template #header>
        <h1><span>航线详情</span></h1>
      </template>

      <ul>
        <li>
          <span class="label">航线名称:</span>
          <span class="value">{{ show.routeList.name }}</span>
        </li>
        <li>
          <span class="label">航线类型:</span>
          <span class="value">航点飞行</span>
        </li>
        <li>
          <span class="label">所属机构:</span>
          <span class="value">{{ show.routeList.orgName }}</span>
        </li>
        <li>
          <span class="label">机场名称:</span>
          <span class="value">{{ show.routeList.hangarName }}</span>
        </li>
      </ul>

      <div class="tabs">
        <a-tabs v-model:activeKey="activeKey" type="card" size="small">
          <a-tab-pane :key="index" :tab="pointList.pointName" v-for="({ pointList }, index) in show.sorts">
            <a-row :gutter="16">
              <a-col class="gutter-row" :span="12">
                <ul>
                  <li>
                    <span class="label">航点名称:</span>
                    <span class="value">{{ pointList.pointName }}</span>
                  </li>
                  <li>
                    <span class="label">速度:</span>
                    <span class="value">{{ pointList.speed }} 米/秒</span>
                  </li>
                  <li>
                    <span class="label">高度:</span>
                    <span class="value">{{ pointList.altitude }} 米</span>
                  </li>
                </ul>
              </a-col>
              <a-col class="gutter-row" :span="12">
                <ul>
                  <li>
                    <span class="label">经度:</span>
                    <span class="value">{{ pointList.lon }}</span>
                  </li>
                  <li>
                    <span class="label">纬度:</span>
                    <span class="value">{{ pointList.lat }}</span>
                  </li>
                  <li>
                    <span class="label">过点方式:</span>
                    <span class="value" :title="pointList.pointMethodName">{{ pointList.pointMethodName }}</span>
                  </li>
                </ul>
              </a-col>
            </a-row>
            <h3><a-divider type="vertical" style="width: 2px; height: 18px; background-color: #448aff" />动作详情</h3>
            <a-table
              bordered
              size="small"
              rowKey="actOrder"
              :pagination="false"
              :columns="ACTION_COLUMNS"
              :locale="{ emptyText: '暂无数据' }"
              :data-source="pointList.actionList"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.dataIndex === 'actModeName'">
                  {{ record.actModeName }}
                </template>
                <template v-if="column.dataIndex === 'actValue'">
                  {{ record.actValue || '-' }}
                </template>
              </template>
            </a-table>
          </a-tab-pane>
        </a-tabs>
      </div>

      <ul>
        <li>
          <span class="label">返航高度:</span>
          <span class="value">{{ isDjHangar ? '-' : `${show.routeList.returnAltitude} 米` }}</span>
        </li>
        <li>
          <span class="label">安全起飞高度:</span>
          <span class="value">{{ show.routeList.safeAltitude }} 米</span>
        </li>
        <li>
          <span class="label">爬升模式:</span>
          <span class="value">{{ show.routeList.climbMode === 'safely' ? '垂直' : '倾斜' }}爬升</span>
        </li>
        <li>
          <span class="label">航线高度模式:</span>
          <span class="value">{{ show.routeList.globalHeightModeName }}</span>
        </li>
        <li>
          <span class="label">AI算法类型:</span>
          <span class="value">高速停车区大货车</span>
        </li>
        <li>
          <span class="label">预估执飞里程:</span>
          <span class="value">{{ show.routeList.predictMileage }} 米</span>
        </li>
        <li>
          <span class="label">预估执飞时间:</span>
          <span class="value">{{ show.routeList.predictTime }} 分钟</span>
        </li>
        <li>
          <span class="label">创建人:</span>
          <span class="value">{{ show.routeList.createName }}</span>
        </li>
        <li>
          <span class="label">创建时间:</span>
          <span class="value">{{ show.routeList.createTime }}</span>
        </li>
      </ul>

      <template #footer>
        <a-button @click="$emit('ok')">取消</a-button>
      </template>
    </airway-container>
  </div>
</template>

<style lang="less" scoped>
.airway-detail {
  h2,
  h3 {
    margin: 0;
    color: #fff;
    font-size: 14px;
  }

  h1 {
    margin: 0;
    height: 100%;
    display: flex;
    font-size: 16px;
    padding-left: 34px;
    align-items: center;
  }

  h3 {
    font-size: 12px;
    margin: 16px 0 8px;
  }

  ul {
    margin: 0;
    padding: 0;

    li {
      display: flex;
      list-style: none;
      padding: 6px 8px;
      line-height: 20px;
      align-items: center;
      justify-content: space-between;

      .value {
        max-width: 260px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      &:nth-child(odd) {
        background-color: rgba(255, 255, 255, 0.0355);
      }

      &:nth-child(even) {
        background-color: rgba(255, 255, 255, 0.1155);
      }
    }
  }

  .container {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .table {
    margin: 8px 0 24px;
  }

  .tabs {
    margin: 16px 0;
  }
}
</style>
