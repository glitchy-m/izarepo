(function(){
  // Helper function to convert time string (HH:MM) to minutes since midnight
  function timeToMinutes(t) {
    var parts = t.split(":");
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  // Helper function to format time to 12-hour format (HH:MM AM/PM)
  function format12Hr(t) {
    var parts = t.split(":");
    var h = parseInt(parts[0], 10),
        m = parseInt(parts[1], 10),
        ampm = (h >= 12 ? "PM" : "AM");
    h = h % 12;
    if (h === 0) h = 12;
    return h + ":" + (m < 10 ? "0" + m : m) + " " + ampm;
  }

  // Abbreviations for class names
  var abbreviations = {
    "Chromebook Pick-up and Attendance": "Attendance",
    "Structured Individualized Learning": "SIL",
    "Independent Study & Research": "IS&R",
    "Science & Tech": "Science",
    "Digital Art": "Digital Arts",
    "Fine Art": "Fine Art",
    "Belizean Studies": "Belizean Studies",
    "Language Arts": "Language Arts",
    "Quantitative Reasoning": "QR",
    "Sustainable Development Projects": "SDP",
    "Super Teams & Intramurals": "Super Teams",
    "Classroom Cleanup & Duties": "Dismissal",
    "Advisory / Life Skills": "Advisory",
    "Maker": "Maker",
    "Seminar": "Seminar",
    "PE": "PE",
    "Assembly": "Assembly",
    "Lunch": "Lunch"
  };

  // Function to calculate the school day (1-6) based on a calendar date
  // It uses today's date and the current-day from JSON as a reference point.
  function getDateDay(selectedDate, todayDate, currentDayInJson, holidayDates) {
      let selectedMs = selectedDate.setHours(0,0,0,0);
      let todayMs = todayDate.setHours(0,0,0,0);
      let msPerDay = 24 * 60 * 60 * 1000;

      // If the selected date is today, return the current day from JSON
      if (selectedMs === todayMs) {
          return currentDayInJson;
      }

      let diffDays = Math.round((selectedMs - todayMs) / msPerDay);
      let schoolDaysOffset = 0;

      let currentDateIterator = new Date(todayMs);

      // Iterate through days to count effective school days
      if (diffDays > 0) { // Future date
          for (let i = 0; i < diffDays; i++) {
              currentDateIterator.setDate(currentDateIterator.getDate() + 1); // Move to next day
              const dayOfWeek = currentDateIterator.getDay();
              const dateString = currentDateIterator.toISOString().substring(0, 10);
              // Only count if it's not a weekend (0=Sun, 6=Sat) and not a holiday
              if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.includes(dateString)) {
                  schoolDaysOffset++;
              }
          }
      } else { // Past date
          for (let i = 0; i > diffDays; i--) {
              currentDateIterator.setDate(currentDateIterator.getDate() - 1); // Move to previous day
              const dayOfWeek = currentDateIterator.getDay();
              const dateString = currentDateIterator.toISOString().substring(0, 10);
              // Only count if it's not a weekend and not a holiday
              if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.includes(dateString)) {
                  schoolDaysOffset--;
              }
          }
      }

      // Calculate the school day number (1-6)
      let calculatedDay = (currentDayInJson - 1 + schoolDaysOffset) % 6;
      if (calculatedDay < 0) {
          calculatedDay += 6; // Adjust for negative modulo results
      }
      return calculatedDay + 1;
  }

  // Function to render the schedule table for a given day
  function renderScheduleTable(dayNumber, scheduleData) {
    const dayLabel = document.getElementById("day-label");
    const tableBody = document.getElementById("schedule-body");

    const dayKey = `day${dayNumber}`;
    const todaySchedule = scheduleData.schedule?.[dayKey];

    if (!Array.isArray(todaySchedule) || todaySchedule.length === 0) {
      dayLabel.textContent = `No schedule found for Day ${dayNumber}.`;
      tableBody.innerHTML = `<tr><td colspan="3">No classes scheduled for this day.</td></tr>`;
      return;
    }

    dayLabel.textContent = `Schedule for Day ${dayNumber}`;
    tableBody.innerHTML = ""; // Clear previous entries

    for (const cls of todaySchedule) {
      const row = document.createElement("tr");
      const className = abbreviations[cls.class] || cls.class; // Use abbreviation if available
      row.innerHTML = `
        <td>${format12Hr(cls.time)}</td>
        <td>${className}</td>
        <td>${cls.building}</td>
      `;
      tableBody.appendChild(row);
    }
  }

  // Main application logic
  Promise.all([
    fetch("schedule.json").then(resp => resp.json()), // Fetch schedule data
    fetch("current-day.json").then(resp => resp.json()) // Fetch current day data
  ])
  .then(function([scheduleJson, currentDayJson]){
    const today = new Date();
    const currentDayInJson = parseInt(currentDayJson["current-day"], 10);
    const holidayDates = scheduleJson["holiday-dates"] || [];

    // Initialize Flatpickr
    const datePicker = document.getElementById("date-picker");
    flatpickr(datePicker, {
        defaultDate: today, // Set default date to today
        dateFormat: "Y-m-d",
        disableWeekends: true, // Disable weekends
        onChange: function(selectedDates, dateStr, instance) {
            if (selectedDates.length > 0) {
                const selectedDate = selectedDates[0];
                const calculatedDay = getDateDay(selectedDate, today, currentDayInJson, holidayDates);
                renderScheduleTable(calculatedDay, scheduleJson);
            }
        },
        onReady: function(selectedDates, dateStr, instance) {
            // Initial render for today's schedule when Flatpickr is ready
            if (selectedDates.length > 0) {
                const selectedDate = selectedDates[0];
                const calculatedDay = getDateDay(selectedDate, today, currentDayInJson, holidayDates);
                renderScheduleTable(calculatedDay, scheduleJson);
            }
        }
    });
  })
  .catch(function(err) {
    console.error("Error loading schedule data:", err);
    document.getElementById("day-label").textContent = "Error loading schedule data.";
    document.getElementById("schedule-body").innerHTML = `<tr><td colspan="3">Could not load school schedule.</td></tr>`;
  });
})();
