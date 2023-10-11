require('dotenv').config();

const hbs = require('hbs');
const path = require('path');
const express = require('express');
const compression = require('compression')

const { mongoConnect } = require('./db/mongo');
const {
  addController,
  getControllers,
} = require('./controllers/dehumid.controller');

const app = express();
const port = process.env.PORT || 3000;

hbs.handlebars.registerHelper('formatTemperature', function (temperature) {
  return `${temperature}°C`;
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

const views = path.join(__dirname, 'views');

app.use(compression())
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

app.get('/', getControllers);
app.post('/add-controller', addController);

app.listen(port, () => {
  console.log(`Server running on port http://localhost:${port}`);
});
