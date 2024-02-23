// notification.js

// Function to display a notification message
function displayNotification(message) {
  // Create a new div element for the notification
  const notification = document.createElement('div');
  notification.classList.add('notification');
  notification.textContent = message;

  // Add the notification to the page
  document.body.appendChild(notification);

  // Remove the notification after 3 seconds
  setTimeout(() => {
    notification.remove();
  }, 3000);
}
