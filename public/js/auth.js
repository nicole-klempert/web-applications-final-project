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
        // show both passwords as text
        pass1.type = "text";
        pass2.type = "text";
    } else {
        // hide both passwords 
        pass1.type = "password";
        pass2.type = "password";
    }
}

// check if passwords match
function checkPasswordsMatch() {
    const pass1 = document.getElementById("new-password");
    const pass2 = document.getElementById("confirm-password");
    const message = document.getElementById("password-match-message");

    // if confirm password is empty
    if (pass2.value === "") {
        message.innerHTML = "";
        pass2.classList.remove("input-error", "input-success");
        return;
    }

    // check if passwords match
    if (pass1.value === pass2.value) {
        message.innerHTML = "Passwords match!";
        message.className = "text-success"; // colors the text in green
        pass2.classList.remove("input-error");
        pass2.classList.add("input-success"); // colors the border in green
    } else {
        message.innerHTML = "Passwords do not match";
        message.className = "text-error"; // colors the text in red
        pass2.classList.remove("input-success");
        pass2.classList.add("input-error"); // colors the border in red
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

            // insert alert at the very top of the container
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
            // if there are any characters that do not match the allowed characters
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

    // real-time checks
    setupRealTimeValidation("username", "username-warning", /^[a-z0-9_.-]*$/);
    setupRealTimeValidation("new-username", "username-warning", /^[a-z0-9_.-]*$/);
    setupRealTimeValidation("email", "email-warning", /^[a-z0-9@._-]*$/);
    setupRealTimeValidation("recovery-answer", "recovery-answer-warning", /^[a-z0-9 ]*$/);

    // passwords (must be English characters, numbers, and symbols)
    const passwordAllowedRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/;
    setupRealTimeValidation("new-password", "new-password-warning", passwordAllowedRegex);
    setupRealTimeValidation("confirm-password", "confirm-password-warning", passwordAllowedRegex);

    // submit form with ajax
    const form = document.querySelector("form");
    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            // Remove previous error/success banners
            const oldAlerts = form.querySelectorAll(".alert-message");
            oldAlerts.forEach(el => el.remove());

            // Block submission if there are validation warnings on input formats
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
                    // show error message without clearing inputs
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
                    // successful action -> redirect
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