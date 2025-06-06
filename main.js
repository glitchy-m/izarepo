(function(){
  // Helper function to calculate the schedule day (day1-day6) for a given calendar date
  // considering a start date and skipping weekends/holidays.
  function calculateScheduleDay(selectedDateStr, startDateStr, holidayDates) {
      const selectedDate = new Date(selectedDateStr + 'T00:00:00');
      const startDate = new Date(startDateStr + 'T00:00:00');

      // If selected date is before the start date, it's not part of this cycle.
      if (selectedDate < startDate) {
          return null;
      }

      let schoolDaysCount = 0;
      let currentDate = new Date(startDate);

      while (currentDate.getTime() <= selectedDate.getTime()) {
          const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
          const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
          const currentDateISO = currentDate.toISOString().substring(0, 10);
          const isHoliday = holidayDates.includes(currentDateISO);

          if (!isWeekend && !isHoliday) {
              schoolDaysCount++;
          }
          currentDate.setDate(currentDate.getDate() + 1); // Move to the next day
      }

      // If no school days were counted, it means the selected day (or days leading to it) were all non-school days.
      if (schoolDaysCount === 0) {
          return null; // Indicates no school day schedule for this date
      }

      // The day in the 6-day cycle (1 to 6)
      const dayInCycle = (schoolDaysCount - 1) % 6 + 1;
      return dayInCycle;
  }

  function timeToMinutes(t) {
    var parts = t.split(":");
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  function format12Hr(t) {
    var parts = t.split(":");
    var h = parseInt(parts[0], 10),
        m = parseInt(parts[1], 10),
        ampm = (h >= 12 ? "PM" : "AM");
    h = h % 12;
    if (h === 0) h = 12;
    return h + ":" + (m < 10 ? "0" + m : m) + " " + ampm;
  }

  var breakTimes = ["09:00", "10:05", "11:20", "12:30", "14:00"],
      afterSchoolStart = 15 * 60 + 15;

  var now = new Date(),
      currentMinutes = now.getHours() * 60 + now.getMinutes(),
      weekday = now.getDay(); // 0 = Sunday, 6 = Saturday

  var container = document.getElementById("container");

  Promise.all([
    fetch("schedule.json").then(resp => resp.json()),
  ])
  .then(function([jsonData]){
    var html = "";
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

    // Calculate currentDay based on actual date and schedule.json's startDate
    const todayISO = now.toISOString().substring(0, 10);
    const startDate = jsonData.startDate;
    const holidayDates = jsonData['holiday-dates'] || [];

    const currentDay = calculateScheduleDay(todayISO, startDate, holidayDates); // This will be null if it's a weekend/holiday

    let viewType = "";
    if (weekday === 0 || weekday === 6) { // Actual weekend
      viewType = "weekend";
    } else if (currentDay === null) { // Actual holiday that is not a weekend
        viewType = "holiday"; // Custom viewType for holidays
    } else if (currentMinutes >= afterSchoolStart) {
      viewType = "afterSchool";
    } else {
      viewType = "main";
    }

    if (viewType === "weekend" || viewType === "holiday") {
        let message = "It's the weekend! No school schedule today.";
        if (viewType === "holiday") {
            message = "It's a holiday! No school schedule today.";
        }
        container.innerHTML = '<div style="font-size:1.2rem; text-align:center; margin-bottom:20px;">' + message + '</div>';
        return;
    }

    // Continue with schedule display only if it's a school day
    var dayKey = "day" + currentDay;
    var todaysSchedule = jsonData.schedule[dayKey];

    if (!todaysSchedule || !Array.isArray(todaysSchedule)) {
        // This case should ideally not happen if calculateScheduleDay returned a valid day
        container.innerHTML = "Something went wrong loading the schedule for this day.";
        return;
    }

    var currentClass = null;

    for (var i = 0; i < todaysSchedule.length; i++) {
      var classStart = timeToMinutes(todaysSchedule[i].time);
      var nextClassStart = (todaysSchedule[i+1]) ? timeToMinutes(todaysSchedule[i+1].time) : 24*60;
      if (classStart <= currentMinutes && currentMinutes < nextClassStart) {
        currentClass = todaysSchedule[i];
        break;
      }
    }

    var upcomingClasses = todaysSchedule.filter(function(c){
      return timeToMinutes(c.time) > currentMinutes;
    });
    var nextClass = upcomingClasses[0] || null;
    var nextNextClass = upcomingClasses[1] || null;
    var nextBreakMins = null;

    for (var j = 0; j < breakTimes.length; j++) {
      var bMins = timeToMinutes(breakTimes[j]);
      if (bMins > currentMinutes) {
        nextBreakMins = bMins - currentMinutes;
        break;
      }
    }

    var breakText = "";
    if (nextBreakMins !== null) {
      if (nextBreakMins <= 5) breakText = "It’s break time!";
      else if (nextBreakMins >= 55 && nextBreakMins <= 65) breakText = "Break is in an hour.";
      else breakText = "Break is in " + nextBreakMins + " minutes.";
    } else {
      breakText = "No more breaks today.";
    }

    var topStatusText = currentClass ?
      "You’re having <strong>" + currentClass.class + "</strong>. " + breakText :
      "No current class (Break/Lunch). " + breakText;

    html += '<div id="topStatus" style="font-size:1.2rem; text-align:center; margin-bottom:20px;">' + topStatusText + '</div>';

    if (nextClass) {
      html += '<div class="white-bubble" id="mainBubble">' +
                '<div class="main-line" style="font-size: 120%;"><b>' + nextClass.class + ' is next!<b></div>' +
                '<div class="sub-line">Be there at: ' + format12Hr(nextClass.time) + ', ' + nextClass.building + '</div>' +
              '</div>';
    }

    if (nextNextClass) {
      html += '<div class="reflected-bubble" id="nextNextBubble">' +
                '<div class="main-line">' + nextNextClass.class + '</div>' +
                '<div class="sub-line">Be there at: ' + format12Hr(nextNextClass.time) + ', ' + nextNextClass.building + '</div>' +
              '</div>';
    }

    container.innerHTML = html;
  })
  .catch(function(err) {
    console.error("Error:", err);
    container.innerHTML = "Something went wrong loading the schedule.";
  });
})();
