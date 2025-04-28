<template>
    <div class="tokens-bd" v-if="tokensData">
        <CollapsePanel :is-open.sync="isCollapsed">
            <div class="tokens-bd__header" slot="header">
                <div class="tokens-bd__header__desc">
                    <span>运行状态</span>
                </div>
            </div>
            <div slot="content" class="tokens-bd__content">
                <div v-for="ele in tokensData.procedures" :key="ele.name" class="tokens-bd__content__dtl">
                    <div class="tokens-bd__content__dtl__desc">
                        <span>{{ ele.title }}</span>
                    </div>
                    <div class="tokens-bd__content__dtl__info">
                        <VueMarkdown
                            table-class="table"
                            class="answer-md"
                            :style="{ 'max-width': '310px' }"
                            :source="ele.content"
                            :anchorAttributes="{target: '_blank'}"
                            :linkify="false"
                        />
                    </div>
                </div>
            </div>
        </CollapsePanel>
    </div>
</template>

<script>
import VueMarkdown from 'vue-markdown';
import CollapsePanel from './token-collapse.vue';
import { TOKENS_STATUS } from './static';
export default {
    components: {
        VueMarkdown,
        CollapsePanel
    },
    props: {
        tokensData: {
            type: Object, // success, error, "processing"
            default: null
        }

    },
    computed: {
    },
    watch: {
        tokensData (val) {
            if (val && val.status_summary === TOKENS_STATUS.pending) {
                this.isCollapsed = true;
            } else {
                this.isCollapsed = false;
            }
        }
    },
    mounted () {
    },
    data () {
        return {
            TOKENS_STATUS,
            isCollapsed: false
        };
    },
    methods: {
    }
};
</script>
<style lang="less" scoped>
div {
    // margin: 0;
    // padding: 0;
    // border: 0;
    box-sizing: border-box;
}

.tokens-bd {
    .tokens-bd__header {
        display: inline-flex;
        padding: 8px;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        background-color: #ccc;

        &__container{
            color: #000;
            font-size: 12px;
            font-style: normal;
            font-weight: 400;
            line-height: 16px;
            margin: 0 0 0 4px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        &__tk {
            color: #000;
            font-size: 12px;
            font-style: normal;
            font-weight: 400;
            line-height: 16px;
            margin: 0 4px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        &__icon {
            color:#000;
            font-size: 12px;
            font-style: normal;
            font-weight: 400;
            line-height: 16px;
            margin: 0 0 0 4px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        &__desc {
            font-size: 12px;
            font-style: normal;
            font-weight: 400;
            line-height: 16px;
            display: flex;
            align-items: center;
        }
    }

    &__content {
        background: #fff;
        display: flex;
        padding: 5px;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
        align-self: stretch;
        &__dtl {
            position: relative;
            width: 100%;
            padding: 10px 5px 5px 5px;
            color: #000;
            font-size: 12px;
            font-style: normal;
            font-weight: 400;
            line-height: 16px;
            display: flex;
            align-content: center;
            justify-content: space-between;

            &:last-child::after {
                display: none;
            }

            &__desc {
                display: flex;
                align-items: center;
                gap: 4px;
            }

            &__info {
                /* caption/--caption-regular */
                padding-left: 20px;
                margin-top: 10px;
                color: #000;
                font-family: "PingFang SC";
                font-size: 12px;
                font-style: normal;
                font-weight: 400;
                line-height: 16px;
            }
        }
    }
}
</style>
