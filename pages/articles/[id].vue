<script setup lang="ts">
const route = useRoute()

const id = computed(() => route.params.id)
</script>

<template>
  <h1>{{ id }}</h1>
</template>

<style scoped></style>
