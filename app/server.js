// example bot
console.log('starting bot');

import botkit from 'botkit';

// botkit controller
const controller = botkit.slackbot({
  debug: false,
});

// initialize slackbot
const slackbot = controller.spawn({
  token: process.env.SLACK_BOT_TOKEN,
  // this grabs the slack token we exported earlier
}).startRTM(err => {
  // start the real time message client
  if (err) { throw new Error(err); }
});

// prepare webhook
// for now we won't use this but feel free to look up slack webhooks
controller.setupWebserver(process.env.PORT || 3001, (err, webserver) => {
  controller.createWebhookEndpoints(webserver, slackbot, () => {
    if (err) { throw new Error(err); }
  });
});

// example hello response
controller.hears(['help'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.reply(message, 'If you tell me that you are hungry, I can suggest places to eat for you!');
});

controller.hears(['hello', 'hi', 'weijiatang'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    if (res) {
      bot.reply(message, `Hello, ${res.user.name}!`);
    } else {
      bot.reply(message, 'Hello there!');
    }
  });
});

// Request API access: http://www.yelp.com/developers/getting_started/api_access
const Yelp = require('yelp');

const yelp = new Yelp({
  consumer_key: 'YD89DeGKd3ly4sYj-dxRzw',
  consumer_secret: 'hXSHDZptocAePv4GdspK41bIQr0',
  token: 'sNo1I-Lx8q_x-YbpzJEm8JxF1H49ZXpP',
  token_secret: 'Ryg-Jb0CN2e1gFgwlJ_XVX06jB0',
});

controller.hears(['hungry'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  const yelpResults = (response, convo) => {
    convo.say('Here\'s the list of top 5 matched restaurants near you!');
    yelp.search({
      term: convo.extractResponse('food'),
      location: convo.extractResponse('location'),
      limit: 5,
    }).then((data) => {
      data.businesses.forEach(business => {
        const restaurant = {
          text: `rating: ${business.rating}`,
          attachments: [
            {
              fallback: `Yelp result for ${business.name}`,
              title: business.name,
              title_link: business.url,
              text: business.snippet_text,
              image_url: business.image_url,
              color: '#7CD197',
            },
          ],
        };
        convo.say(restaurant);
      });
    });
  };
  const askLocation = (response, convo) => {
    convo.ask('Where are you?', () => {
      convo.say('Ok! one sec. Pulling up results.');
      yelpResults(response, convo);
      convo.next();
    }, { key: 'location' });
  };
  const askType = (response, convo) => {
    convo.ask('What type of food are you interested in?', () => {
      convo.say('Ok.');
      askLocation(response, convo);
      convo.next();
    }, { key: 'food' });
  };
  const askRecommend = (response, convo) => {
    convo.ask('Would you like food recommendations near you?', [
      {
        pattern: bot.utterances.yes,
        callback: () => {
          convo.say('Great!');
          askType(response, convo);
          convo.next();
        },
      },
      {
        pattern: bot.utterances.no,
        callback: () => {
          convo.say('Perhaps later...');
          convo.next();
        },
      },
      {
        default: true,
        callback: () => {
          convo.say('What are you talking about?');
          convo.next();
        },
      },
    ]);
  };

  bot.startConversation(message, askRecommend);
});

// Require the module
const Forecast = require('forecast');

// Initialize
const forecast = new Forecast({
  service: 'forecast.io',
  key: '7212eb0920695eb3b920f185c3222f62',
  units: 'celcius', // Only the first letter is parsed
  cache: true,      // Cache API requests?
  ttl: {            // How long to cache requests. Uses syntax from moment.js: http://momentjs.com/docs/#/durations/creating/
    minutes: 27,
    seconds: 45,
  },
});

const NodeGeocoder = require('node-geocoder');

const options = {
  provider: 'google',
  // Optional depending on the providers
  httpAdapter: 'https', // Default
  apiKey: 'AIzaSyDsavbn0tQHYBKLj4w2Xp340IoKJVE--EA', // for Mapquest, OpenCage, Google Premier
  formatter: null,         // 'gpx', 'string', ...
};

const geocoder = NodeGeocoder(options);

controller.hears(['weather', 'forecast'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  const weatherResults = (response, convo) => {
    convo.say(`The current weather of ${convo.extractResponse('location')}:`);
    geocoder.geocode(convo.extractResponse('location'))
      .then((result) => {
        const latitude = result[0].latitude;
        const longitude = result[0].longitude;
        forecast.get([latitude, longitude], (err, weather) => {
          if (err) return console.dir(err);
          console.log(weather);
          convo.say(`Summary: ${weather.currently.summary}`);
          convo.say(`Intensity of precipitation: ${weather.currently.precipIntensity}`);
          convo.say(`Probability of precipitation: ${weather.currently.precipProbability}`);
          convo.say(`Temperature: ${weather.currently.temperature}`);
          convo.say(`Humidity: ${weather.currently.humidity}`);
        });
      });
  };
  const askLocation = (response, convo) => {
    convo.ask('You want to display the weather of which region?', () => {
      convo.say('Ok! one sec. Pulling up results.');
      weatherResults(response, convo);
      convo.next();
    }, { key: 'location' });
  };
  const askWeather = (response, convo) => {
    convo.ask('Would you like some weather information?', [
      {
        pattern: bot.utterances.yes,
        callback: () => {
          convo.say('Great!');
          askLocation(response, convo);
          convo.next();
        },
      },
      {
        pattern: bot.utterances.no,
        callback: () => {
          convo.say('Perhaps later...');
          convo.next();
        },
      },
      {
        default: true,
        callback: () => {
          convo.say('What are you talking about?');
          convo.next();
        },
      },
    ]);
  };

  bot.startConversation(message, askWeather);
});

controller.hears(['(.*)'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  const key = message.match[1];
  if (key !== 'help' && key !== 'hello' && key !== 'hi' && key !== 'weijiatang' && key !== 'hungry') {
    return bot.reply(message, 'lol I am confused.');
  }
  return undefined;
});

controller.on('outgoing_webhook', (bot, message) => {
  bot.replyPublic(message, 'yeah I am awake');
});
