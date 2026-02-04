<template>
  <div class="login_account">
    <a-form ref="loginAccountRef" :model="formState" name="loginAccount" style="width: 100%">
      <a-form-item name="username" :rules="[{ required: true, message: '请输入用户名!' }]">
        <a-input size="large" v-model:value="formState.username" placeholder="请输入用户名" allow-clear>
          <template #prefix> <img class="login-form-icon" src="@/assets/images/login-form-user-icon.png" /> </template
          ><lock-outlined />
        </a-input>
      </a-form-item>
      <a-form-item name="password" :rules="[{ required: true, message: '请输入密码!' }]">
        <a-input-password
          size="large"
          v-model:value="formState.password"
          placeholder="请输入密码"
          :maxlength="16"
          allow-clear
        >
          <template #prefix>
            <img class="login-form-icon" src="@/assets/images/login-form-password-icon.png" />
          </template>
        </a-input-password>
      </a-form-item>
      <a-form-item class="login_btn">
        <a-button type="primary" block @click.prevent="toLogin">立即登录</a-button>
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup>
const router = useRouter()
const formState = reactive({
  username: 'admin',
  password: '123456'
})

const toLogin = () => {
 router.push('/airway/index')
}
</script>

<style lang="less" scoped>
.login_account {
  width: 373px;
  display: flex;
  justify-content: center;
  color: @main-text-color;

  .remember_item {
    :deep(.ant-form-item-control-input-content) {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
  }

  .login-form-icon {
    width: 24px;
    height: 24px;
    margin-right: 12px;
  }

  :deep(.ant-input-affix-wrapper-lg) {
    padding: 10px 11px;
  }

  .login_btn {
    :deep(.ant-btn-primary) {
      height: 48px;
      border-color: transparent;
      background: url('@/assets/images/login_btn.png') no-repeat center;
      background-size: 100% 100%;

      &:hover {
        background-image: url('@/assets/images/login_btn_hover.png');
      }
    }
  }
}
</style>
