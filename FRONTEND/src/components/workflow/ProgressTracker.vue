<template>
  <nav class="progress-tracker" aria-label="Application progress">
    <ol class="au-stepper au-stepper--vertical progress-tracker__list">
      <li
        v-for="(step, index) in steps"
        :key="step.key"
        class="au-stepper__step progress-tracker__step"
        :class="stepClass(step)"
      >
        <span class="au-stepper__indicator" aria-hidden="true">
          <span v-if="step.status === 'completed'">✓</span>
          <span v-else>{{ index + 1 }}</span>
        </span>
        <span class="au-stepper__content">
          <span class="au-stepper__title progress-tracker__label">{{ step.label }}</span>
          <span
            class="au-stepper__description progress-tracker__status"
            :class="'progress-tracker__status--' + step.status"
          >
            {{ statusText(step.status) }}
          </span>
        </span>
        <span
          v-if="index < steps.length - 1"
          class="au-stepper__connector"
          aria-hidden="true"
        />
      </li>
    </ol>
    <p v-if="!steps.length" class="progress-tracker__empty">No verified step is available yet.</p>
  </nav>
</template>

<script>
export default {
  name: "ProgressTracker",
  props: {
    steps: { type: Array, default: () => [] },
  },
  methods: {
    stepClass(step) {
      return {
        "au-stepper__step--completed": step.status === "completed",
        "au-stepper__step--active": step.status === "current",
        "progress-tracker__step--blocked": step.status === "blocked",
        "progress-tracker__step--upcoming": step.status === "upcoming",
      };
    },
    statusText(status) {
      const map = {
        completed: "Completed",
        current: "Current",
        upcoming: "Upcoming",
        blocked: "Waiting",
      };
      return map[status] || status;
    },
  },
};
</script>

<style lang="scss" scoped>
.progress-tracker__list {
  list-style: none;
  margin: 0;
  padding: 0;
  gap: $space-4;
}

.progress-tracker__step {
  flex: 0 0 auto;
  width: 100%;
  gap: $space-3;
}

.progress-tracker__step .au-stepper__indicator {
  position: relative;
  z-index: 1;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  font-size: $font-size-xs;
  font-weight: $font-weight-semibold;
}

.progress-tracker__step .au-stepper__connector {
  top: 2rem;
  left: 1rem;
  width: 2px;
  height: calc(100% - 1rem);
  background: linear-gradient(180deg, $color-border-light 0%, rgba($color-spruce-base, 0.45) 100%);
  z-index: 0;
}

.progress-tracker__label {
  color: $color-text-primary;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  line-height: 1.4;
}

.progress-tracker__status {
  color: $color-text-muted;
  font-size: $font-size-xs;
  line-height: 1.4;
}

.progress-tracker__status--current {
  color: $color-spruce-base;
}

.progress-tracker__status--completed {
  color: $color-success;
}

.progress-tracker__status--blocked {
  color: $color-warning;
}

.progress-tracker__step--blocked .au-stepper__indicator {
  border-color: $color-warning;
  color: $color-warning;
}

.progress-tracker__empty {
  margin: 0;
  font-size: $font-size-sm;
  color: $color-text-muted;
}
</style>
