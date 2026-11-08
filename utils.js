/**
 * Utility functions for the quiz application
 */

// Format number as currency (R$)
function formatCurrency(value) {
  return parseFloat(value).toFixed(2);
}

// Generate a random number between min and max (inclusive)
function getRandomNumber(min, max) {
  return Math.random() * (max - min) + min;
}

// Shuffle an array randomly (Fisher-Yates algorithm)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Update progress bar
function updateProgressBar(currentQuestion, totalQuestions) {
  const progressBar = document.getElementById('progress-bar');
  const progressPercentage = ((currentQuestion) / totalQuestions) * 100;
  progressBar.style.width = `${progressPercentage}%`;
}

// Format large numbers with commas
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Add animation class and remove it after animation completes
function animateElement(element, animationClass) {
  element.classList.add(animationClass);
  
  element.addEventListener('animationend', function() {
    element.classList.remove(animationClass);
  }, { once: true });
}