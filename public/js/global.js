// --- Main App Logic (Dark Mode, User, Logout) ---
document.addEventListener("DOMContentLoaded", () => {

    // === Global Modals Injection ===
    const injectGlobalModals = () => {
        // logout confirmation modal (popup)
        if (!document.getElementById("logout-confirm-modal")) {
            document.body.insertAdjacentHTML("beforeend", `
                <!-- Logout Confirmation Modal -->
                <div id="logout-confirm-modal" class="modal-overlay">
                    <div class="confirm-modal-content">
                        <h3>Log Out?</h3>
                        <p>Are you sure you want to log out of your account?</p>
                        <button id="confirm-logout-btn" class="danger-btn">Log Out</button>
                        <button id="cancel-logout-btn" class="cancel-btn">Cancel</button>
                    </div>
                </div>
            `);
        }

        // delete confirmation modal (popup)
        if (!document.getElementById("delete-confirm-modal")) {
            document.body.insertAdjacentHTML("beforeend", `
                <!-- Delete Confirmation Modal -->
                <div id="delete-confirm-modal" class="modal-overlay">
                    <div class="confirm-modal-content">
                        <h3>Delete item?</h3>
                        <p>This action can’t be undone and the item will be removed permanently.</p>
                        <button id="confirm-delete-btn" class="danger-btn">Delete</button>
                        <button id="cancel-delete-btn" class="cancel-btn">Cancel</button>
                    </div>
                </div>
            `);
        }

        // edit post modal (popup) 
        if (!document.getElementById("edit-modal-overlay")) {
            document.body.insertAdjacentHTML("beforeend", `
                <!-- popup (modal) for EDITING a post -->
                <div id="edit-modal-overlay" class="modal-overlay">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Edit Post</h3>
                            <button id="close-edit-modal-btn" class="close-modal-btn">&times;</button>
                        </div>
                        <div class="modal-body">
                            <textarea id="edit-modal-textarea" class="modal-textarea-custom" rows="4"></textarea>

                            <input type="file" id="edit-modal-media-upload" accept="image/*,video/*" style="display: none;">
                            <div id="edit-modal-media-preview-container" class="modal-media-preview-container" style="display: none;">
                                <img id="edit-modal-media-preview" src="" style="max-width: 100%; max-height: 250px; border-radius: 8px; display: none;">
                                <video id="edit-modal-video-preview" controls style="max-width: 100%; max-height: 250px; border-radius: 8px; display: none;"></video>
                                <button id="edit-modal-clear-media" class="clear-media-btn">&times;</button>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button id="edit-modal-image-btn" class="media-trigger-btn">
                                <i class="bi bi-image"></i> Change Media
                            </button>
                            <button id="edit-modal-publish-btn" class="publish-btn">Save Changes</button>
                        </div>
                    </div>
                </div>
            `);
        }
    };

    // use the function to inject modals into the DOM
    injectGlobalModals();

    // --- Dark Mode Toggle Logic ---
    const darkModeToggle = document.getElementById("dark-mode-toggle");
    const body = document.body;

    const updateDarkModeUI = () => {
        const isDark = body.classList.contains("dark-mode");
        const icon = document.getElementById("dark-mode-icon");
        const text = document.getElementById("dark-mode-text");

        if (icon && text) {
            if (isDark) {
                icon.classList.replace("bi-moon-stars", "bi-sun-fill");
                text.innerText = "Light Mode";
            } else {
                icon.classList.replace("bi-sun-fill", "bi-moon-stars");
                text.innerText = "Dark Mode";
            }
        }
    };

    // check if the user saved a previous choice in local storage
    if (localStorage.getItem("darkMode") === "enabled") {
        body.classList.add("dark-mode");
    }
    updateDarkModeUI();

    if (darkModeToggle) {
        darkModeToggle.addEventListener("click", (e) => {
            e.preventDefault();
            body.classList.toggle("dark-mode");
            updateDarkModeUI();

            // save the choice
            if (body.classList.contains("dark-mode")) {
                localStorage.setItem("darkMode", "enabled");
            } else {
                localStorage.setItem("darkMode", "disabled");
            }
        });
    }

    // --- User Display Logic (Dynamic Avatar & Profile Picture Anywhere in App) ---
    const loggedInUser = localStorage.getItem("loggedInUser") || "Guest User";
    const savedProfilePic = localStorage.getItem("userProfilePic");

    // update the user name and handle in the navbar and account card
    const userNameDisplay = document.getElementById("nav-user-name") || document.querySelector(".account-card .name");
    const userHandleDisplay = document.getElementById("nav-user-handle") || document.querySelector(".account-card .handle");

    if (userNameDisplay) {
        userNameDisplay.textContent = loggedInUser;
    }
    if (userHandleDisplay) {
        userHandleDisplay.textContent = "@" + loggedInUser.toLowerCase().replace(/\s/g, '');
    }

    // function to update the avatar element based on saved profile picture or initials
    const updateAvatarElement = (avatarEl) => {
        if (!avatarEl) return;

        if (savedProfilePic && savedProfilePic.trim() !== "") {
            // if there's a saved profile picture, display it
            avatarEl.innerHTML = `<img src="${savedProfilePic}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;">`;
            avatarEl.style.background = "transparent";
            avatarEl.style.border = "1px solid var(--border-color)";
        } else {
            // if no profile picture, display initials with a purple background
            const names = loggedInUser.trim().split(" ");
            let initials = names.length >= 2 ? (names[0][0] + names[1][0]).toUpperCase() : loggedInUser.substring(0, 2).toUpperCase();
            avatarEl.textContent = initials;

            avatarEl.classList.remove("avatar-blue", "avatar-muted");
            avatarEl.classList.add("avatar-purple");
        }
    };

    // update all avatar elements in the app (navbar, account card, composer placeholder)
    updateAvatarElement(document.getElementById("nav-user-avatar"));
    updateAvatarElement(document.querySelector(".account-card .avatar"));
    updateAvatarElement(document.querySelector(".composer-placeholder .avatar"));

    // --- Back to Top Button Logic ---
    const backToTopBtn = document.getElementById("back-to-top");
    if (backToTopBtn) {
        window.addEventListener("scroll", () => {
            // check the scroll position and toggle the visibility of the back-to-top button
            const scrollPosition = window.scrollY || document.documentElement.scrollTop;
            if (scrollPosition > 250) {
                backToTopBtn.classList.add("show");
            } else {
                backToTopBtn.classList.remove("show");
            }
        });

        backToTopBtn.addEventListener("click", (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }


    // --- Logout Confirmation Logic (Custom Modal) ---
    const logoutBtnTrigger = document.getElementById("logout-btn-trigger");
    const logoutModal = document.getElementById("logout-confirm-modal");
    const confirmLogoutBtn = document.getElementById("confirm-logout-btn");
    const cancelLogoutBtn = document.getElementById("cancel-logout-btn");

    if (logoutBtnTrigger && logoutModal) {
        logoutBtnTrigger.addEventListener("click", (e) => {
            // prevent immediate navigation
            e.preventDefault();
            logoutModal.classList.add("active");
        });

        if (cancelLogoutBtn) {
            cancelLogoutBtn.addEventListener("click", () => {
                logoutModal.classList.remove("active");
            });
        }

        if (confirmLogoutBtn) {
            confirmLogoutBtn.addEventListener("click", () => {
                // clear saved username and profile picture on logout
                localStorage.removeItem("loggedInUser");
                localStorage.removeItem("userProfilePic");
                // redirect to server logout endpoint to destroy session and cookie
                window.location.href = "/logout";
            });
        }
    }

    // --- Navigate to Profile from bottom-left account card ---
    const accountCard = document.querySelector(".account-card");
    const navAvatar = document.getElementById("nav-user-avatar");

    const navigateToMyProfile = () => {
        const user = localStorage.getItem("loggedInUser");
        if (user) {
            window.location.href = `profile.html?user=${encodeURIComponent(user)}`;
        }
    };

    if (accountCard) {
        accountCard.addEventListener("click", navigateToMyProfile);
    }
    if (navAvatar) {
        navAvatar.addEventListener("click", (e) => {
            e.stopPropagation();
            navigateToMyProfile();
        });
    }
});