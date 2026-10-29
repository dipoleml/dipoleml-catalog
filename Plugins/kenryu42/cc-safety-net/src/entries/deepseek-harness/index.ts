import { registerDeepSeekHarnessGuard } from '@/hosts/deepseek-harness/guard';

export default {
  name: 'cc-safety-net',
  inject: ['tools'],
  apply: registerDeepSeekHarnessGuard,
};
