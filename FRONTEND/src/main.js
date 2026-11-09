import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import { store } from "./store";
import { restoreSessionHeader } from "./session/sessionManager";

Vue.prototype.$store = store;

restoreSessionHeader();

Vue.config.productionTip = false;

new Vue({
  router,
  render: (h) => h(App),
}).$mount("#app");
