require('dotenv').config() //process.env.
const express = require('express')
const app = express()

var request = require("request");
const mysql = require('mysql');
var general = require("./generalFunctions.js")

const tokenCode = process.env.tokenCode; //stg

var d = new Date();
d.setDate(d.getDate() - 90);
const dateStart = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`

var dbConfig = {
  host:  process.env.mySqlHost,
  user: process.env.mySqlUser,
  password: process.env.mySqlPassword,
  database: process.env.mySqlDatabase
}
console.log(dbConfig)

var connection;
function handleDisconnect() {
  connection = mysql.createConnection(dbConfig); // Recreate the connection, since
                                                  // the old one cannot be reused.

  connection.connect(function(err) {              // The server is either down
    if(err) {                                     // or restarting (takes a while sometimes).
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
    }                                     // to avoid a hot loop, and to allow our node script to
  });                                     // process asynchronous requests in the meantime.
                                          // If you're also serving http, display a 503 error.
  connection.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
      handleDisconnect();                         // lost due to either server restart, or a
    } else {                                      // connnection idle timeout (the wait_timeout
      throw err;                                  // server variable configures this)
    }
  });
}
//handleDisconnect();



 app.use(express.json());
 app.use(function(req, res, next) {
   res.header("Access-Control-Allow-Origin", "*");
   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
   next();
 });

app.get('/', function (req, res) {

  var listJobName = []
  var currentJobDuration = []
  var createJson = []
  var workingNowDetails = []
  var allocatedHrs = []
  var jsonDetails = [] //jobcode, job, whoIsWorking, parentId
  var listOfJobsId = ""


//Get Who Is Working
const getWhoIsWorking = function() {
    let promise = new Promise(function(resolve, reject){
      //tsheet select
      var options = { method: 'GET',
        url: 'https://rest.tsheets.com/api/v1/timesheets',
        qs: {
          start_date: general.dtToday(),
          on_the_clock: 'yes',
        },
        headers:
         { 'Authorization': tokenCode },
        json: true  };

      request(options, function (error, response, body) {
        if (error) throw new Error(error);
        if (body.results != null) {
            var workingNow = body.results.timesheets
            var workingNowParent = body.supplemental_data.jobcode

            for(var i = 0; i < Object.keys(workingNow).length;i++){
                var key = Object.keys(workingNow)[i]
                var userName = "";
                var userId = workingNow[key].user_id;

                userName = body.supplemental_data.users[userId].first_name + " " + body.supplemental_data.users[userId].last_name

                indexWorkingNowDetails = workingNowDetails.findIndex(x=>x.jobcode === workingNow[key].jobcode_id)

                var parentJobName = ""
                if (body.supplemental_data.jobcodes[workingNow[key].jobcode_id].parent_id != 0){
                  parentJobName = body.supplemental_data.jobcodes[body.supplemental_data.jobcodes[workingNow[key].jobcode_id].parent_id].name + " > "
                  parentId =  body.supplemental_data.jobcodes[body.supplemental_data.jobcodes[workingNow[key].jobcode_id].parent_id].id

                  // Create parent line if it doesnt exist
                  indexWorkingNowDetailsParent = workingNowDetails.findIndex(x=>x.jobcode === body.supplemental_data.jobcodes[workingNow[key].jobcode_id].parent_id)
                  if(indexWorkingNowDetailsParent == -1){
                      workingNowDetails.push({jobcode: body.supplemental_data.jobcodes[workingNow[key].jobcode_id].parent_id, user: userName})
                      jsonDetails.push({jobcode: body.supplemental_data.jobcodes[workingNow[key].jobcode_id].parent_id, job: body.supplemental_data.jobcodes[body.supplemental_data.jobcodes[workingNow[key].jobcode_id].parent_id].name, whoIsWorking: userName, parentJob:0})
                      listOfJobsId += workingNow[key].jobcode_id + ", "
                  }else{
                      workingNowDetails[indexWorkingNowDetailsParent] = ({jobcode: body.supplemental_data.jobcodes[workingNow[key].jobcode_id].parent_id, user: workingNowDetails[indexWorkingNowDetailsParent].user +", " + userName})
                      jsonDetails[indexWorkingNowDetailsParent] = ({jobcode: body.supplemental_data.jobcodes[workingNow[key].jobcode_id].parent_id, job: body.supplemental_data.jobcodes[body.supplemental_data.jobcodes[workingNow[key].jobcode_id].parent_id].name, whoIsWorking: workingNowDetails[indexWorkingNowDetailsParent].user +", " + userName, parentJob:0})
                  }


                }

                var statusParentJob = 0;
                if (parentJobName != "") {
                  var statusParentJob = 1;
                }

                if(indexWorkingNowDetails == -1){
                    workingNowDetails.push({jobcode: workingNow[key].jobcode_id, user: userName})
                    jsonDetails.push({jobcode: workingNow[key].jobcode_id, job: parentJobName + body.supplemental_data.jobcodes[workingNow[key].jobcode_id].name, whoIsWorking: userName,  parentJob:body.supplemental_data.jobcodes[workingNow[key].jobcode_id].parent_id})
                    listOfJobsId += workingNow[key].jobcode_id + ", "
                }else{
                    workingNowDetails[indexWorkingNowDetails] = ({jobcode: workingNow[key].jobcode_id, user: workingNowDetails[indexWorkingNowDetails].user +", " + userName})
                    jsonDetails[indexWorkingNowDetails] = ({jobcode: workingNow[key].jobcode_id, job: parentJobName + body.supplemental_data.jobcodes[workingNow[key].jobcode_id].name, whoIsWorking: workingNowDetails[indexWorkingNowDetails].user +", " + userName,  parentJob:body.supplemental_data.jobcodes[workingNow[key].jobcode_id].parent_id})
                }








             }//for
        }

      })//request
      //end tsheet
       resolve();
   })
     console.log("#0 getWhoIsWorking")
     console.log(jsonDetails)
     return promise;
   }

//Get AllocatedHrs
const getAllocatedHrs = function() {
  let promise = new Promise(function(resolve, reject){
    setTimeout(function() {
            handleDisconnect()
            connection.query('SELECT * FROM allocatedhrs', (err,rows) => {
              if(err) throw err;

              for (var i = 0; i < rows.length; i++) {
                allocatedHrs.push({jobcode: rows[i].jobcode_id, allocatedHrs: rows[i].allocatedhrs})
              }

              connection.destroy();

            })
           resolve()
           console.log(currentJobDuration)
           console.log("#2 getAllocatedHrs")
    }, 20000)
    })

    return promise
}

//Get Duration
const getJobDuration = function() {

  function readTimeSheets(pageNum) {
    var options = ""
        options = { method: 'GET',
        url: 'https://rest.tsheets.com/api/v1/timesheets',
        qs: {
          start_date: dateStart,
          on_the_clock: 'both',
          jobcode_ids: listOfJobsId,
          page: pageNum
        },
        headers:
          { 'Authorization': tokenCode },
         }; //end options

       request(options, function (error, response, body) {
       if (error) throw new Error(error);
           if (JSON.parse(body).supplemental_data !== undefined ) {
           var dataJson = JSON.parse(body).results.timesheets;
           var dataSuplementalJson = JSON.parse(body).supplemental_data.jobcodes;

                 for(var i = 0; i < Object.keys(dataJson).length;i++){
                    var key = Object.keys(dataJson)[i]
                    var durationValue = 0
                    if (dataJson[key].on_the_clock == true) {
                      var dateStart = dataJson[key].start
                      var a = new Date()
                      serverDateNow = (a.getMonth()+1) + " " + a.getDate() + ", " + a.getFullYear() + " " + a.getHours() + ":" + a.getMinutes() + ":" + a.getSeconds()
                      durationValue = general.calcDuration(serverDateNow, dateStart)/60;
                    } else {
                      durationValue = dataJson[key].duration/60
                    }

                    //console.log(".. " + key)

                    if (dataSuplementalJson[dataJson[key].jobcode_id].parent_id==0) {
                      idJobOfThisTimesheets = dataSuplementalJson[dataJson[key].jobcode_id].id
                    } else {
                      idJobOfThisTimesheets = dataSuplementalJson[dataJson[key].jobcode_id].parent_id
                    }
                    indexCurrentJobDuration = currentJobDuration.findIndex(x=>x.jobcode === idJobOfThisTimesheets)
                    if(indexCurrentJobDuration == -1){
                        currentJobDuration.push({jobcode: idJobOfThisTimesheets, duration: durationValue})
                    }else{
                        currentJobDuration[indexCurrentJobDuration] = {jobcode: idJobOfThisTimesheets, duration: currentJobDuration[indexCurrentJobDuration].duration + durationValue}
                    }

                    // if(indexCurrentJobDuration == -1){
                    //     currentJobDuration.push({jobcode: dataJson[key].jobcode_id, duration: durationValue})
                    // }else{
                    //     currentJobDuration[indexCurrentJobDuration] = {jobcode: dataJson[key].jobcode_id, duration: currentJobDuration[indexCurrentJobDuration].duration + durationValue}
                    // }

                 }//end for
            }

       })//request
  }

    let promise = new Promise(function(resolve, reject){
    setTimeout(function() {
        for (var k = 1; k < 30 ; k++) {
            readTimeSheets(k)
        }
        resolve();

        console.log(listOfJobsId)
        console.log("#1 getJobDuration")
    }, 5000)
    }) //END LET
return promise;
}

//jsonGenerator
const jsonGenerator = function() {
   let promise = new Promise(function(resolve, reject){
      setTimeout(function() {
        for(var i = 0; i < jsonDetails.length; i++) {
                //allocatedHrs //allocatedHrs
                var allocatedHrsValue = 0
                var indexallocatedHrs = allocatedHrs.findIndex(x => x.jobcode == jsonDetails[i].jobcode)

                if (indexallocatedHrs != -1) {
                  allocatedHrsValue = allocatedHrs[indexallocatedHrs].allocatedHrs
                }

                if (allocatedHrsValue===null || allocatedHrsValue ==''){
                  allocatedHrsValue = 0
                }

                if (jsonDetails[i].parentJob == 0) {
                    //duration - currentJobDuration
                    var durationValue = 0
                    var indexCurrentJobDuration = currentJobDuration.findIndex(x => x.jobcode === jsonDetails[i].jobcode)
                    if (indexCurrentJobDuration != -1) {
                      durationValue = Math.floor(currentJobDuration[indexCurrentJobDuration].duration)
                    }
                    if (durationValue===null || durationValue ==''){
                      durationValue = 0
                    }

                    //who is workingNow
                    var userNameWorking = "-"

                    var indexWorkingNowDetails = workingNowDetails.findIndex(x => x.jobcode === jsonDetails[i].jobcode)
                    if (indexWorkingNowDetails != -1) {
                      userNameWorking = workingNowDetails[indexWorkingNowDetails].user
                    }

                    createJson.push({jobcode: jsonDetails[i].jobcode,
                               job: jsonDetails[i].job,
                               allocatedHrs: general.formatTime(allocatedHrsValue),
                               countTime: general.formatTime(durationValue),
                               whoIsWorking: jsonDetails[i].whoIsWorking,
                               percentDone: Math.floor((durationValue*100)/allocatedHrsValue),
                               orderby: durationValue,
                               parentJob: jsonDetails[i].parentJob
                               })
                }

          }
          createJson.sort(function(a, b){
              if(a.job < b.job) { return -1; }
              if(a.job > b.job) { return 1; }
              return 0;
          })

         //console.log(userNameWorking)
      resolve();
      console.log("#3 jsonGenerator")
    }, 2000); //40000
  })
    return promise;
  }

const sendJson = function() {
    let promise = new Promise(function(resolve, reject){
          setTimeout(function() {
           res.json(createJson);
           console.log("#4 sendJson")
           connection.destroy();
           console.log("#5 connection.destroy()")
       }, 2000);
    })
    return promise;
  }





getWhoIsWorking() //FEITO
     .then(getJobDuration)
     .then(getAllocatedHrs)
     .then(jsonGenerator)
     .then(sendJson)

})


var allocatedHrs1 = "0"
const getAllocatedHrsFromDb = function(a) {
  let promise = new Promise(function(resolve, reject){
      handleDisconnect();
      connection.query("SELECT * FROM allocatedhrs where jobcode_id='" + a + "'", (err,rows) => {
      if(err) throw err;
      if (rows.length == 1){
          allocatedHrs1 = rows[0].allocatedhrs

          connection.destroy();
      }
    })

           resolve()
    })

    return promise
}

app.get('/AllocatedHrs/:jobcode_id', function(req, res) {

  var options = { method: 'GET',
  url: 'https://rest.tsheets.com/api/v1/jobcodes',
  qs: {
    ids: req.params.jobcode_id
  },
  headers:
   { 'Authorization': tokenCode },
 json:true };

request(options, function (error, response, body) {
  if (error) throw new Error(error);

  var jobName = body.results.jobcodes[req.params.jobcode_id].name

  getAllocatedHrsFromDb(req.params.jobcode_id)
    .then(
      setTimeout(function() {
      res.json({jobcode: req.params.jobcode_id, AllocatedHrs: general.formatTime(allocatedHrs1), JobName: jobName})
    },500)
    )

  });

})

// Access the parse results as request.body
app.post('/AllocatedHrs/edit/', function(req, res){
   var jobIdValue = req.body.jobid
   var jobAllocatedHrs = req.body.allocated_hrs

   var splitJobAllocated = jobAllocatedHrs.split(":");
   var minJobAllocated = (parseInt(splitJobAllocated[0]) * 60) + parseInt(splitJobAllocated[1])

   if (!Number.isInteger(minJobAllocated)) {
     minJobAllocated=0
   }
   handleDisconnect();
   connection.query("Select * from allocatedhrs where  jobcode_id = '" + jobIdValue + "'", (err,rows) => {
    if(err) throw err;
    if (rows.length == 1){
        connection.query("Update allocatedhrs set allocatedhrs = '" + minJobAllocated + "' where jobcode_id = '" + jobIdValue + "'", (err,rows) => {
        if(err) throw err;
        console.log("updated")
        connection.destroy();})
    } else {
       connection.query("Insert into allocatedhrs (jobcode_id, allocatedhrs) values ('" + jobIdValue + "','" + minJobAllocated + "')", (err,rows) => {
       if(err) throw err;
       console.log("inserted")
       connection.destroy();})
     }

  })

});

app.listen(8080, function(){
  console.log("Server Started on Port 8080");
})
