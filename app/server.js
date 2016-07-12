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

yelp.search({ term: 'sushi', location: 'hanover, nh' })
.then((data) => {
  data.businesses.forEach(business => {
    console.log(business.rating);
  });
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

controller.on('me_message', (bot, message) => {
  bot.reply(message, 'What are you talking about?');
});

controller.on('outgoing_webhook', (bot, message) => {
  bot.replyPublic(message, 'yeah yeah');
});
