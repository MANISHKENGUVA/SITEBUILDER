<template>
  <div class="workflow-host">
    <div v-if="isLoading && !resolution" class="workflow-host__loading" role="status">
      <LoadingSpinner />
      <p>Loading your application…</p>
    </div>

    <div v-else-if="sessionError" class="workflow-host__error-overlay" role="alert">
      <div class="error-card au-card">
        <h2 class="au-card__title">Unable to continue</h2>
        <p>{{ sessionError.message }}</p>
        <button type="button" class="btn btn--primary au-button au-button--primary" @click="recoverSession">
          Return to catalogue
        </button>
      </div>
    </div>

    <WorkflowShell
      v-else-if="resolution"
      :resolution="resolution"
      :mobile-nav-open.sync="mobileNavOpen"
    >
      <template #sidebar>
        <div class="shell-sidebar__context">
          <h2 class="shell-sidebar__product">{{ productName }}</h2>
          <p v-if="applicationNo" class="shell-sidebar__app-no">{{ applicationNo }}</p>
          <p class="shell-sidebar__actor">{{ currentActor }}</p>
        </div>
        <ProgressTracker :steps="trackerSteps" />
        <p v-if="resolution.message" class="shell-sidebar__message">{{ resolution.message }}</p>
      </template>
      <template #main>
        <div v-if="submitError" class="banner banner--error" role="alert">{{ submitError }}</div>
        <CaptchaGate
          v-if="resolution.status === 'CAPTCHA_REQUIRED'"
          @verified="onGateCleared"
        />
        <AuthGate
          v-else-if="resolution.status === 'AUTHENTICATION_REQUIRED'"
          :methods="authMethods"
          @authenticated="onGateCleared"
        />
        <NotYourTurnGate
          v-else-if="resolution.status === 'NOT_YOUR_TURN'"
          :message="resolution.message"
          @resolved="refresh"
        />
        <AccessDeniedGate
          v-else-if="resolution.status === 'ACCESS_DENIED'"
          :message="resolution.message"
        />
        <InternalGate
          v-else-if="resolution.status === 'INTERNAL'"
          :message="resolution.message"
          @resolved="refresh"
        />
        <CompletedGate
          v-else-if="resolution.status === 'WORKFLOW_COMPLETED'"
          :message="resolution.message"
        />
        <NodeRenderer
          v-else-if="resolution.status === 'OK' && resolution.node"
          :key="resolution.node"
          :node-key="resolution.node"
          :component-name="resolution.component"
          :session-id="sessionId"
          :can-submit="resolution.canSubmit && !submitting"
          :submitting="submitting"
          @event-submitted="onEventSubmitted"
        />
        <ErrorGate
          v-else-if="resolution.status === 'OK'"
          message="No renderable node was returned for this session."
        />
        <ErrorGate
          v-else
          :message="'Unknown workflow status: ' + resolution.status"
        />
      </template>
    </WorkflowShell>
  </div>
</template>

<script>
import { resolveWorkflow, submitEvent } from "@/api/workflow";
import { clearSession, isExpiredCode, resumeSession } from "@/session/sessionManager";
import { decorateProduct } from "@/components/registry/productRegistry";
import { stepsFromResolution } from "@/workflow/progress";
import { getProduct as getProductMeta } from "@/api/workflow";
import WorkflowShell from "@/components/workflow/WorkflowShell.vue";
import ProgressTracker from "@/components/workflow/ProgressTracker.vue";
import NodeRenderer from "@/components/workflow/NodeRenderer.vue";
import CaptchaGate from "@/components/gates/CaptchaGate.vue";
import AuthGate from "@/components/gates/AuthGate.vue";
import NotYourTurnGate from "@/components/gates/NotYourTurnGate.vue";
import AccessDeniedGate from "@/components/gates/AccessDeniedGate.vue";
import InternalGate from "@/components/gates/InternalGate.vue";
import CompletedGate from "@/components/gates/CompletedGate.vue";
import ErrorGate from "@/components/gates/ErrorGate.vue";
import LoadingSpinner from "@/components/common/LoadingSpinner.vue";

