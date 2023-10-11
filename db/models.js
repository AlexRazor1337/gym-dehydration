const mongoose = require('mongoose');

// Define the Clock schema
const clockSchema = new mongoose.Schema({
  time: {
    type: Number,
    min: 0,
    max: 1440,
    required: true,
  },
});

// Define the Sensor schema
const sensorSchema = new mongoose.Schema({
  temperature: {
    type: Number,
    required: true,
  },
  humidity: {
    type: Number,
    required: true,
  },
});

// Define the DehydratorController schema
const dehydratorControllerSchema = new mongoose.Schema({
  clock: {
    type: clockSchema,
    required: true,
  },
  indoorSensor: {
    type: sensorSchema,
    required: true,
  },
  outdoorSensor: {
    type: sensorSchema,
    required: true,
  },
  mode: {
    type: String,
    enum: ['off', 'low', 'medium', 'high'],
    required: true,
  },
});

// Create models for Clock, Sensor, and DehydratorController
const Clock = mongoose.model('Clock', clockSchema);
const Sensor = mongoose.model('Sensor', sensorSchema);
const DehydratorController = mongoose.model(
  'DehydratorController',
  dehydratorControllerSchema
);

module.exports = {
  Clock,
  Sensor,
  DehydratorController,
};
