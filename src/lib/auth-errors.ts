export function getAuthErrorMessage(error: unknown) {
  if (typeof error === "object" && error && "code" in error) {
    const code = String(error.code);

    switch (code) {
      case "auth/email-already-in-use":
        return "An account with this email already exists.";
      case "auth/invalid-email":
        return "Enter a valid email address.";
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Incorrect email or password.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      case "auth/popup-closed-by-user":
        return "Google sign-in was cancelled.";
      case "auth/popup-blocked":
        return "The sign-in popup was blocked. Allow popups and try again.";
      case "auth/operation-not-allowed":
        return "This sign-in method is not enabled in Firebase Auth.";
      default:
        break;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}
