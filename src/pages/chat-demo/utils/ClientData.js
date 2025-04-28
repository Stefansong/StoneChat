import Vue from 'vue';
import { MESSAGE_TYPE } from '@/constants';
import { getQueryVariable, generateRequestId, arrayUnique } from '@/utils/util';
import { v4 as uuidv4 } from 'uuid';

const $e = Vue.prototype.$eventHub;
const $s = Vue.prototype.$socket;

let cache = null; // 缓存
let timeoutTasks = {}; // 超时任务管理
const msgSendTimeout = 2 * 60 * 1000; // 发送消息超时ms，此处超时默认为2min

class ClientData {
    constructor () {
        cache = {
            session_id: '', // 会话ID
            configInfo: null, // 配置信息
            chatsContent: [], // 会话聊天内容
            systemEvents: [], // 系统事件栈
            transferInfo: {
                transferStatus: false,
                transferAvatar: ''
            } // 当前转人工状态
        };
    }
    init () {
        // 获取基础配置
        this.queryConfigInfo();
        // 监听下行消息
        this.listenReplyMsg();
        // 监听参考来源
        this.listenReference();
        // 监听token下行消息
        this.listenTokenStat();
        // 监听思考过程，agent模式
        this.listenThought();

        // 添加欢迎消息
        setTimeout(() => {
            const welcomeMessage = {
                record_id: 'welcome-message',
                is_from_self: false,
                content: `# 欢迎使用石说AI (StoneChat) 👋\n\n我是北京清华长庚医院泌尿外科开发的泌尿系结石智能助手。我能帮您解答关于：\n\n* 结石的预防和饮食建议\n* 结石的基本知识和治疗方法\n* 结石相关症状的初步判断\n* 检查结果的初步解读\n\n请注意：我提供的信息仅供参考，具体诊断和治疗方案请遵医嘱。\n\n**您可以这样提问：**\n1. 肾结石有哪些常见症状？\n2. 尿酸盐结石患者应该注意什么饮食？\n3. 输尿管结石疼痛怎么缓解？`,
                from_avatar: require('@/assets/img/StoneChat_logo.png'),
                timestamp: +new Date(),
                is_final: true
            };

            if (cache.chatsContent.length === 0) {
                this.assembleMsgContent(welcomeMessage, MESSAGE_TYPE.ANSWER);
            }
        }, 500);
    }
    // 获取基础配置
    async queryConfigInfo () {
        try {
            const seatBizId = getQueryVariable('seat_biz_id');
            const sessionInfo = await this.createSession();
            console.log('createsession, res', sessionInfo);
            if (sessionInfo.code === 0) {
                cache.seat_biz_id = seatBizId;
                cache.session_id = sessionInfo.data.session_id;
            } else {
                Vue.prototype.$message.error(sessionInfo.msg || '获取会话ID失败，请重试');
            }
            // 接着获取机器人基础信息
            const botInfo = {
                'code': 0,
                'data': {
                    'name': '石说AI',
                    'avatar': require('@/assets/img/StoneChat_logo.png'),
                    'is_available': true,
                    'bot_biz_id': '1664519736704069632'
                }
            };
            if (botInfo.data) {
                cache.configInfo = botInfo.data;
                cache.configInfo.session_id = sessionInfo.data.session_id;
                $e.$emit('client_configChange', cache.configInfo);
            } else {
                Vue.prototype.$message.error('获取机器人信息失败，请重试！');
            }
        } catch (e) {
            Vue.prototype.$message.error('获取会话信息失败，请刷新页面重试！');
        }
    }
    async createSession () {
        const session_id = uuidv4();
        return {'code': 0, 'data': {'session_id': session_id}};
    }
    // 获取全局配置信息
    getConfigInfo () {
        return cache.configInfo;
    }
    // 消息上行事件（用户端）
    async triggerSendMsg (msg) {
        if (!cache.configInfo || !cache.configInfo.session_id) {
            await this.queryConfigInfo();
        }
        const requestId = generateRequestId();

        // 插入消息队列的数据
        const msgContent = {
            request_id: requestId,
            content: msg,
            is_from_self: true,
            timestamp: +new Date(),
            is_final: true, // 问题无流失，默认置为 true（即流式输出已结束）
            is_loading: true, // 默认消息发送中
            user_avatar: require('@/assets/img/user_avatar.png') // 添加用户头像
        };

        this.assembleMsgContent(msgContent, MESSAGE_TYPE.QUESTION);

        timeoutTasks[msgContent.request_id] = setTimeout(() => {
            this.assembleMsgContent({
                ...msgContent,
                failed: true
            }, MESSAGE_TYPE.ANSWER);
        }, msgSendTimeout);

        $s.emit('send', {
            request_id: requestId,
            session_id: cache.configInfo ? cache.configInfo.session_id : 0,
            content: msg
        });
    }
    // 监听参考来源消息
    listenReference () {
        $s.on('reference', (data) => {
            const findedMsg = this.getMsgById(data.record_id);

            if (findedMsg) {
                findedMsg.references = data.references.filter((reference) => reference.type !== 1);
                $e.$emit('client_msgContentChange', {
                    chatsContent: cache.chatsContent,
                    type: 'R' // "参考来源"事件
                });
            }
        });
    }
    // 监听点赞/点踩回执
    listenFeedback () {
        $s.on('rating', (data) => {
            const findedMsg = this.getMsgById(data.record_id);

            if (findedMsg) {
                findedMsg.score = data.score;
                findedMsg.reasons = data.reasons;

                $e.$emit('client_msgContentChange', {
                    chatsContent: cache.chatsContent,
                    type: 'F' // "点赞/点踩回执"事件
                });
            }
        });
    }
    // 监听ws下行答案消息
    listenReplyMsg () {
        $s.on('reply', (data) => {
            if (data.session_id !== cache.session_id) return; // 若新消息不属于当前机器人时，则不做处理
            const findedMsg = this.getMsgById(data.record_id);
            if (findedMsg && findedMsg.is_final) return; // 若消息已经"停止生成"，则新消息抛弃
            if (data.quote_infos && data.quote_infos.length > 0) {
                const quoteMock = data.quote_infos.reduce((acc, curr) => {
                    const existingItem = acc.find(item => item.position === curr.position);
                    let res = {};
                    if (findedMsg && findedMsg.references && findedMsg.references.length > 0) {
                        res = findedMsg.references.find(i => i.id === curr.index.toString());
                    }
                    if (existingItem) {
                        existingItem.tag.push({...res, id: curr.index});
                    } else {
                        acc.push({
                            'tag': [{...res, id: curr.index}],
                            'position': curr.position
                        });
                    }
                    return acc;
                }, []);
                data.quote_infos = quoteMock.sort((a, b) => b.position - a.position);
                // 遍历数组，对每个元素进行操作
                data.quote_infos.forEach(item => {
                    // 提取id数组并转换为字符串
                    const tagIds = item.tag.map(tag => tag.id);
                    const tagString = `[${tagIds.join(',')}](@ref)`;

                    // 在指定位置插入字符串
                    data.content = data.content.slice(0, item.position) + tagString + data.content.slice(item.position);
                });
            }
            this.assembleMsgContent(data, MESSAGE_TYPE.ANSWER);
        });
    }
    // 监听token用量和详情事件
    listenTokenStat () {
        $s.on('token_stat', (data) => {
            $e.$emit('token_state_change', data);
            if (data.session_id !== cache.session_id) return; // 若新消息不属于当前机器人时，则不做处理
            let loadingMsg = cache.chatsContent.find((el) => el.loading_message);
            let loadingText = '思考中';
            if (loadingMsg) {
                if (data.procedures && data.procedures.length > 0) {
                    loadingText =
                        data.procedures[data.procedures.length - 1].title || '思考中';
                }
                let currentList = cache.chatsContent;
                currentList.forEach((el) => {
                    if (el.loading_message) {
                        el.text = loadingText;
                        el.record_id = data.record_id;
                        el.tokens_msg = data;
                        // 只有标准模式加这个
                        if (window.webimToken[0].pattern === 'standard') {
                            el.is_final = false;
                        }
                    }
                });
                $e.$emit('client_msgContentChange', {
                    chatsContent: cache.chatsContent,
                    type: MESSAGE_TYPE.ANSWER
                });
            } else {
                let findedMsg = cache.chatsContent.find(
                    (el) => el.record_id === data.record_id
                );
                if (!findedMsg) return;
                findedMsg.tokens_msg = data;

                $e.$emit('client_msgContentChange', {
                    chatsContent: cache.chatsContent,
                    type: MESSAGE_TYPE.ANSWER
                });
            }
        });
    }
    // 监听agent模式思考过程详情
    listenThought () {
        $s.on('thought', (data) => {
            if (data.session_id !== cache.session_id) return; // 若新消息不属于当前机器人时，则不做处理
            // let loadingMsg = cache.chatsContent.find((el) => el.loading_message);
            let findedMsg = cache.chatsContent.find(
                (el) => el.record_id === data.record_id
            );
            if (!findedMsg) return;
            if (data && data.procedures && data.procedures.length > 0) {
                data.procedures.forEach(el => {
                    el.show_type = this.getShowType(el);
                    if (this.getShowType(el) === 'search-reference') {
                        let quote_infos = el.debugging && el.debugging.quote_infos;
                        // 给reference备注id index
                        let references = el.debugging && el.debugging.references && el.debugging.references.map((m) => ({ ...m, id: m.index }));
                        el.debugging.references = references || [];

                        let content = el.debugging && el.debugging.display_content;
                        if (quote_infos && quote_infos.length > 0) {
                            el.display_content = this.handeLittleTagsData(quote_infos, references, content);
                        } else {
                            el.display_content = content || '';
                        }
                    } else {
                        let content = el.debugging && el.debugging.display_content;
                        el.display_content = content || '';
                    }
                });
            }
            findedMsg.agent_thought = data;

            $e.$emit('client_msgContentChange', {
                chatsContent: cache.chatsContent,
                type: MESSAGE_TYPE.ANSWER
            });
        });
    }
    handeLittleTagsData (quote_infos, references, content) {
        let res = '';
        if (quote_infos && quote_infos.length > 0) {
            const quoteMock = quote_infos.reduce((acc, curr) => {
                const existingItem = acc.find(item => item.position === curr.position);
                let res = {};
                if (references && references.length > 0) {
                    res = references.find(i => i.id === curr.index.toString());
                }
                if (existingItem) {
                    existingItem.tag.push({...res, id: curr.index});
                } else {
                    acc.push({
                        'tag': [{...res, id: curr.index}],
                        'position': curr.position
                    });
                }
                return acc;
            }, []);

            // data.quote_infos = quoteMock.sort((a, b) => b.position - a.position);
            let sortQuote = quoteMock.sort((a, b) => b.position - a.position);
            // 遍历数组，对每个元素进行操作
            sortQuote.forEach(item => {
                // 提取id数组并转换为字符串
                const tagIds = item.tag.map(tag => tag.id);
                const tagString = `[${tagIds.join(',')}](@ref)`;

                // 在指定位置插入字符串
                res = content.slice(0, item.position) + tagString + content.slice(item.position);
            });

            return res;
        } else {
            return content;
        }
    }
    getShowType (item) {
        // 展示种类 md json lke
        if (item.name === 'thought') {
            return 'md';
        } else if (item.status === 'success') {
            // 在clientData处还有特殊处理
            // 原来为lke-reference，现在区分两块处理，一块搜索类型参考来源，一块为qa doc参考来源，主要区别为字段内部数据定义和处理差异
            // 只能判断搜索 这块唯一标识取  index 将index转id
            if (item.debugging && item.debugging.display_type === 1) {
                return 'search-reference';
            } else if (item.debugging && item.debugging.display_type === 2) {
            // 只能qa和doc 这块唯一标识取  id
                return 'knowledge-reference';
            } else {
                return 'json';
            }
        } else {
            return 'json';
        }
    }
    // 组装消息队列数据
    // 问题确认消息：根据request_id关联覆盖（服务端收到问题后的确认消息）
    // 答案消息：倒序遍历插入（服务端答案消息）
    assembleMsgContent (msgList, type) {
        let newMsg = msgList;

        if (type === MESSAGE_TYPE.QUESTION) {
            // 发送的问题消息由前端临时插入消息队列
            cache.chatsContent.push(newMsg);
        } else if (type === MESSAGE_TYPE.ANSWER) {
            if (cache.chatsContent.length < 1) {
                cache.chatsContent.push(newMsg);
            } else {
                let currentList = cache.chatsContent;

                timeoutTasks[newMsg.request_id] && clearTimeout(timeoutTasks[newMsg.request_id]);

                if (currentList.length === 2 && newMsg.can_rating) {
                    currentList[0].transferRobot = true;
                }
                if (newMsg.transfer && newMsg.loading_message) {
                    currentList.pop();
                    currentList[currentList.length - 1].loading_message = false;
                    currentList[currentList.length - 1] = {
                        ...newMsg,
                        ...currentList[currentList.length - 1],
                        transfer: true,
                        transferRobot: false
                    };
                } else {
                    for (let i = currentList.length - 1; i >= 0; i--) {
                        const { transfer, quit, transferRobot } = currentList[i];
                        let tmp = {
                            ...newMsg,
                            transfer,
                            quit,
                            transferRobot
                        };
                        // 保留tokens_msg，防止覆盖
                        if (currentList[i].tokens_msg) {
                            tmp = { ...tmp, tokens_msg: currentList[i].tokens_msg };
                        }
                        // 保留thought 放置被覆盖
                        if (currentList[i].agent_thought) {
                            tmp = { ...tmp, agent_thought: currentList[i].agent_thought };
                        }
                        // 保留reference
                        if (currentList[i].references) {
                            tmp = { ...tmp, references: currentList[i].references };
                        }
                        // 答案消息流式输出覆盖（record_id）
                        if (newMsg.record_id === currentList[i].record_id) {
                            currentList[i] = tmp;
                            break;
                        }
                        // 服务端问题消息确认数据，覆盖前端插入的临时问题消息数据（request_id匹配 & 自己发出的问题消息）
                        if (newMsg.request_id && newMsg.request_id === currentList[i].request_id && newMsg.is_from_self) {
                            newMsg.is_loading = false; // 服务端确认收到问题消息，则去除"发送中"状态
                            currentList[i] = tmp;
                            // 非人工状态时, 并且用户发送的不是敏感消息。插入临时[正在思考中...]消息
                            if (!newMsg.is_evil && !cache.transferInfo.transferStatus) {
                                currentList.push({
                                    loading_message: true,
                                    is_from_self: false,
                                    content: '',
                                    from_avatar: require('@/assets/img/StoneChat_logo.png'),
                                    timestamp: Number(currentList[i].timestamp) // 精确到秒
                                });
                            }
                            break;
                        }
                        // 插入最新答案消息
                        if (Number(newMsg.timestamp) >= Number(currentList[i].timestamp)) {
                            if (currentList[i].loading_message) {
                            // 删除原来的[正在思考中...]消息
                                currentList[currentList.length - 1] = newMsg;
                            } else {
                                currentList.splice(i + 1, 0, newMsg);
                            }
                            break;
                        }
                        if (i === 0 && Number(newMsg.timestamp) < Number(currentList[i].timestamp)) {
                            currentList.splice(0, 0, newMsg);
                        }
                    }
                }
            }
        } else if (type === MESSAGE_TYPE.HISTORY) {
            let currentList = cache.chatsContent;
            // 历史数据打上标签，无需展示"重新生成"和"停止生成"操作
            msgList = msgList.map((r) => {
                return {
                    ...r,
                    is_history: true,
                    is_final: true
                };
            });

            if (currentList.length === 0) {
                // 若消息队列为空（用户端，初始拉取历史记录，用做判断欢迎页展示场景）
                cache.chatsContent = [].concat(msgList);
            } else {
                // 若消息队列不为空
                let oldMsgCurrent = currentList[0];
                let newMsgHistory = msgList[msgList.length - 1];

                // 将历史数据拼装到消息队列中（按照时间戳重排数据）
                if (Number(newMsgHistory.timestamp) < Number(oldMsgCurrent.timestamp)) {
                    cache.chatsContent = [].concat(msgList).concat(cache.chatsContent);
                } else {
                    msgList.reverse().forEach(msg => {
                        for (let i = 0; i < cache.chatsContent.length; i++) {
                            if (msg.record_id === cache.chatsContent[i].record_id) {
                                // 重复覆盖
                                cache.chatsContent[i] = msg;
                                break;
                            } else if (Number(msg.timestamp) <= Number(cache.chatsContent[i].timestamp)) {
                                cache.chatsContent.splice(i, 0, msg);
                                break;
                            } else if (i === cache.chatsContent.length - 1 && Number(msg.timestamp) > Number(cache.chatsContent[i].timestamp)) {
                                cache.chatsContent.splice(i + 1, 0, msg);
                            }
                        }
                    });
                }
            }
        }

        // 消息去重。同一record_id取最新，同时保留消息最早的时间戳
        cache.chatsContent = arrayUnique(cache.chatsContent, 'record_id', 'timestamp');

        // 消息队列变更通知事件
        $e.$emit('client_msgContentChange', {
            chatsContent: cache.chatsContent,
            type
        });
    }
    // 修改指定msgId的消息内容
    modifyMsgContent (msgId) {
        const findedMsg = this.getMsgById(msgId);

        if (findedMsg) {
            findedMsg.is_final = true;
            findedMsg.content = findedMsg.content.concat(`<span class="stop-ws">| 已停止生成</span>`);

            $e.$emit('client_msgContentChange', {
                chatsContent: cache.chatsContent,
                type: MESSAGE_TYPE.STOP // "停止生成"事件
            });
        }
    }
    // 获取消息队列数据
    getChatsContent () {
        return cache.chatsContent || [];
    }
    // 根据msgId获取消息
    getMsgById (msgId) {
        const findedMsg = cache.chatsContent.find((r) => r.record_id === msgId);
        return findedMsg;
    }
    // 根据msgId获取其关联问题消息
    getQmsgById (msgId) {
        let findedQmsg = null;
        const findedMsg = this.getMsgById(msgId);

        if (findedMsg) {
            findedQmsg = cache.chatsContent.find((r) => (r.record_id === findedMsg.related_record_id));
        }

        return findedQmsg;
    }
    // 停止生成回复
    stopGeneration () {
        const ongoingMsg = cache.chatsContent.find((r) => r.is_final === false);
        if (!ongoingMsg) return;

        $s.emit('stop_generation', {
            record_id: ongoingMsg.record_id
        });
        this.modifyMsgContent(ongoingMsg.record_id);
    }
    releaseCache () {
    }
    destroy () {
        // be careful to clear the cache to avoid errors
        this.releaseCache();
    }
}

const $cd = new ClientData();
Vue.prototype.$clientData = $cd;
export default $cd;
