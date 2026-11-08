/**
 * Main application initialization
 */

// Initialize the quiz
document.addEventListener('DOMContentLoaded', () => {
  // Start with the first question
  renderQuestion(0);
  
  // Initialize pages navigation
  initializePages();
});