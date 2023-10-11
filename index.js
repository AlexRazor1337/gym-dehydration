require('dotenv').config();
const express = require('express');
const path = require('path');
const { DehydratorController } = require('./db/models');
const { mongoConnect } = require('./db/mongo');
const hbs = require('hbs');

const app = express();
const port = process.env.PORT || 3000;

const views = path.join(__dirname, 'views');

hbs.handlebars.registerHelper('formatTemperature', function (temperature) {
  return `${temperature}°C`; // Replace '°C' with your desired degree symbol
});

hbs.handlebars.registerHelper('formatHumidity', function (humidity) {
  return `${humidity}%`;
});

hbs.handlebars.registerHelper('formatTimeOfDay', function (time) {
  const hours = Math.floor(time / 60);
  const minutes = time % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${formattedHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
});

app.set('view engine', 'hbs');
app.set('views', views);
app.use(express.static('public'));

app.use(express.urlencoded({ extended: false }));

mongoConnect()
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.log('Error connecting to MongoDB', err);
  });

// Main function to determine the dehumidifier mode
function determineDehumidifierMode(
  indoorTemperature,
  indoorHumidity,
  outdoorTemperature,
  outdoorHumidity,
  time
) {
  const rules = [];

  // Determine the time of day (day or night)
  const isNightTime = time >= 22 * 60 || time < 6 * 60;

  // Define priority levels for rules
  const priorityLevels = {
    off: 4,
    low: 1,
    medium: 2,
    high: 3,
  };

  // Rule for temperature in the room
  if (indoorTemperature >= 18 && indoorTemperature < 22) {
    rules.push('low');
  } else if (indoorTemperature >= 22 && indoorTemperature < 25) {
    rules.push('medium');
  } else if (indoorTemperature >= 25) {
    rules.push('high');
  }

  // Rule for indoor humidity
  if (indoorHumidity < 40) {
    rules.push('off');
  } else if (indoorHumidity >= 40 && indoorHumidity < 50) {
    rules.push('low');
  } else if (indoorHumidity >= 50 && indoorHumidity < 60) {
    rules.push('medium');
  } else {
    rules.push('high');
  }

  // Rule for outdoor temperature
  if (outdoorTemperature >= 10 && outdoorTemperature < 20) {
    rules.push('low');
  } else if (outdoorTemperature >= 20) {
    rules.push('medium');
  }

  // Rule for outdoor humidity
  if (outdoorHumidity >= 40 && outdoorHumidity < 50) {
    rules.push('low');
  } else if (outdoorHumidity >= 50 && outdoorHumidity < 60) {
    rules.push('medium');
  } else if (outdoorHumidity >= 60) {
    rules.push('high');
  }

  // Rule for nighttime (highest priority)
  if (isNightTime) {
    rules.push('off');
  }

  // Sort rules by priority
  rules.sort((a, b) => priorityLevels[a] - priorityLevels[b]);

  // Return the highest priority rule
  return rules[rules.length - 1];
}

app.get('/', async (req, res) => {
  try {
    const controllers = await DehydratorController.find();
    res.render('home', { controllers }); // Render the 'controllers.hbs' view with the data
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/add-controller', async (req, res) => {
  try {
    // Extract data from the form
    const {
      time,
      indoorTemperature,
      indoorHumidity,
      outdoorTemperature,
      outdoorHumidity,
    } = req.body;

    const mode = determineDehumidifierMode(
      Number(indoorTemperature),
      Number(indoorHumidity),
      Number(outdoorTemperature),
      Number(outdoorHumidity),
      Number(time)
    );

    // Create a new DehydratorController instance
    const newController = new DehydratorController({
      clock: { time },
      indoorSensor: {
        temperature: indoorTemperature,
        humidity: indoorHumidity,
      },
      outdoorSensor: {
        temperature: outdoorTemperature,
        humidity: outdoorHumidity,
      },
      mode,
    });

    // Save the new controller to the database
    await newController.save();

    // Redirect to the list of controllers
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port http://localhost:${port}`);
});
