<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'

const route = useRoute()

const id = computed(() => route.params.id as string)

// mock markdown content (later replace with API data)
const markdownContent = `
<div align="center">

# 罕见疾病国家组织CEO帕梅拉·加文关于参议院未能在年底前通过《给孩子们一个机会法案》的声明

**📅 发布日期：** 2025-12-18

**✍️ 作者：** sroberts

**🏷️ 标签：** Advocacy · Featured News

**🔗 原文链接：** [https://rarediseases.org/statement-from-pamela-gavin-ceo-national-organization-for-rare-disorders-nord-on-the-senate-failure-to-approve-the-give-kids-a-chance-act-by-year-end/](https://rarediseases.org/statement-from-pamela-gavin-ceo-national-organization-for-rare-disorders-nord-on-the-senate-failure-to-approve-the-give-kids-a-chance-act-by-year-end/)

</div>

---

12月18日，NORD发布

参议院没有通过《给孩子们一个机会法案》，这让我们非常失望。

一年多来，成千上万的罕见病倡导者一直在跟两党的议员们沟通，希望他们能通过《给孩子们一个机会法案》。这个法案包括重新启动罕见儿科疾病优先审评券计划（一种奖励机制，鼓励药企研发罕见病药物），以及其他一些对有罕见病的孩子们很重要的政策。这个法案得到了很多人的支持，不会增加预算，而且已经证明可以加快为那些没有其他选择的孩子们开发治疗方法。

如果这个法案过期了，那么那些已经在等待诊断和治疗的家庭就会更慢地得到帮助，甚至可能完全停止进展。对于得罕见病的孩子们来说，这种延迟不是抽象的概念，而是会导致身体功能不可逆的损失、神经损伤、时间的浪费，甚至生命危险。

在这个时候，我们的国家需要领导者们团结起来，放下分歧，做正确的事情。很遗憾，这次机会被错过了。这本来可以是一个重要的胜利，特别是对3000多万得罕见病的美国人来说。

等到一月份参议院回来的时候，NORD会继续在国会山跟议员们一起努力，推动这个法案尽快通过。罕见病社区一直都很明确、一致和团结。我们呼吁国会迅速行动，确保得罕见病的孩子们不会被落下。
`

const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: true,
})

const mdContent = computed(() => md.render(markdownContent))
</script>

<template>
  <div class="article-page">
    <div class="article-content" v-html="mdContent"></div>
  </div>
</template>

<style scoped>
.article-page {
  padding: 24px;
}

.article-content {
  max-width: 800px;
  margin: 0 auto;
  line-height: 1.7;
}

.article-content h1,
.article-content h2,
.article-content h3 {
  margin-top: 1.5em;
}

.article-content a {
  color: #2563eb;
}
</style>
