import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

const blank = { render: () => null };

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: blank },
  { path: '/c/:id', name: 'chat', component: blank },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
