<template>
  <USelect
    v-if="themeOptions.length > 1"
    v-model="theme"
    :items="themeOptions"
    value-key="value"
    label-key="label"
    aria-label="Site theme"
    color="neutral"
    variant="ghost"
    size="sm"
    class="w-32"
  />
</template>

<script setup lang="ts">
const { theme, themes } = useSiteTheme()

const themeOptions = themes.map(option => ({ ...option }))
</script>
