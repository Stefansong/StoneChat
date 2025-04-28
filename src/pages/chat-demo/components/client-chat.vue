<template>
    <div class="client-chat" style="height: 100%">
        <v-popper ref="first" clazz="pop-demo" :use-arrow="true">
            <div class="pop-demo-list" v-for="pop in popperList" :key="pop.id">
                <v-button type="link" kind="primary" @click="openSearchUrl(pop, pop.id)">
                    {{ pop.id }}.{{ pop.name }}
                    <v-icon remote name="arrow_right_line" size="12" valign="-1"></v-icon>
                </v-button>
            </div>
        </v-popper>
        <div class="chat-container">
            <div class="qa-item" v-for="(item, index) in msgList" :key="index">
                <!-- 时间戳 -->
                <div class="timestamp"
                     v-if="index === 0 || (index !== 0 && item.timestamp && (Number(item.timestamp) - Number(msgList[index - 1].timestamp)) > timestampGap)">
                    {{ moment(new Date(String(item.timestamp).length === 10 ? item.timestamp * 1000 :
                    Number(item.timestamp))).format('MM-DD HH:mm') }}
                </div>

                <!-- 问题 -->
                <div class="question-item" v-if="item.is_from_self">
                    <v-spinner status="default" class="qs-loading" v-if="item.is_loading"></v-spinner>
                    <VueMarkdown class="question-text" style="max-width: 352px" :source="item.content"
                                 :anchorAttributes="{ target: '_blank' }" :linkify="false" />
                    <!-- 用户头像 -->
                    <div class="user-avatar">
                        <img class="user-avatar-img" :src="item.user_avatar || require('@/assets/img/user_avatar.png')" />
                    </div>
                </div>
                <!-- 答案 -->
                <div class="answer-item" v-if="!item.is_from_self">
                    <!-- 头像 -->
                    <div class="answer-avatar">
                        <img class="robot-avatar" :src="item.from_avatar" />
                    </div>

                    <!-- 答案信息 -->
                    <div class="answer-info" :ref="item.record_id">
                        <div v-if="item.agent_thought && item.agent_thought.procedures && item.agent_thought.procedures.length > 0">
                            <!-- 思考部分   -->
                            <MsgThought
                                v-for="(thought, index) in item.agent_thought.procedures"
                                :key="index"
                                :content="thought.debugging.content"
                                :title="thought.title"
                                :titleIcon="thought.icon"
                                :nodeName="thought.name"
                                :status="thought.status"
                                :elapsed="thought.elapsed"
                                :detailVisible="thought.detailVisible"
                            />
                        </div>
                        <div class="loading" v-if="item.loading_message">正在思考中</div>
                        <!-- 回复主体 -->
                        <MsgContent :showTags="true"
                                    :recordId="item.record_id"
                                    :isReplaceLinks="true"
                                    :loadingMessage="item.loading_message"
                                    :content="item.content"
                                    :isFinal="item.is_final"
                                    :isMdExpand="item.isMdExpand"
                                    @littleTagClick="littleTagClick"
                        />
                        <!-- 参考来源 -->
                        <Reference v-if="item.references && item.references.length>0" :references-list="item.references"/>
                        <!-- 运行状态 -->
                        <TokensBoardBfr class="tokens-board-class" :showDtl="true" :tokensData="item.tokens_msg"></TokensBoardBfr>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import clone from 'clone';
import VueMarkdown from 'vue-markdown';
import elementResizeDetectorMaker from 'element-resize-detector';
import { scrollToBottom } from '@/utils/util';
import { MESSAGE_TYPE, ACCESS_TYPE } from '@/constants';
import TokensBoardBfr from './tokens-board-brif.vue';
import Reference from './reference-component.vue';

