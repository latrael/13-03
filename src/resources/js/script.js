function initializeContent(){
//   document.addEventListener('DOMContentLoaded', function() {
//   var calendarEl = document.getElementById('calendar');
//   calendar = new FullCalendar.Calendar(calendarEl, {
//     initialView: 'dayGridMonth'
//   });
//   //calendar.render();
//   console.log("Calendar initialized:", window.calendar);
// });

}

function loadCommunityCalendar(communityName) {
  console.log("Community Name:", communityName); // Debugging

  if(calendar) {
    calendar.destroy();
  }
  var calendarElement = document.getElementById('calendar');
  var calendar = new FullCalendar.Calendar(calendarElement, {
      initialView: 'dayGridMonth',
      headerToolbar: {
        start: 'title', // will normally be on the left. if RTL, will be on the right
        center: '',
        end: 'today prev,next' // will normally be on the right. if RTL, will be on the left
      }
    });
    var calendarTitle = document.getElementById('calendar-name');
    calendarTitle.innerHTML = communityName;
  // Remove all existing events and rerender the calendar
  calendar.removeAllEvents();
  calendar.render();
}