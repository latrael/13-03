function initializeContent(eventData){
  //   document.addEventListener('DOMContentLoaded', function() {
  //   var calendarEl = document.getElementById('calendar');
  //   calendar = new FullCalendar.Calendar(calendarEl, {
  //     initialView: 'dayGridMonth'
  //   });
  //   //calendar.render();
  //   console.log("Calendar initialized:", window.calendar);
  // });
  console.log("Event Data:", eventData); // Debugging
  
  if(calendar) {
    calendar.destroy();
  }
  var calendarElement = document.getElementById('calendar');
  var calendar = new FullCalendar.Calendar(calendarElement, {
      initialView: 'dayGridMonth',
      eventClick: function(info) {
        var eventObj = info.event;
        console.log(info.event);
        document.getElementById('modalTitleHome').innerHTML = info.event.title;
        document.getElementById('descriptionHome').innerHTML = info.event.extendedProps.description;
        document.getElementById('eventidHome').value = info.event.id;
        document.getElementById('startHome').innerHTML = "Start: "+ info.event.start;
        document.getElementById('endHome').innerHTML = "End: "+ info.event.end;
        if(info.event.extendedProps.status == 'false'){
            document.getElementById('joinHome').style.display = "inline-block";
            document.getElementById('leaveHome').style.display = "none";
        }
        else{
            document.getElementById('leaveHome').style.display = "inline-block";
            document.getElementById('joinHome').style.display = "none";
        }
        //document.getElementById('description').innerHTML = info.event.extendedProps.location; 
        $("#myModal").modal("toggle");
        
    },
      // eventDidMount: function(info) {
      //   console.log("TESTING TOOLTIP: ", info.event.extendedProps.description);
      //   var tooltip = new bootstrap.Tooltip(info.el, {
      //     title: info.event.title,
      //     placement: 'top',
      //     trigger: 'hover',
      //     container: 'body'
      //   });
      // },
      events: eventData
    });
  // Remove all existing events and rerender the calendar
  //calendar.removeAllEvents();
  calendar.render();
  }
  
  function loadCommunityCalendar(communityName, eventData) {
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
    // Remove all existing events and rerender the calendar
    //calendar.removeAllEvents();
    calendar.render();
  }