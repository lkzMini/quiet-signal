(function (root) {
  'use strict';
  const create = () => ({ briefingComplete:false, tutorialComplete:false, tutorialStep:0 });
  function normalize(value, { hasPriorRun = false, hasCompletedRun = false } = {}) {
    if (!value || typeof value !== 'object' || (!('briefingComplete' in value) && !('tutorialComplete' in value) && (hasPriorRun || hasCompletedRun))) return hasPriorRun || hasCompletedRun
      ? { briefingComplete:true, tutorialComplete:true, tutorialStep:0 }
      : create();
    const step = Number.isInteger(value.tutorialStep) ? Math.max(0, Math.min(6, value.tutorialStep)) : 0;
    return {
      briefingComplete:Boolean(value.briefingComplete),
      tutorialComplete:Boolean(value.tutorialComplete),
      tutorialStep:Boolean(value.tutorialComplete) ? 0 : step
    };
  }
  function setStep(value, step, total) {
    value.tutorialStep = Math.max(0, Math.min(Math.max(0, total - 1), Number(step) || 0));
    return value;
  }
  function completeBriefing(value) { value.briefingComplete = true; return value; }
  function completeTutorial(value) { value.briefingComplete = true; value.tutorialComplete = true; value.tutorialStep = 0; return value; }
  const api = { create, normalize, setStep, completeBriefing, completeTutorial,
    shouldShowBriefing:value => !value.briefingComplete && !value.tutorialComplete,
    shouldResumeTutorial:value => value.briefingComplete && !value.tutorialComplete };
  root.QS_ONBOARDING = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
