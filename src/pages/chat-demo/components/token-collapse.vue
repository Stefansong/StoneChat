<template>
    <div v-if="!isOpen" class="token-clp">
        <div :class="collapseHeaderClass" @click="toggleCollapse" >
            <slot name="header" ></slot>
        </div>
    </div>
    <div v-else class="token-clp">
        <div :class="collapseHeaderClass" @click="toggleCollapse" >
            <slot name="header" ></slot>
        </div>
        <div class="content" v-show="isOpen" >
            <slot name="content"></slot>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        isOpen: {
            type: Boolean,
            default: false
        },
        headerText: {
            type: String,
            default: ''
        }
    },
    computed: {
        collapseHeaderClass () {
            // token-clp__header
            return {
                'token-clp__header': true,
                'headerOpen': this.isOpen,
                'headerClose': !this.isOpen
            };
        }
    },
    methods: {
        toggleCollapse () {
            this.$emit('update:isOpen', !this.isOpen);
        }
    }
};
</script>

<style lang="less" scoped>
div {
    margin: 0;
    padding: 0;
    border: 0;
    box-sizing: border-box;
}

.isShow {
}

.token-clp {
    @media (min-width: 800px) {
        .content{
            max-width: 712px;
        }
    }
    &__header {
        cursor: pointer;
        /* caption/--caption-regular */
        font-family: "PingFang SC";
        font-size: 12px;
        font-style: normal;
        font-weight: 400;
        line-height: 15px;
        height: 32px;
        &.headerOpen{
            background: #fff;
        }
              /* 媒体查询，适用于宽度超过796px的屏幕 */
        @media (min-width: 800px) {
            &.headerOpen{
                max-width: 712px;
            }
        }
        &.headerClose{
            width: fit-content;
        }

    }
}
</style>
