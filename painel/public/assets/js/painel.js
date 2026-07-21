(() => {
  const openButtons = Array.from(document.querySelectorAll('[data-open-modal]'));
  const closeButtons = Array.from(document.querySelectorAll('[data-close-modal]'));

  const decodeBase64Text = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
      return atob(raw);
    } catch (_) {
      return '';
    }
  };

  let suggestionVisibilityTouched = false;

  const syncSuggestionVisibilityByApproval = ({ force = false } = {}) => {
    const approvalInput = document.getElementById('manage-suggestion-approval');
    const visibleInput = document.getElementById('manage-suggestion-visible');
    if (!approvalInput || !visibleInput) return;

    const isApproved = approvalInput.value === 'approved';
    if (!isApproved) {
      visibleInput.checked = false;
      return;
    }

    if (force || !suggestionVisibilityTouched) {
      visibleInput.checked = true;
    }
  };

  const resetSuggestionModal = () => {
    const idInput = document.getElementById('manage-suggestion-id');
    const typeInput = document.getElementById('manage-suggestion-type');
    const titleInput = document.getElementById('manage-suggestion-title');
    const detailsInput = document.getElementById('manage-suggestion-details');
    const approvalInput = document.getElementById('manage-suggestion-approval');
    const statusInput = document.getElementById('manage-suggestion-status');
    const visibleInput = document.getElementById('manage-suggestion-visible');
    const publishAtInput = document.getElementById('manage-suggestion-publish-at');
    const publishUntilInput = document.getElementById('manage-suggestion-publish-until');
    const notesInput = document.getElementById('manage-suggestion-notes');

    if (idInput) idInput.value = '0';
    if (typeInput) typeInput.value = 'suggestion';
    if (titleInput) titleInput.value = '';
    if (detailsInput) detailsInput.value = '';
    if (approvalInput) approvalInput.value = 'pending';
    if (statusInput) statusInput.value = 'em_votacao';
    if (visibleInput) visibleInput.checked = false;
    if (publishAtInput) publishAtInput.value = '';
    if (publishUntilInput) publishUntilInput.value = '';
    if (notesInput) notesInput.value = '';
    suggestionVisibilityTouched = false;
  };

  const resetReleaseModal = () => {
    const idInput = document.getElementById('manage-release-id');
    const versionInput = document.getElementById('manage-release-version');
    const statusInput = document.getElementById('manage-release-status');
    const titleInput = document.getElementById('manage-release-title');
    const changelogInput = document.getElementById('manage-release-changelog');
    const publishAtInput = document.getElementById('manage-release-publish-at');
    const installerInput = document.getElementById('manage-release-installer');
    const blockmapInput = document.getElementById('manage-release-blockmap');

    if (idInput) idInput.value = '0';
    if (versionInput) versionInput.value = '';
    if (statusInput) statusInput.value = 'draft';
    if (titleInput) titleInput.value = '';
    if (changelogInput) changelogInput.value = '';
    if (publishAtInput) publishAtInput.value = '';
    if (installerInput) installerInput.value = '';
    if (blockmapInput) blockmapInput.value = '';
  };

  const resetPlanModal = () => {
    const idInput = document.getElementById('manage-plan-id');
    const codeInput = document.getElementById('manage-plan-code');
    const nameInput = document.getElementById('manage-plan-name');
    const accessInput = document.getElementById('manage-plan-access-type');
    const durationInput = document.getElementById('manage-plan-duration-days');
    const priceInput = document.getElementById('manage-plan-price');
    const descriptionInput = document.getElementById('manage-plan-description');
    const featuresInput = document.getElementById('manage-plan-features');
    const activeInput = document.getElementById('manage-plan-active');
    const sortInput = document.getElementById('manage-plan-sort-order');

    if (idInput) idInput.value = '0';
    if (codeInput) codeInput.value = '';
    if (nameInput) nameInput.value = '';
    if (accessInput) accessInput.value = 'full';
    if (durationInput) durationInput.value = '30';
    if (priceInput) priceInput.value = '';
    if (descriptionInput) descriptionInput.value = '';
    if (featuresInput) featuresInput.value = 'Acesso sem atraso ao Pre-live\nLinks diretos para as casas de apostas\n40 esportes e 27 eSports\nMais de 60 casas de apostas';
    if (activeInput) activeInput.checked = true;
    if (sortInput) sortInput.value = '0';
  };

  const openModal = (id) => {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  };

  const closeModal = (modal) => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  };

  openButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const modalId = button.getAttribute('data-open-modal');
      if (!modalId) return;

      if (modalId === 'manage-sub-modal') {
        const userId = button.getAttribute('data-user-id') || '';
        const userEmail = button.getAttribute('data-user-email') || '-';
        const idInput = document.getElementById('manage-user-id');
        const emailSpan = document.getElementById('manage-user-email');
        if (idInput) idInput.value = userId;
        if (emailSpan) emailSpan.textContent = userEmail;
      }

      if (modalId === 'manage-admin-modal') {
        const adminId = button.getAttribute('data-admin-id') || '';
        const adminEmail = button.getAttribute('data-admin-email') || '-';
        const idInput = document.getElementById('manage-admin-id');
        const emailSpan = document.getElementById('manage-admin-email');
        if (idInput) idInput.value = adminId;
        if (emailSpan) emailSpan.textContent = adminEmail;
      }

      if (modalId === 'manage-user-password-modal') {
        const userId = button.getAttribute('data-user-id') || '';
        const userEmail = button.getAttribute('data-user-email') || '-';
        const idInput = document.getElementById('manage-user-password-id');
        const emailSpan = document.getElementById('manage-user-password-email');
        if (idInput) idInput.value = userId;
        if (emailSpan) emailSpan.textContent = userEmail;
      }

      if (modalId === 'manage-suggestion-modal') {
        resetSuggestionModal();
        const idInput = document.getElementById('manage-suggestion-id');
        const typeInput = document.getElementById('manage-suggestion-type');
        const titleInput = document.getElementById('manage-suggestion-title');
        const detailsInput = document.getElementById('manage-suggestion-details');
        const approvalInput = document.getElementById('manage-suggestion-approval');
        const statusInput = document.getElementById('manage-suggestion-status');
        const visibleInput = document.getElementById('manage-suggestion-visible');
        const publishAtInput = document.getElementById('manage-suggestion-publish-at');
        const publishUntilInput = document.getElementById('manage-suggestion-publish-until');
        const notesInput = document.getElementById('manage-suggestion-notes');

        const suggestionId = button.getAttribute('data-suggestion-id') || '0';
        const entryType = button.getAttribute('data-suggestion-entry-type') || 'suggestion';
        const title = button.getAttribute('data-suggestion-title') || '';
        const details = decodeBase64Text(button.getAttribute('data-suggestion-details'));
        const approval = button.getAttribute('data-suggestion-approval') || 'pending';
        const publicStatus = button.getAttribute('data-suggestion-status') || 'em_votacao';
        const isVisible = button.getAttribute('data-suggestion-visible') === '1';
        const publishAt = button.getAttribute('data-suggestion-publish-at') || '';
        const publishUntil = button.getAttribute('data-suggestion-publish-until') || '';
        const notes = decodeBase64Text(button.getAttribute('data-suggestion-notes'));

        if (idInput) idInput.value = suggestionId;
        if (typeInput) typeInput.value = entryType;
        if (titleInput) titleInput.value = title;
        if (detailsInput) detailsInput.value = details;
        if (approvalInput) approvalInput.value = approval;
        if (statusInput) statusInput.value = publicStatus;
        if (visibleInput) visibleInput.checked = isVisible;
        if (publishAtInput) publishAtInput.value = publishAt;
        if (publishUntilInput) publishUntilInput.value = publishUntil;
        if (notesInput) notesInput.value = notes;
        suggestionVisibilityTouched = false;
        syncSuggestionVisibilityByApproval({ force: true });
      }

      if (modalId === 'manage-release-modal') {
        resetReleaseModal();
        const idInput = document.getElementById('manage-release-id');
        const versionInput = document.getElementById('manage-release-version');
        const statusInput = document.getElementById('manage-release-status');
        const titleInput = document.getElementById('manage-release-title');
        const changelogInput = document.getElementById('manage-release-changelog');
        const publishAtInput = document.getElementById('manage-release-publish-at');

        const releaseId = button.getAttribute('data-release-id') || '0';
        const version = button.getAttribute('data-release-version') || '';
        const title = button.getAttribute('data-release-title') || '';
        const changelog = decodeBase64Text(button.getAttribute('data-release-changelog'));
        const status = button.getAttribute('data-release-status') || 'draft';
        const publishAt = button.getAttribute('data-release-publish-at') || '';

        if (idInput) idInput.value = releaseId;
        if (versionInput) versionInput.value = version;
        if (statusInput) statusInput.value = status;
        if (titleInput) titleInput.value = title;
        if (changelogInput) changelogInput.value = changelog;
        if (publishAtInput) publishAtInput.value = publishAt;
      }

      if (modalId === 'manage-plan-modal') {
        resetPlanModal();
        const idInput = document.getElementById('manage-plan-id');
        const codeInput = document.getElementById('manage-plan-code');
        const nameInput = document.getElementById('manage-plan-name');
        const accessInput = document.getElementById('manage-plan-access-type');
        const durationInput = document.getElementById('manage-plan-duration-days');
        const priceInput = document.getElementById('manage-plan-price');
        const descriptionInput = document.getElementById('manage-plan-description');
        const featuresInput = document.getElementById('manage-plan-features');
        const activeInput = document.getElementById('manage-plan-active');
        const sortInput = document.getElementById('manage-plan-sort-order');

        const planId = button.getAttribute('data-plan-id') || '0';
        if (idInput) idInput.value = planId;
        if (codeInput) codeInput.value = button.getAttribute('data-plan-code') || '';
        if (nameInput) nameInput.value = button.getAttribute('data-plan-name') || '';
        if (accessInput) accessInput.value = button.getAttribute('data-plan-access-type') || 'full';
        if (durationInput) durationInput.value = button.getAttribute('data-plan-duration-days') || '30';
        if (priceInput) priceInput.value = button.getAttribute('data-plan-price') || '';
        if (descriptionInput) descriptionInput.value = button.getAttribute('data-plan-description') || '';
        if (featuresInput) featuresInput.value = decodeBase64Text(button.getAttribute('data-plan-features'));
        if (activeInput) activeInput.checked = button.getAttribute('data-plan-active') !== '0';
        if (sortInput) sortInput.value = button.getAttribute('data-plan-sort-order') || '0';
      }

      openModal(modalId);
    });
  });

  const suggestionApprovalInput = document.getElementById('manage-suggestion-approval');
  const suggestionVisibleInput = document.getElementById('manage-suggestion-visible');
  const suggestionForm = document.querySelector('#manage-suggestion-modal form');

  if (suggestionVisibleInput) {
    suggestionVisibleInput.addEventListener('change', () => {
      suggestionVisibilityTouched = true;
    });
  }

  if (suggestionApprovalInput) {
    suggestionApprovalInput.addEventListener('change', () => {
      suggestionVisibilityTouched = false;
      syncSuggestionVisibilityByApproval({ force: true });
    });
  }

  if (suggestionForm) {
    suggestionForm.addEventListener('submit', () => {
      syncSuggestionVisibilityByApproval();
    });
  }

  closeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const modal = button.closest('.modal-backdrop');
      if (!modal) return;
      closeModal(modal);
    });
  });

  document.querySelectorAll('.modal-backdrop').forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal(modal);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.modal-backdrop.open').forEach((modal) => closeModal(modal));
  });
})();