export default {
  name: "WorkflowHost",
  components: {
    WorkflowShell,
    ProgressTracker,
    NodeRenderer,
    CaptchaGate,
    AuthGate,
    NotYourTurnGate,
    AccessDeniedGate,
    InternalGate,
    CompletedGate,
    ErrorGate,
    LoadingSpinner,
  },
  data() {
    return {
      resolution: null,
      isLoading: true,
      submitting: false,
      sessionError: null,
      submitError: null,
      mobileNavOpen: false,
      lastEventId: null,
    };
  },
  computed: {
    sessionId() {
      return this.$store.state.sessionId;
    },
    currentActor() {
      return this.$store.state.actor || "BORROWER";
    },
    applicationNo() {
      return this.$store.state.applicationNo;
    },
    productName() {
      const product = this.$store.state.activeProduct;
      return (product && product.name) || this.$store.state.productId || "Loan application";
    },
    trackerSteps() {
      return stepsFromResolution(this.resolution);
    },
    authMethods() {
      const auth = this.resolution && this.resolution.authentication;
      return (auth && auth.methods) || [];
    },
  },
  created() {
    this.initialize();
  },
  methods: {
    async initialize() {
      this.isLoading = true;
      this.sessionError = null;
      try {
        if (!this.sessionId) {
          await resumeSession();
        }
        await this.refresh();
      } catch (err) {
        this.handleSessionFailure(err);
      } finally {
        this.isLoading = false;
      }
    },
    async refresh() {
      const result = await resolveWorkflow();
      this.applyResolution(result);
    },
    applyResolution(result) {
      this.$store.mutations.setWorkflowResolution(result);
      this.$store.mutations.setSession({
        sessionId: result.sessionId || this.$store.state.sessionId,
        actor: result.actor || this.$store.state.actor,
        sessionStatus: result.sessionStatus,
        expiresAt: result.expiresAt,
        authenticationExpired: result.authenticationExpired,
      });
      this.resolution = result;
      this.loadProductLabel(result.productId);
    },
    async loadProductLabel(productId) {
      if (!productId || (this.$store.state.activeProduct && this.$store.state.activeProduct.id === productId)) {
        return;
      }
      try {
        const product = decorateProduct(await getProductMeta(productId));
        this.$store.mutations.setActiveProduct(product);
      } catch {
        this.$store.mutations.setActiveProduct({ id: productId, name: productId });
      }
    },
    handleSessionFailure(err) {
      if (isExpiredCode(err.code)) {
        clearSession();
      }
      this.sessionError = {
        message: err.message || "Your session could not be restored.",
        recoverable: isExpiredCode(err.code),
      };
      this.resolution = null;
    },
    recoverSession() {
      clearSession();
      this.$router.replace("/catalogue");
    },
    async onGateCleared() {
      this.isLoading = true;
      try {
        await this.refresh();
      } catch (err) {
        this.handleSessionFailure(err);
      } finally {
        this.isLoading = false;
      }
    },
    async onEventSubmitted({ eventType, payload, nodeKey }) {
      if (this.submitting) return;
      this.submitting = true;
      this.submitError = null;
      const eventId = `${nodeKey}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
      this.lastEventId = eventId;
      try {
        await submitEvent({ eventType, payload, nodeKey, eventId });
        await this.refresh();
      } catch (err) {
        if (isExpiredCode(err.code)) {
          this.handleSessionFailure(err);
        } else {
          this.submitError = err.message || "The server rejected this submission.";
        }
      } finally {
        this.submitting = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.workflow-host {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.workflow-host__loading,
.workflow-host__error-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  padding: $space-8;
}

.error-card {
  max-width: 28rem;
}

.shell-sidebar__product {
  font-size: $font-size-lg;
  margin: 0 0 $space-1;
}

.shell-sidebar__app-no,
.shell-sidebar__actor {
  font-size: $font-size-sm;
  color: $color-text-secondary;
  margin: 0;
}

.shell-sidebar__app-no {
  font-family: $font-mono;
}

.shell-sidebar__message {
  margin-top: $space-6;
  font-size: $font-size-sm;
  color: $color-text-secondary;
}

.shell-sidebar__context {
  margin-bottom: $space-6;
  padding-bottom: $space-6;
  border-bottom: 1px solid $color-border-light;
}

.banner {
  padding: $space-3 $space-4;
  border-radius: $radius-md;
  margin-bottom: $space-6;
}

.banner--error {
  background: $color-error-tint;
  color: $color-error;
}
</style>
