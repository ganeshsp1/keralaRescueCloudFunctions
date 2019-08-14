
const functions = require('firebase-functions');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;


const admin = require('firebase-admin');
admin.initializeApp();


exports.scheduledAPICheckFunction = functions.pubsub.schedule('every 10 minutes').onRun((context) => {
  console.log('This will be run every 10 minutes!');
  loadNewAnnouncements();
  return null;
});

exports.addMessage = functions.https.onRequest(async (req, res) => {	
  loadNewAnnouncements();
  res.end();
});

exports.clearDatabase = functions.https.onRequest(async (req, res) => {
  var adaRef = admin.database().ref('announcements');
  adaRef.remove()
    .then(() => {
      return null;
    })
    .catch((error) => {
      console.error("Remove failed: " + error.message)
    });
	adaRef = admin.database().ref('count');
  adaRef.remove()
    .then(() => {
      return null;
    })
    .catch((error) => {
      console.error("Remove failed: " + error.message)
    });
  res.end();
  return "Successful";
});


exports.getAllAnnouncements = functions.https.onRequest(async (req, res) => {
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.open("GET", 'https://keralarescue.in/api/announcements/api');
  xmlHttp.send();
  xmlHttp.onreadystatechange = function () {
    if (this.readyState === 4 && this.status === 200) {
	  var announcements = JSON.parse(this.responseText).announcements;
      admin.database().ref('/announcements').set(announcements);
	  var count = Object.keys(announcements).length;
      admin.database().ref('/count').set(count);
    }
  }
  res.end();
});

function sendNotification(announcement) {
  var topic = 'announcements';
  var title = 'Low Priority';
  if (announcement['Priority'] === 'H') {
    if (announcement['is_pinned'] === true) {
      title = 'VERY IMPORTANT';
    }
  }
  if (announcement['Priority'] === 'M') {
    title = 'MEDIUM PRIORITY';
  }
  let msg = announcement['description'];
  var message = {
    notification: {
      title: title,
      body: msg
    },
    data: {
      score: '850',
      time: '2:45',
      "click_action": "FLUTTER_NOTIFICATION_CLICK", "id": "1", "status": "done"
    },
    topic: topic
  };

  // Send a message to devices subscribed to the provided topic.
  admin.messaging().send(message).then((response) => {
    // Response is a message ID string.
    return console.log('Successfully sent message:', response);
  })
    .catch((error) => {
      console.log('Error sending message:', error);
	  console.log(message);
    });
}

function loadNewAnnouncements() {
	var xmlHttp = new XMLHttpRequest();
  xmlHttp.open("GET", 'https://keralarescue.in/api/announcements/api');
  xmlHttp.send();
  var count = 0;
  xmlHttp.onreadystatechange = function () {
    if (this.readyState === 4 && this.status === 200) {
		
	  var announcements = JSON.parse(this.responseText).announcements;
	  var webCount = Object.keys(announcements).length;
      admin.database().ref('/count').once("value")
        .then((snapshot) => {
          count = snapshot.val();
		  
		  while(count<webCount){			  
			admin.database().ref('/announcements/' + count).set(announcements[count]);			
          sendNotification(announcements[count]);
			count++;
		  }
          admin.database().ref('/count').set(count);	  
          return count;
        }).catch((error) => {
          console.error(error);
        })
    }
  }
}