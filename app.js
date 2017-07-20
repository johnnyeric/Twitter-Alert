const AWS = require('aws-sdk');
const Deque = require('double-ended-queue');

const Twitter = require('node-tweet-stream')
  , t = new Twitter({
    consumer_key: '<consumer_key>',
    consumer_secret: '<consumer_secret>',
    token: '<token>',
    token_secret: '<token_secret>'
  });

AWS.config.update({
  accessKeyId: '<accessKeyId>',
  secretAccessKey: '<secretAccessKey>',
  region: 'us-east-1'
});

var sns = new AWS.SNS();

const sendSNS = message => {
  let payload = {
    default: message,
    GCM: `{ \"data\": { \"message\": \"${message}\" } } `
  };
  payload = JSON.stringify(payload);

  sns.publish({
    Message: payload,
    MessageStructure: 'json',
    TargetArn: 'arn:aws:sns:us-east-1:201178272257:StormDetected'
  }, function(err, data) {
    if (err) {
      console.log(err.stack);
      return;
    }

    console.log('push sent');
    console.log(data);
  });
}

//space means AND | comma means OR
const phrases = [
  'sorocaba enchente',
  'sorocaba terremoto enchente',
  'sorocaba terremoto',
  'sorocaba chuva forte',
  'sorocaba tempestade',
  'sorocaba alagamento',
  'sorocaba chuva alagamento',
  'sorocaba chuva tempestade',
  'sorocaba tremores',
]

const keywords = ['javascript','enchente','terremoto','alagamento','tempestade','chuva', 'sorocaba', 'tremores'];
const pattern = new RegExp('(' + keywords.join('|') + ')','ig');

const deque = new Deque(5);
let startTime, count = 0;
 
t.on('tweet', (tweet) => {
  
  let keywordsMatched = tweet.text && tweet.text.match(pattern) || [];
  if (tweet.text && tweet.text.toLowerCase().indexOf('enchente') !== -1) {
    sendSNS(`message: ${tweet.text} keywords: ${keywordsMatched.length && keywordsMatched.join(',')}`);
    return;
  }

  if (!startTime) {
    startTime = new Date().getTime();
  }

  const now = new Date().getTime();
  const secs = (now - startTime) / 1000 / 60;
  if ( secs < 20) {
    deque.push(tweet.text);
    count += 1;
    console.log('deque ', count, deque.toArray());
  } else {
    startTime = new Date().getTime();
    deque.clear();
    count = 1;
  }

  if (count >= 5) {
    sendSNS(`message: ${tweet.text} keywords: ${keywordsMatched.length && keywordsMatched.join(',')}`);
    count = 0;
    startTime = null;
  }

});

t.on('error', (err) => {
  console.log('Error: ', error);
});
 
t.track(phrases.join(','));
//t.location('-47.5700,-23.5882,-47.3024,-23.350');