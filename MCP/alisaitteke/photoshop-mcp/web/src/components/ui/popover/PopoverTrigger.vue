<script setup lang="ts">
import { PopoverTrigger, type PopoverTriggerProps } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps<PopoverTriggerProps & { class?: string }>();
</script>

<template>
  <PopoverTrigger v-bind="props" :class="cn(props.class)">
    <slot />
  </PopoverTrigger>
</template>
