(function(){
    // ------------------------
    // Helper Functions
    // ------------------------
    
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
    
    var breakTimes = ["09:00", "10:05", "12:30", "14:00"],
        afterSchoolStart = 15 * 60 + 15;

    var now = new Date(),
        currentMinutes = now.getHours() * 60 + now.getMinutes(),
        weekday = now.getDay(),
        viewType = "";

    if (weekday === 0 || weekday === 6) {
      viewType = "weekend";
    } else if (currentMinutes >= afterSchoolStart) {
      viewType = "afterSchool";
    } else {
      viewType = "main";
    }

    var container = document.getElementById("container");

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
        // Set the day manually
        // ------------------------
        var currentDay = 6; // Change this to set the desired fixed day (1-6)
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
                      '<div class="main-line" style="font-size: 120%;"><b>' + nextClass.class + ' is next!<b></div>' +
                      '<div class="sub-line">Be there at: ' + format12Hr(nextClass.time) + ', ' + nextClass.building + '</div>' +
                    '</div>';
        }
        
        if(nextNextClass){
            html += '<div class="reflected-bubble" id="nextNextBubble">' +
                      '<div class="main-line">' + nextNextClass.class + '</div>' +
                      '<div class="sub-line">Be there at: ' + format12Hr(nextNextClass.time) + ', ' + nextNextClass.building + '</div>' +
                    '</div>';
        }
        
        container.innerHTML = html;
      })
      .catch(function(err) {
        console.error("Error fetching schedule:", err);
        container.innerHTML = "Error fetching schedule.";
      });
})();
