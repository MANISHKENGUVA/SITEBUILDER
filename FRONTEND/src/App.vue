<template>
  <div id="app" :class="{ 'is-loading': store.state.isLoading }">
    <router-view />
  </div>
</template>

<script>
import { store } from "@/store";
import { clearSession } from "@/session/sessionManager";

export default {
  name: "App",
  data() {
    return { store };
  },
  created() {
    window.addEventListener("storage", this.onStorageEvent);
  },
  beforeDestroy() {
    window.removeEventListener("storage", this.onStorageEvent);
  },
  methods: {
    onStorageEvent(event) {
      if (event.key === "workflow_session_revoked") {
        clearSession();
        if (this.$route.path !== "/catalogue") {
          this.$router.replace("/catalogue");
        }
      }
    },
  },
};
</script>

<style lang="scss">
@import "./styles/main.scss";

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
