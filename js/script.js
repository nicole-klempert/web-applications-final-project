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

// chec
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
