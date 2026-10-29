<script setup lang="ts">
import { cn } from '@/lib/utils';
import { badgeVariants, type BadgeVariants } from './variants';

interface Props {
  variant?: BadgeVariants['variant'];
  class?: string;
}

const props = defineProps<Props>();
</script>

<template>
  <span :class="cn(badgeVariants({ variant }), props.class)">
    <slot />
  </span>
</template>
