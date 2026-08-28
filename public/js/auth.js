// ===== LOGIN PAGE JS ====

// ---- Log in page password toggle ----
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

// check if passwords match
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

// ==== GLOBAL ALERT MESSAGES HANDLER & FORM SYSTEM ====
document.addEventListener("DOMContentLoaded", () => {
    // Set max date for birthday picker to today to prevent future date selection
    const birthdayInput = document.getElementById("birthday");
    if (birthdayInput) {
        birthdayInput.max = new Date().toISOString().split("T")[0];
    }

    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const success = params.get("success");
    const authAlert = sessionStorage.getItem("authAlert");

    let container = document.querySelector("form") || document.querySelector(".main-feed");

    if (error || success || authAlert) {
        if (container) {
            const alertDiv = document.createElement("div");
            alertDiv.className = "alert-message";

            if (error || authAlert) {
                alertDiv.innerText = error || authAlert;
                if (authAlert) sessionStorage.removeItem("authAlert");
            } else if (success) {
                alertDiv.classList.add("success");
                alertDiv.innerText = success;
            }

            container.insertBefore(alertDiv, container.firstChild);
        }
    }

    // real-time input validators for lowercase english patterns
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


    // --- Initialize Universal Image Cropper ---
    if (typeof window.initImageCropper === "function") {
        window.initImageCropper({
            triggerId: "avatar-trigger",
            fileInputId: "profile-picture-input",
            livePreviewId: "avatar-live-preview",
            placeholderId: "avatar-placeholder",
            onCropApply: (base64String) => {
                const hiddenCroppedData = document.getElementById("cropped-profile-data");
                if (hiddenCroppedData) hiddenCroppedData.value = base64String;
                localStorage.setItem("userProfilePic", base64String);
            }
        });
    }

    // submit form with ajax
    const form = document.querySelector("form");
    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const oldAlerts = form.querySelectorAll(".alert-message");
            oldAlerts.forEach(el => el.remove());

            const invalidFields = form.querySelectorAll("[data-invalid-format='true']");
            if (invalidFields.length > 0) {
                const alertDiv = document.createElement("div");
                alertDiv.className = "alert-message text-error input-error";
                alertDiv.innerText = "Please correct the fields with format errors (only lowercase English allowed).";
                form.insertBefore(alertDiv, form.firstChild);
                alertDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                return;
            }

            const isSignupPage = document.getElementById("profile-picture-input");
            const hiddenCroppedData = document.getElementById("cropped-profile-data"); 
            if (isSignupPage && (!hiddenCroppedData || !hiddenCroppedData.value)) {
                localStorage.removeItem("userProfilePic");
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
                    alertDiv.className = "alert-message text-error input-error";
                    alertDiv.innerText = result.error || "An error occurred. Please try again.";
                    form.insertBefore(alertDiv, form.firstChild);
                    alertDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } else if (result.redirect) {
                    // save username and profile picture to localStorage for later use
                    const enteredUser = (result.username || result.user || "") ||
                        (document.getElementById("username")?.value ||
                            document.getElementById("new-username")?.value ||
                            document.getElementById("email")?.value ||
                            form.querySelector("input[type='text'], input[type='email']")?.value ||
                            "User");

                    if (enteredUser && enteredUser.trim() !== "") {
                        localStorage.setItem("loggedInUser", enteredUser.trim());
                    }

                    if (result.profilePicture && result.profilePicture.trim() !== "") {
                        localStorage.setItem("userProfilePic", result.profilePicture);
                    }

                    window.location.href = result.redirect;
                }
            } catch (err) {
                console.error("AJAX submission failed:", err);
                const alertDiv = document.createElement("div");
                alertDiv.className = "alert-message text-error input-error";
                alertDiv.innerText = "Network connection error. Please try again later.";
                form.insertBefore(alertDiv, form.firstChild);
            }
        });
    }
});