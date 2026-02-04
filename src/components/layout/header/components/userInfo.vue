<template>
  <div class="user-info">
    <div class="time">
      <span class="white_text">
        {{ year }}-{{ (month + '')?.padStart(2, '0') }}-{{ (day + '')?.padStart(2, '0') }}<br />{{ hour }} :
        {{ minute }} :
        {{ second }}
      </span>
    </div>
    <div class="info_devide"></div>
    <a-dropdown placement="bottomRight">
      <div class="tw-flex tw-items-center tw-cursor-pointer tw-text-zinc-100" style="height: 22px">
        <a-tooltip placement="left">
          <template #title>admin</template>
          <div style="display: flex; align-items: center">
            <span class="username white_text tw-mr-2 tw-text-zinc-100 hover:tw-font-bold">admin</span>
            <img src="@/assets/images/header-arrow-down.png" style="width: 8px; height: 4px" />
          </div>
        </a-tooltip>
      </div>
      <template #overlay>
        <a-menu>
          <a-menu-item @click="toLogout">
            <icon-font type="icon-poweroff" class="tw-text-slate-600" />
            退出
          </a-menu-item>
        </a-menu>
      </template>
    </a-dropdown>
  </div>
</template>

<script setup>
import { useTime } from '@/hooks/useTime'

const router = useRouter()
const { year, month, day, hour, minute, second } = useTime()

function toLogout() {
 router.push('/')
}
</script>

<style lang="less" scoped>
:deep(.ant-dropdown-menu-title-content) {
  padding: 0 0 0 4px;
}

:deep(.ant-dropdown-menu) {
  background: linear-gradient(180deg, rgba(68, 138, 255, 0.4) 0%, rgba(68, 138, 255, 0) 100%), #001630;
  box-sizing: border-box;
  border: 1px solid transparent; /* 显式设为transparent，避免默认边框色干扰 */
  border-image: linear-gradient(0deg, rgba(68, 138, 255, 0.7981) 0%, rgba(67, 234, 255, 0.8) 99%);
  border-image-slice: 1; /* 关键：将渐变图像切片并应用到边框 */
  border-image-width: 1;
  border-image-outset: 0;
  border-image-repeat: stretch;
  box-shadow: 0px 8px 16px 0px rgba(14, 19, 25, 0.5), inset 0px 0px 12px 0px rgba(68, 138, 255, 0.8);
}

:deep(.ant-dropdown-menu-item:hover),
:deep(.ant-dropdown-menu-submenu-title:hover) {
  background: linear-gradient(90deg, transparent, #448aff 50%, transparent);
  position: relative;
}

.user-info {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  white-space: nowrap;
  padding-top: 4px;
  position: absolute;
  right: 16px;
  top: 8px;

  .info_devide {
    width: 1px;
    height: 16px;
    background: url('@/assets/images/layout/dashboard_header/info-devide.png') no-repeat center center;
    margin: 0 12px;
  }

  .blue_text {
    color: @blue-text;
    margin-bottom: 5px;
    font-size: 16px;
    text-align: right;
  }

  .white_text {
    font-family: PingFang SC;
    font-size: 14px;
    font-weight: 500;
    line-height: 22px;
    letter-spacing: 0px;
    color: #ffffff;
  }

  .time {
    display: flex;
    align-items: center;
    height: 25px;

    span {
      display: inline-block;
      line-height: 1;
      text-align: center;
    }
  }

  .weather {
    height: 36px;

    .m-weather {
      height: 100%;
      display: flex;
    }

    .inner {
      display: flex;
      margin-left: 10px;
      flex-direction: column;

      span {
        display: inline-block;
        line-height: 1;
      }
    }
  }

  .username {
    display: block;
    max-width: 83px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
