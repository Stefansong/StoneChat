<template>
    <div class="reference-source" v-if="references && references.length > 0">
        <div>参考来源：</div>
        <div v-for="(sItem, sIndex) in references" :key="sIndex">
            <v-button v-if="getReferenceType(sItem.type) === 'DOC'" type="link" kind="primary" @click="openSearchUrl(sItem, sIndex)">
                <v-icon remote name="basic_papers_line"></v-icon>
                {{ sItem.name || sItem.title }}
                <v-icon remote name="arrow_right_line" size="12" valign="-1"></v-icon>
            </v-button>
            <v-button v-else-if="getReferenceType(sItem.type) === 'SEARCH'" type="link" kind="primary" @click="openSearchUrl(sItem, sIndex)">
                <v-icon remote name="basic_url_line"></v-icon>
                {{ sItem.id }}.{{ sItem.name || sItem.title }}
                <v-icon remote name="arrow_right_line" size="12" valign="-1"></v-icon>
            </v-button>
            <v-button v-else type="link" kind="primary">
                <v-icon remote name="basic_q_a_line"></v-icon>
                {{ sItem.name || sItem.title }}
                <v-icon remote name="arrow_right_line" size="12" valign="-1"></v-icon>
            </v-button>
        </div>
    </div>
</template>

<script>

export default {
    components: {
    },
    data () {
        return {
            references: []
        };
    },
    props: {
        referencesList: {
            type: Array,
            default: () => []
        }
    },
    computed: {
    },
    methods: {
        getReferenceType (type) {
            // 参考来源类型 1-QA  2-文档 4-search 分三类展示 default展示search
            switch (type) {
            case 1:
                return 'QA';
            case 2:
                return 'DOC';
            case 4:
            default:
                return 'SEARCH';
            }
        },
        openSearchUrl (refer, index) {
            // console.log('【reference】', refer, index);
            window.open(refer.url);
        },
        formatteReference (references) {
            let res = references;
            if (references && references.length > 0) {
                res = references.reduce((result, item) => {
                    if (this.getReferenceType(item.type) === 'DOC') {
                        const existingItem = result.find(
                            (i) => i.doc_id === item.doc_id && i.type === item.type
                        );
                        if (existingItem) {
                            existingItem.ids.push(item.id);
                        } else {
                            result.push({ ...item, ids: [item.id] });
                        }
                    } else {
                        result.push({ ...item, ids: [item.id] });
                    }
                    return result;
                }, []);
            }
            return res;
        }
    },
    watch: {
        referencesList: {
            handler (val, oldValue) {
                let refer = this.formatteReference(val);
                this.references = refer;
                // console.log('【references】res', refer);
            },
            immediate: true
        }
    },
    created () {
    },
    mounted () {
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

.reference-source {
    margin: 12px 0;
    font-size: 14px;
    color: var(--color-text-caption);
    text-align: left;

    .v-button {
        text-decoration: none;
        text-align: left;
    }
}
</style>
