<script setup>
import { AIRWAY_OPTIONS } from '@/mock'
import { message } from 'ant-design-vue'
import AirwayForm from './AirwayForm.vue'
import AirwayDetail from './AirwayDetail.vue'
import AirwayType from './components/AirwayType/index.vue'

const total = ref(0)
const activeOrgId = ref()
const activeAirway = ref()
const loading = ref(false)
const airwayList = ref([])
const geofenceList = ref([])
const airwayFormData = ref()
const modalVisible = ref(false)
const airwayTypeOptions = [
  {
    id: 1837,
    state: 0,
    level: 0,
    type: 478,
    isDel: '0',
    tenantId: 0,
    remark: '',
    createUser: 21192,
    updateUser: 21192,
    dictName: '航点航线',
    dictCode: 'waypoint',
    createTime: '2025-11-05 16:22:57',
    updateTime: '2025-12-03 15:37:18',
    self: 'icon-hangdianhangxianicon'
  }
]
const airwayTypeVisible = ref(false)
const removeAirwayVisible = ref(false)
const airwayWarningMsgOptions = ref([])
const props = defineProps(['searchData'])
const { activeOrg } = inject('activeOrg', {})
const searchParams = ref({ pageNo: 1, pageSize: 12 })
const pageSizeOptions = ref(['12', '24', '36', '48', '60'])
const { airwayType, updateAirwayType } = inject('airwayType', {})
const { cesiumViewer, updateCesiumViewer } = inject('cesiumViewer', {})

provide('updateAirwayWarningMsgOptions', { airwayWarningMsgOptions, updateAirwayWarningMsgOptions })

function updateAirwayWarningMsgOptions(value) {
  airwayWarningMsgOptions.value = value
}

function handleSelectOrg(orgId) {
  activeOrgId.value = orgId
}

async function getAirwayList() {
  airwayList.value = AIRWAY_OPTIONS
  total.value = AIRWAY_OPTIONS.length
}

function selectAirwayType(type) {
  updateAirwayType(type)
  modalVisible.value = true
}

function onReadyMap(viewer) {
  updateCesiumViewer(viewer)
}

function onReadyGeofence(geofence) {
  geofenceList.value = geofence
}

function handleCreateAirway() {
  airwayFormData.value = undefined
  airwayTypeVisible.value = true
}

async function handleDetail(item) {
  updateAirwayType(item.routeList.type === 'mapping2d' ? 'airwayAreaDetail' : 'airwayDetail')
  airwayFormData.value = { ...item }
  modalVisible.value = true
}

function handleReturn() {
  modalVisible.value = false
  airwayFormData.value = undefined
  searchParams.value.pageNo = 1
  airwayWarningMsgOptions.value = []
  updateCesiumViewer(undefined)
  getAirwayList()
}

function handlePaginationChange(page, pageSize) {
  searchParams.value.pageNo = page
  searchParams.value.pageSize = pageSize
  getAirwayList()
}

async function handleRemoveAirway() {
  const { code, msg } = await DeleteAirway(activeAirway.value.id)

  if (code === 0) {
    message.success(msg)
    removeAirwayVisible.value = false
    getAirwayList()
  } else {
    message.warning(msg)
  }
}

function getAirwayTypeOptionsItem(value) {
  return airwayTypeOptions.find(({ dictCode }) => dictCode === value)?.dictName
}

watch(
  () => props.searchData,
  () => {
    searchParams.value.pageNo = 1
    getAirwayList()
  }
)

watch(activeOrg, () => {
  getAirwayList()
  activeOrgId.value = activeOrg.value.id
})
</script>

