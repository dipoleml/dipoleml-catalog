<script setup lang="ts">
import { Label as RekaLabel, type LabelProps } from 'reka-ui';
import { cn } from '@/lib/utils';

interface Props extends LabelProps {
  class?: string;
}

const props = defineProps<Props>();
</script>

<template>
  <RekaLabel
    :for="props.for"
    :class="
      cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        props.class
      )
    "
  >
    <slot />
  </RekaLabel>
</template>
