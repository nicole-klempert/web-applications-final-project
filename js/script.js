// ===== LOGIN PAGE JS ====
function toggleLoginPassword() {
    const passField = document.getElementById("password");
    if (passField.type === "password") {
        passField.type = "text";
    } else {
        passField.type = "password";
    }
}

// ===== SIGNUP PAGE JS ====
function toggleRegPasswords() {
    const pass1 = document.getElementById("new-password");
    const pass2 = document.getElementById("confirm-password");

    if (pass1.type === "password") {
        pass1.type = "text";
        pass2.type = "text";
    } else {
        pass1.type = "password";
        pass2.type = "password";
    }
}

function checkPasswordsMatch() {
    const pass1 = document.getElementById("new-password");
    const pass2 = document.getElementById("confirm-password");
    const message = document.getElementById("password-match-message");

    if (pass2.value === "") {
        message.innerHTML = "";
        pass2.classList.remove("input-error", "input-success");
        return;
    }

    if (pass1.value === pass2.value) {
        message.innerHTML = "Passwords match!";
        message.className = "text-success";
        pass2.classList.remove("input-error");
        pass2.classList.add("input-success");
    } else {
        message.innerHTML = "Passwords do not match";
        message.className = "text-error";
        pass2.classList.remove("input-success");
        pass2.classList.add("input-error");
    }
}