<template>
  <div class="airway-content">
    <box-container>
      <div class="airway-content__container">
        <div class="airway-content__header">
          <h1 class="title">航线规划</h1>
          <a-button type="primary" @click="handleCreateAirway">
            <template #icon><plus-circle-outlined /></template>
            <span>新增航线</span>
          </a-button>
        </div>
        <div class="airway-content__list">
          <template v-if="airwayList.length > 0">
            <div class="airway-content__list__item" :key="item.routeList.id" v-for="item in airwayList">
              <a-image placeholder :src="item.routeList.thumbnail" />
              <div class="airway-info">
                <h2>
                  <p :title="item.routeList.name">{{ item.routeList.name }}</p>
                  <a-popover overlayClassName="custom-popover">
                    <template #content>
                      <div class="airway-content__list__item__action">
                        <p @click="handleDetail(item)">详情</p>
                      </div>
                    </template>
                    <more-outlined />
                  </a-popover>
                </h2>
                <ul>
                  <li>
                    <span class="key">航线类型:</span>
                    <span class="value">{{ getAirwayTypeOptionsItem(item.routeList.type) }}</span>
                  </li>
                  <li>
                    <span class="key">机场名称:</span>
                    <span class="value">{{ item.routeList.hangarName }}</span>
                  </li>
                  <li>
                    <span class="key">创建人:</span>
                    <span class="value">{{ item.routeList.createName }}</span>
                  </li>
                  <li>
                    <span class="key">所属机构:</span>
                    <span class="value" :title="item.routeList.orgName">{{ item.routeList.orgName }}</span>
                  </li>
                  <li>
                    <span class="key">创建时间:</span>
                    <span class="value">{{ item.routeList.createTime }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </template>
          <a-spin size="large" v-show="loading" />
          <a-empty v-show="airwayList.length === 0 && !loading" />
        </div>
        <div class="airway-content__pagination" v-show="airwayList.length > 0">
          <a-pagination
            :total="total"
            show-size-changer
            @change="handlePaginationChange"
            :page-size-options="pageSizeOptions"
            v-model:current="searchParams.pageNo"
            v-model:page-size="searchParams.pageSize"
            :show-total="() => `当前 ${searchParams.pageNo} 页，每页 ${searchParams.pageSize} 条，总 ${total} 条 `"
          />
        </div>
      </div>
    </box-container>
  </div>

  <airway-type v-model="airwayTypeVisible" @select="selectAirwayType" />
  <a-modal
    width="100%"
    force-render
    :footer="null"
    destroy-on-close
    :closable="false"
    wrap-class-name="full-modal"
    v-model:visible="modalVisible"
  >
    <template v-if="cesiumViewer">
      <airway-form
        @ok="handleReturn"
        :edit="airwayFormData"
        @org="handleSelectOrg"
        :geofence="geofenceList"
        v-if="airwayType === 'waypoint'"
      />
      <airway-detail @ok="handleReturn" :show="airwayFormData" v-else-if="airwayType === 'airwayDetail'" />
    </template>

    <a-button type="primary" class="return-button" @click="handleReturn">
      <template #icon><rollback-outlined /></template>
      <span>返回</span>
    </a-button>

    <airway-warning-msg type="airwayFly" style="top: 16px; right: 630px" :options="airwayWarningMsgOptions" />

    <div id="cesiumContainerRef">
      <cesium-container @ready="onReadyMap" @geofence="onReadyGeofence" :org-id="activeOrgId" />
    </div>
  </a-modal>
  <a-modal v-model:visible="removeAirwayVisible" title="删除航线">
    <div class="remove-airway-visible">
      <img src="@/assets/images/Airway/remove-airway-visible-bg.png" />
      <p>是否要删除 “{{ activeAirway.name }}” 航线</p>
    </div>

    <template #footer>
      <a-button @click="removeAirwayVisible = false">取消</a-button>
      <a-button type="primary" danger @click="handleRemoveAirway">删除</a-button>
    </template>
  </a-modal>
</template>

<style lang="less">
.full-modal {
  .ant-modal {
    top: 0;
    margin: 0;
    max-width: 100%;
    padding-bottom: 0;
  }

  .ant-modal-content {
    display: flex;
    height: 100vh;
    flex-direction: column;
  }

  .ant-modal-body {
    padding: 0;
    overflow: hidden;
  }
}

.custom-popover {
  .ant-popover-inner-content {
    padding: 0;
    border: 1px solid;
    border-image: linear-gradient(180deg, #448aff 0%, rgba(139, 177, 242, 0.6) 99%) 1;
    box-shadow: 0px 8px 12px 0px rgba(14, 19, 25, 0.6), inset 0px 1px 3px 0px rgba(0, 0, 0, 0.5);
    background: linear-gradient(180deg, rgba(68, 138, 255, 0.4) 0%, rgba(68, 138, 255, 0.08) 100%), #0e1319;
  }
}
</style>

<style lang="less" scoped>
.ant-empty {
  top: 50%;
  left: 50%;
  position: absolute;
  transform: translate(-50%, -50%);
}

:deep(.ant-spin-dot) {
  top: 50%;
  left: 50%;
  position: absolute;
  margin: -16px 0 0 -16px;
}

:deep(.ant-image) {
  width: 210px;
  height: 180px;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
  }
}

.return-button {
  top: 16px;
  left: 16px;
  z-index: 999;
  position: absolute;
}

.remove-airway-visible {
  text-align: center;

  img {
    width: 60px;
    height: 53px;
    margin-bottom: 20px;
  }

  p {
    margin: 0;
    font-weight: 600;
    line-height: 22px;
  }
}

#cesiumContainerRef {
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.airway-content {
  height: calc(100% - 132px);

  &__container {
    height: 100%;
    padding: 16px;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    h1 {
      margin: 0;
      padding: 0;
      color: #fff;
      font-size: 16px;
      font-weight: 500;
      line-height: 24px;
      letter-spacing: 0px;
    }
  }

  &__list {
    display: grid;
    grid-gap: 16px;
    margin: 16px 0;
    overflow-y: auto;
    align-content: start;
    height: calc(100% - 96px);
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));

    &__item {
      display: flex;
      padding: 16px;
      background-color: rgba(80, 100, 160, 0.12);

      &:hover {
        background-color: rgba(80, 100, 160, 0.4);
      }

      &__action {
        padding: 8px 0;

        p {
          margin: 0;
          padding: 0 30px;
          line-height: 22px;
          cursor: pointer;

          &:nth-child(2),
          &:nth-child(3),
          &:nth-child(4) {
            margin: 8px 0;
          }

          &:hover {
            background-color: rgba(68, 138, 255, 0.12);
          }
        }
      }

      .airway-info {
        flex: 1;
        overflow: hidden;
        margin-left: 16px;

        h2 {
          margin: 0;
          padding: 0;
          color: #fff;
          display: flex;
          font-size: 16px;
          font-weight: 500;
          line-height: 24px;
          letter-spacing: 0px;
          align-items: center;
          justify-content: space-between;

          p {
            margin: 0;
            max-width: 200px;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }
        }

        ul {
          padding: 0;
          margin: 16px 0 0 0;

          li {
            display: flex;
            color: #fff;
            list-style: none;
            align-items: center;
            justify-content: space-between;

            .key {
              flex-shrink: 0;
              min-width: 80px;
              color: rgba(255, 255, 255, 0.8);
            }

            .value {
              flex: 1;
              min-width: 0;
              font-weight: 500;
              overflow: hidden;
              text-align: right;
              white-space: nowrap;
              text-overflow: ellipsis;
            }

            &:nth-child(2),
            &:nth-child(3),
            &:nth-child(4) {
              margin: 8px 0;
            }
          }
        }
      }
    }
  }

  &__pagination {
    display: flex;
    line-height: 22px;
    align-items: center;
    justify-content: flex-end;
  }
}
</style>
