exports.dtToday = function() {
  var today = new Date();
  var dd = today.getDate();
  var mm = today.getMonth() + 1; //January is 0!

  var yyyy = today.getFullYear();
  if (dd < 10) {
    dd = '0' + dd;
  }
  if (mm < 10) {
    mm = '0' + mm;
  }
    var today = yyyy + '-' + mm + '-' + dd ;
    return today;
}

exports.calcDuration = function(dateEnd, dateStart) {

  date1 = new Date(dateEnd); //end "May 19, 2019 09:03:38"
  date2 = new Date(dateStart); //start

  var res = Math.abs(date1 - date2) / 1000;
  var seconds = res;
  return seconds;

}

exports.formatDate = function(a) {
  //  a = 2019-05-19T05:09:52+10:00"
  var yyyy = a.substr(0, 4) //year
  var mm = a.substr(5, 2) //month
  var dd = a.substr(8, 2) //day
  var hh = a.substr(11, 2) //hour
  var min = a.substr(14, 2) //minute
  var ss = a.substr(17, 2) //second
  return dtFomatted = mm + " " + dd + ", " + yyyy + " " + hh + ":" + min + ":" + ss
}

//convert minute to HH:MM
exports.formatTime = function(varMinute) {
  if(isNaN(varMinute)) {
    return "00:00"
  }else{
    hours = varMinute/60
    minutes = Math.floor((hours % 1) * 60)

    leftZero = ":"
    if (minutes < 10) {
      leftZero = ":0"
    }

    showFormated = Math.floor(hours)+leftZero+minutes
    if (hours < 10) {
      showFormated = "00"+showFormated
    } else if(hours < 100) {
      showFormated = "0"+showFormated
    }

    return showFormated
  }
}
