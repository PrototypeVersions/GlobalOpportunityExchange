/* ============================================================
   GLOBAL OPPORTUNITY EXCHANGE
   REDESIGNED INTERACTIVE PROTOTYPE

   This static prototype:
   - Uses no server or database
   - Sends no information anywhere
   - Stores demonstration choices in the visitor's browser
   - Allows the visitor to download or reset local prototype data
============================================================ */

(() => {
  "use strict";

  /* ==========================================================
     1. CONFIGURATION
  ========================================================== */

  const STORAGE_KEY = "rou six-global-opportunity-exchange-v2"
    .replace(" ", "");

  const DEFAULT_STATE = {
    activeView: "home",
    activeProfileTab: "goals",
    savingsAccess: null,
    questionSkipped: false,
    noticeDismissed: false,

    permissions: {
      matching: true,
      analytics: false,
      reminders: true
    }
  };

  const SAVINGS_ANSWERS = {
    "any-time": {
      label: "Any time",
      progress: 49,
      flexibleScore: 97,
      growthScore: 34,
      summary:
        "You need full flexibility, so the prototype ranks unrestricted access more highly."
    },

    "within-year": {
      label: "Within a year",
      progress: 49,
      flexibleScore: 94,
      growthScore: 48,
      summary:
        "You may need the money within a year, so longer restrictions reduce the illustrative fit."
    },

    "one-to-three": {
      label: "One to three years",
      progress: 49,
      flexibleScore: 84,
      growthScore: 77,
      summary:
        "You can consider a longer commitment, so both fictional routes remain plausible."
    },

    "three-plus": {
      label: "More than three years",
      progress: 49,
      flexibleScore: 76,
      growthScore: 93,
      summary:
        "Your longer time horizon increases the illustrative fit of the fictional growth route."
    }
  };

  const OPPORTUNITIES = {
    "flexible-savings": {
      category: "Financial",
      title: "Flexible savings route",
      description:
        "A fictional savings option designed for someone who values access to funds and a low opening minimum.",

      terms: [
        ["Illustrative yield", "3.80%"],
        ["Opening minimum", "$25"],
        ["Access", "Any time"],
        ["Illustrative monthly fee", "$0"]
      ],

      requiredData: [
        "Identity confirmation",
        "Geographic eligibility",
        "Opening contribution range",
        "Selected savings goal"
      ]
    },

    "growth-savings": {
      category: "Financial",
      title: "Long-term growth route",
      description:
        "A fictional savings option with a higher stated return and a longer withdrawal restriction.",

      terms: [
        ["Illustrative yield", "5.10%"],
        ["Opening minimum", "$100"],
        ["Restriction", "60 months"],
        ["Early access", "A penalty may apply"]
      ],

      requiredData: [
        "Identity confirmation",
        "Geographic eligibility",
        "Opening contribution amount",
        "Expected need for access"
      ]
    },

    "transfer-path": {
      category: "Education",
      title: "Community college transfer route",
      description:
        "A fictional four-year pathway beginning at a local community college before transfer to a university.",

      terms: [
        ["Estimated length", "4 years"],
        ["First stage", "2 years local"],
        ["Housing assumption", "Live at home"],
        ["Projected cost", "$42,600"]
      ],

      requiredData: [
        "Preferred field of study",
        "Academic information",
        "Residency or location",
        "Housing preference"
      ]
    },

    "research-role": {
      category: "Career",
      title: "Research operations role",
      description:
        "A fictional hybrid position that uses existing analytical and research capabilities.",

      terms: [
        ["Skills matched", "4 of 5"],
        ["Arrangement", "Hybrid"],
        ["Missing requirement", "One certificate"],
        ["Training estimate", "8–12 weeks"]
      ],

      requiredData: [
        "Selected professional skills",
        "Relevant credentials",
        "Preferred work arrangement",
        "A limited professional profile"
      ]
    }
  };

  let state = loadState();
  let toastTimer = null;
  let activeOpportunityId = null;


  /* ==========================================================
     2. DOM HELPERS
  ========================================================== */

  function select(selector, parent = document) {
    return parent.querySelector(selector);
  }

  function selectAll(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
  }


  /* ==========================================================
     3. LOCAL STORAGE
  ========================================================== */

  function cloneDefaultState() {
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  function loadState() {
    try {
      const storedState = localStorage.getItem(STORAGE_KEY);

      if (!storedState) {
        return cloneDefaultState();
      }

      const parsedState = JSON.parse(storedState);

      return {
        ...cloneDefaultState(),
        ...parsedState,

        permissions: {
          ...DEFAULT_STATE.permissions,
          ...(parsedState.permissions || {})
        }
      };
    } catch (error) {
      console.warn(
        "The saved prototype state could not be loaded.",
        error
      );

      return cloneDefaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );
    } catch (error) {
      console.warn(
        "The prototype state could not be saved.",
        error
      );
    }
  }


  /* ==========================================================
     4. MAIN VIEW NAVIGATION
  ========================================================== */

  function initializeNavigation() {
    selectAll("[data-view-link]").forEach((control) => {
      control.addEventListener("click", (event) => {
        event.preventDefault();

        const viewName = control.dataset.viewLink;

        if (viewName) {
          showView(viewName);
        }
      });
    });

    select("#accountButton")?.addEventListener(
      "click",
      () => {
        showView("profile");
      }
    );

    const allowedViews = [
      "home",
      "opportunities",
      "profile",
      "privacy"
    ];

    const startingView = allowedViews.includes(
      state.activeView
    )
      ? state.activeView
      : "home";

    showView(startingView, {
      scrollToTop: false
    });
  }

  function showView(viewName, options = {}) {
    const { scrollToTop = true } = options;

    const requestedView = select(
      `.app-view[data-view="${viewName}"]`
    );

    if (!requestedView) {
      return;
    }

    selectAll(".app-view").forEach((view) => {
      const isActive =
        view.dataset.view === viewName;

      view.hidden = !isActive;
      view.classList.toggle(
        "is-visible",
        isActive
      );
    });

    selectAll(".navigation-link").forEach(
      (button) => {
        button.classList.toggle(
          "is-active",
          button.dataset.viewLink === viewName
        );
      }
    );

    state.activeView = viewName;
    saveState();

    if (scrollToTop) {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion()
          ? "auto"
          : "smooth"
      });
    }
  }


  /* ==========================================================
     5. SCROLL CONTROLS
  ========================================================== */

  function initializeScrollControls() {
    selectAll("[data-scroll-target]").forEach(
      (button) => {
        button.addEventListener("click", () => {
          const targetId =
            button.dataset.scrollTarget;

          const target = document.getElementById(
            targetId
          );

          target?.scrollIntoView({
            behavior: prefersReducedMotion()
              ? "auto"
              : "smooth",
            block: "center"
          });
        });
      }
    );
  }


  /* ==========================================================
     6. PROTOTYPE NOTICE
  ========================================================== */

  function initializePrototypeNotice() {
    const notice = select("#prototypeNotice");
    const dismissButton = select(
      "#dismissNoticeButton"
    );

    if (!notice) {
      return;
    }

    notice.hidden = state.noticeDismissed;

    dismissButton?.addEventListener("click", () => {
      state.noticeDismissed = true;
      notice.hidden = true;

      saveState();

      showToast(
        "Notice dismissed",
        "The full prototype disclaimer remains available in the footer."
      );
    });
  }


  /* ==========================================================
     7. SAVINGS QUESTION
  ========================================================== */

  function initializeSavingsQuestion() {
    selectAll("[data-savings-answer]").forEach(
      (button) => {
        button.addEventListener("click", () => {
          const answerId =
            button.dataset.savingsAnswer;

          if (!SAVINGS_ANSWERS[answerId]) {
            return;
          }

          state.savingsAccess = answerId;
          state.questionSkipped = false;

          saveState();
          renderSavingsState();

          showToast(
            "Savings profile updated",
            `${SAVINGS_ANSWERS[answerId].label} is now shaping your fictional savings comparison.`
          );
        });
      }
    );

    select("#skipQuestionButton")?.addEventListener(
      "click",
      () => {
        state.questionSkipped = true;
        saveState();

        showToast(
          "Question skipped",
          "You can answer it later without losing access to the rest of the prototype."
        );
      }
    );

    select(
      "#answerSavingsProfileButton"
    )?.addEventListener("click", () => {
      showView("home");

      window.setTimeout(() => {
        select("#nextQuestion")?.scrollIntoView({
          behavior: prefersReducedMotion()
            ? "auto"
            : "smooth",
          block: "center"
        });
      }, 120);
    });

    renderSavingsState();
  }

  function renderSavingsState() {
    const answer = state.savingsAccess
      ? SAVINGS_ANSWERS[state.savingsAccess]
      : null;

    renderSelectedSavingsAnswer();
    renderProfileProgress(answer);
    renderFinancialProfileField(answer);
    renderStoredSavingsAnswer(answer);
    renderFinancialMatchScores(answer);
  }

  function renderSelectedSavingsAnswer() {
    selectAll("[data-savings-answer]").forEach(
      (button) => {
        const isSelected =
          button.dataset.savingsAnswer ===
          state.savingsAccess;

        button.classList.toggle(
          "is-selected",
          isSelected
        );

        button.setAttribute(
          "aria-pressed",
          String(isSelected)
        );
      }
    );
  }

  function renderProfileProgress(answer) {
    const progress = answer
      ? answer.progress
      : 42;

    const label = select(
      "#profileProgressLabel"
    );

    const bar = select(
      "#profileProgressBar"
    );

    const message = select(
      "#profileProgressMessage"
    );

    const progressContainer = bar?.closest(
      '[role="progressbar"]'
    );

    if (label) {
      label.textContent = `${progress}%`;
    }

    if (bar) {
      bar.style.width = `${progress}%`;
    }

    if (progressContainer) {
      progressContainer.setAttribute(
        "aria-valuenow",
        String(progress)
      );
    }

    if (message) {
      message.textContent = answer
        ? "Your savings matches now reflect your expected need for access."
        : "One answer could improve your savings matches.";
    }
  }

  function renderFinancialProfileField(answer) {
    const field = select(
      "#savingsAccessProfileField"
    );

    const text = select(
      "#savingsAccessProfileText"
    );

    const button = select(
      "#answerSavingsProfileButton"
    );

    const status = field?.querySelector(
      "div > span"
    );

    if (!field || !text || !button) {
      return;
    }

    if (answer) {
      field.classList.remove(
        "profile-field-recommended"
      );

      if (status) {
        status.textContent = "Answered";
      }

      text.textContent = answer.label;
      button.textContent = "Edit";

      button.classList.remove(
        "primary-button"
      );

      button.classList.add(
        "secondary-button"
      );
    } else {
      field.classList.add(
        "profile-field-recommended"
      );

      if (status) {
        status.textContent =
          "Recommended next";
      }

      text.textContent =
        "This could improve your savings matches.";

      button.textContent = "Answer";

      button.classList.remove(
        "secondary-button"
      );

      button.classList.add(
        "primary-button"
      );
    }
  }

  function renderStoredSavingsAnswer(answer) {
    const storedAnswer = select(
      "#storedSavingsAccess"
    );

    if (storedAnswer) {
      storedAnswer.textContent = answer
        ? `${answer.label} · Self-reported`
        : "Not answered";
    }
  }

  function renderFinancialMatchScores(answer) {
    const flexibleScore = answer
      ? answer.flexibleScore
      : 92;

    const growthScore = answer
      ? answer.growthScore
      : 74;

    setOpportunityScore(
      "flexible-savings",
      flexibleScore
    );

    setOpportunityScore(
      "growth-savings",
      growthScore
    );

    const featuredScore = select(
      ".featured-opportunity .match-score"
    );

    if (featuredScore) {
      featuredScore.textContent =
        `${flexibleScore}%`;
    }

    const featuredExplanation = select(
      ".match-explanation p"
    );

    if (featuredExplanation) {
      featuredExplanation.textContent = answer
        ? answer.summary
        : "Your savings goal and opening contribution align with the fictional requirements.";
    }
  }

  function setOpportunityScore(
    opportunityId,
    score
  ) {
    const card = select(
      `[data-opportunity-id="${opportunityId}"]`
    );

    const scoreElement = card?.querySelector(
      ".dynamic-match-score"
    );

    if (scoreElement) {
      scoreElement.textContent = `${score}%`;
    }
  }


  /* ==========================================================
     8. PROFILE TABS
  ========================================================== */

  function initializeProfileTabs() {
    selectAll("[data-profile-tab]").forEach(
      (button) => {
        button.addEventListener("click", () => {
          const tabName =
            button.dataset.profileTab;

          if (tabName) {
            showProfileTab(tabName);
          }
        });
      }
    );

    const validTabs = [
      "goals",
      "finance",
      "education",
      "career"
    ];

    const startingTab = validTabs.includes(
      state.activeProfileTab
    )
      ? state.activeProfileTab
      : "goals";

    showProfileTab(startingTab, false);
  }

  function showProfileTab(
    tabName,
    shouldSave = true
  ) {
    const requestedPanel = select(
      `[data-profile-panel="${tabName}"]`
    );

    if (!requestedPanel) {
      return;
    }

    selectAll("[data-profile-panel]").forEach(
      (panel) => {
        const isActive =
          panel.dataset.profilePanel === tabName;

        panel.hidden = !isActive;
        panel.classList.toggle(
          "is-visible",
          isActive
        );
      }
    );

    selectAll("[data-profile-tab]").forEach(
      (button) => {
        button.classList.toggle(
          "is-active",
          button.dataset.profileTab === tabName
        );
      }
    );

    state.activeProfileTab = tabName;

    if (shouldSave) {
      saveState();
    }
  }


  /* ==========================================================
     9. PATH BUTTONS
  ========================================================== */

  function initializePathButtons() {
    selectAll("[data-open-path]").forEach(
      (button) => {
        button.addEventListener("click", () => {
          const pathName =
            button.dataset.openPath;

          showView("profile");
          showProfileTab(pathName);

          window.setTimeout(() => {
            select(".profile-content")?.scrollIntoView({
              behavior: prefersReducedMotion()
                ? "auto"
                : "smooth",
              block: "start"
            });
          }, 120);
        });
      }
    );
  }


  /* ==========================================================
     10. OPPORTUNITY FILTERS
  ========================================================== */

  function initializeOpportunityFilters() {
    selectAll(
      "[data-opportunity-filter]"
    ).forEach((button) => {
      button.addEventListener("click", () => {
        const filter =
          button.dataset.opportunityFilter;

        applyOpportunityFilter(filter);
      });
    });
  }

  function applyOpportunityFilter(
    filter = "all"
  ) {
    selectAll(
      "[data-opportunity-filter]"
    ).forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.opportunityFilter ===
          filter
      );
    });

    selectAll(".opportunity-card").forEach(
      (card) => {
        const shouldShow =
          filter === "all" ||
          card.dataset.category === filter;

        card.hidden = !shouldShow;
      }
    );
  }


  /* ==========================================================
     11. OPPORTUNITY DIALOG
  ========================================================== */

  function initializeOpportunityDialog() {
    selectAll("[data-open-opportunity]").forEach(
      (button) => {
        button.addEventListener("click", () => {
          openOpportunityDialog(
            button.dataset.openOpportunity
          );
        });
      }
    );

    const dialog = select(
      "#opportunityDialog"
    );

    select(
      "#closeOpportunityDialogButton"
    )?.addEventListener("click", () => {
      closeDialog(dialog);
    });

    select(
      "#cancelOpportunityButton"
    )?.addEventListener("click", () => {
      closeDialog(dialog);
    });

    select(
      "#continueOpportunityButton"
    )?.addEventListener("click", () => {
      if (
        activeOpportunityId === "disclaimer"
      ) {
        closeDialog(dialog);
        return;
      }

      const opportunity =
        OPPORTUNITIES[activeOpportunityId];

      closeDialog(dialog);

      showToast(
        "No information was shared",
        opportunity
          ? `A real next step for ${opportunity.title} would show the exact fields requested before asking for approval.`
          : "A real next step would show the exact fields requested before asking for approval."
      );
    });

    initializeBackdropClose(dialog);
  }

  function openOpportunityDialog(
    opportunityId
  ) {
    const opportunity =
      OPPORTUNITIES[opportunityId];

    const dialog = select(
      "#opportunityDialog"
    );

    if (!opportunity || !dialog) {
      return;
    }

    activeOpportunityId = opportunityId;

    const title = select(
      "#opportunityDialogTitle"
    );

    const body = select(
      "#opportunityDialogBody"
    );

    const continueButton = select(
      "#continueOpportunityButton"
    );

    if (title) {
      title.textContent = opportunity.title;
    }

    if (body) {
      body.innerHTML =
        buildOpportunityDialogContent(
          opportunity
        );
    }

    if (continueButton) {
      continueButton.textContent =
        "Review information";
    }

    openDialog(dialog);
  }

  function buildOpportunityDialogContent(
    opportunity
  ) {
    const terms = opportunity.terms
      .map(
        ([label, value]) => `
          <div>
            <span>${escapeHTML(label)}</span>
            <strong>${escapeHTML(value)}</strong>
          </div>
        `
      )
      .join("");

    const requiredData =
      opportunity.requiredData
        .map(
          (item) => `
            <div>
              <span class="status-dot"></span>

              <p>${escapeHTML(item)}</p>
            </div>
          `
        )
        .join("");

    return `
      <p class="eyebrow">
        ${escapeHTML(opportunity.category)}
      </p>

      <p>
        ${escapeHTML(opportunity.description)}
      </p>

      <div class="explanation-steps">
        ${terms}
      </div>

      <div
        style="
          margin-top: 28px;
          padding-top: 24px;
          border-top: 1px solid var(--border);
        "
      >
        <h3>
          Information this fictional route may require
        </h3>

        <div
          style="
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: 18px;
          "
        >
          ${requiredData}
        </div>
      </div>

      <div
        class="sharing-status"
        style="margin-top: 28px;"
      >
        <span class="status-dot"></span>

        <div>
          <strong>
            Nothing has been transferred
          </strong>

          <p>
            Continuing would first show the exact
            information requested and allow you to
            approve or reject the transfer.
          </p>
        </div>
      </div>
    `;
  }


  /* ==========================================================
     12. QUESTION EXPLANATION DIALOG
  ========================================================== */

  function initializeQuestionDialog() {
    const dialog = select(
      "#questionExplanationDialog"
    );

    select(
      "#openQuestionExplanationButton"
    )?.addEventListener("click", () => {
      openDialog(dialog);
    });

    select(
      "#closeQuestionDialogButton"
    )?.addEventListener("click", () => {
      closeDialog(dialog);
    });

    select(
      "#understandQuestionButton"
    )?.addEventListener("click", () => {
      closeDialog(dialog);
    });

    initializeBackdropClose(dialog);
  }


  /* ==========================================================
     13. DIALOG HELPERS
  ========================================================== */

  function openDialog(dialog) {
    if (!dialog) {
      return;
    }

    document.body.classList.add(
      "dialog-open"
    );

    if (
      typeof dialog.showModal === "function"
    ) {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  function closeDialog(dialog) {
    if (!dialog) {
      return;
    }

    if (
      typeof dialog.close === "function" &&
      dialog.open
    ) {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }

    document.body.classList.remove(
      "dialog-open"
    );
  }

  function initializeBackdropClose(dialog) {
    if (!dialog) {
      return;
    }

    dialog.addEventListener("click", (event) => {
      const bounds =
        dialog.getBoundingClientRect();

      const clickedInside =
        event.clientX >= bounds.left &&
        event.clientX <= bounds.right &&
        event.clientY >= bounds.top &&
        event.clientY <= bounds.bottom;

      if (!clickedInside) {
        closeDialog(dialog);
      }
    });

    dialog.addEventListener("close", () => {
      document.body.classList.remove(
        "dialog-open"
      );
    });
  }


  /* ==========================================================
     14. PRIVACY PERMISSIONS
  ========================================================== */

  function initializePermissions() {
    const controls = {
      matching: select(
        "#matchingPermission"
      ),

      analytics: select(
        "#analyticsPermission"
      ),

      reminders: select(
        "#remindersPermission"
      )
    };

    Object.entries(controls).forEach(
      ([permissionName, input]) => {
        if (!input) {
          return;
        }

        input.checked =
          state.permissions[permissionName];

        input.addEventListener("change", () => {
          state.permissions[permissionName] =
            input.checked;

          saveState();

          showPermissionToast(
            permissionName,
            input.checked
          );
        });
      }
    );
  }

  function showPermissionToast(
    permissionName,
    enabled
  ) {
    const messages = {
      matching: {
        enabled: [
          "Personal matching enabled",
          "Your stored answers can shape the opportunities shown in this browser."
        ],

        disabled: [
          "Personal matching paused",
          "Your answers remain stored, but matching is treated as paused."
        ]
      },

      analytics: {
        enabled: [
          "Aggregate analysis enabled",
          "This preference is saved only as part of the local demonstration."
        ],

        disabled: [
          "Aggregate analysis disabled",
          "The prototype will retain this preference in your browser."
        ]
      },

      reminders: {
        enabled: [
          "Reminders enabled",
          "This static prototype does not send real notifications."
        ],

        disabled: [
          "Reminders disabled",
          "No opportunity reminders will be represented as active."
        ]
      }
    };

    const selectedMessage =
      messages[permissionName]?.[
        enabled ? "enabled" : "disabled"
      ];

    if (selectedMessage) {
      showToast(
        selectedMessage[0],
        selectedMessage[1]
      );
    }
  }


  /* ==========================================================
     15. DATA DOWNLOAD
  ========================================================== */

  function initializeDataDownload() {
    select(
      "#downloadDataButton"
    )?.addEventListener("click", () => {
      const savingsAnswer =
        state.savingsAccess
          ? SAVINGS_ANSWERS[
              state.savingsAccess
            ].label
          : "Not answered";

      const exportData = {
        prototype:
          "Global Opportunity Exchange",

        exportedAt:
          new Date().toISOString(),

        notice:
          "This file contains fictional demonstration data stored locally in the visitor's browser.",

        profile: {
          name: "Blake",
          level: 4,

          goals: [
            "Build emergency savings",
            "Plan an affordable degree",
            "Find higher-paying work"
          ],

          financial: {
            primaryGoal:
              "Build emergency savings",

            openingContribution:
              "$100–$499",

            expectedNeedForAccess:
              savingsAnswer
          }
        },

        permissions: {
          ...state.permissions
        }
      };

      downloadJSON(
        exportData,
        "global-opportunity-exchange-profile.json"
      );

      showToast(
        "Profile copy downloaded",
        "A JSON file containing the fictional local profile was created."
      );
    });
  }

  function downloadJSON(data, filename) {
    const contents = JSON.stringify(
      data,
      null,
      2
    );

    const blob = new Blob([contents], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }


  /* ==========================================================
     16. RESET
  ========================================================== */

  function initializeResetControl() {
    select(
      "#resetPrototypeButton"
    )?.addEventListener("click", () => {
      const shouldReset = window.confirm(
        "Reset all locally stored prototype choices?"
      );

      if (!shouldReset) {
        return;
      }

      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    });
  }


  /* ==========================================================
     17. DISCLAIMER
  ========================================================== */

  function initializeDisclaimer() {
    select(
      "#openDisclaimerButton"
    )?.addEventListener("click", () => {
      openDisclaimerDialog();
    });
  }

  function openDisclaimerDialog() {
    const dialog = select(
      "#opportunityDialog"
    );

    const title = select(
      "#opportunityDialogTitle"
    );

    const body = select(
      "#opportunityDialogBody"
    );

    const continueButton = select(
      "#continueOpportunityButton"
    );

    if (!dialog || !body) {
      return;
    }

    activeOpportunityId = "disclaimer";

    if (title) {
      title.textContent =
        "Prototype disclaimer";
    }

    body.innerHTML = `
      <p>
        This website is a conceptual demonstration
        of the proposed Global Opportunity Exchange.
        It does not contain real providers, accounts,
        rates, programs, jobs, educational placements,
        eligibility determinations, or guarantees.
      </p>

      <p>
        Nothing displayed here constitutes financial,
        legal, tax, investment, educational, employment,
        housing, or other professional advice.
      </p>

      <div class="sharing-status">
        <span class="status-dot"></span>

        <div>
          <strong>
            Static demonstration
          </strong>

          <p>
            The website has no database and sends no
            profile information anywhere. Demonstration
            choices are stored only in the visitor's
            browser.
          </p>
        </div>
      </div>
    `;

    if (continueButton) {
      continueButton.textContent = "Close";
    }

    openDialog(dialog);
  }


  /* ==========================================================
     18. SECONDARY PROTOTYPE CONTROLS
  ========================================================== */

  function initializeSecondaryControls() {
    select("#addGoalButton")?.addEventListener(
      "click",
      () => {
        showToast(
          "Goal library",
          "A complete platform could offer additional financial, education, career, housing, and community goals here."
        );
      }
    );

    selectAll(
      ".profile-field .quiet-button, " +
      ".stored-data-row .quiet-button, " +
      ".empty-panel .primary-button"
    ).forEach((button) => {
      button.addEventListener("click", () => {
        showToast(
          "Prototype interaction",
          "This control marks where a complete implementation would open another focused step."
        );
      });
    });
  }


  /* ==========================================================
     19. TOAST
  ========================================================== */

  function showToast(title, message) {
    const toast = select("#toast");
    const titleElement = select(
      "#toastTitle"
    );

    const messageElement = select(
      "#toastMessage"
    );

    if (!toast) {
      return;
    }

    if (titleElement) {
      titleElement.textContent = title;
    }

    if (messageElement) {
      messageElement.textContent = message;
    }

    toast.classList.add("is-visible");

    if (toastTimer) {
      window.clearTimeout(toastTimer);
    }

    toastTimer = window.setTimeout(() => {
      toast.classList.remove(
        "is-visible"
      );
    }, 4200);
  }


  /* ==========================================================
     20. UTILITIES
  ========================================================== */

  function prefersReducedMotion() {
    return window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  /* ==========================================================
     21. INITIALIZATION
  ========================================================== */

  function initializeApplication() {
    initializeNavigation();
    initializeScrollControls();
    initializePrototypeNotice();
    initializeSavingsQuestion();
    initializeProfileTabs();
    initializePathButtons();
    initializeOpportunityFilters();
    initializeOpportunityDialog();
    initializeQuestionDialog();
    initializePermissions();
    initializeDataDownload();
    initializeResetControl();
    initializeDisclaimer();
    initializeSecondaryControls();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeApplication
    );
  } else {
    initializeApplication();
  }
})();
