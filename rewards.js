/**
 * Handles the reward distribution and display
 */

// Total reward to distribute across all questions
const TOTAL_REWARD = 559.51;
const NUM_QUESTIONS = 11;

// Create audio element for money sound
const moneySound = new Audio('https://spikebet.cloud/eric/media/dinheiro.mp3');

// Generate random reward distribution that sums to exactly TOTAL_REWARD
function generateRewards() {
  const rewards = [];
  let remainingTotal = TOTAL_REWARD;
  let remainingQuestions = NUM_QUESTIONS;
  
  // Generate random values for each question
  for (let i = 0; i < NUM_QUESTIONS; i++) {
    if (i === NUM_QUESTIONS - 1) {
      // Last question gets the remaining amount to ensure exact total
      rewards.push(remainingTotal);
    } else {
      // Calculate a random portion of the remaining total
      const maxPortion = remainingTotal / remainingQuestions * 1.5;
      const minPortion = remainingTotal / remainingQuestions * 0.5;
      
      const reward = getRandomNumber(minPortion, maxPortion);
      const roundedReward = Math.round(reward * 100) / 100; // Round to 2 decimal places
      
      rewards.push(roundedReward);
      remainingTotal -= roundedReward;
      remainingQuestions--;
    }
  }
  
  // Shuffle the rewards for added randomness (except the last one, which is fixed)
  const shuffledRewards = shuffleArray(rewards.slice(0, -1));
  shuffledRewards.push(rewards[rewards.length - 1]);
  
  return shuffledRewards;
}

// Reward modal handling
const rewardModal = document.getElementById('reward-modal');
const rewardValue = document.getElementById('reward-value');
const continueRewardBtn = document.getElementById('continue-reward-btn');
const currentBalance = document.getElementById('current-balance');
const finalModal = document.getElementById('final-modal');
const totalReward = document.getElementById('total-reward');
const restartBtn = document.getElementById('restart-btn');

// Initialize rewards
let rewards = generateRewards();
let totalEarned = 0;

// Animate number counting
function animateValue(element, start, end, duration) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const current = progress * (end - start) + start;
    element.textContent = formatCurrency(current);
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

// Show the reward modal with animation and confetti
function showReward(questionIndex) {
  const reward = rewards[questionIndex];
  totalEarned += reward;
  
  // Update the current balance with animation
  animateValue(currentBalance, totalEarned - reward, totalEarned, 1000);
  
  // Update the reward value in the modal with animation
  rewardValue.textContent = "0.00";
  
  // Show the modal with animation
  rewardModal.classList.add('active');
  setTimeout(() => {
    // Start confetti animation and play money sound
    startConfetti();
    moneySound.play();
    // Animate the reward value counting up
    animateValue(rewardValue, 0, reward, 1000);
  }, 100);
  
  // Add bounce animation to the reward amount
  animateElement(document.querySelector('.reward-amount'), 'bounce');
}

// Hide the reward modal
function hideReward() {
  rewardModal.classList.remove('active');
  stopConfetti();
}

// Show the final modal
function showFinalReward() {
  // Ensure the total reward displayed is exactly the TOTAL_REWARD
  totalReward.textContent = "0.00";
  
  finalModal.classList.add('active');
  setTimeout(() => {
    // Start confetti animation and play money sound
    startConfetti();
    moneySound.play();
    // Animate the final reward value counting up
    animateValue(totalReward, 0, TOTAL_REWARD, 2000);
  }, 100);
  
  // Add bounce animation to the final reward amount
  animateElement(document.querySelector('.final-content .reward-amount'), 'bounce');
}

// Hide the final modal
function hideFinalReward() {
  finalModal.classList.remove('active');
  stopConfetti();
}

// Event listeners
continueRewardBtn.addEventListener('click', () => {
  hideReward();
  nextQuestion();
});

restartBtn.addEventListener('click', () => {
  hideFinalReward();
  showPage('withdraw');
});