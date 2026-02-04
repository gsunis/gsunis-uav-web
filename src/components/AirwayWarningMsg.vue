<script setup>
const props = defineProps({
  type: {
    type: String,
    default: 'tapFly'
  },
  total: {
    Number,
    default: () => []
  },
  options: {
    type: Array,
    default: () => []
  }
})

function formatAirwayWarningMsg(item) {
  if (props.type === 'tapFly') {
    return item.content
  } else {
    if (item.type === 'occlusion') {
      let endPoint
      const startPoint = item.index === 0 ? '机场' : `航点${item.index}`

      // 判断当前航点是否是最后一个
      if (props.total[item.index + 1] === 1) {
        endPoint = '机场'
      } else {
        endPoint = `航点${item.index + 1}`
      }

      return `【碰撞提示】${startPoint}到${endPoint}之间的航线在飞行过程中会出现碰撞，请注意飞行安全。`
    } else {
      if (typeof item.index === 'number') {
        return `【近地提示】航点${item.index}高度距离参考地形小于30米，请注意飞行安全。`
      } else {
        return `【近地提示】${item.index}距离参考地形小于30米，请注意飞行安全。`
      }
    }
  }
}
</script>

<template>
  <div class="airway-warning-msg" v-if="options.length > 0">
    <a-tooltip placement="bottomLeft" :overlayStyle="{ maxWidth: '420px' }">
      <template #title>
        <ul class="airway-warning-msg__content">
          <li v-for="(item, index) in options" :key="index">
            <exclamation-circle-filled style="color: #ff9100" class="airway-warning-msg__content__icon" />
            <p>问题 {{ index + 1 }}: {{ formatAirwayWarningMsg(item) }}</p>
          </li>
        </ul>
      </template>
      <div class="airway-warning-msg__header">
        <exclamation-circle-filled class="airway-warning-msg__header__icon" />
        <p>{{ formatAirwayWarningMsg(options[0]) }}</p>
      </div>
    </a-tooltip>
  </div>
</template>

<style lang="less" scoped>
.airway-warning-msg {
  z-index: 999;
  width: 420px;

  position: absolute;

  &__header {
    display: flex;
    padding: 3px 0;
    cursor: pointer;
    user-select: none;
    border: 1px solid;
    align-items: center;
    border-image: radial-gradient(50% 50% at 50% 50%, #ffeed7 0%, #ff9100 100%) 1;
    background: linear-gradient(90deg, rgba(255, 145, 0, 0.8) 1%, rgba(255, 145, 0, 0.56) 98%), rgba(14, 19, 25, 0.8);

    &__icon {
      margin-left: 8px;
    }

    p {
      margin: 0;
      width: 390px;
      overflow: hidden;
      line-height: 22px;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }

  &__content {
    margin: 0;
    padding: 16px;
    overflow-y: auto;
    max-height: 400px;
    border: 1px solid #3c4b7b;

    &__icon {
      margin: 4px 8px 0 0;
    }

    li {
      display: flex;
      list-style: none;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px dashed #3c4b7b;

      &:last-child {
        margin-bottom: 0;
        padding-bottom: 0;
        border-bottom: none;
      }

      p {
        margin: 0;
        line-height: 22px;
      }
    }
  }
}
</style>
