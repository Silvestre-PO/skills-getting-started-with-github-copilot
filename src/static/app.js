document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Genera la lista de participantes
        const participantsList = details.participants.length
          ? details.participants.map((participant) => `<li>${participant}</li>`).join("")
          : "<li>No participants yet</li>";

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div>
            <strong>Participants:</strong>
            <ul style="list-style-type: none; padding: 0;">
              ${details.participants.map((participant) => `
                <li style="display: flex; align-items: center;">
                  <span>${participant}</span>
                  <button class="delete-participant" data-activity="${name}" data-participant="${participant}" style="margin-left: 10px; background: none; border: none; color: red; cursor: pointer;">&times;</button>
                </li>
              `).join("")}
            </ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Agrega la opción al dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        fetchActivities(); // Refresh the activities list dynamically
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Add event listener for delete buttons
  document.addEventListener("click", async (event) => {
    if (event.target.classList.contains("delete-participant")) {
      const button = event.target;
      const activity = button.getAttribute("data-activity");
      const participant = button.getAttribute("data-participant");

      try {
        const response = await fetch(`/activities/${encodeURIComponent(activity)}/remove?email=${encodeURIComponent(participant)}`, {
          method: "POST",
        });

        if (response.ok) {
          alert(`Removed ${participant} from ${activity}`);
          fetchActivities(); // Refresh the activities list
        } else {
          const result = await response.json();
          alert(result.detail || "Failed to remove participant.");
        }
      } catch (error) {
        console.error("Error removing participant:", error);
        alert("An error occurred. Please try again.");
      }
    }
  });

  // Initialize app
  fetchActivities();
});
