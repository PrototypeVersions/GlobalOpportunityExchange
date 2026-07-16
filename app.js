/* ============================================================
   GLOBAL OPPORTUNITY EXCHANGE
   app.js

   This file provides:
   - Single-page navigation
   - Saved prototype progress
   - Interactive profile questions
   - Opportunity filtering
   - Profile section navigation
   - Permission controls
   - Dialogs and explanations
   - Data download and reset functions

   All information remains inside the visitor's browser.
   No information is transmitted anywhere.
============================================================ */

(() => {
  "use strict";

  /* ==========================================================
     1. CONFIGURATION AND DEFAULT STATE
  ========================================================== */

  const STORAGE_KEY = "globalOpportunityExchangePrototype";

  const DEFAULT_STATE = {
    activeView: "home",
    activeProfileSection: "goals",
    savingsAccess: null,
    questionSkipped: false,
    demoNoticeDismissed: false,
    notificationsSeen: false,
    savedOpportunities: [],
    permissions: {
      matching: true,
      analytics: false,
      reminders: true
    }
  };

  const SAVINGS_ACCESS_LABELS = {
    "any-time": "At any time",
    "within-year": "Within one year",
    "one-to-three-years": "One to three years",
    "three-plus-years": "More than three years"
  };

  const OPPORTUNITY_DETAILS = {
    "flexible-savings": {
      title: "Flexible Access Savings",
      category: "Financial",
      summary:
        "This illustrative route prioritizes access to funds, a low opening minimum, and the absence of a fictional monthly maintenance fee.",
      requiredInformation: [
        "Identity confirmation",
        "Geographic eligibility",
        "Opening contribution range",
        "Selected financial goal"
      ]
    },

    "long-term-savings": {
      title: "Long-Term Growth Savings",
      category: "Financial",
      summary:
        "This illustrative route offers a higher stated return in exchange for a longer commitment period and possible early-access penalties.",
      requiredInformation: [
        "Identity confirmation",
        "Geographic eligibility",
        "Opening contribution amount",
        "Expected need for access to funds"
      ]
    },

    "transfer-path": {
      title: "Community College Transfer Path",
      category: "Education",
      summary:
        "This illustrative route combines two years at a community college with transfer to a four-year institution.",
      requiredInformation: [
        "Preferred field of study",
        "Academic information",
        "Residency or location information",
        "Housing preference"
      ]
    },

    "career-role": {
      title: "Research Operations Specialist",
      category: "Career",
      summary:
        "This illustrative pathway connects existing research and analytical skills to a fictional role while identifying one missing qualification.",
      requiredInformation: [
        "Selected skills",
        "Relevant credentials",
        "Preferred work arrangement",
        "Permission to share a limited professional profile"
      ]
    }
  };

  let state = loadState();
  let toastTimeout = null;
  let currentOpportunityId = null;


  /* ==========================================================
     2. ELEMENT HELPERS
  ========================================================== */

  const select = (selector, parent = document) =>
    parent.querySelector(selector);

  const selectAll = (selector, parent = document) =>
    Array.from(parent.querySelectorAll(selector));


  /* ==========================================================
     3. LOCAL STORAGE
  ========================================================== */

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
        },
        savedOpportunities: Array.isArray(
          parsedState.savedOpportunities
        )
          ? parsedState.savedOpportunities
          : []
      };
    } catch (error) {
      console.warn(
        "The saved prototype state could not be loaded.",
        error
      );

      return cloneDefaultState();
    }
  }

  function cloneDefaultState() {
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn(
        "The prototype state could not be saved.",
        error
      );
    }
  }


  /* ==========================================================
     4. VIEW NAVIGATION
  ========================================================== */

  function showView(viewName, options = {}) {
    const { scrollToTop = true } = options;

    const requestedView = select(
      `.app-view[data-view="${viewName}"]`
    );

    if (!requestedView) {
      return;
    }

    selectAll(".app-view").forEach((view) => {
      const isRequestedView = view.dataset.view === viewName;

      view.hidden = !isRequestedView;
      view.classList.toggle("is-visible", isRequestedView);
    });

    selectAll(".navigation-button").forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.viewLink === viewName
      );
    });

    state.activeView = viewName;
    saveState();

    if (scrollToTop) {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion() ? "auto" : "smooth"
      });
    }
  }

  function initializeViewNavigation() {
    selectAll("[data-view-link]").forEach((control) => {
      control.addEventListener("click", (event) => {
        event.preventDefault();

        const viewName = control.dataset.viewLink;

        if (viewName) {
          showView(viewName);
        }
      });
    });

    const profileMenuButton = select("#profileMenuButton");

    profileMenuButton?.addEventListener("click", () => {
      showView("profile");
    });

    const validViews = [
      "home",
      "profile",
      "opportunities",
      "data"
    ];

    const startingView = validViews.includes(state.activeView)
      ? state.activeView
      : "home";

    showView(startingView, {
      scrollToTop: false
    });
  }


  /* ==========================================================
     5. DEMO NOTICE
  ========================================================== */

  function initializeDemoNotice() {
    const demoNotice = select(".demo-notice");
    const dismissButton = select("#dismissDemoNoticeButton");

    if (!demoNotice) {
      return;
    }

    if (state.demoNoticeDismissed) {
      demoNotice.hidden = true;
    }

    dismissButton?.addEventListener("click", () => {
      state.demoNoticeDismissed = true;
      demoNotice.hidden = true;
      saveState();

      showToast(
        "Prototype notice dismissed",
        "You can still review the disclaimer at the bottom of the page."
      );
    });
  }


  /* ==========================================================
     6. SAVINGS QUESTION
  ========================================================== */

  function initializeSavingsQuestion() {
    const answerOptions = selectAll(".answer-option");
    const skipButton = select("#skipQuestionButton");
    const detailsButton = select("#questionDetailsButton");

    answerOptions.forEach((option) => {
      option.addEventListener("click", () => {
        const selectedAnswer = option.dataset.answer;

        if (!selectedAnswer) {
          return;
        }

        state.savingsAccess = selectedAnswer;
        state.questionSkipped = false;

        saveState();
        updateSavingsQuestion();
        updateOverallProgress();
        updateFinancialProfileField();
        updateFinancialOpportunityMatches();

        const answerLabel =
          SAVINGS_ACCESS_LABELS[selectedAnswer] ||
          "Your selected preference";

        showToast(
          "Financial profile improved",
          `${answerLabel} is now being used to refine your illustrative savings matches.`
        );
      });
    });

    skipButton?.addEventListener("click", () => {
      state.questionSkipped = true;
      saveState();

      showToast(
        "Question skipped",
        "You can return and answer it whenever the information becomes useful."
      );
    });

    detailsButton?.addEventListener("click", () => {
      openQuestionExplanationDialog();
    });

    updateSavingsQuestion();
    updateOverallProgress();
    updateFinancialProfileField();
    updateFinancialOpportunityMatches();
  }

  function updateSavingsQuestion() {
    selectAll(".answer-option").forEach((option) => {
      const isSelected =
        option.dataset.answer === state.savingsAccess;

      option.classList.toggle("is-selected", isSelected);
      option.setAttribute(
        "aria-pressed",
        String(isSelected)
      );
    });
  }

  function updateOverallProgress() {
    const progressLabel = select("#overallProgressLabel");
    const progressBar = select("#overallProgressBar");
    const progressTrack = progressBar?.closest(
      '[role="progressbar"]'
    );

    const progress = state.savingsAccess ? 49 : 42;

    if (progressLabel) {
      progressLabel.textContent = `${progress}%`;
    }

    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }

    if (progressTrack) {
      progressTrack.setAttribute(
        "aria-valuenow",
        String(progress)
      );
    }

    const progressMessage = select(".avatar-progress p");

    if (progressMessage) {
      progressMessage.textContent = state.savingsAccess
        ? "Your savings matches now reflect your expected need for access."
        : "One more answer could improve your savings matches.";
    }
  }

  function updateFinancialProfileField() {
    const highlightedField = select(
      '[data-profile-panel="finance"] .profile-field-highlight'
    );

    if (!highlightedField) {
      return;
    }

    const status = select(".field-status", highlightedField);
    const heading = select("h3", highlightedField);
    const description = select("p", highlightedField);
    const actionButton = select("button", highlightedField);

    if (state.savingsAccess) {
      highlightedField.classList.remove(
        "profile-field-highlight"
      );

      status?.classList.remove(
        "field-status-recommended"
      );

      status?.classList.add("field-status-complete");

      if (status) {
        status.textContent = "Answered";
      }

      if (heading) {
        heading.textContent = "Expected need for access";
      }

      if (description) {
        description.textContent =
          SAVINGS_ACCESS_LABELS[state.savingsAccess];
      }

      if (actionButton) {
        actionButton.textContent = "Edit";
        actionButton.classList.remove(
          "primary-button",
          "primary-button-small"
        );
        actionButton.classList.add("text-button");
      }
    } else {
      highlightedField.classList.add(
        "profile-field-highlight"
      );

      status?.classList.remove("field-status-complete");
      status?.classList.add("field-status-recommended");

      if (status) {
        status.textContent = "Recommended next";
      }

      if (heading) {
        heading.textContent = "Expected need for access";
      }

      if (description) {
        description.textContent =
          "This answer may remove unsuitable long-term options.";
      }

      if (actionButton) {
        actionButton.textContent = "Answer";
        actionButton.classList.remove("text-button");
        actionButton.classList.add(
          "primary-button",
          "primary-button-small"
        );
      }
    }

    actionButton?.addEventListener(
      "click",
      navigateToSavingsQuestion,
      { once: true }
    );
  }

  function navigateToSavingsQuestion() {
    showView("home");

    window.setTimeout(() => {
      select(".question-card")?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "center"
      });
    }, 100);
  }


  /* ==========================================================
     7. PROFILE SECTION NAVIGATION
  ========================================================== */

  function initializeProfileSections() {
    const sectionButtons = selectAll(
      ".profile-section-button"
    );

    sectionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const sectionName = button.dataset.profileSection;

        if (sectionName) {
          showProfileSection(sectionName);
        }
      });
    });

    const availableSections = sectionButtons
      .map((button) => button.dataset.profileSection)
      .filter(Boolean);

    const startingSection = availableSections.includes(
      state.activeProfileSection
    )
      ? state.activeProfileSection
      : "goals";

    showProfileSection(startingSection, false);
  }

  function showProfileSection(
    sectionName,
    shouldSave = true
  ) {
    const requestedPanel = select(
      `[data-profile-panel="${sectionName}"]`
    );

    if (!requestedPanel) {
      return;
    }

    selectAll("[data-profile-panel]").forEach((panel) => {
      const isRequested =
        panel.dataset.profilePanel === sectionName;

      panel.hidden = !isRequested;
      panel.classList.toggle("is-visible", isRequested);
    });

    selectAll(".profile-section-button").forEach(
      (button) => {
        button.classList.toggle(
          "is-active",
          button.dataset.profileSection === sectionName
        );
      }
    );

    state.activeProfileSection = sectionName;

    if (shouldSave) {
      saveState();
    }
  }

  function initializeDomainButtons() {
    selectAll("[data-domain]").forEach((button) => {
      button.addEventListener("click", () => {
        const domainName = button.dataset.domain;

        showView("profile");
        showProfileSection(domainName);

        window.setTimeout(() => {
          select(".profile-main")?.scrollIntoView({
            behavior: prefersReducedMotion()
              ? "auto"
              : "smooth",
            block: "start"
          });
        }, 100);
      });
    });
  }


  /* ==========================================================
     8. GOAL BUTTON
  ========================================================== */

  function initializeGoalControls() {
    const addGoalButton = select("#addGoalButton");

    addGoalButton?.addEventListener("click", () => {
      showToast(
        "Goal library",
        "A complete implementation could offer financial, educational, career, housing, and community goals here."
      );
    });
  }


  /* ==========================================================
     9. OPPORTUNITY PREVIEW BUTTONS
  ========================================================== */

  function initializeOpportunityPreviewButtons() {
    selectAll("[data-opportunity]").forEach((button) => {
      button.addEventListener("click", () => {
        const opportunityName =
          button.dataset.opportunity || "";

        showView("opportunities");

        if (opportunityName.includes("savings")) {
          applyOpportunityFilter("finance");
        } else if (
          opportunityName.includes("transfer")
        ) {
          applyOpportunityFilter("education");
        }
      });
    });
  }


  /* ==========================================================
     10. OPPORTUNITY FILTERING
  ========================================================== */

  function initializeOpportunityFilters() {
    selectAll(".filter-button").forEach((button) => {
      button.addEventListener("click", () => {
        applyOpportunityFilter(button.dataset.filter);
      });
    });

    const sortControl = select("#opportunitySort");

    sortControl?.addEventListener("change", () => {
      sortOpportunities(sortControl.value);
    });
  }

  function applyOpportunityFilter(filterName = "all") {
    selectAll(".filter-button").forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.filter === filterName
      );
    });

    selectAll(".opportunity-card").forEach((card) => {
      const matchesFilter =
        filterName === "all" ||
        card.dataset.category === filterName;

      card.hidden = !matchesFilter;
    });
  }

  function sortOpportunities(sortType) {
    const opportunityList = select("#opportunityList");

    if (!opportunityList) {
      return;
    }

    const cards = selectAll(
      ".opportunity-card",
      opportunityList
    );

    const informationWeights = {
      "Flexible Access Savings": 2,
      "Long-Term Growth Savings": 4,
      "Community College Transfer Path": 3,
      "Research Operations Specialist": 3
    };

    const newestWeights = {
      "Research Operations Specialist": 4,
      "Flexible Access Savings": 3,
      "Community College Transfer Path": 2,
      "Long-Term Growth Savings": 1
    };

    cards.sort((cardA, cardB) => {
      const titleA =
        select("h2", cardA)?.textContent.trim() || "";

      const titleB =
        select("h2", cardB)?.textContent.trim() || "";

      if (sortType === "least-information") {
        return (
          (informationWeights[titleA] || 99) -
          (informationWeights[titleB] || 99)
        );
      }

      if (sortType === "newest") {
        return (
          (newestWeights[titleB] || 0) -
          (newestWeights[titleA] || 0)
        );
      }

      const scoreA = readMatchScore(cardA);
      const scoreB = readMatchScore(cardB);

      return scoreB - scoreA;
    });

    cards.forEach((card) => {
      opportunityList.appendChild(card);
    });

    showToast(
      "Opportunities reordered",
      "The visible routes have been sorted using your selected method."
    );
  }

  function readMatchScore(card) {
    const scoreText =
      select(".match-score strong", card)?.textContent ||
      "0";

    return Number.parseInt(scoreText, 10) || 0;
  }


  /* ==========================================================
     11. DYNAMIC FINANCIAL MATCHES
  ========================================================== */

  function updateFinancialOpportunityMatches() {
    const financialCards = selectAll(
      '.opportunity-card[data-category="finance"]'
    );

    if (financialCards.length < 2) {
      return;
    }

    const flexibleCard = financialCards.find((card) =>
      select("h2", card)?.textContent.includes(
        "Flexible Access"
      )
    );

    const longTermCard = financialCards.find((card) =>
      select("h2", card)?.textContent.includes(
        "Long-Term"
      )
    );

    const scoreSets = {
      "any-time": {
        flexible: 96,
        longTerm: 38
      },

      "within-year": {
        flexible: 94,
        longTerm: 52
      },

      "one-to-three-years": {
        flexible: 84,
        longTerm: 76
      },

      "three-plus-years": {
        flexible: 79,
        longTerm: 91
      }
    };

    const selectedScores =
      scoreSets[state.savingsAccess] || {
        flexible: 92,
        longTerm: 74
      };

    setOpportunityScore(
      flexibleCard,
      selectedScores.flexible
    );

    setOpportunityScore(
      longTermCard,
      selectedScores.longTerm
    );

    updateFinancialMatchExplanations(
      flexibleCard,
      longTermCard
    );
  }

  function setOpportunityScore(card, score) {
    if (!card) {
      return;
    }

    const scoreElement = select(
      ".match-score strong",
      card
    );

    if (scoreElement) {
      scoreElement.textContent = `${score}%`;
    }
  }

  function updateFinancialMatchExplanations(
    flexibleCard,
    longTermCard
  ) {
    const flexibleExplanation = select(
      ".opportunity-reason > p",
      flexibleCard
    );

    const longTermExplanation = select(
      ".opportunity-reason > p",
      longTermCard
    );

    if (!state.savingsAccess) {
      if (flexibleExplanation) {
        flexibleExplanation.textContent =
          "Your emergency-savings goal, expected opening contribution, and preference for access to funds fit the example requirements.";
      }

      if (longTermExplanation) {
        longTermExplanation.textContent =
          "This example offers a higher stated return, but more information is needed to determine whether its access restrictions fit your circumstances.";
      }

      return;
    }

    const answer =
      SAVINGS_ACCESS_LABELS[state.savingsAccess];

    if (flexibleExplanation) {
      flexibleExplanation.textContent =
        `You indicated that you may need access ${answer.toLowerCase()}. This answer changes how strongly the prototype ranks this flexible route.`;
    }

    if (longTermExplanation) {
      longTermExplanation.textContent =
        `You indicated that you may need access ${answer.toLowerCase()}. The prototype uses that answer when evaluating this route's fictional 60-month restriction.`;
    }
  }


  /* ==========================================================
     12. EXPANDABLE OPPORTUNITY EXPLANATIONS
  ========================================================== */

  function initializeExplanationToggles() {
    selectAll("[data-explanation-toggle]").forEach(
      (button) => {
        button.addEventListener("click", () => {
          const explanationContainer =
            button.nextElementSibling;

          if (
            !explanationContainer ||
            !explanationContainer.classList.contains(
              "explanation-details"
            )
          ) {
            return;
          }

          const isOpening =
            explanationContainer.hidden;

          explanationContainer.hidden = !isOpening;

          button.textContent = isOpening
            ? "Hide explanation"
            : getOriginalExplanationLabel(button);
        });
      }
    );
  }

  function getOriginalExplanationLabel(button) {
    const cardTitle =
      select(
        "h2",
        button.closest(".opportunity-card")
      )?.textContent || "";

    if (
      cardTitle.includes("Flexible Access")
    ) {
      return "See the information used";
    }

    if (cardTitle.includes("Long-Term")) {
      return "See what would improve this match";
    }

    if (cardTitle.includes("Transfer")) {
      return "See pathway assumptions";
    }

    return "See matched skills";
  }


  /* ==========================================================
     13. SAVE OPPORTUNITIES
  ========================================================== */

  function initializeSaveButtons() {
    selectAll(".opportunity-card").forEach((card) => {
      const footerButtons = selectAll(
        ".opportunity-card-footer button",
        card
      );

      const saveButton = footerButtons.find(
        (button) =>
          button.textContent.trim() === "Save" ||
          button.textContent.trim() === "Saved"
      );

      if (!saveButton) {
        return;
      }

      const opportunityTitle =
        select("h2", card)?.textContent.trim() || "";

      updateSaveButton(
        saveButton,
        opportunityTitle
      );

      saveButton.addEventListener("click", () => {
        toggleSavedOpportunity(
          opportunityTitle,
          saveButton
        );
      });
    });
  }

  function toggleSavedOpportunity(
    opportunityTitle,
    button
  ) {
    const existingIndex =
      state.savedOpportunities.indexOf(
        opportunityTitle
      );

    const isCurrentlySaved = existingIndex !== -1;

    if (isCurrentlySaved) {
      state.savedOpportunities.splice(
        existingIndex,
        1
      );
    } else {
      state.savedOpportunities.push(
        opportunityTitle
      );
    }

    saveState();
    updateSaveButton(button, opportunityTitle);

    showToast(
      isCurrentlySaved
        ? "Opportunity removed"
        : "Opportunity saved",
      isCurrentlySaved
        ? `${opportunityTitle} was removed from your saved routes.`
        : `${opportunityTitle} is now saved in this browser.`
    );
  }

  function updateSaveButton(
    button,
    opportunityTitle
  ) {
    const isSaved =
      state.savedOpportunities.includes(
        opportunityTitle
      );

    button.textContent = isSaved ? "Saved" : "Save";
    button.setAttribute(
      "aria-pressed",
      String(isSaved)
    );
  }


  /* ==========================================================
     14. OPPORTUNITY REVIEW DIALOG
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

    const dialog = select("#opportunityDialog");
    const closeButton = select(
      "#closeOpportunityDialogButton"
    );
    const cancelButton = select(
      "#cancelOpportunityDialogButton"
    );
    const continueButton = select(
      "#continueOpportunityButton"
    );

    closeButton?.addEventListener("click", () => {
      closeDialog(dialog);
    });

    cancelButton?.addEventListener("click", () => {
      closeDialog(dialog);
    });

    continueButton?.addEventListener("click", () => {
      if (currentOpportunityId === "disclaimer") {
        closeDialog(dialog);
        return;
      }

      const details =
        OPPORTUNITY_DETAILS[currentOpportunityId];

      closeDialog(dialog);

      showToast(
        "No information was shared",
        details
          ? `The next stage for ${details.title} would show the exact fictional fields requested.`
          : "The next stage would show the exact fictional fields requested."
      );
    });

    initializeDialogBackdropClose(dialog);
  }

  function openOpportunityDialog(opportunityId) {
    const dialog = select("#opportunityDialog");
    const details =
      OPPORTUNITY_DETAILS[opportunityId];

    if (!dialog || !details) {
      return;
    }

    currentOpportunityId = opportunityId;

    const title = select(
      "#opportunityDialogTitle"
    );

    const content = select(
      ".dialog-content",
      dialog
    );

    const continueButton = select(
      "#continueOpportunityButton"
    );

    if (title) {
      title.textContent = details.title;
    }

    if (content) {
      content.innerHTML = buildOpportunityDialogContent(
        details
      );
    }

    if (continueButton) {
      continueButton.textContent =
        "Review information";
    }

    openDialog(dialog);
  }

  function buildOpportunityDialogContent(details) {
    const informationItems =
      details.requiredInformation
        .map(
          (item) => `
            <label>
              <input type="checkbox" checked disabled>
              <span>
                <strong>${escapeHTML(item)}</strong>
                <small>
                  Included only if necessary for this fictional route
                </small>
              </span>
            </label>
          `
        )
        .join("");

    return `
      <section>
        <h3>${escapeHTML(details.category)} route</h3>

        <p>
          ${escapeHTML(details.summary)}
        </p>
      </section>

      <section>
        <h3>Information this example may require</h3>

        <div class="sharing-list">
          ${informationItems}

          <label>
            <input type="checkbox">

            <span>
              <strong>Broader profile information</strong>

              <small>
                Optional and not required for this demonstration
              </small>
            </span>
          </label>
        </div>
      </section>

      <section class="plain-language-summary">
        <span>Plain-language summary</span>

        <p>
          Continuing would not open your entire profile.
          The next stage would display the exact information
          requested and allow you to approve or reject the transfer.
        </p>
      </section>
    `;
  }

  function openDisclaimerDialog() {
    const dialog = select("#opportunityDialog");
    const title = select(
      "#opportunityDialogTitle"
    );
    const content = select(
      ".dialog-content",
      dialog
    );
    const continueButton = select(
      "#continueOpportunityButton"
    );

    if (!dialog || !content) {
      return;
    }

    currentOpportunityId = "disclaimer";

    if (title) {
      title.textContent = "Prototype disclaimer";
    }

    content.innerHTML = `
      <section>
        <h3>This website is a conceptual demonstration.</h3>

        <p>
          The people, institutions, financial accounts, rates,
          contribution requirements, commitment periods,
          educational pathways, employment roles, costs,
          eligibility results, and projections displayed here
          are fictional.
        </p>
      </section>

      <section>
        <h3>No offer or professional advice</h3>

        <p>
          Nothing on this prototype constitutes an offer,
          solicitation, guarantee, recommendation, eligibility
          decision, financial product, securities offering,
          educational placement, employment opportunity,
          housing opportunity, or professional advice.
        </p>
      </section>

      <section class="plain-language-summary">
        <span>What the prototype demonstrates</span>

        <p>
          The experience is intended to show how voluntary
          information sharing could produce understandable
          opportunity comparisons while preserving visible,
          purpose-specific control over personal data.
        </p>
      </section>
    `;

    if (continueButton) {
      continueButton.textContent = "Close";
    }

    openDialog(dialog);
  }


  /* ==========================================================
     15. QUESTION EXPLANATION DIALOG
  ========================================================== */

  function initializeQuestionDialog() {
    const dialog = select(
      "#questionExplanationDialog"
    );

    const closeButton = select(
      "#closeQuestionExplanationButton"
    );

    const understandButton = select(
      "#understandQuestionButton"
    );

    closeButton?.addEventListener("click", () => {
      closeDialog(dialog);
    });

    understandButton?.addEventListener("click", () => {
      closeDialog(dialog);
    });

    initializeDialogBackdropClose(dialog);
  }

  function openQuestionExplanationDialog() {
    openDialog(
      select("#questionExplanationDialog")
    );
  }


  /* ==========================================================
     16. DIALOG HELPERS
  ========================================================== */

  function openDialog(dialog) {
    if (!dialog) {
      return;
    }

    document.body.classList.add("dialog-open");

    if (typeof dialog.showModal === "function") {
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

    document.body.classList.remove("dialog-open");
  }

  function initializeDialogBackdropClose(dialog) {
    if (!dialog) {
      return;
    }

    dialog.addEventListener("click", (event) => {
      const rectangle =
        dialog.getBoundingClientRect();

      const clickedInside =
        event.clientX >= rectangle.left &&
        event.clientX <= rectangle.right &&
        event.clientY >= rectangle.top &&
        event.clientY <= rectangle.bottom;

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
     17. PERMISSION CONTROLS
  ========================================================== */

  function initializePermissions() {
    const matchingPermission = select(
      "#matchingPermission"
    );

    const analyticsPermission = select(
      "#analyticsPermission"
    );

    const reminderPermission = select(
      "#reminderPermission"
    );

    if (matchingPermission) {
      matchingPermission.checked =
        state.permissions.matching;

      matchingPermission.addEventListener(
        "change",
        () => {
          state.permissions.matching =
            matchingPermission.checked;

          saveState();

          showToast(
            matchingPermission.checked
              ? "Personal matching enabled"
              : "Personal matching paused",
            matchingPermission.checked
              ? "Your stored answers can again shape the prototype's opportunity results."
              : "Your stored answers remain visible, but the prototype will treat matching as paused."
          );
        }
      );
    }

    if (analyticsPermission) {
      analyticsPermission.checked =
        state.permissions.analytics;

      analyticsPermission.addEventListener(
        "change",
        () => {
          state.permissions.analytics =
            analyticsPermission.checked;

          saveState();

          showToast(
            analyticsPermission.checked
              ? "Aggregate analysis enabled"
              : "Aggregate analysis disabled",
            "This setting is saved only as part of the local demonstration."
          );
        }
      );
    }

    if (reminderPermission) {
      reminderPermission.checked =
        state.permissions.reminders;

      reminderPermission.addEventListener(
        "change",
        () => {
          state.permissions.reminders =
            reminderPermission.checked;

          saveState();

          showToast(
            reminderPermission.checked
              ? "Opportunity reminders enabled"
              : "Opportunity reminders disabled",
            "This static prototype does not send actual notifications."
          );
        }
      );
    }
  }


  /* ==========================================================
     18. DATA DOWNLOAD
  ========================================================== */

  function initializeDataDownload() {
    const downloadButton = select(
      "#downloadDataButton"
    );

    downloadButton?.addEventListener("click", () => {
      const exportData = {
        prototype: "Global Opportunity Exchange",
        exportedAt: new Date().toISOString(),
        notice:
          "This file contains only fictional prototype data stored in this browser.",
        profile: {
          goals: [
            "Build emergency savings",
            "Plan an affordable degree",
            "Find higher-paying work",
            "Prepare for home ownership"
          ],
          openingContributionRange: "$100–$499",
          savingsAccess: state.savingsAccess
            ? SAVINGS_ACCESS_LABELS[
                state.savingsAccess
              ]
            : "Not answered",
          savedOpportunities:
            state.savedOpportunities
        },
        permissions: {
          ...state.permissions
        }
      };

      const fileContents = JSON.stringify(
        exportData,
        null,
        2
      );

      const blob = new Blob([fileContents], {
        type: "application/json"
      });

      const downloadURL =
        URL.createObjectURL(blob);

      const temporaryLink =
        document.createElement("a");

      temporaryLink.href = downloadURL;
      temporaryLink.download =
        "global-opportunity-exchange-profile.json";

      document.body.appendChild(temporaryLink);
      temporaryLink.click();
      temporaryLink.remove();

      URL.revokeObjectURL(downloadURL);

      showToast(
        "Prototype data downloaded",
        "A JSON copy of the demonstration profile was created."
      );
    });
  }


  /* ==========================================================
     19. CLEAR AND RESET CONTROLS
  ========================================================== */

  function initializeResetControls() {
    const clearOptionalButton = select(
      "#clearOptionalDataButton"
    );

    const resetButton = select(
      "#resetPrototypeButton"
    );

    clearOptionalButton?.addEventListener(
      "click",
      () => {
        const shouldClear = window.confirm(
          "Clear the optional savings answer and saved opportunities from this browser?"
        );

        if (!shouldClear) {
          return;
        }

        state.savingsAccess = null;
        state.questionSkipped = false;
        state.savedOpportunities = [];

        saveState();
        updateSavingsQuestion();
        updateOverallProgress();
        updateFinancialProfileField();
        updateFinancialOpportunityMatches();
        refreshSaveButtons();

        showToast(
          "Optional answers cleared",
          "The demonstration kept its basic profile but removed optional selections."
        );
      }
    );

    resetButton?.addEventListener("click", () => {
      const shouldReset = window.confirm(
        "Reset the entire prototype to its original state?"
      );

      if (!shouldReset) {
        return;
      }

      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    });
  }

  function refreshSaveButtons() {
    selectAll(".opportunity-card").forEach((card) => {
      const title =
        select("h2", card)?.textContent.trim() || "";

      const saveButton = selectAll(
        ".opportunity-card-footer button",
        card
      ).find((button) =>
        ["Save", "Saved"].includes(
          button.textContent.trim()
        )
      );

      if (saveButton) {
        updateSaveButton(saveButton, title);
      }
    });
  }


  /* ==========================================================
     20. NOTIFICATIONS
  ========================================================== */

  function initializeNotifications() {
    const notificationButton = select(
      "#openNotificationsButton"
    );

    const indicator = select(
      ".notification-indicator"
    );

    if (state.notificationsSeen && indicator) {
      indicator.hidden = true;
    }

    notificationButton?.addEventListener("click", () => {
      state.notificationsSeen = true;

      if (indicator) {
        indicator.hidden = true;
      }

      saveState();

      showToast(
        "One prototype update",
        "A new financial question may improve your savings comparisons."
      );
    });
  }


  /* ==========================================================
     21. FOOTER DISCLAIMER
  ========================================================== */

  function initializeFooterControls() {
    const disclaimerButton = select(
      "#footerDisclaimerButton"
    );

    disclaimerButton?.addEventListener("click", () => {
      openDisclaimerDialog();
    });
  }


  /* ==========================================================
     22. GENERAL DEMONSTRATION BUTTONS
  ========================================================== */

  function initializeDemonstrationButtons() {
    const handledSelectors = [
      "[data-view-link]",
      "[data-domain]",
      "[data-opportunity]",
      "[data-open-opportunity]",
      "[data-explanation-toggle]",
      ".answer-option",
      ".filter-button",
      ".profile-section-button",
      "#addGoalButton",
      "#skipQuestionButton",
      "#questionDetailsButton",
      "#downloadDataButton",
      "#clearOptionalDataButton",
      "#resetPrototypeButton",
      "#openNotificationsButton",
      "#profileMenuButton",
      "#dismissDemoNoticeButton",
      "#footerDisclaimerButton",
      "#closeOpportunityDialogButton",
      "#cancelOpportunityDialogButton",
      "#continueOpportunityButton",
      "#closeQuestionExplanationButton",
      "#understandQuestionButton"
    ].join(",");

    selectAll("button").forEach((button) => {
      if (
        button.matches(handledSelectors) ||
        button.closest(".opportunity-card-footer") ||
        button.closest(".dialog-footer")
      ) {
        return;
      }

      button.addEventListener("click", () => {
        showToast(
          "Prototype interaction",
          "This control demonstrates where the complete platform would open another step."
        );
      });
    });
  }


  /* ==========================================================
     23. TOAST MESSAGES
  ========================================================== */

  function showToast(title, message) {
    const toast = select("#toast");
    const toastTitle = select("#toastTitle");
    const toastMessage = select("#toastMessage");

    if (!toast) {
      return;
    }

    if (toastTitle) {
      toastTitle.textContent = title;
    }

    if (toastMessage) {
      toastMessage.textContent = message;
    }

    toast.classList.add("is-visible");

    if (toastTimeout) {
      window.clearTimeout(toastTimeout);
    }

    toastTimeout = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 4200);
  }


  /* ==========================================================
     24. UTILITY FUNCTIONS
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
     25. START THE APPLICATION
  ========================================================== */

  function initializeApplication() {
    initializeViewNavigation();
    initializeDemoNotice();
    initializeSavingsQuestion();
    initializeProfileSections();
    initializeDomainButtons();
    initializeGoalControls();
    initializeOpportunityPreviewButtons();
    initializeOpportunityFilters();
    initializeExplanationToggles();
    initializeSaveButtons();
    initializeOpportunityDialog();
    initializeQuestionDialog();
    initializePermissions();
    initializeDataDownload();
    initializeResetControls();
    initializeNotifications();
    initializeFooterControls();
    initializeDemonstrationButtons();
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
