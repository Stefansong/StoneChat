<template>
    <div class="question-input" :style="{ width: `${questionInputWith}px`, bottom: `${questionInputBottom}px` }">
        <!-- 停止生成 -->
        <div class="stop-button" v-if="isGeneratingReply">
            <v-button icon="basic_stop_line" remote @click="onStopStream">停止生成</v-button>
        </div>
        <div v-if="disableInput[currentVisitorId]" class="question-mask"></div>
        <div :class="['question-input-inner', { 'inputFocus': inputFocus, 'disabled': isGeneratingReply || isThinking }]">
            <v-textarea @focus="updateFocus(true)" @blur="updateFocus(false)"
                        :readonly="disableInput[currentVisitorId] || isGeneratingReply || isThinking" v-model="question"
                        @keydown.native="onPressEnter($event)" :placeholder="disableInput[currentVisitorId] ? '已结束会话' : '请输入'"
                        :autofocus="true" :autoheight="true" class="question-input-inner__textarea"></v-textarea>
            <div class="question-input-inner__toolbar">
                <div class="toolbar-left"></div>
                <div class="toolbar-right">
                    <div :class="['send-icon', { 'disabled': isSendIconDisabled || disableInput[currentVisitorId] }]">
                        <v-icon name="basic_send_fill" size="20" @click="onSendQuestion" v-tip:sendMsg.hover remote></v-icon>
                        <v-tip ref="sendMsg" size="small" placement="top">发送</v-tip>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import elementResizeDetectorMaker from 'element-resize-detector';
import { scrollToBottom, escapeUserInput } from '@/utils/util';
import { MESSAGE_TYPE, ACCESS_TYPE } from '@/constants';

export default {
    name: 'QuestionInput',
    components: {
    },
    props: {
        currentVisitorId: {
            msgData: {
                type: Number,
                default: 0
            }
        }
    },
    data () {
        return {
            isSendIconDisabled: true,
            questionInputWith: 360,
            questionInputBottom: 0,
            question: '',
            inputFocus: false,
            disableInput: {},
            isGeneratingReply: false, // 是否生成回答中
            isThinking: false // 是否思考中
        };
    },
    created () {
    // 监听答案消息队列变更事件, 判断是否正在思考/正在生成答案
        this.$eventHub.$on('client_msgContentChange', (res) => {
            const { chatsContent, type } = res;
            if (type !== MESSAGE_TYPE.ANSWER) return;
            // this.isGeneratingReply = !!chatsContent.find(r => r.is_final === false);
            this.isGeneratingReply = !!chatsContent.find(r => {
                if (r.loading_message) {
                    return r.agent_thought && r.is_final === false && !r.is_connection_error;
                } else {
                    return r.is_final === false && !r.is_connection_error;
                }
            });
            this.isThinking = chatsContent.length > 0 && res.chatsContent[res.chatsContent.length - 1].loading_message;
        });
    },
    mounted () {
        const erd = elementResizeDetectorMaker();
        const questionInputParentDom = document.querySelector('.question-input').parentElement;

        // 输入框宽度
        erd.listenTo(questionInputParentDom, (element) => {
            this.questionInputWith = element.clientWidth;
        });

        // 输入框bootom间距（坐席端置底无需处理，用户端需计算）
        if (this.webIMSource === 'client') {
            const bodyDom = document.body;
            const chatWrapperDom = document.querySelector('.chat-wrap__main');

            erd.listenTo(bodyDom, () => {
                this.questionInputBottom = bodyDom.clientHeight > chatWrapperDom.clientHeight ? (bodyDom.clientHeight - chatWrapperDom.clientHeight) / 2 : 0;
            });
        }
    },
    methods: {
        updateFocus (isFocus) {
            // console.log('updateFocus', isFocus);
            this.inputFocus = isFocus;
        },
        // 回车键
        onPressEnter (event) {
            if (event.keyCode === 13) {
                if (!event.metaKey) {
                    event.preventDefault();
                    this.onSendQuestion();
                } else {
                    this.question = this.question + '\n';
                }
            }
        },
        // 发送问题
        onSendQuestion () {
            if (this.disableInput[this.currentVisitorId]) return;
            if (!this.question.trim()) {
                return;
            }
            this.$emit('send', escapeUserInput(this.question));
            this.question = '';

            // 问题发出后，对话框立即滚动至底部
            this.$nextTick(() => {
                const sDom = document.querySelector('.client-chat');
                if (!sDom) return;
                scrollToBottom(sDom, sDom.scrollHeight);
            });
        },
        // 停止生成
        onStopStream () {
            if (ACCESS_TYPE === 'ws') {
                this.$clientData.stopGeneration();
            } else {
                this.$SseCls.stopGeneration();
            }

            this.isGeneratingReply = false;
        }
    },
    watch: {
        question (val) {
            if (val.trim()) {
                this.isSendIconDisabled = false;
            } else {
                this.isSendIconDisabled = true;
            }
        }
    }
};
</script>

