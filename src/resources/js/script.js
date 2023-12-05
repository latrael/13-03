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

function loadCommunityCalendar(communityName, eventData) {
  console.log("Community Name:", communityName); // Debugging
  console.log("Event Data:", eventData); // Debugging

  if(calendar) {
    calendar.destroy();
  }
  var calendarElement = document.getElementById('calendar');
  var calendar = new FullCalendar.Calendar(calendarElement, {
      initialView: 'dayGridMonth',
      eventDidMount: function(info) {
        console.log("TESTING TOOLTIP: ", info.event.extendedProps.description);
        var tooltip = new bootstrap.Tooltip(info.el, {
          title: info.event.title,
          placement: 'top',
          trigger: 'hover',
          container: 'body'
        });
      },
      events: eventData
    });
    var calendarTitle = document.getElementById('calendar-name');
    calendarTitle.innerHTML = communityName;
  // Remove all existing events and rerender the calendar
  //calendar.removeAllEvents();
  calendar.render();
}