export default {
    name: 'ClientChat',
    components: {
        VueMarkdown,
        Reference,
        TokensBoardBfr
    },
    data () {
        return {
            popperList: [],
            oldPopDemo: null,
            loading: false,
            historyLoading: false,
            timestampGap: 5 * 60, // 两次问题间隔大于5min，则展示时间戳（接口侧返回的时间戳是秒级）
            msgList: [], // 对话消息列表
            robotName: '', // 机器人名称
            chatBoxHeight: document.body.clientHeight,
            jsScrolling: false,
            userScrolling: false
        };
    },
    created () {
    // 监听用户端/管理端体验侧的ws事件
        this.listenClientAndManageEvent();
        // 监听公共的ws事件
        this.listenCommonEvent();
    },
    mounted () {
        const erd = elementResizeDetectorMaker();
        const bodyDom = document.body;

        erd.listenTo(bodyDom, (element) => {
            this.chatBoxHeight = element.clientHeight - 113; // 57+56 头部的高度
        });

        document.addEventListener('click', this.handleOutsideClick);

        const sDom = document.querySelector('.client-chat');
        sDom.addEventListener('scroll', () => {
            if (this.msgList[this.msgList.length - 1].is_final === false && !this.jsScrolling) {
                this.userScrolling = true;
            } else {
                this.jsScrolling = false;
            }
        });
    },
    beforeDestroy () {
        // 移除全局事件监听器
        document.removeEventListener('click', this.handleOutsideClick);
    },
    methods: {
        openSearchUrl (refer, index) {
            window.open(refer.url);
        },
        // 监听用户端/管理端体验侧的ws事件
        listenClientAndManageEvent () {
            // 从缓存获取机器人信息
            let cachedConfig = null;
            if (ACCESS_TYPE === 'ws') {
                cachedConfig = this.$clientData.getConfigInfo();
            } else {
                cachedConfig = this.$SseCls.sseQueryConfigInfo();
            }
            if (cachedConfig) {
                this.robotName = cachedConfig.name;
            }

            // 监听答案消息队列变更事件
            this.$eventHub.$on('client_msgContentChange', (res) => {
                const { chatsContent, type } = res;

                // PS：若新消息不属于当前机器人，则在 $clientData 中监听到ws消息后判断并屏蔽。不在此处判断和屏蔽
                this.renderMsgList(chatsContent, type);
            });
        },
        // 监听公共的ws事件
        listenCommonEvent () {
            this.$eventHub.$on('data_history', () => {
                this.historyLoading = false;
            });

            this.$eventHub.$on('data_historyError', () => {
                this.historyLoading = false;
            });
        },
        // 渲染消息会话页面
        renderMsgList (data, type) {
            // 无需滚动至底部的ws事件：用户端拉取历史记录、用户端停止生成、坐席端取历史记录、点赞点踩
            const noScrollEvt = [MESSAGE_TYPE.HISTORY, MESSAGE_TYPE.STOP, MESSAGE_TYPE.WORKBENCH_HISTORY, MESSAGE_TYPE.FEEDBACK];
            const list = data.map(el => {
                return { ...el, showPop: true };
            });
            this.msgList = clone(list);
            // console.log('=======更新消list========', clone(list));

            // 对话框滚动至底部（部分ws事件类型无需执行滚动）
            this.$nextTick(() => {
                const sDom = document.querySelector('.client-chat');

                if (!sDom) return;

                if (!this.userScrolling && (!noScrollEvt.includes(type))) {
                    this.jsScrolling = true;
                    scrollToBottom(sDom, sDom.scrollHeight);
                }
                if (this.msgList.length > 0 && this.msgList[this.msgList.length - 1].is_final === true) {
                    this.userScrolling = false;
                }
            });
        },
        handleOutsideClick (event) {
            if (!this.oldPopDemo) { return; };
            const firstElement = document.getElementsByClassName('pop-demo')[0];
            if (this.oldPopDemo.contains(event.target) || firstElement.contains(event.target)) {
            } else {
                if (this.oldPopDemo) {
                    this.$refs['first'] && this.$refs['first'].unbindTrigger(this.oldPopDemo);
                }
                // 调用你想要执行的方法
                this.$refs['first'] && this.$refs['first'].hide();
                this.oldPopDemo = null;
            }
        },
        littleTagClick (e, r) {
            const findMsg = this.$clientData.getMsgById(r);
            let innerDome = e.querySelectorAll('.little-tags');
            let outerTextArr = [];
            if (innerDome && innerDome.length > 0) {
                innerDome.forEach(dom => {
                    outerTextArr.push(dom.outerText);
                });
            }
            this.popperList = findMsg.references.filter(e => outerTextArr.includes(e.id));
            if (e) {
                this.$refs['first'] && this.$refs['first'].bindTrigger(e, 'manual');
                this.$refs['first'] && this.$refs['first'].update();
                this.$refs['first'] && this.$refs['first'].show();
                this.oldPopDemo = e;
            }
        }
    }
};
</script>