<style lang="less">
.question-input {
  position: fixed;
  // margin-top: -110px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 16px;
  padding-top: 10px;

  .toolbar-info {
    display: inline-block;
    font-weight: 400;
    font-size: 12px;
    color: #666;

    .red-txt {
      color: #e53e3e;
    }
  }

  .stop-button {
    display: flex;
    justify-content: center;
    margin-bottom: 8px;

    button {
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      border: none;
      padding: 6px 12px;
      border-radius: 20px;
      background-color: #f8f9fa;
      color: #1e81b0;
      font-weight: 500;
      transition: all 0.2s;

      &:hover {
        background-color: #e6f0fb;
      }
    }
  }

  .question-mask {
    width: 100%;
    height: 110px;
    position: absolute;
    z-index: 200;
    background: rgba(255, 255, 255, 0);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bolder;
  }

  &-inner {
    display: flex;
    flex-direction: column;
    margin: 12px 16px;
    background-color: white;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    transition: all 0.2s;

    .v-textarea--default {
      border-radius: 16px;
    }

    &:has(.question-input-inner),
    &:has(.v-textarea--focus),
    &.inputFocus {
      border-color: #1e81b0;
      box-shadow: 0 0 0 3px rgba(30, 129, 176, 0.1);
    }

    &.disabled {
      background-color: #f8f9fa;
      border-color: #e2e8f0 !important;

      .v-textarea__placeholder {
        color: #a0aec0;
      }
    }

    &__textarea {
      width: 100%;
      max-height: 120px;
      border: none;
      background: none;
      padding: 4px;

      .v-textarea__txt {
        overflow-y: overlay;
        font-size: 15px;
        line-height: 1.5;
        padding: 10px 12px;
        font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Helvetica, Arial, PingFang SC, Microsoft YaHei, Noto Sans, sans-serif !important;
      }
    }

    .v-textarea--focus {
      border: none;
    }

    &__toolbar {
      display: flex;
      justify-content: space-between;
      z-index: 10;
      margin: 8px 12px;

      .v-icon {
        cursor: pointer;
      }

      .toolbar-left {
        display: flex;

        .v-icon {
          &.disabled {
            cursor: not-allowed;
            color: #a0aec0;
          }

          padding: 6px;
        }
      }

      .toolbar-right {
        display: flex;
        gap: 4px;

        .stop-icon {
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          padding: 6px;
        }

        .send-icon {
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          background-color: #1e81b0;
          color: white;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          transition: all 0.2s;

          &:hover {
            background-color: #0d4883;
          }
        }

        .stop-icon:hover {
          background: #f1f1f1;
          border-radius: 3px;
        }

        .stop-icon:active {
          background: #e6e6e6;
          border-radius: 3px;
        }

        .stop-icon.disabled,
        .send-icon.disabled {
          background: #e2e8f0;
          cursor: not-allowed;

          .v-icon {
            cursor: not-allowed;
            color: #a0aec0;
          }
        }

        .split-line {
          align-self: center;
          width: 1px;
          height: 16px;
          background: #e2e8f0;
          margin: 0 5px;
        }
      }
    }
  }
}
</style>
