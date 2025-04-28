<template>
    <div class="header-banner theme-QDS-dark header-banner-bg">
        <div class="banner-wrap">
            <div class="banner-wrap__left">
                <div class="left-logo">
                    <img class="robot-avatar" :src="require('@/assets/img/StoneChat_logo.png')" />
                </div>
                <div class="left-title">
                    <div class="main-title">
                        石说AI <span class="english-name">StoneChat</span>
                    </div>
                    <div class="sub-title">北京清华长庚医院泌尿外科 - 泌尿系结石智能助手</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'CommonHeader',
    components: {
    },
    props: {
    },
    data () {
        return {
            robotName: '石说AI',
            robotAvatar: ''
        };
    },
    created () {
        // 监听配置信息，获取机器人名称
        this.$eventHub.$on('client_configChange', (res) => {
            // 使用自定义名称
            this.robotName = '石说AI';
            // 不再使用后端返回的头像
            // this.robotAvatar = res.avatar;
        });
    },
    methods: {
    }
};
</script>

<style lang="less">
.header-banner {
  width: 100%;
  &.header-banner-bg {
    background: linear-gradient(271.81deg, #0d4883 0%, #1e81b0 52.76%, #76b5c5 100%);
  }
  &.header-fixed {
    position: fixed;
    width: 100%;
    z-index: 10;
  }

  .banner-wrap {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    z-index: 1;
    position: relative;

    &__left {
      display: flex;
      flex-direction: row;
      align-items: center;

      .left-logo {
        margin-right: 12px;
        .robot-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }
      }

      .left-title {
        display: flex;
        flex-direction: column;

        .main-title {
          font-weight: 600;
          font-size: 18px;
          color: white;
          .english-name {
            font-size: 14px;
            opacity: 0.9;
            margin-left: 5px;
          }
        }
        .sub-title {
          font-weight: 400;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.8);
          margin-top: 2px;
        }
      }
    }
  }
}
</style>