<style lang="less">
.client-chat::-webkit-scrollbar {
  display: none;
}
.pop-demo{
  // background-color: pink;
  padding: 10px;
  display: flex;
  min-width: var(--size-l);
  padding: var(--spacing-base);
  flex-direction: column;
  justify-content: center;
  // align-items: center;
  gap: var(--spacing-tight);

  border-radius: var(--radius-normal);
  border: 0.5px solid var(--color-border-normal);

  background: var(--color-bg-2);
  /* shadow/--shadow-medium */
  box-shadow: var(--shadow-medium-x-1) var(--shadow-medium-y-2) var(--shadow-medium-blur-1) var(--shadow-medium-spread-1) var(--shadow-medium-color-1), var(--shadow-medium-x-2) var(--shadow-medium-y-2) var(--shadow-medium-blur-2) var(--shadow-medium-spread-2) var(--shadow-medium-color-2), var(--shadow-medium-x-3) var(--shadow-medium-y-3) var(--shadow-medium-blur-3) var(--shadow-medium-spread-3) var(--shadow-medium-color-3);

  .v-popper__arrow{
    display: block;
  }
  .pop-demo-list{
    color: var(--color-link-normal);
    /* caption/--caption-regular */
    font-family: var(--font-family-normal);
    font-size: 12px;
    font-style: normal;
    font-weight: 400;
    line-height: 16px; /* 133.333% */
    .v-button {
      text-decoration: none;
      text-align: left;
    }
  }
}
.client-chat {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: overlay;
  padding: 0 20px; /* 增加左右间距，提供更好的视觉平衡 */

  .chat-container {
    width: 100%;
    max-width: 600px; /* 匹配父容器宽度 */
    margin: 0 auto; /* 居中显示 */
  }

  .loading {
    margin: 1em 0;
    width: 150px;
    font-weight: 500;
    color: #0d4883;

    &:after {
      content: ".";
      animation: ellipsis 1.5s steps(1, end) infinite;
    }
  }

  @keyframes ellipsis {
    0% {
      content: ".";
    }

    33% {
      content: "..";
    }

    66% {
      content: "...";
    }

    100% {
      content: ".";
    }
  }

  .qa-item {
    display: flex;
    flex-direction: column;
    margin-bottom: 22px; /* 增加消息间距 */
    font-weight: 400;
    font-size: 14px;
    color: #333;

    .timestamp {
      font-weight: 400;
      font-size: 12px;
      line-height: 16px;
      text-align: center;
      color: #888;
      margin: 16px 0;
    }

    .question-item {
      display: flex;
      align-items: center;
      width: fit-content;
      text-align: center;
      align-self: flex-end;
      padding-left: 10px;
      margin-right: 10px; /* 保持右侧间距 */

      .qs-error {
        min-width: 16px;
        margin-right: 10px;
        color: #e53e3e;
      }

      .qs-loading {
        margin-right: 10px;
      }

      .question-text {
        background: #e6f0fb;
        border-radius: 12px 12px 0 12px;
        padding: 10px 14px;
        text-align: left;
        word-break: break-all;
        word-wrap: break-word;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        margin: 0;
        max-width: 320px;

        code {
          white-space: break-spaces;
          background: rgba(0, 0, 0, 0.05);
          padding: 2px 4px;
          border-radius: 4px;
        }

        img {
          max-width: 80%;
        }
      }

      .user-avatar {
        margin-left: 10px;
        .user-avatar-img {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 2px solid #fff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          background-color: #e6f0fb;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;

          &::before {
            content: "";
            position: absolute;
            top: 40%;
            left: 50%;
            width: 16px;
            height: 16px;
            background-color: #1e81b0;
            border-radius: 50%;
            transform: translate(-50%, -50%);
          }

          &::after {
            content: "";
            position: absolute;
            bottom: -5px;
            left: 50%;
            width: 24px;
            height: 24px;
            background-color: #1e81b0;
            border-radius: 50%;
            transform: translateX(-50%);
          }
        }
      }
    }

    .summary-item {
      align-self: center;
      margin: 12px 0;
    }

    .answer-item {
      display: flex;
      margin-left: 10px;

      .answer-avatar {
        margin-right: 10px;
        .robot-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 2px solid #fff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
      }

      .answer-info {
        position: relative;
        display: flex;
        flex-direction: column;
        padding: 12px 16px;
        background: #f8f9fa;
        border-radius: 12px 12px 12px 0;
        width: auto; /* 自动适应内容宽度 */
        min-width: 50px; /* 最小宽度，可根据需要调整 */
        max-width: 400px; /* 最大宽度，从320px增加到400px提供更多空间 */
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        margin: 0; /* 确保没有额外边距 */

        .answer-expand {
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          width: 44px;
          height: 24px;
          margin-bottom: 12px;
          background: white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border-radius: 16px;
          align-self: center;
        }

        .stop-ws {
          color: #888;
          margin-left: 5px;
        }

        .answer-source {
          margin: 12px 0;
          font-size: 14px;
          color: #888;
          text-align: left;

          .v-button {
            text-decoration: none;
            text-align: left;
          }
        }
      }
    }
  }

  .qa-item:last-child {
    padding-bottom: 120px;
  }
}
</style>
