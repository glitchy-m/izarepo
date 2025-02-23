(function(){
    // ------------------------
    // Helper Functions
    // ------------------------
    
    // Converts "HH:MM" into total minutes since midnight.
    function timeToMinutes(t) {
      var parts = t.split(":");
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
    
    // Formats a time string ("HH:MM") into 12-hour format with AM/PM.
    function format12Hr(t) {
      var parts = t.split(":");
      var h = parseInt(parts[0], 10),
          m = parseInt(parts[1], 10),
          ampm = (h >= 12 ? "PM" : "AM");
      h = h % 12;
      if (h === 0) h = 12;
      return h + ":" + (m < 10 ? "0" + m : m) + " " + ampm;
    }
    
    // Computes the effective school day (a value 1–6) based on jsonData.startDate,
    // subtracting holidays and applying a day offset if the time is >= 18:00.
    // Accepts an optional date parameter (as a string or Date object) to compute the effective day for that date.
    function getEffectiveDay(jsonData, date) {
      var now = date ? new Date(date) : new Date();
      var startDate = new Date(jsonData.startDate);
      var holidayCount = 0;
      if (jsonData["holiday-dates"]) {
        jsonData["holiday-dates"].forEach(function(ds){
          var holiday = new Date(ds);
          if (holiday >= startDate && holiday < now) {
            holidayCount++;
          }
        });
      }
      var dayOffset = now.getHours() >= 18 ? -1 : 0;
      var daysBetween = Math.floor((now - startDate) / (1000 * 60 * 60 * 24)) + dayOffset;
      var effectiveDays = daysBetween - holidayCount;
      return ((effectiveDays % 6) + 6) % 6 + 1;
    }
    
    // ------------------------
    // Constants & View Determination
    // ------------------------
    
    var breakTimes = ["09:00", "10:05", "14:00"],
        afterSchoolStart = 15 * 60 + 15, // 3:15 PM in minutes
        morningEnd = 7 * 60;           // 7:00 AM in minutes
    
    var now = new Date(),
        currentMinutes = now.getHours() * 60 + now.getMinutes(),
        weekday = now.getDay(), // Sunday = 0, Saturday = 6
        viewType = "";
    
    // Determine the view based on current time and day.
    if (weekday === 0 || weekday === 6) {
      viewType = "weekend";
    } else if (currentMinutes >= afterSchoolStart || currentMinutes < morningEnd) {
      viewType = "afterSchool";
    } else {
      viewType = "main";
    }
    
    var container = document.getElementById("container");
    
    // ------------------------
    // Fetch schedule.json and Build the Page Content
    // ------------------------
    
    fetch("schedule.json")
      .then(function(resp){ return resp.json(); })
      .then(function(jsonData){
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
        
        // ------------------------
        // Weekend View: Determine Monday’s schedule based on the last school day.
        // ------------------------
        if(viewType === "weekend"){
          // Compute the effective day for the last school day:
          // If today is Saturday, assume last school day was Friday.
          // If today is Sunday, assume last school day was Friday (i.e., subtract 2 days).
          var lastSchoolDate = new Date(now);
          if(now.getDay() === 6) {
            lastSchoolDate.setDate(now.getDate() - 1);
          } else if(now.getDay() === 0) {
            lastSchoolDate.setDate(now.getDate() - 2);
          }
          var effectiveDay = getEffectiveDay(jsonData, lastSchoolDate);
          // Next day in rotation (Monday's schedule) is computed as (effectiveDay % 6) + 1.
          var nextDay = (effectiveDay % 6) + 1;
          
          html += '<div class="white-bubble">';
          html += '<h1>Have a great weekend!</h1>';
          html += '<div style="margin-top:10px; font-size:1.3rem;">Classes start on <b>Monday</b>.</div>';
          html += '<div style="margin-top:10px; font-size:1.2rem;">Monday\'s classes are:</div>';
          html += '</div>';
          
          var mondaySchedule = jsonData.schedule["day" + nextDay];
          if(mondaySchedule){
            mondaySchedule = mondaySchedule.filter(function(c){ return !/break/i.test(c.class); });
            html += '<div class="pills-container">';
            mondaySchedule.forEach(function(c){
              var label = abbreviations[c.class] || c.class;
              if(c.class === "PE") {
                html += '<div class="pill pe-pill">' + label + '</div>';
              } else {
                html += '<div class="pill">' + label + '</div>';
              }
            });
            html += '</div>';
          }
        }
        // ------------------------
        // After-School View
        // ------------------------
        else if(viewType === "afterSchool"){
          var currentDay = getEffectiveDay(jsonData);
          var nextDay = (currentDay === 6) ? 1 : currentDay + 1;
          html += '<div class="white-bubble">';
          html += '<h1>The day is over!</h1>';
          html += '<div style="margin-top:10px; font-size:1.3rem;">Next Day: <b>Day ' + nextDay + '</b></div>';
          html += '<div style="margin-top:10px; font-size:1.2rem;">Tomorrow\'s classes are:</div>';
          html += '</div>';
          var tomorrowSchedule = jsonData.schedule["day" + nextDay];
          if(tomorrowSchedule){
            tomorrowSchedule = tomorrowSchedule.filter(function(c){ return !/break/i.test(c.class); });
            html += '<div class="pills-container">';
            tomorrowSchedule.forEach(function(c){
              var label = abbreviations[c.class] || c.class;
              if(c.class === "PE"){
                html += '<div class="pill pe-pill">' + label + '</div>';
              } else {
                html += '<div class="pill">' + label + '</div>';
              }
            });
            html += '</div>';
          }
        }
        // ------------------------
        // Main View (Normal School Day)
        // ------------------------
        else { // viewType === "main"
          var currentDay = getEffectiveDay(jsonData);
          var dayKey = "day" + currentDay;
          var todaysSchedule = jsonData.schedule[dayKey];
          var currentClass = null;
          for(var i = 0; i < todaysSchedule.length; i++){
            var classStart = timeToMinutes(todaysSchedule[i].time);
            var nextClassStart = (todaysSchedule[i+1]) ? timeToMinutes(todaysSchedule[i+1].time) : 24*60;
            if(classStart <= currentMinutes && currentMinutes < nextClassStart){
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
          for(var j = 0; j < breakTimes.length; j++){
            var bMins = timeToMinutes(breakTimes[j]);
            if(bMins > currentMinutes){
              nextBreakMins = bMins - currentMinutes;
              break;
            }
          }
          var breakText = "";
          if(nextBreakMins !== null){
            if(nextBreakMins <= 5) breakText = "It’s break time!";
            else if(nextBreakMins >= 55 && nextBreakMins <= 65) breakText = "Break is in an hour";
            else breakText = "Break is in " + nextBreakMins + " minutes.";
          } else {
            breakText = "No more breaks today.";
          }
          var topStatusText = currentClass ?
            "You’re having <strong>" + currentClass.class + "</strong>. " + breakText :
            "No current class (Break/Lunch). " + breakText;
          html += '<div id="topStatus" style="font-size:1.2rem; text-align:center; margin-bottom:20px;">' + topStatusText + '</div>';
          if(nextClass){
            html += '<div class="white-bubble" id="mainBubble">' +
                      '<div class="main-line">' + nextClass.class + ' is next!</div>' +
                      '<div class="sub-line">Be there at: ' + format12Hr(nextClass.time) + ', ' + nextClass.building + '</div>' +
                    '</div>';
          }
          if(nextNextClass){
            html += '<div class="reflected-bubble" id="nextNextBubble">' +
                      '<div class="main-line">' + nextNextClass.class + '</div>' +
                      '<div class="sub-line">Be there at: ' + format12Hr(nextNextClass.time) + ', ' + nextNextClass.building + '</div>' +
                    '</div>';
          }
        }
        container.innerHTML = html;
      })
      .catch(function(err) {
        console.error("Error fetching schedule:", err);
        container.innerHTML = "Error fetching schedule.";
      });
  })();
  
