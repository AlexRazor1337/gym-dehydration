require('dotenv').config();
const express = require('express');
const path = require('path');
const { DehydratorController } = require('./db/models');
const { mongoConnect } = require('./db/mongo');
const hbs = require('hbs');

const app = express();
const port = process.env.PORT || 3000;

const views = path.join(__dirname, 'views');

hbs.handlebars.registerHelper('formatTemperature', function(temperature) {
    return `${temperature}°C`; // Replace '°C' with your desired degree symbol
  });
  
  hbs.handlebars.registerHelper('formatHumidity', function(humidity) {
    return `${humidity}%`;
  });
  
  hbs.handlebars.registerHelper('formatTimeOfDay', function(time) {
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
  function determineDehumidifierMode(indoorTemperature, indoorHumidity, outdoorTemperature, outdoorHumidity, time) {
    // Define temperature and humidity thresholds
    const indoorTempThresholds = [18, 22, 25];
    const indoorHumidityThresholds = [40, 50, 60];
    const outdoorTempThreshold = 10;
  
    // Determine the time of day (day or night)
    const isNightTime = time >= 22 * 60 || time < 6 * 60;
  
    // Initialize mode to "off"
    let mode = "off";
  
    // Check indoor temperature
    if (indoorTemperature < 18) {
      mode = "off";
    } else if (indoorTemperature >= 18 && indoorTemperature < 22) {
      mode = "low";
    } else if (indoorTemperature >= 22 && indoorTemperature < 25) {
      mode = "medium";
    } else {
      mode = "high";
    }
  
    // Check indoor humidity
    if (indoorHumidity < indoorHumidityThresholds[0]) {
      mode = "off";
    } else if (indoorHumidity >= indoorHumidityThresholds[0] && indoorHumidity < indoorHumidityThresholds[1]) {
      mode = "low";
    } else if (indoorHumidity >= indoorHumidityThresholds[1] && indoorHumidity < indoorHumidityThresholds[2]) {
      mode = "medium";
    } else {
      mode = "high";
    }
  
    // Check outdoor temperature
    if (outdoorTemperature < outdoorTempThreshold) {
      mode = "off";
    } else if (outdoorTemperature >= outdoorTempThreshold && outdoorTemperature < 20) {
      mode = "low";
    } else {
      mode = "medium";
    }
  
    // Apply the time of day rule
    if (isNightTime) {
      mode = "off";
    }
  
    return mode;
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
    console.log(req.body);
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
    )

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
