<template>
  <footer class="site-footer">
    <p class="site-footer__line">
      <a
        class="site-footer__icp"
        href="https://beian.miit.gov.cn/"
        target="_blank"
        rel="noopener noreferrer"
      >
        京ICP备2025115189号-2
      </a>
    </p>
  </footer>
</template>

<style scoped lang="scss">
.site-footer {
  margin-top: auto;
  padding: 24px 20px 32px;
  text-align: center;
  font-size: 13px;
  color: #6b7280;
  border-top: 1px solid #e5e7eb;
  background: #fafafa;
}

.site-footer__line {
  margin: 0;
}

.site-footer__icp {
  color: #6b7280;
  text-decoration: none;

  &:hover {
    color: #2563eb;
    text-decoration: underline;
  }
}
</style>
