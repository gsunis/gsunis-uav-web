<template>
  <video-bg :sources="[videoSrc]">
    <div class="tw-flex tw-items-center tw-justify-center tw-w-full tw-h-full tw-relative">
      <login-header :logoUrl="logoUrl" />
      <transition mode="out-in" name="login-fade">
        <div class="login_wrap">
          <div class="title_img">
            <img src="@/assets/images/login_title.png" alt="login" />
          </div>
          <div class="login_input">
            <transition mode="out-in" name="login-fade">
              <login-account />
            </transition>
          </div>
        </div>
      </transition>
    </div>
  </video-bg>
</template>

<script setup>
import VideoBg from 'vue-videobg'
import LoginHeader from './LoginHeader.vue'
import LoginAccount from './LoginAccount.vue'
import logoUrl from '@/assets/images/logo.png'
import videoSrc from '@/assets/images/login_bg_video/login_bg_video.mp4'
</script>

<style scoped lang="less">
.login-fade-enter-active,
.login-fade-leave-active {
  transition: opacity 0.3s ease;
}

.login-fade-enter-from,
.login-fade-leave-to {
  opacity: 0;
}

.login_wrap {
  width: 625px;
  height: 471px;
  display: flex;
  padding-top: 56px;
  align-items: center;
  flex-direction: column;
  background: url('@/assets/images/login_fram.png') no-repeat center;
  background-size: 100% 100%;

  .title_img {
    img {
      width: 159px;
      height: 57px;
      margin-bottom: 24px;
    }
  }

  // .login_input {
  // }
}
</style>