// ==== GLOBAL ALERT MESSAGES HANDLER ====
document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const success = params.get("success");

    let container = document.querySelector("form");
    if (!container) {
        container = document.querySelector(".main-feed");
    }

    if (error || success) {
        if (container) {
            const alertDiv = document.createElement("div");
            alertDiv.className = "alert-message";
            alertDiv.style.padding = "12px";
            alertDiv.style.marginBottom = "20px";
            alertDiv.style.borderRadius = "6px";
            alertDiv.style.textAlign = "center";
            alertDiv.style.fontWeight = "bold";
            alertDiv.style.fontSize = "0.9rem";
            alertDiv.style.width = "100%";

            if (error) {
                alertDiv.style.backgroundColor = "#fee2e2";
                alertDiv.style.color = "#ef4444";
                alertDiv.style.border = "1px solid #fca5a5";
                alertDiv.innerText = error;
            } else if (success) {
                alertDiv.style.backgroundColor = "#dcfce7";
                alertDiv.style.color = "#22c55e";
                alertDiv.style.border = "1px solid #86efac";
                alertDiv.innerText = success;
            }

            container.insertBefore(alertDiv, container.firstChild);
        }
    }

    const setupRealTimeValidation = (inputId, warningId, allowedRegex) => {
        const input = document.getElementById(inputId);
        const warning = document.getElementById(warningId);
        if (!input || !warning) return;

        const checkInput = () => {
            const val = input.value;
            if (val && !allowedRegex.test(val)) {
                warning.style.display = "block";
                input.classList.add("input-error");
                input.dataset.invalidFormat = "true";
            } else {
                warning.style.display = "none";
                input.classList.remove("input-error");
                delete input.dataset.invalidFormat;
            }
        };

        input.addEventListener("input", checkInput);
        input.addEventListener("blur", checkInput);
    };

    setupRealTimeValidation("username", "username-warning", /^[a-z0-9_.-]*$/);
    setupRealTimeValidation("new-username", "username-warning", /^[a-z0-9_.-]*$/);
    setupRealTimeValidation("email", "email-warning", /^[a-z0-9@._-]*$/);
    setupRealTimeValidation("recovery-answer", "recovery-answer-warning", /^[a-z0-9 ]*$/);

    const passwordAllowedRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/;
    setupRealTimeValidation("new-password", "new-password-warning", passwordAllowedRegex);
    setupRealTimeValidation("confirm-password", "confirm-password-warning", passwordAllowedRegex);

    const form = document.querySelector("form");
    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const oldAlerts = form.querySelectorAll(".alert-message");
            oldAlerts.forEach(el => el.remove());

            const invalidFields = form.querySelectorAll("[data-invalid-format='true']");
            if (invalidFields.length > 0) {
                const alertDiv = document.createElement("div");
                alertDiv.className = "alert-message";
                alertDiv.style.padding = "12px";
                alertDiv.style.marginBottom = "20px";
                alertDiv.style.borderRadius = "6px";
                alertDiv.style.textAlign = "center";
                alertDiv.style.fontWeight = "bold";
                alertDiv.style.fontSize = "0.9rem";
                alertDiv.style.width = "100%";
                alertDiv.style.backgroundColor = "#fee2e2";
                alertDiv.style.color = "#ef4444";
                alertDiv.style.border = "1px solid #fca5a5";
                alertDiv.innerText = "Please correct the fields with format errors (only lowercase English allowed).";

                form.insertBefore(alertDiv, form.firstChild);
                alertDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                return;
            }

            const formData = new URLSearchParams(new FormData(form)).toString();

            try {
                const response = await fetch(form.action, {
                    method: form.method || 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    body: formData
                });

                const result = await response.json();

                if (!response.ok) {
                    const alertDiv = document.createElement("div");
                    alertDiv.className = "alert-message";
                    alertDiv.style.padding = "12px";
                    alertDiv.style.marginBottom = "20px";
                    alertDiv.style.borderRadius = "6px";
                    alertDiv.style.textAlign = "center";
                    alertDiv.style.fontWeight = "bold";
                    alertDiv.style.fontSize = "0.9rem";
                    alertDiv.style.width = "100%";
                    alertDiv.style.backgroundColor = "#fee2e2";
                    alertDiv.style.color = "#ef4444";
                    alertDiv.style.border = "1px solid #fca5a5";
                    alertDiv.innerText = result.error || "An error occurred. Please try again.";

                    form.insertBefore(alertDiv, form.firstChild);
                    alertDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } else if (result.redirect) {
                    window.location.href = result.redirect;
                }
            } catch (err) {
                console.error("AJAX submission failed:", err);
                const alertDiv = document.createElement("div");
                alertDiv.className = "alert-message";
                alertDiv.style.padding = "12px";
                alertDiv.style.marginBottom = "20px";
                alertDiv.style.borderRadius = "6px";
                alertDiv.style.textAlign = "center";
                alertDiv.style.fontWeight = "bold";
                alertDiv.style.fontSize = "0.9rem";
                alertDiv.style.width = "100%";
                alertDiv.style.backgroundColor = "#fee2e2";
                alertDiv.style.color = "#ef4444";
                alertDiv.style.border = "1px solid #fca5a5";
                alertDiv.innerText = "Network connection error. Please try again later.";

                form.insertBefore(alertDiv, form.firstChild);
            }
        });
    }
});

// --- Main App Logic (Dark Mode, User, Logout) ---
document.addEventListener("DOMContentLoaded", () => {
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

            if (body.classList.contains("dark-mode")) {
                localStorage.setItem("darkMode", "enabled");
            } else {
                localStorage.setItem("darkMode", "disabled");
            }
        });
    }

    // --- User Display Logic ---
    const userNameDisplay = document.getElementById("nav-user-name");
    const userHandleDisplay = document.getElementById("nav-user-handle");
    const userAvatarDisplay = document.getElementById("nav-user-avatar");

    if (userNameDisplay) {
        // fetch user data (to be replaced later with actual fetch from the server)
        const loggedInUser = localStorage.getItem("loggedInUser") || "User";
        userNameDisplay.textContent = loggedInUser;
        userHandleDisplay.textContent = "@" + loggedInUser.toLowerCase().replace(/\s/g, '');
        userAvatarDisplay.textContent = loggedInUser.substring(0, 2).toUpperCase();
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
                // clear the saved username
                localStorage.removeItem("loggedInUser");
                // redirect back to the login screen (url can be changed if needed)
                window.location.href = "login.html";
            });
        }
    }
});