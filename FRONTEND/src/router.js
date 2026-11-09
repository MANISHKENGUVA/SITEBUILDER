import Vue from "vue";
import Router from "vue-router";
import Catalogue from "@/views/Catalogue.vue";
import WorkflowHost from "@/views/WorkflowHost.vue";
import NotFound from "@/views/NotFound.vue";
import WorkflowViewer from "@/views/WorkflowViewer.vue";
import ConfigDashboard from "@/config-builder/views/ConfigDashboard.vue";
import ConfigWorkspace from "@/config-builder/views/ConfigWorkspace.vue";
import { store } from "@/store";

Vue.use(Router);

const router = new Router({
  mode: "history",
  base: import.meta.env.BASE_URL,
  routes: [
    {
      path: "/",
      redirect: "/catalogue",
    },
    {
      path: "/catalogue",
      name: "Catalogue",
      component: Catalogue,
      meta: { title: "Loan Products — Northline" },
    },
    {
      path: "/workflow",
      name: "WorkflowHost",
      component: WorkflowHost,
      meta: { title: "Application — Northline" },
    },
    {
      path: "/workflow/:workflowId",
      name: "WorkflowWithId",
      component: WorkflowHost,
      meta: { title: "Application — Northline" },
    },
    {
      path: "/workflow-viewer",
      name: "WorkflowViewer",
      component: WorkflowViewer,
      meta: { title: "Workflow Viewer — Northline" },
    },
    {
      path: "/builder",
      name: "ConfigDashboard",
      component: ConfigDashboard,
      meta: { title: "Config Builder — Site Builder" },
    },
    {
      path: "/builder/:id",
      name: "ConfigWorkspace",
      component: ConfigWorkspace,
      meta: { title: "Workflow Studio — Config Builder" },
    },
    {
      path: "*",
      component: NotFound,
      meta: { title: "Not Found — Northline" },
    },
  ],
});

router.beforeEach((to, from, next) => {
  document.title = (to.meta && to.meta.title) || "Northline";
  store.mutations.clearError();
  next();
});

router.afterEach(() => {
  window.scrollTo(0, 0);
});

export default router;
