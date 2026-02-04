<template>
  <div class="airway-container">
    <div class="airway-container__header">
      <slot name="header"></slot>
    </div>
    <div class="airway-container__body">
      <slot></slot>
    </div>
    <div class="airway-container__footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<style lang="less" scoped>
.airway-container {
  top: 0;
  right: 0;
  bottom: 0;
  width: 616px;
  z-index: 999;
  position: absolute;
  background: linear-gradient(180deg, rgba(68, 138, 255, 0.12) 0%, rgba(83, 109, 254, 0) 99%), rgba(14, 19, 25, 0.86);

  &__header {
    height: 52px;
    background: url('@/assets/images/Airway/airway-form-header-bg.png') center center / cover no-repeat;
  }

  &__body {
    padding: 16px;
    overflow-y: auto;
    border-left: 1px solid;
    height: calc(100vh - 116px);
    border-image: linear-gradient(180deg, #3ba0ff 0%, rgba(68, 138, 255, 0.08) 99%) 1;
  }

  &__footer {
    height: 64px;
    display: flex;
    padding-right: 24px;
    align-items: center;
    justify-content: flex-end;
    border-top: 1px solid rgba(80, 100, 160, 0.6);
  }
}
</style>
