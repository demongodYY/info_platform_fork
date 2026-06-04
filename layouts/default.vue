<template>
  <div class="app-shell">
    <main class="app-shell__main">
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>

<style scoped lang="scss">
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-shell__main {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>
